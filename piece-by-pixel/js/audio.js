const PENT = [0, 2, 4, 7, 9];
const PROGRESSION = [
  [48, 60, 64, 67, 71],
  [45, 57, 60, 64, 67],
  [41, 57, 60, 64, 69],
  [43, 55, 59, 62, 67],
];
const STEP = 60 / 76 / 2;

let ctx = null;
let sfxBus;
let musicBus;
let noiseBuf;
let settings = { sfx: true, music: true };
let timer = 0;
let nextTime = 0;
let step = 0;

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function init() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 5;
  comp.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = settings.sfx ? 0.85 : 0;
  sfxBus.connect(comp);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(comp);

  const echo = ctx.createDelay(1);
  echo.delayTime.value = STEP * 3;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2200;
  const wet = ctx.createGain();
  wet.gain.value = 0.4;
  musicBus.echoIn = echo;
  echo.connect(tone);
  tone.connect(feedback);
  feedback.connect(echo);
  tone.connect(wet);
  wet.connect(musicBus);

  noiseBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.25), ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
  return true;
}

function voice({ freq, type = 'sine', at = 0, dur = 0.3, gain = 0.2, attack = 0.004, glide = 0, bus = sfxBus, send = false }) {
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur * 0.8);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(bus);
  if (send) g.connect(musicBus.echoIn);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function knock({ at = 0, dur = 0.035, gain = 0.12, freq = 2600, q = 2 }) {
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(sfxBus);
  src.start(t, Math.random() * 0.15, dur + 0.02);
}

function bell(midi, at, gain, bus = sfxBus, dur = 0.9, send = false) {
  voice({ freq: hz(midi), at, dur, gain, bus, send });
  voice({ freq: hz(midi + 12) * 1.003, at, dur: dur * 0.5, gain: gain * 0.28, bus, send });
  voice({ freq: hz(midi + 31), at, dur: 0.12, gain: gain * 0.08, bus });
}

function ready() {
  return ctx && ctx.state !== 'closed' && settings.sfx;
}

function tick() {
  while (nextTime < ctx.currentTime + 0.3) {
    const bar = Math.floor(step / 8) % PROGRESSION.length;
    const [root, ...chord] = PROGRESSION[bar];
    const beat = step % 8;
    if (beat === 0) {
      voice({ freq: hz(root), at: nextTime - ctx.currentTime, dur: STEP * 7, gain: 0.07, attack: 0.08, bus: musicBus });
    }
    const pool = beat % 2 === 0 ? chord.map((n) => n + 12) : PENT.map((n) => 72 + n);
    if (beat === 0 || Math.random() < 0.34) {
      const note = pool[Math.floor(Math.random() * pool.length)];
      bell(note, Math.max(0, nextTime - ctx.currentTime), 0.045, musicBus, 1.6, true);
    }
    nextTime += STEP;
    step++;
  }
}

function syncMusic() {
  if (!ctx) return;
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setTargetAtTime(settings.music ? 0.9 : 0, t, 0.4);
  if (settings.music && !timer) {
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(tick, 120);
  } else if (!settings.music && timer) {
    clearInterval(timer);
    timer = 0;
  }
}

export const audio = {
  configure(next) {
    settings = { ...settings, ...next };
    if (!ctx) return;
    sfxBus.gain.setTargetAtTime(settings.sfx ? 0.85 : 0, ctx.currentTime, 0.05);
    syncMusic();
  },
  unlock() {
    if (!ctx && !init()) return;
    if (ctx.state === 'suspended') ctx.resume();
    syncMusic();
  },
  tap() {
    if (!ready()) return;
    voice({ freq: 620, type: 'triangle', dur: 0.06, gain: 0.07 });
  },
  pick() {
    if (!ready()) return;
    voice({ freq: 700, glide: 1150, type: 'triangle', dur: 0.09, gain: 0.08 });
    knock({ gain: 0.05, freq: 3800 });
  },
  snap(n) {
    if (!ready()) return;
    const midi = 72 + PENT[n % 5] + 12 * Math.floor(n / 5);
    knock({ gain: 0.16, freq: 1800, q: 3 });
    voice({ freq: 120, glide: 70, dur: 0.09, gain: 0.14 });
    bell(midi, 0.01, 0.2);
  },
  miss() {
    if (!ready()) return;
    voice({ freq: 330, glide: 220, type: 'triangle', dur: 0.16, gain: 0.1 });
    voice({ freq: 262, glide: 175, type: 'triangle', at: 0.09, dur: 0.2, gain: 0.08 });
  },
  rotate() {
    if (!ready()) return;
    knock({ gain: 0.08, freq: 1200, dur: 0.06, q: 1 });
    voice({ freq: 520, glide: 780, type: 'triangle', dur: 0.08, gain: 0.05 });
  },
  hint() {
    if (!ready()) return;
    bell(81, 0, 0.09);
    bell(88, 0.12, 0.08);
  },
  done() {
    if (!ready()) return;
    [72, 76, 79, 84, 88].forEach((n, i) => bell(n, i * 0.075, 0.16));
    for (let i = 0; i < 6; i++) bell(96 + PENT[i % 5], 0.42 + i * 0.05, 0.035, sfxBus, 0.4);
  },
  fanfare() {
    if (!ready()) return;
    [67, 72, 76, 79].forEach((n, i) => bell(n, i * 0.13, 0.17, sfxBus, 0.6));
    [72, 76, 79, 84].forEach((n) => bell(n, 0.56, 0.12, sfxBus, 1.8));
    voice({ freq: hz(48), at: 0.56, dur: 1.8, gain: 0.12, attack: 0.03 });
  },
};
