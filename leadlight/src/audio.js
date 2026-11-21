const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let noiseBuf = null;

  function ensure() {
    if (muted) return null;
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function bell(freq, when, gain = 0.25, decay = 1.6) {
    const partials = [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]];
    for (const [ratio, amp] of partials) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(gain * amp, when + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, when + decay / ratio ** 0.5);
      osc.connect(g).connect(master);
      osc.start(when);
      osc.stop(when + decay + 0.1);
    }
  }

  function noise(when, dur, { type = 'bandpass', freq = 3000, q = 1, gain = 0.2, attack = 0.002 } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f).connect(g).connect(master);
    src.start(when, Math.random() * 0.5);
    src.stop(when + dur + 0.05);
  }

  const note = (step) => 523.25 * 2 ** (SCALE[Math.min(step, SCALE.length - 1)] / 12);

  return {
    unlock: ensure,
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.55;
    },
    chime(combo = 0) {
      if (!ensure()) return;
      const t = ctx.currentTime;
      bell(note(combo % SCALE.length), t, 0.22, 1.8);
      bell(note((combo % SCALE.length) + 2) * 1.0, t + 0.06, 0.08, 1.2);
      noise(t, 0.35, { type: 'highpass', freq: 7000, gain: 0.05, attack: 0.02 });
    },
    bump() {
      if (!ensure()) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.18);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + 0.25);
      noise(t, 0.08, { type: 'lowpass', freq: 900, gain: 0.25 });
    },
    slide(durationMs = 300) {
      if (!ensure()) return;
      const t = ctx.currentTime;
      const d = durationMs / 1000;
      noise(t, d, { type: 'bandpass', freq: 600, q: 2, gain: 0.07, attack: 0.03 });
      const land = t + d;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, land);
      osc.frequency.exponentialRampToValueAtTime(55, land + 0.16);
      g.gain.setValueAtTime(0, land);
      g.gain.linearRampToValueAtTime(0.4, land + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, land + 0.22);
      osc.connect(g).connect(master);
      osc.start(land);
      osc.stop(land + 0.25);
      noise(land, 0.06, { type: 'lowpass', freq: 1200, gain: 0.18 });
      bell(note(0) / 2, land, 0.05, 0.6);
    },
    crack() {
      if (!ensure()) return;
      const t = ctx.currentTime + 0.05;
      for (let i = 0; i < 5; i++) noise(t + i * 0.018 + Math.random() * 0.01, 0.05, { freq: 2500 + Math.random() * 2500, q: 4, gain: 0.18 });
    },
    win() {
      if (!ensure()) return;
      const t = ctx.currentTime;
      [0, 2, 4, 5, 7, 9, 12].forEach((s, i) => bell(note(s), t + i * 0.09, 0.16, 2.4));
      bell(note(0) / 2, t + 0.7, 0.2, 3.5);
      noise(t + 0.2, 1.6, { type: 'highpass', freq: 8000, gain: 0.05, attack: 0.4 });
    },
    lose() {
      if (!ensure()) return;
      const t = ctx.currentTime;
      [7, 4, 0].forEach((s, i) => bell(note(s) / 2, t + i * 0.16, 0.18, 1.4));
      for (let i = 0; i < 12; i++) noise(t + 0.05 + i * 0.03, 0.12, { freq: 2000 + Math.random() * 5000, q: 3, gain: 0.12 });
    },
    tick() {
      if (!ensure()) return;
      bell(1568, ctx.currentTime, 0.05, 0.3);
    },
  };
}
