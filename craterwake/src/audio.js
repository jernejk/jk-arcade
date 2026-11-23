const storageKey = 'craterwake-sound';
export class Chimes {
  constructor() {
    this.on = true;
    try {
      this.on = localStorage.getItem(storageKey) !== 'muted';
    } catch {}
  }
  unlock() {
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch {}
  }
  toggle() {
    this.on = !this.on;
    try {
      localStorage.setItem(storageKey, this.on ? 'on' : 'muted');
    } catch {}
    if (this.on) this.unlock();
  }
  play(name, calm = false) {
    if (!this.on || !this.ctx || calm) return;
    const ctx = this.ctx;
    const sounds = {
      fire: [220, 57, 0.18, 'triangle'],
      tick: [740, 625, 0.055, 'sine'],
      click: [420, 525, 0.075, 'sine'],
      splash: [410, 95, 0.22, 'sine'],
      impact: [130, 34, 0.31, 'sawtooth'],
      win: [460, 920, 0.44, 'triangle'],
    };
    const [start, end, length, type] = sounds[name],
      o = ctx.createOscillator(),
      g = ctx.createGain(),
      t = ctx.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(start, t);
    o.frequency.exponentialRampToValueAtTime(end, t + length);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(
      type === 'sawtooth' ? 0.055 : 0.13,
      t + 0.008,
    );
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + length + 0.01);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
}
