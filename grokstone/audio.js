// Small synthesized stingers. Nothing is loaded from the network.

export function createAudio() {
  let ctx = null;
  let master = null;
  let noise = null;
  let muted = false;

  function context() {
    if (muted) return null;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
      const len = ctx.sampleRate * 1.2;
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      noise = buffer;
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function burst(freq, dur, type, gain, slide = 0) {
    const ac = context();
    if (!ac) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noiseHit(dur, freq, q, gain) {
    const ac = context();
    if (!ac || !noise) return;
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noise;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  return {
    setMuted(value) { muted = !!value; },
    blip() { burst(620, 0.07, "triangle", 0.12); },
    cannon() {
      burst(150, 0.28, "sine", 0.45, -90);
      noiseHit(0.22, 180, 0.6, 0.35);
    },
    hit(hard) {
      noiseHit(hard ? 0.16 : 0.08, hard ? 420 : 900, 0.8, hard ? 0.28 : 0.16);
      if (hard) burst(90, 0.12, "sine", 0.18, -30);
    },
    crumble() { noiseHit(0.45, 160, 0.4, 0.3); },
    boom() {
      burst(80, 0.4, "sine", 0.5, -40);
      noiseHit(0.35, 240, 0.5, 0.4);
    },
    clink() { burst(880, 0.06, "square", 0.05); },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => burst(f, 0.18, "triangle", 0.14), i * 110));
    },
    lose() {
      burst(311, 0.3, "sine", 0.16, -80);
      burst(196, 0.4, "triangle", 0.1, -40);
    },
  };
}
