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

  return {
    setMuted(next) { muted = !!next; },
    unlock() { if (!muted) context(); },
    play(name) {
      if (muted) return;
      if (name === "tick") tone(880, 0.045, "sine", 0.03);
      else if (name === "wild") tone(520, 0.07, "triangle", 0.035, 740);
      else if (name === "perfect") {
        tone(660, 0.16, "sine", 0.06, 880);
        tone(990, 0.2, "sine", 0.035);
      } else if (name === "good") tone(420, 0.08, "triangle", 0.045, 360);
      else if (name === "wait") tone(240, 0.05, "sine", 0.02);
      else if (name === "miss") noise(0.28, 0.08);
      else if (name === "start") tone(330, 0.12, "sine", 0.04, 660);
    },
  };
}
