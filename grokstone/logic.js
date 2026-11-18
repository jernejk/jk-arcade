// Pure rules for Grokstone. No DOM, no physics engine.

export const SAVE_KEY = "grokstone-v1";

export const WORLD = Object.freeze({
  w: 460,
  h: 600,
  groundTop: 548,
});

export const PHYS = Object.freeze({
  dt: 1000 / 60,
  gravityY: 1,
  gravityScale: 0.001,
  air: 0.008,
});

export const PITCH_X = 32;
export const PITCH_Y = 26;
export const BLOCK_W = 30;
export const BLOCK_H = 24;

export const HP = Object.freeze({
  foundation: 190,
  stone: 150,
  timber: 48,
  keystone: 90,
  keg: 28,
  merlon: 40,
  banner: 240,
});

export const RUBBLE = Object.freeze({
  foundation: 3,
  stone: 2,
  timber: 1,
  keystone: 5,
  keg: 4,
  merlon: 1,
  banner: 6,
});

export const WEAPONS = Object.freeze([
  {
    id: "roundshot",
    name: "Roundshot",
    short: "Ball",
    crew: "Ida Flint",
    line: "A true iron ball. It hits the stone you mean.",
    speed: [8.4, 15.2],
    radius: 7,
    damage: 76,
    speedDamage: 3.6,
    mass: 0.85,
    restitution: 0.22,
    air: 0.006,
    explode: 0,
    explodeRadius: 0,
    yank: 0,
    pierce: 0,
  },
  {
    id: "keg",
    name: "Cinder keg",
    short: "Keg",
    crew: "Puck Harrow",
    line: "Kiln-fire in a clay pot. It does not care whose wall.",
    speed: [7.4, 13.1],
    radius: 9,
    damage: 22,
    speedDamage: 0.8,
    mass: 0.45,
    restitution: 0.04,
    air: 0.012,
    explode: 84,
    explodeRadius: 76,
    yank: 0,
    pierce: 0,
  },
  {
    id: "harpoon",
    name: "Hookline",
    short: "Hook",
    crew: "Sable Quinn",
    line: "Bites one stone and hauls it out of the courses.",
    speed: [11.2, 17.4],
    radius: 5,
    damage: 34,
    speedDamage: 1.2,
    mass: 0.32,
    restitution: 0.02,
    air: 0.004,
    explode: 0,
    explodeRadius: 0,
    yank: 1,
    pierce: 0,
  },
  {
    id: "boulder",
    name: "Holt boulder",
    short: "Rock",
    crew: "Bram Holt",
    line: "Slow, rude, and heavy enough to take a foot out.",
    speed: [6.6, 11.2],
    radius: 13,
    damage: 124,
    speedDamage: 5.5,
    mass: 3.1,
    restitution: 0.03,
    air: 0.01,
    explode: 0,
    explodeRadius: 0,
    yank: 0,
    pierce: 1,
  },
]);

export const UPGRADES = Object.freeze([
  { id: "keg", kind: "weapon", weapon: "keg", cost: 8, name: "Hire Puck Harrow", blurb: "Cinder kegs. They pop a whole patch of wall, and sometimes your own." },
  { id: "buttress", kind: "keep", cost: 10, name: "Buttress the foot", blurb: "Stone wings on your foundation, so a lucky shot does not end you." },
  { id: "powder", kind: "keep", cost: 12, name: "Powder horn", blurb: "Ida's roundshot lands harder." },
  { id: "iron", kind: "keep", cost: 12, name: "Iron standard", blurb: "The capstone under your banner is banded. It takes two clean hits." },
  { id: "thick", kind: "keep", cost: 14, name: "Thicker ashlar", blurb: "Every course in your keep is cut deeper." },
  { id: "harpoon", kind: "weapon", weapon: "harpoon", cost: 16, name: "Hire Sable Quinn", blurb: "A hookline for plucking the one stone that matters." },
  { id: "boulder", kind: "weapon", weapon: "boulder", cost: 18, name: "Hire Bram Holt", blurb: "A boulder for doors, feet, and bad ideas." },
]);

export const LEVELS = Object.freeze([
  {
    number: 1,
    id: "foot",
    name: "The Foot",
    foe: "Pebble Stack",
    blurb: "The banner hangs on the near column. Kick a stone out from under it.",
    par: 2,
    wind: 0,
    enemy: { cols: 3, rows: 8, arch: false, bridge: false, timberEvery: 0, kegs: 0, merlons: false, hp: 1 },
    ai: { skill: 0.18, weapon: "roundshot" },
  },
  {
    number: 2,
    id: "arch",
    name: "Odd Arch",
    foe: "The Odd Door",
    blurb: "A gold stone sits in the near face. Everything above it is trusting that one block.",
    par: 3,
    wind: 0.22,
    enemy: { cols: 5, rows: 8, arch: true, bridge: false, timberEvery: 0, kegs: 0, merlons: true, hp: 1 },
    ai: { skill: 0.32, weapon: "roundshot" },
  },
  {
    number: 3,
    id: "barn",
    name: "Banded Barn",
    foe: "Banded Barn",
    blurb: "Timber bands every few courses. They snap before the stone does.",
    par: 3,
    wind: -0.18,
    enemy: { cols: 4, rows: 8, arch: false, bridge: false, timberEvery: 3, kegs: 0, merlons: true, hp: 1.05 },
    ai: { skill: 0.38, weapon: "roundshot" },
  },
  {
    number: 4,
    id: "pantry",
    name: "Pantry Fuse",
    foe: "Pantry Fuse",
    blurb: "Someone stored cinder kegs in the wall. Wake them gently.",
    par: 2,
    wind: 0.12,
    enemy: { cols: 4, rows: 7, arch: false, bridge: false, timberEvery: 0, kegs: 2, merlons: false, hp: 1 },
    ai: { skill: 0.4, weapon: "roundshot" },
  },
  {
    number: 5,
    id: "bridge",
    name: "Crow Bridge",
    foe: "Twin Crows",
    blurb: "The banner stands on a timber neck in the near wall. Timber snaps.",
    par: 2,
    wind: 0.28,
    enemy: { cols: 5, rows: 8, arch: false, bridge: true, timberEvery: 0, kegs: 0, merlons: true, hp: 1 },
    ai: { skill: 0.45, weapon: "roundshot" },
  },
  {
    number: 6,
    id: "buttress",
    name: "Low Buttress",
    foe: "Low Buttress",
    blurb: "A wide foot. You will want something heavier than a polite ball.",
    par: 4,
    wind: -0.12,
    enemy: { cols: 5, rows: 7, arch: false, bridge: false, timberEvery: 0, kegs: 0, merlons: true, hp: 1.2, buttress: true },
    ai: { skill: 0.52, weapon: "roundshot" },
  },
  {
    number: 7,
    id: "spire",
    name: "High Merlon",
    foe: "High Merlon",
    blurb: "A needle of a tower. Wind has opinions.",
    par: 4,
    wind: 0.4,
    enemy: { cols: 3, rows: 12, arch: false, bridge: false, timberEvery: 4, kegs: 1, merlons: true, hp: 1.05 },
    ai: { skill: 0.58, weapon: "keg" },
  },
  {
    number: 8,
    id: "citadel",
    name: "Brackencrown",
    foe: "Brackencrown",
    blurb: "Arch, kegs, and a crew that has learned your name.",
    par: 5,
    wind: -0.26,
    enemy: { cols: 5, rows: 10, arch: true, bridge: false, timberEvery: 3, kegs: 2, merlons: true, hp: 1.15 },
    ai: { skill: 0.72, weapon: "keg" },
  },
]);

const FOES = Object.freeze([
  "Marrow Gate", "Hollow Spire", "Cinder Bailey", "Lark Keep", "Mudcrown",
  "Ivy Redoubt", "Salt Curtain", "Wick Tower", "Amber Barbican", "Nock Wall",
  "Pell Folly", "The Unsteady", "Rookery Line", "Thorn Merlon", "Ash Lintel",
  "Brindle Wall", "Cobble Spire", "Hinge Keep", "Loam Crown", "Quarry Door",
]);

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function hashString(text) {
  let h = 2166136261;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dailySeed(dateStr) {
  return hashString(`grokstone-daily-${dateStr}`);
}

export function weaponById(id) {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}

export function defaultSave() {
  return {
    v: 1,
    unlocked: 1,
    rubble: 0,
    weapons: ["roundshot"],
    upgrades: { buttress: false, iron: false, thick: false, powder: false },
    cleared: {},
    best: {},
    daily: null,
    seeds: {},
    lastWeapon: "roundshot",
    stats: { wins: 0, losses: 0, shots: 0 },
    settings: { muted: false, motion: "auto" },
    seenEgg: false,
  };
}

function asBool(v) {
  return v === true;
}

export function coerceSave(raw) {
  const d = defaultSave();
  if (!raw || typeof raw !== "object") return d;
  const unlocked = Number(raw.unlocked);
  d.unlocked = Number.isFinite(unlocked) ? clamp(Math.floor(unlocked), 1, 99) : 1;
  const rubble = Number(raw.rubble);
  d.rubble = Number.isFinite(rubble) ? clamp(Math.floor(rubble), 0, 99999) : 0;
  if (Array.isArray(raw.weapons)) {
    const allowed = new Set(WEAPONS.map((w) => w.id));
    const list = [];
    for (const id of raw.weapons) {
      if (allowed.has(id) && id !== "roundshot" && !list.includes(id)) list.push(id);
    }
    d.weapons = ["roundshot", ...list];
  }
  if (raw.upgrades && typeof raw.upgrades === "object") {
    for (const key of Object.keys(d.upgrades)) d.upgrades[key] = asBool(raw.upgrades[key]);
  }
  if (raw.cleared && typeof raw.cleared === "object") {
    for (const [k, v] of Object.entries(raw.cleared)) {
      if (v === true && typeof k === "string" && k.length < 40) d.cleared[k] = true;
    }
  }
  if (raw.best && typeof raw.best === "object") {
    for (const [k, v] of Object.entries(raw.best)) {
      if (!v || typeof v !== "object" || typeof k !== "string" || k.length > 40) continue;
      const stars = clamp(Math.floor(Number(v.stars) || 0), 0, 3);
      const shots = clamp(Math.floor(Number(v.shots) || 0), 0, 99);
      if (stars > 0) d.best[k] = { stars, shots };
    }
  }
  if (raw.daily && typeof raw.daily === "object" && typeof raw.daily.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.daily.date)) {
    d.daily = {
      date: raw.daily.date,
      shots: clamp(Math.floor(Number(raw.daily.shots) || 0), 0, 99),
      won: raw.daily.won === true,
      stars: clamp(Math.floor(Number(raw.daily.stars) || 0), 0, 3),
    };
  }
  if (raw.seeds && typeof raw.seeds === "object") {
    const entries = Object.entries(raw.seeds).slice(0, 20);
    for (const [k, v] of entries) {
      if (!/^[0-9a-z]{1,12}$/i.test(k)) continue;
      const shots = Number(v);
      if (Number.isFinite(shots)) d.seeds[k] = clamp(Math.floor(shots), 1, 99);
    }
  }
  if (typeof raw.lastWeapon === "string" && d.weapons.includes(raw.lastWeapon)) d.lastWeapon = raw.lastWeapon;
  if (raw.stats && typeof raw.stats === "object") {
    for (const key of ["wins", "losses", "shots"]) {
      const n = Number(raw.stats[key]);
      d.stats[key] = Number.isFinite(n) ? clamp(Math.floor(n), 0, 1e7) : 0;
    }
  }
  if (raw.settings && typeof raw.settings === "object") {
    d.settings.muted = raw.settings.muted === true;
    if (raw.settings.motion === "reduce" || raw.settings.motion === "full" || raw.settings.motion === "auto") {
      d.settings.motion = raw.settings.motion;
    }
  }
  d.seenEgg = raw.seenEgg === true;
  return d;
}

export function loadSave(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return coerceSave(JSON.parse(raw));
  } catch {
    return defaultSave();
  }
}

export function writeSave(storage, save) {
  storage.setItem(SAVE_KEY, JSON.stringify(save));
  return save;
}

export function playerSpec(save) {
  return {
    cols: 3,
    rows: 5,
    arch: false,
    bridge: false,
    timberEvery: 0,
    kegs: 0,
    merlons: true,
    hp: save.upgrades.thick ? 1.38 : 1,
    bannerScale: save.upgrades.iron ? 1.85 : 1,
    buttress: save.upgrades.buttress === true,
  };
}

function cellCenter(left, col, row) {
  return {
    x: left + col * PITCH_X + BLOCK_W / 2,
    y: WORLD.groundTop - row * PITCH_Y - BLOCK_H / 2,
  };
}

function makeBlock(partial) {
  const maxHp = Math.max(1, Math.round(partial.maxHp));
  return {
    id: partial.id,
    side: partial.side,
    col: partial.col,
    row: partial.row,
    x: partial.x,
    y: partial.y,
    w: partial.w,
    h: partial.h,
    material: partial.material,
    hp: maxHp,
    maxHp,
    rooted: partial.rooted === true,
    arch: partial.arch === true,
    loose: false,
    variant: partial.variant | 0,
  };
}

function faceCol(cols, side) {
  return side === "enemy" ? 0 : cols - 1;
}

function placeCastle(spec, side, rng) {
  const cols = spec.cols;
  const rows = spec.rows;
  const width = cols * PITCH_X;
  const left = side === "player" ? 24 : WORLD.w - 24 - width;
  const face = faceCol(cols, side);
  const blocks = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let material = "stone";
      let arch = false;
      if (r === 0) material = "foundation";
      else if (spec.arch && c === face && r === Math.min(3, rows - 2)) {
        material = "keystone";
      } else if (spec.bridge && c === face && r === rows - 2) {
        material = "timber";
        arch = true;
      } else if (spec.timberEvery && r % spec.timberEvery === 0 && r !== rows - 1 && r !== 0) {
        material = "timber";
      } else if (spec.merlons && r === rows - 1 && c !== face) {
        material = "merlon";
      }
      const pos = cellCenter(left, c, r);
      let scale = spec.hp || 1;
      if (c === face && r === rows - 1) scale *= spec.bannerScale || 1;
      blocks.push(makeBlock({
        id: `${side[0]}${c}x${r}`,
        side,
        col: c,
        row: r,
        x: pos.x,
        y: pos.y,
        w: BLOCK_W,
        h: BLOCK_H,
        material,
        maxHp: HP[material] * scale,
        rooted: r === 0,
        arch,
        variant: Math.floor(rng() * 4),
      }));
    }
  }

  if (spec.buttress) {
    let n = 0;
    for (const c of [-1, cols]) {
      for (const r of [0, 1]) {
        const pos = cellCenter(left, c, r);
        blocks.push(makeBlock({
          id: `${side[0]}wing${n++}`,
          side,
          col: c,
          row: r,
          x: pos.x,
          y: pos.y,
          w: BLOCK_W,
          h: BLOCK_H,
          material: "foundation",
          maxHp: HP.foundation * (spec.hp || 1),
          rooted: true,
          arch: false,
          variant: Math.floor(rng() * 4),
        }));
      }
    }
  }

  const kegCount = spec.kegs | 0;
  if (kegCount > 0) {
    const candidates = blocks.filter((b) => (b.material === "stone" || b.material === "timber") && b.col === face && b.row > 0 && b.row < rows - 1);
    for (let i = 0; i < kegCount && candidates.length; i++) {
      const index = spec.fixedKegs ? i % candidates.length : Math.floor(rng() * candidates.length);
      const block = candidates.splice(index, 1)[0];
      block.material = "keg";
      block.maxHp = Math.round(HP.keg * (spec.hp || 1));
      block.hp = block.maxHp;
      block.arch = false;
    }
  }

  const top = blocks.filter((b) => b.col === face).sort((a, b) => b.row - a.row)[0];
  if (top) {
    const pos = {
      x: top.x,
      y: top.y - top.h / 2 - 2 - 17,
    };
    blocks.push(makeBlock({
      id: `${side[0]}banner`,
      side,
      col: face,
      row: top.row + 1,
      x: pos.x,
      y: pos.y,
      w: 16,
      h: 34,
      material: "banner",
      maxHp: HP.banner * (spec.bannerScale || 1) * (side === "enemy" ? spec.hp || 1 : 1),
      rooted: false,
      arch: false,
      variant: 0,
    }));
  }

  return { blocks, left, width, face };
}

function attachNeighbors(blocks) {
  const neigh = neighborsOf(blocks);
  for (const block of blocks) {
    const n = neigh.get(block.id) || { below: [], left: [], right: [], above: [] };
    block.neighbors = {
      below: n.below.slice(),
      left: n.left.slice(),
      right: n.right.slice(),
      above: n.above.slice(),
    };
  }
  return blocks;
}

export function neighborsOf(blocks) {
  const map = new Map();
  for (const b of blocks) map.set(b.id, { below: [], left: [], right: [], above: [] });
  const live = blocks.filter((b) => b.hp > 0 && !b.loose);
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const b = live[j];
      if (a.side !== b.side) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const ax = (a.w + b.w) / 2;
      const ay = (a.h + b.h) / 2;
      const xOverlap = ax - Math.abs(dx);
      const yGap = Math.abs(Math.abs(dy) - ay);
      const yOverlap = ay - Math.abs(dy);
      const xGap = Math.abs(Math.abs(dx) - ax);
      if (xOverlap > Math.min(a.w, b.w) * 0.4 && yGap < 8 && Math.abs(dy) > 4) {
        if (dy > 0) {
          map.get(a.id).below.push(b.id);
          map.get(b.id).above.push(a.id);
        } else {
          map.get(b.id).below.push(a.id);
          map.get(a.id).above.push(b.id);
        }
      } else if (yOverlap > Math.min(a.h, b.h) * 0.4 && xGap < 8 && Math.abs(dx) > 4) {
        if (dx > 0) {
          map.get(a.id).right.push(b.id);
          map.get(b.id).left.push(a.id);
        } else {
          map.get(b.id).right.push(a.id);
          map.get(a.id).left.push(b.id);
        }
      }
    }
  }
  return map;
}

export function stableIds(blocks) {
  const usable = blocks.filter((b) => b.hp > 0 && !b.loose);
  const neigh = neighborsOf(usable);
  const stable = new Set(usable.filter((b) => b.rooted).map((b) => b.id));
  let guard = 0;
  let changed = true;
  while (changed && guard++ < 48) {
    changed = false;
    for (const b of usable) {
      if (stable.has(b.id)) continue;
      const n = neigh.get(b.id);
      if (n.below.some((id) => stable.has(id))) {
        stable.add(b.id);
        changed = true;
        continue;
      }
      if (b.arch && n.left.some((id) => stable.has(id)) && n.right.some((id) => stable.has(id))) {
        stable.add(b.id);
        changed = true;
      }
    }
  }
  return stable;
}

export function collapseIds(blocks) {
  const stable = stableIds(blocks);
  return blocks.filter((b) => b.hp > 0 && !b.loose && !stable.has(b.id)).map((b) => b.id);
}

function cannonFor(placed, side) {
  const xs = placed.blocks.map((b) => b.x);
  const edge = side === "player" ? Math.max(...xs) : Math.min(...xs);
  return {
    x: side === "player" ? edge + 28 : edge - 28,
    y: WORLD.groundTop - 32,
    side,
  };
}

function withNeighbors(blocks) {
  return attachNeighbors(blocks.map((b) => ({ ...b, neighbors: null })));
}

export function generateSpec(seed) {
  const rng = mulberry32(seed >>> 0);
  const kindRoll = rng();
  const cols = 3 + Math.floor(rng() * 3);
  let rows = 6 + Math.floor(rng() * 5);
  const arch = kindRoll < 0.34 && cols >= 4;
  const bridge = !arch && kindRoll > 0.72 && cols >= 5;
  if ((arch || bridge) && rows < 7) rows = 7;
  const timberEvery = rng() > 0.55 ? 3 + Math.floor(rng() * 2) : 0;
  const kegs = kindRoll > 0.42 && kindRoll < 0.8 ? 1 + Math.floor(rng() * 2) : 0;
  const merlons = rng() > 0.25;
  const wind = Math.round((rng() - 0.5) * 80) / 100;
  const hp = 0.95 + rng() * 0.35;
  const foe = FOES[seed % FOES.length];
  const skill = 0.4 + (seed % 7) * 0.05;
  const weapon = kegs > 0 && rng() > 0.45 ? "keg" : "roundshot";
  return {
    cols, rows, arch, bridge, timberEvery, kegs, merlons, hp, wind, foe, skill, weapon,
    buttress: cols >= 5 && rng() > 0.7,
  };
}

function parFor(spec) {
  let par = 2 + Math.floor(spec.cols / 2);
  if (spec.arch) par += 1;
  if (spec.bridge) par -= 1;
  if (spec.kegs) par -= 1;
  if (spec.rows >= 10) par += 1;
  return clamp(par, 2, 7);
}

export function buildLayout({ mode, number = 1, save, seed, date }) {
  const safeSave = save || defaultSave();
  const rngSeed = mode === "daily" ? dailySeed(date || localDateString()) : (seed >>> 0);
  const rng = mulberry32((rngSeed || hashString(String(number))) ^ 0x9e3779b9);
  let enemy;
  let wind;
  let name;
  let foe;
  let blurb;
  let par;
  let id;
  let ai;
  let levelNumber = number;

  if (mode === "campaign" && number <= LEVELS.length) {
    const level = LEVELS[number - 1];
    enemy = { ...level.enemy, bannerScale: 1, fixedKegs: true };
    wind = level.wind;
    name = level.name;
    foe = level.foe;
    blurb = level.blurb;
    par = level.par;
    id = level.id;
    ai = { ...level.ai };
    levelNumber = level.number;
  } else if (mode === "campaign") {
    const trail = number - LEVELS.length;
    const spec = generateSpec(hashString(`trail-${trail}`));
    spec.hp = Math.min(1.8, spec.hp + trail * 0.05);
    spec.rows = Math.min(12, spec.rows + Math.floor((trail - 1) / 2));
    enemy = { ...spec, bannerScale: 1 };
    wind = spec.wind;
    name = `Trail ${trail}`;
    foe = spec.foe;
    blurb = "The trail keeps raising keeps. The wind is part of the masonry.";
    par = parFor(spec);
    id = `trail-${trail}`;
    ai = { skill: Math.min(0.9, spec.skill), weapon: spec.weapon };
    levelNumber = number;
  } else {
    const spec = generateSpec(rngSeed);
    enemy = { ...spec, bannerScale: 1 };
    wind = spec.wind;
    foe = spec.foe;
    par = parFor(spec);
    ai = { skill: clamp(spec.skill, 0.35, 0.85), weapon: spec.weapon };
    if (mode === "daily") {
      id = `daily-${date}`;
      name = "Today's keep";
      blurb = `${foe} stood up overnight. Every crew is lent to you. Fewest shots is the mark.`;
    } else {
      id = `seed-${(rngSeed >>> 0).toString(36)}`;
      name = "Shared keep";
      blurb = `${foe}, raised from a shared seed. The crews are lent.`;
    }
    levelNumber = 0;
  }

  const player = placeCastle(playerSpec(safeSave), "player", rng);
  const foeCastle = placeCastle(enemy, "enemy", rng);
  const blocks = withNeighbors([...player.blocks, ...foeCastle.blocks]);
  const weapons = mode === "campaign" ? safeSave.weapons.slice() : WEAPONS.map((w) => w.id);

  return {
    mode,
    id,
    number: levelNumber,
    name,
    foe,
    blurb,
    par,
    wind,
    seed: rngSeed >>> 0,
    date: date || null,
    blocks,
    playerCannon: cannonFor(player, "player"),
    enemyCannon: cannonFor(foeCastle, "enemy"),
    ai,
    weapons,
    world: WORLD,
  };
}

export function layoutByNumber(number, save) {
  return buildLayout({ mode: "campaign", number, save });
}

export function dailyLayout(save, date = localDateString()) {
  return buildLayout({ mode: "daily", save, date, seed: dailySeed(date) });
}

export function seedLayout(save, seed) {
  return buildLayout({ mode: "seed", save, seed: seed >>> 0 });
}

export function accelOf(component) {
  return component * PHYS.gravityScale * PHYS.dt * PHYS.dt;
}

export function integrate(x, y, vx, vy, wind, steps, air = PHYS.air) {
  const points = [];
  const g = accelOf(PHYS.gravityY);
  const w = accelOf(wind || 0);
  const drag = 1 - air;
  for (let i = 0; i < steps; i++) {
    vx = vx * drag + w;
    vy = vy * drag + g;
    x += vx;
    y += vy;
    points.push({ x, y, vx, vy });
    if (y > WORLD.groundTop + 40 || x < -40 || x > WORLD.w + 40) break;
  }
  return points;
}

export function shotVelocity(weapon, angle, power) {
  const t = clamp(power, 0, 1);
  const speed = weapon.speed[0] + (weapon.speed[1] - weapon.speed[0]) * t;
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    speed,
  };
}

export function firstHit(points, blocks, radius) {
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.y + radius >= WORLD.groundTop) {
      return { type: "ground", x: p.x, y: WORLD.groundTop, speed: Math.hypot(p.vx, p.vy), index: i };
    }
    for (const b of blocks) {
      if (b.hp <= 0) continue;
      if (Math.abs(p.x - b.x) <= b.w / 2 + radius && Math.abs(p.y - b.y) <= b.h / 2 + radius) {
        return { type: "block", id: b.id, side: b.side, x: p.x, y: p.y, speed: Math.hypot(p.vx, p.vy), index: i };
      }
    }
  }
  return null;
}

export function damageOf(weapon, speed, powder) {
  const scale = weapon.id === "roundshot" && powder ? 1.22 : 1;
  return (weapon.damage + Math.max(0, speed) * weapon.speedDamage) * scale;
}

function angleRange(side, count) {
  const out = [];
  if (side === "player") {
    for (let i = 0; i < count; i++) out.push(-1.42 + (1.52 * i) / (count - 1));
  } else {
    for (let i = 0; i < count; i++) out.push(Math.PI - 0.08 + (1.34 * i) / (count - 1));
  }
  return out;
}

function dropsBanner(blocks, block, damage) {
  if (!block || block.material === "banner" || damage < block.hp) return false;
  const banner = blocks.find((b) => b.side === block.side && b.material === "banner");
  if (!banner) return false;
  const next = blocks.map((b) => (b.id === block.id ? { ...b, hp: 0 } : b));
  return collapseIds(next).includes(banner.id);
}

export function sampleAims(cannon, weapon, blocks, wind, side, powder = false) {
  const aims = [];
  const angles = angleRange(side, side === "player" ? 16 : 14);
  for (const angle of angles) {
    for (let i = 0; i < 7; i++) {
      const power = 0.32 + i * 0.1;
      const vel = shotVelocity(weapon, angle, power);
      const pts = integrate(cannon.x, cannon.y, vel.vx, vel.vy, wind, 78, weapon.air);
      const hit = firstHit(pts, blocks, weapon.radius);
      let score = 0;
      let target = null;
      if (hit && hit.type === "block") {
        target = blocks.find((b) => b.id === hit.id) || null;
        if (target && target.side !== side) {
          const banner = blocks.find((b) => b.side === target.side && b.material === "banner");
          const under = banner && target.col === banner.col;
          const harm = damageOf(weapon, hit.speed, powder);
          score = 6 + harm * 0.12;
          if (target.material === "banner") score = 1;
          else if (dropsBanner(blocks, target, harm)) score += 140;
          else if (target.material === "keystone" || target.arch) score += 58;
          else if (target.material === "keg") score += 50;
          else if (target.material === "foundation" && under) score += 40;
          else if (target.material === "foundation") score += 18;
          else if (under && target.material === "timber") score += 36;
          else if (under) score += 20;
          else if (target.material === "timber") score += 14;
          else if (target.material === "merlon") score += 2;
        } else if (target) {
          score = -40;
        }
      }
      aims.push({ angle, power, score, hit, targetId: target ? target.id : null });
    }
  }
  aims.sort((a, b) => b.score - a.score);
  return aims;
}

export function bestAim(cannon, weapon, blocks, wind, side, powder = false) {
  const aims = sampleAims(cannon, weapon, blocks, wind, side, powder);
  return aims.find((a) => a.score > 0) || aims[0];
}

export function enemyAim(layout, shotIndex) {
  const weapon = weaponById(layout.ai.weapon);
  const aims = sampleAims(layout.enemyCannon, weapon, layout.blocks, layout.wind, "enemy", false);
  const rng = mulberry32((layout.seed ^ Math.imul(shotIndex + 1, 0x85ebca6b)) >>> 0);
  const skill = clamp(layout.ai.skill, 0, 1);
  const pool = aims.filter((a) => a.score > 0).slice(0, 6);
  const bag = pool.length ? pool : aims.slice(0, 4);
  const miss = (1 - skill) * (0.35 + rng() * 0.65);
  const index = Math.min(bag.length - 1, Math.floor(miss * bag.length));
  const pick = bag[index];
  const noise = (1 - skill) * (rng() - 0.5) * 0.55;
  return {
    angle: pick.angle + noise,
    power: clamp(pick.power + (rng() - 0.5) * (1 - skill) * 0.25, 0.3, 1),
    weaponId: weapon.id,
  };
}

export function aimToward(cannon, point, weapon, blocks, wind, side) {
  const angles = angleRange(side, 18);
  let best = null;
  for (const angle of angles) {
    for (let i = 0; i < 8; i++) {
      const power = 0.28 + i * 0.1;
      const vel = shotVelocity(weapon, angle, power);
      const pts = integrate(cannon.x, cannon.y, vel.vx, vel.vy, wind, 80, weapon.air);
      const hit = firstHit(pts, blocks, weapon.radius);
      let bestD = Infinity;
      const stop = hit ? hit.index : pts.length - 1;
      for (let p = 0; p <= stop; p += 1) {
        const q = pts[p];
        const d = (q.x - point.x) ** 2 + (q.y - point.y) ** 2;
        if (d < bestD) bestD = d;
      }
      if (hit && hit.type === "block") {
        const block = blocks.find((b) => b.id === hit.id);
        if (block) {
          const d = (block.x - point.x) ** 2 + (block.y - point.y) ** 2;
          if (d < bestD) bestD = d * 0.65;
        }
      }
      if (!best || bestD < best.distance) best = { angle, power, distance: bestD, hit };
    }
  }
  return best;
}

export function starsFor(shots, par, won) {
  if (!won) return 0;
  if (shots <= par) return 3;
  if (shots <= par + 2) return 2;
  return 1;
}

export function rubbleFor(material) {
  return RUBBLE[material] || 0;
}

export function inscription(block, seed) {
  if (!block || block.material !== "keystone") return "";
  if (((seed >>> 0) + block.col * 5 + block.row) % 9 === 4) return "42";
  return "";
}

export function buy(save, upgradeId) {
  const item = UPGRADES.find((u) => u.id === upgradeId);
  if (!item) return { ok: false, reason: "unknown", save };
  if (item.kind === "weapon" && save.weapons.includes(item.weapon)) return { ok: false, reason: "owned", save };
  if (item.kind === "keep" && save.upgrades[item.id]) return { ok: false, reason: "owned", save };
  if (save.rubble < item.cost) return { ok: false, reason: "rubble", save };
  const next = structuredClone(save);
  next.rubble -= item.cost;
  if (item.kind === "weapon") next.weapons = [...next.weapons, item.weapon];
  else next.upgrades = { ...next.upgrades, [item.id]: true };
  return { ok: true, save: next, item };
}

export function recordResult(save, layout, outcome) {
  const next = structuredClone(save);
  next.stats = { ...next.stats, shots: next.stats.shots + (outcome.shots | 0) };
  if (!outcome.won) {
    next.stats.losses += 1;
    return next;
  }
  next.stats.wins += 1;
  const stars = starsFor(outcome.shots, layout.par, true);
  const prev = next.best[layout.id];
  if (!prev || stars > prev.stars || (stars === prev.stars && outcome.shots < prev.shots)) {
    next.best = { ...next.best, [layout.id]: { stars, shots: outcome.shots } };
  }
  if (layout.mode === "campaign") {
    if (!next.cleared[layout.id]) {
      next.cleared = { ...next.cleared, [layout.id]: true };
      next.rubble += outcome.rubble | 0;
    }
    next.unlocked = Math.max(next.unlocked, (layout.number || 1) + 1);
  } else if (layout.mode === "daily") {
    const first = !next.daily || next.daily.date !== layout.date || next.daily.won !== true;
    if (first) next.rubble += 8;
    if (!next.daily || next.daily.date !== layout.date || next.daily.won !== true || outcome.shots < next.daily.shots) {
      next.daily = { date: layout.date, shots: outcome.shots, won: true, stars };
    }
  } else if (layout.mode === "seed") {
    const key = (layout.seed >>> 0).toString(36);
    const prevShots = next.seeds[key];
    const seeds = { ...next.seeds };
    if (prevShots == null || outcome.shots < prevShots) seeds[key] = outcome.shots;
    const keys = Object.keys(seeds);
    while (keys.length > 20) {
      const drop = keys.shift();
      delete seeds[drop];
    }
    next.seeds = seeds;
  }
  return next;
}

export function shareText(layout, outcome) {
  const stars = "★".repeat(outcome.stars) + "☆".repeat(3 - outcome.stars);
  if (!outcome.won) {
    return `Grokstone · ${layout.name} · the standard fell`;
  }
  if (layout.mode === "daily") {
    return `Grokstone · daily ${layout.date} · ${outcome.shots} shots ${stars}`;
  }
  return `Grokstone · ${layout.name} · ${outcome.shots} shots ${stars}`;
}

export function hashFor(layout) {
  if (!layout) return "";
  if (layout.mode === "daily") return "#daily";
  if (layout.mode === "seed") return `#s=${(layout.seed >>> 0).toString(36)}`;
  if (layout.mode === "campaign" && layout.number) return `#l=${layout.number}`;
  return "";
}

export function parseHash(hash) {
  const h = String(hash || "").replace(/^#/, "").trim();
  if (!h) return { mode: "campaign" };
  if (h === "daily" || h.startsWith("daily")) return { mode: "daily" };
  let m = /^s=([0-9a-z]+)$/i.exec(h);
  if (m) {
    const seed = Number.parseInt(m[1], 36);
    if (Number.isFinite(seed)) return { mode: "seed", seed: seed >>> 0 };
  }
  m = /^l=(\d{1,2})$/.exec(h);
  if (m) return { mode: "campaign", number: clamp(Number(m[1]), 1, 40) };
  return { mode: "campaign" };
}

export function windLabel(wind) {
  if (wind > 0.12) return "The wind pulls right.";
  if (wind < -0.12) return "The wind pulls left.";
  return "The air is still.";
}

export function nextLevelNumber(save) {
  return clamp(save.unlocked || 1, 1, 40);
}
