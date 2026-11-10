// Tiny synthesized stingers. Nothing is fetched.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function context() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain, slide) {
    const ac = context();
    if (!ac || muted) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, gain) {
    const ac = context();
    if (!ac || muted) return;
    const length = Math.floor(ac.sampleRate * dur);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    const amp = ac.createGain();
    amp.gain.setValueAtTime(gain, ac.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(ac.destination);
    src.start();
  }

  const penta = [523.25, 587.33, 659.25, 783.99, 880];
  let bed = null;
  function ensureBed() {
    const ac = context();
    if (!ac || bed || muted) return;
    const gain = ac.createGain();
    gain.gain.value = 0.012;
    const a = ac.createOscillator();
    const b = ac.createOscillator();
    a.type = "sine";
    b.type = "triangle";
    a.frequency.value = 196;
    b.frequency.value = 247;
    const g2 = ac.createGain();
    g2.gain.value = 0;
    a.connect(gain);
    b.connect(g2);
    g2.connect(gain);
    gain.connect(ac.destination);
    a.start();
    b.start();
    bed = { gain, g2, b };
  }
  return {
    setMuted(next) {
      muted = !!next;
      if (bed) bed.gain.gain.value = muted ? 0 : 0.012;
    },
    unlock() { if (!muted) { context(); ensureBed(); } },
    setChain(combo) {
      if (!bed || muted) return;
      const mult = combo >= 6 ? 3 : combo >= 3 ? 2 : 1;
      bed.gain.gain.value = 0.012 + (mult - 1) * 0.006;
      bed.g2.gain.value = mult >= 2 ? 0.02 : 0;
      bed.b.frequency.value = mult >= 3 ? 392 : 247;
    },
    play(name, step = 0) {
      if (muted) return;
      if (name === "tick") tone(880, 0.045, "sine", 0.03);
      else if (name === "wild") tone(520, 0.07, "triangle", 0.035, 740);
      else if (name === "perfect") {
        const freq = penta[Math.abs(step) % penta.length] * (2 ** Math.min(2, Math.floor(Math.abs(step) / 5)));
        tone(freq, 0.12, "sine", 0.06);
        tone(freq * 1.5, 0.16, "sine", 0.028);
      } else if (name === "good") tone(420, 0.08, "triangle", 0.045, 360);
      else if (name === "cash") tone(520, 0.09, "triangle", 0.04, 340);
      else if (name === "relic") {
        tone(740, 0.14, "sine", 0.05, 980);
        tone(1180, 0.18, "sine", 0.03);
      } else if (name === "milestone") {
        tone(523, 0.16, "sine", 0.05);
        tone(659, 0.18, "sine", 0.04);
        tone(784, 0.22, "sine", 0.03);
      } else if (name === "rift") tone(196, 0.12, "sine", 0.04, 330);
      else if (name === "veil") tone(880, 0.06, "sine", 0.03, 1320);
      else if (name === "hour") tone(392, 0.22, "sine", 0.04, 523);
      else if (name === "wait") tone(240, 0.05, "sine", 0.02);
      else if (name === "miss") noise(0.28, 0.08);
      else if (name === "start") tone(330, 0.12, "sine", 0.04, 660);
    },
  };
}
