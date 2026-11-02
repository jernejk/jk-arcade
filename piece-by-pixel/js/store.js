const KEY = 'piece-by-pixel:v1';

const fresh = () => ({ scenes: {}, settings: { sfx: true, music: true, twist: false, tier: 'normal' } });

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw) return fresh();
    return { ...fresh(), ...raw, settings: { ...fresh().settings, ...raw.settings } };
  } catch {
    return fresh();
  }
}

let data = load();

export const store = {
  get settings() {
    return data.settings;
  },
  scene(id) {
    data.scenes[id] ??= { done: [], placed: {}, current: null, misses: {}, perfect: [], completedAt: null, hintsUsed: 0 };
    return data.scenes[id];
  },
  peek(id) {
    return data.scenes[id] ?? null;
  },
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // Private mode or full storage: keep playing in memory.
    }
  },
  reset() {
    const settings = data.settings;
    data = { ...fresh(), settings };
    this.save();
  },
};
