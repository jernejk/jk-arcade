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

export const PITCH_X = 34;
export const PITCH_Y = 22;
export const BLOCK_W = 32;
export const BLOCK_H = 20;

export const HP = Object.freeze({
  foundation: 155,
  stone: 140,
  timber: 58,
  keystone: 160,
  keg: 36,
  merlon: 48,
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
    explode: 210,
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
  { id: "harpoon", kind: "weapon", weapon: "harpoon", cost: 12, name: "Hire Sable Quinn", blurb: "A hookline for plucking the one stone that matters." },
  { id: "boulder", kind: "weapon", weapon: "boulder", cost: 15, name: "Hire Bram Holt", blurb: "A boulder for doors, feet, and bad ideas." },
]);

export const FIRST_HIRE = Math.min(...UPGRADES.map((item) => item.cost));

export const LEVELS = Object.freeze([
  {
    number: 1,
    id: "foot",
    name: "The Foot",
    foe: "Pebble Stack",
    blurb: "One foot is gold. Break that, and the plain stone beside it.",
    par: 3,
    wind: 0,
    starShot: "the gold foot",
    enemy: { pattern: "bond", cols: 4, rows: 7, timberEvery: 0, kegs: 0, merlons: true, hp: 1, crown: "gold" },
    ai: { skill: 0.55, weapon: "roundshot" },
  },
  {
    number: 2,
    id: "arch",
    name: "Odd Arch",
    foe: "The Odd Door",
    blurb: "The door is in the middle of the wall. The gold stone is why the crown is still up.",
    par: 3,
    wind: 0.22,
    starShot: "the gold stone",
    enemy: { pattern: "arch", cols: 5, rows: 8, timberEvery: 0, kegs: 0, merlons: true, hp: 1, keystone: 1.15 },
    ai: { skill: 0.32, weapon: "roundshot" },
  },
  {
    number: 3,
    id: "barn",
    name: "Banded Barn",
    foe: "Banded Barn",
    blurb: "Both feet are timber bands. Sable plucks them. Ida is still counting when the reply lands.",
    par: 3,
    wind: -0.18,
    starShot: "Sable's hook on the timber",
    enemy: { pattern: "bond", cols: 4, rows: 8, timberEvery: 0, kegs: 0, merlons: true, hp: 1, crown: "timber" },
    ai: { skill: 0.58, weapon: "roundshot" },
  },
  {
    number: 4,
    id: "pantry",
    name: "Pantry Fuse",
    foe: "Pantry Fuse",
    blurb: "Two casks are the feet under the cloth. A pot opens them. An iron ball does not.",
    par: 3,
    wind: 0.12,
    starShot: "Puck's pot on the casks",
    enemy: { pattern: "bond", cols: 5, rows: 7, timberEvery: 0, kegs: 2, merlons: true, hp: 1 },
    ai: { skill: 0.4, weapon: "roundshot" },
  },
  {
    number: 5,
    id: "bridge",
    name: "Crow Bridge",
    foe: "Twin Crows",
    blurb: "The timber between the towers is the bridge. The cloth is only watching.",
    par: 2,
    wind: 0.28,
    starShot: "the timber span",
    enemy: { pattern: "bridge", cols: 5, rows: 8, timberEvery: 0, kegs: 0, merlons: true, hp: 1 },
    ai: { skill: 0.45, weapon: "roundshot" },
  },
  {
    number: 6,
    id: "buttress",
    name: "Low Buttress",
    foe: "Low Buttress",
    blurb: "The near foot is a heavy gold stone. Bram breaks it. A ball will not, not in time.",
    par: 4,
    wind: -0.12,
    starShot: "Bram's boulder on the gold foot",
    enemy: { pattern: "bond", cols: 5, rows: 7, timberEvery: 0, kegs: 0, merlons: true, hp: 1, foundation: 1.15, buttress: true, crown: "buttress" },
    ai: { skill: 0.6, weapon: "roundshot" },
  },
  {
    number: 7,
    id: "spire",
    name: "High Merlon",
    foe: "High Merlon",
    blurb: "The gold stone is heavy. Crack it, and Sable can lift it out.",
    par: 4,
    wind: 0.35,
    starShot: "Sable's hook on the cracked gold stone",
    enemy: { pattern: "arch", cols: 5, rows: 9, timberEvery: 0, kegs: 0, merlons: true, hp: 1, keystone: 3.5, heavyKey: true },
    ai: { skill: 0.62, weapon: "roundshot" },
  },
  {
    number: 8,
    id: "citadel",
    name: "Brackencrown",
    foe: "Brackencrown",
    blurb: "The crown is a boulder problem. Ida will still be counting when Bram is done.",
    par: 5,
    wind: -0.26,
    starShot: "Bram's boulder on the gold stone",
    enemy: { pattern: "arch", cols: 5, rows: 10, timberEvery: 0, kegs: 2, merlons: true, hp: 1.15, foundation: 1.35, keystone: 3.5, heavyKey: true, sealedKey: true },
    ai: { skill: 0.66, weapon: "roundshot" },
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

export function stepClock(acc, elapsed, maxSteps = 5) {
  const total = Math.min(PHYS.dt * maxSteps, acc + Math.max(0, elapsed));
  // The epsilon keeps two 8.33 ms frames at 120 Hz from landing a hair short of one step.
  const steps = Math.floor(total / PHYS.dt + 1e-6);
  return { steps, acc: Math.max(0, total - steps * PHYS.dt) };
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
    dailyBonusDate: null,
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
  if (typeof raw.dailyBonusDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dailyBonusDate)) {
    d.dailyBonusDate = raw.dailyBonusDate;
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
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function playerSpec(save) {
  return {
    pattern: "bond",
    cols: 3,
    rows: 5,
    timberEvery: 0,
    kegs: 0,
    merlons: true,
    hp: save.upgrades.thick ? 1.38 : 1,
    bannerScale: save.upgrades.iron ? 1.85 : 1,
    buttress: save.upgrades.buttress === true,
    foundation: save.upgrades.buttress ? 1.25 : 1,
  };
}

function patternOf(spec) {
  if (spec.pattern) return spec.pattern;
  if (spec.bridge) return "bridge";
  if (spec.arch) return "arch";
  return "bond";
}

function rowShift(pattern, row) {
  if (pattern !== "bond") return 0;
  return row % 2 === 1 ? PITCH_X / 2 : 0;
}

function cellCenter(left, col, row, shift) {
  return {
    x: left + shift + col * PITCH_X + BLOCK_W / 2,
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
    pin: partial.pin === true,
    heavy: partial.heavy === true,
    sealed: partial.sealed === true,
    arch: partial.arch === true,
    loose: false,
    variant: partial.variant | 0,
  };
}

function placeCastle(spec, side, rng) {
  const pattern = patternOf(spec);
  const cols = spec.cols;
  const rows = spec.rows;
  const width = cols * PITCH_X + (pattern === "bond" || pattern === "arch" ? PITCH_X / 2 : 0);
  const left = side === "player" ? 24 : WORLD.w - 24 - width;
  const mid = Math.floor(cols / 2);
  const blocks = [];

  const near = side === "enemy" ? 0 : cols - 1;
  const push = (col, row, material, flags = {}) => {
    const shift = rowShift(pattern, row);
    const pos = cellCenter(left, col, row, shift);
    let scale = spec.hp || 1;
    if (material === "foundation") scale *= spec.foundation || 1;
    if (material === "keystone") scale *= spec.keystone || 1;
    if (material === "timber" && flags.arch) scale = (spec.spanHp || 58) / HP.timber;
    if (material === "stone" && row === rows - 1) scale *= spec.bannerScale || 1;
    blocks.push(makeBlock({
      id: `${side[0]}${col}x${row}`,
      side,
      col,
      row,
      x: pos.x,
      y: pos.y,
      w: BLOCK_W,
      h: material === "timber" && flags.arch ? 28 : BLOCK_H,
      material,
      maxHp: HP[material] * scale,
      rooted: material === "foundation",
      pin: flags.pin === true,
      heavy: flags.heavy === true,
      sealed: flags.sealed === true,
      arch: flags.arch === true,
      variant: Math.floor(rng() * 4),
    }));
  };

  for (let r = 0; r < rows; r++) {
    const shift = rowShift(pattern, r);
    const count = shift ? Math.max(1, cols - 1) : cols;
    for (let c = 0; c < count; c++) {
      if (pattern === "arch" && c === mid && r >= 1 && r <= 2) continue;
      if (pattern === "arch" && c !== mid && r >= 3) continue;
      if (pattern === "arch" && c === mid && r > 3) continue;
      if (pattern === "bridge" && c === mid && r !== rows - 4) continue;
      if (pattern === "bridge" && c < mid && r >= rows - 6) continue;
      let material = "stone";
      const flags = {};
      if (r === 0) material = "foundation";
      else if (pattern === "bridge" && c === mid) {
        material = "timber";
        flags.arch = true;
      } else if (pattern === "arch" && r === 3 && c === mid) {
        material = "keystone";
        flags.arch = true;
        flags.pin = true;
        flags.heavy = spec.heavyKey === true;
        flags.sealed = spec.sealedKey === true;
      } else if (spec.timberEvery && r % spec.timberEvery === 0 && r > 0 && r < rows - 1 && pattern !== "arch") {
        material = "timber";
      } else if (spec.merlons && r === rows - 1 && pattern !== "arch" && c !== near) {
        material = "merlon";
      } else if (pattern === "arch" && r === 2 && c !== mid && spec.merlons) {
        material = "merlon";
      }
      push(c, r, material, flags);
    }
  }

  if (spec.buttress && pattern !== "bridge") {
    let n = 0;
    for (const c of [-1, cols]) {
      const pos = cellCenter(left, c, 0, 0);
      blocks.push(makeBlock({
        id: `${side[0]}wing${n++}`,
        side,
        col: c,
        row: 0,
        x: pos.x,
        y: pos.y,
        w: BLOCK_W,
        h: BLOCK_H,
        material: "foundation",
        maxHp: HP.foundation * (spec.hp || 1) * (spec.foundation || 1),
        rooted: true,
        arch: false,
        variant: Math.floor(rng() * 4),
      }));
    }
  }

  const span = pattern === "bridge" ? blocks.find((b) => b.arch && b.material === "timber") : null;
  if (span) {
    blocks.push(makeBlock({
      id: `${side[0]}deck0`,
      side,
      col: span.col,
      row: span.row + 1,
      x: span.x + 18,
      y: span.y - BLOCK_H - 2,
      w: 16,
      h: BLOCK_H,
      material: "timber",
      maxHp: Math.round(HP.timber * (spec.hp || 1)),
      rooted: false,
      arch: false,
      variant: 1,
    }));
  }
  const bannerHost = span || null;
  const kegCount = spec.kegs | 0;
  if (kegCount > 0 && pattern !== "bond") {
    const seats = blocks
      .filter((b) => b.material === "stone" && b.row === 1 && b.col !== mid)
      .sort((a, b) => Math.abs(a.col - mid) - Math.abs(b.col - mid) || a.col - b.col);
    for (let i = 0; i < kegCount && i < seats.length; i++) {
      const block = seats[i];
      block.material = "keg";
      block.maxHp = Math.round(Math.max(HP.keg, 170) * (spec.hp || 1));
      block.hp = block.maxHp;
    }
  }

  if (span && bannerHost) {
    blocks.push(makeBlock({
      id: `${side[0]}banner`,
      side,
      col: bannerHost.col,
      row: bannerHost.row + 1,
      x: bannerHost.x + 12,
      y: bannerHost.y - bannerHost.h / 2 - 2 - 17,
      w: 8,
      h: 34,
      material: "banner",
      maxHp: HP.banner,
      rooted: false,
      arch: false,
      variant: 0,
    }));
  }
  if (pattern === "arch") buildArchCrown(blocks, side);
  if (pattern === "bond") capBondStandard(blocks, side, near, spec);

  return { blocks, left, width, face: mid };
}

function buildArchCrown(blocks, side) {
  const key = blocks.find((b) => b.side === side && b.material === "keystone");
  if (!key) return;
  const y1 = key.y - key.h / 2 - 2 - 7;
  const haunch = (name, dx) => makeBlock({
    id: `${side[0]}${name}`,
    side,
    col: key.col,
    row: key.row + 1,
    x: key.x + dx,
    y: y1,
    w: 14,
    h: 14,
    material: "stone",
    maxHp: 420,
  });
  const left = haunch("haunchL", -8);
  const right = haunch("haunchR", 8);
  const lintel = makeBlock({
    id: `${side[0]}lintel`,
    side,
    col: key.col,
    row: key.row + 2,
    x: key.x,
    y: y1 - 7 - 2 - 9,
    w: 52,
    h: 18,
    material: "stone",
    maxHp: 900,
    heavy: true,
  });
  blocks.push(left, right, lintel, makeBlock({
    id: `${side[0]}banner`,
    side,
    col: key.col,
    row: key.row + 3,
    x: lintel.x,
    y: lintel.y - lintel.h / 2 - 2 - 17,
    w: 16,
    h: 34,
    material: "banner",
    maxHp: HP.banner,
  }));
}

function capBondStandard(blocks, side, near, spec) {
  const outward = side === "enemy" ? -1 : 1;
  const face = blocks
    .filter((b) => b.side === side && b.col === near && b.material !== "merlon" && b.material !== "banner" && b.material !== "keg")
    .sort((a, b) => b.row - a.row)[0];
  if (!face) return;
  const crown = spec.crown || "stones";
  const enemy = side === "enemy";
  let faceHp = enemy ? 110 : (spec.playerFeet || HP.stone);
  let footHp = enemy ? 110 : (spec.playerFeet || HP.stone);
  let footMat = "stone";
  let footArch = false;
  let footHeavy = false;
  let footSealed = false;
  if (enemy && crown === "gold") {
    footMat = "keystone";
    footHp = 100;
    faceHp = 110;
  } else if (enemy && crown === "timber") {
    face.material = "timber";
    face.arch = true;
    faceHp = 210;
    footMat = "timber";
    footHp = 210;
    footArch = true;
    const course = blocks.find((b) => b.side === side && b.col === near && b.row === face.row - 1);
    // The inner band has to stand proud of the course under it. Tucked behind
    // that course, every arc clips the neighbour and the foot never outlines.
    if (course) face.x = course.x - course.w / 2 - 10 + face.w / 2;
  } else if (enemy && crown === "buttress") {
    footMat = "keystone";
    footHeavy = true;
    footSealed = true;
    footHp = 250;
    faceHp = 200;
  }
  face.maxHp = faceHp;
  face.hp = faceHp;
  // Timber bands need a gap a hook can fly through. Forty pixels leaves an
  // 11px slot, which a radius-5 shot cannot use.
  const footGap = footMat === "timber" ? 66 : 40;
  const foot = makeBlock({
    id: `${side[0]}footb`,
    side,
    col: near,
    row: face.row,
    x: face.x + outward * footGap,
    y: face.y,
    w: 26,
    h: BLOCK_H,
    material: footMat,
    maxHp: footHp,
    pin: true,
    arch: footArch,
    heavy: footHeavy,
    sealed: footSealed,
  });
  const cover = Math.abs(face.x - foot.x) + face.w / 2 + foot.w / 2 + 8;
  const lintel = makeBlock({
    id: `${side[0]}lintel`,
    side,
    col: near,
    row: face.row + 1,
    x: (face.x + foot.x) / 2,
    y: face.y - face.h / 2 - 2 - 9,
    w: footMat === "timber" ? Math.max(70, cover) : 70,
    h: 18,
    material: "stone",
    maxHp: 640,
    heavy: true,
  });
  blocks.push(foot, lintel, makeBlock({
    id: `${side[0]}banner`,
    side,
    col: near,
    row: face.row + 2,
    x: lintel.x,
    y: lintel.y - lintel.h / 2 - 2 - 17,
    w: 16,
    h: 34,
    material: "banner",
    maxHp: HP.banner,
  }));
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
  const computed = neighborsOf(usable);
  const links = (b) => (b.neighbors ? b.neighbors : computed.get(b.id)) || { below: [], left: [], right: [] };
  const stable = new Set(usable.filter((b) => b.rooted || b.pin).map((b) => b.id));
  let guard = 0;
  let changed = true;
  while (changed && guard++ < 64) {
    changed = false;
    for (const b of usable) {
      if (stable.has(b.id)) continue;
      const n = links(b);
      const below = n.below || [];
      const held = below.length === 1
        ? stable.has(below[0])
        : below.length >= 2 && below.some((id) => stable.has(id));
      if (held) {
        stable.add(b.id);
        changed = true;
        continue;
      }
      if (b.arch && (n.left.some((id) => stable.has(id)) || n.right.some((id) => stable.has(id)))) {
        stable.add(b.id);
        changed = true;
      }
    }
  }
  return stable;
}

export function collapseIds(blocks) {
  let current = blocks;
  const falling = new Set();
  for (let pass = 0; pass < 6; pass++) {
    const stable = stableIds(current);
    let added = false;
    for (const block of current) {
      if (block.hp > 0 && !block.loose && !stable.has(block.id) && !falling.has(block.id)) {
        falling.add(block.id);
        added = true;
      }
    }
    const doomed = [];
    for (const banner of current) {
      if (banner.material !== "banner" || !falling.has(banner.id)) continue;
      const host = current.find((b) => (banner.neighbors?.below || []).includes(b.id));
      if (!host) continue;
      const rows = new Set([host.row]);
      for (const id of host.neighbors?.below || []) {
        const foot = current.find((b) => b.id === id);
        if (foot) rows.add(foot.row);
      }
      for (const other of current) {
        if (other.side !== banner.side || other.hp <= 0 || other.loose || other.material === "banner") continue;
        if (rows.has(other.row)) doomed.push(other.id);
      }
    }
    if (!doomed.length) break;
    for (const id of doomed) falling.add(id);
    current = current.map((b) => (doomed.includes(b.id) ? { ...b, hp: 0 } : b));
  }
  return [...falling];
}

export function hookYields(block) {
  if (!block || block.sealed) return false;
  if (!block.heavy) return true;
  const max = block.maxHp || block.hp || 1;
  return block.hp / max <= 0.84;
}

export function missingStar(layout, stars, won) {
  if (!won || !layout || stars >= 3 || !layout.starShot) return "";
  return `The third star wanted ${layout.starShot}.`;
}

export function supportPath(blocks, banner) {
  const path = new Set();
  const walk = (id, depth) => {
    if (!id || path.has(id) || depth > 8) return;
    path.add(id);
    const block = blocks.find((b) => b.id === id);
    for (const below of block?.neighbors?.below || []) walk(below, depth + 1);
  };
  if (banner) walk(banner.id, 0);
  return path;
}

export function cleverClear(blocks, broken) {
  const banner = blocks.find((b) => b.side === "enemy" && b.material === "banner");
  const path = supportPath(blocks, banner);
  return (broken || []).some((b) => b.side === "enemy" && path.has(b.id) && (b.material === "keystone" || b.material === "keg" || (b.material === "timber" && b.arch)));
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

function thickenPlayerStandard(blocks) {
  const banner = blocks.find((b) => b.side === "player" && b.material === "banner");
  let id = banner && banner.neighbors.below[0];
  for (let i = 0; i < 3 && id; i++) {
    const block = blocks.find((b) => b.id === id);
    if (!block || block.material === "foundation") break;
    block.maxHp = Math.round(block.maxHp * 2.8);
    block.hp = block.maxHp;
    id = block.neighbors.below.length === 1 ? block.neighbors.below[0] : null;
  }
}

function seatBannerKegs(blocks, spec) {
  if (!spec || patternOf(spec) !== "bond" || !(spec.kegs > 0)) return;
  const banner = blocks.find((b) => b.side === "enemy" && b.material === "banner");
  const host = banner && blocks.find((b) => (banner.neighbors.below || []).includes(b.id));
  const feet = (host && host.neighbors && host.neighbors.below) || [];
  for (const id of feet.slice(0, spec.kegs)) {
    const block = blocks.find((b) => b.id === id);
    if (!block || block.material === "foundation" || block.material === "banner") continue;
    block.material = "keg";
    block.maxHp = Math.round(190 * (spec.hp || 1));
    block.hp = block.maxHp;
  }
}

function loneTrick(blocks) {
  const banner = blocks.find((b) => b.side === "enemy" && b.material === "banner");
  if (!banner) return null;
  for (const block of blocks) {
    if (block.side !== "enemy") continue;
    if (block.material !== "timber" && block.material !== "keg") continue;
    const fallen = collapseIds(blocks.map((b) => (b.id === block.id ? { ...b, hp: 0 } : b)));
    if (fallen.includes(banner.id)) return block;
  }
  return null;
}

function braceDailyStandard(blocks) {
  const next = blocks;
  for (let guard = 0; guard < 3 && loneTrick(next); guard++) {
    const banner = next.find((b) => b.side === "enemy" && b.material === "banner");
    const host = next.find((b) => (banner.neighbors.below || []).includes(b.id));
    banner.w = Math.max(banner.w, 40);
    banner.x -= 16;
    next.push(makeBlock({
      id: `eprop${guard}`,
      side: "enemy",
      col: host ? host.col : 0,
      row: host ? host.row : 0,
      x: banner.x - banner.w / 2 + 10,
      y: host ? host.y : banner.y + 30,
      w: 18,
      h: host ? host.h : BLOCK_H,
      material: "stone",
      maxHp: 220,
      pin: true,
    }));
    const refreshed = withNeighbors(next.splice(0, next.length));
    next.push(...refreshed);
  }
  return next;
}

export function generateSpec(seed) {
  const rng = mulberry32(seed >>> 0);
  const kindRoll = rng();
  const pattern = kindRoll < 0.34 ? "arch" : kindRoll < 0.67 ? "bridge" : "bond";
  const cols = pattern === "bond" ? 4 : 5;
  let rows = 7 + Math.floor(rng() * 3);
  const arch = pattern === "arch";
  const bridge = pattern === "bridge";
  const timberEvery = rng() > 0.55 ? 3 + Math.floor(rng() * 2) : 0;
  const kegs = kindRoll > 0.42 && kindRoll < 0.8 ? 1 + Math.floor(rng() * 2) : 0;
  const merlons = rng() > 0.25;
  const wind = Math.round((rng() - 0.5) * 80) / 100;
  const hp = 0.95 + rng() * 0.35;
  const foe = FOES[seed % FOES.length];
  const skill = 0.4 + (seed % 7) * 0.05;
  const weapon = kegs > 0 && rng() > 0.45 ? "keg" : "roundshot";
  return {
    pattern, cols, rows, arch, bridge, timberEvery, kegs, merlons, hp, wind, foe, skill, weapon,
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
  const layoutSeed = (rngSeed || hashString(String(number))) >>> 0;
  let enemy;
  let wind;
  let name;
  let foe;
  let blurb;
  let par;
  let id;
  let ai;
  let starShot = "";
  let levelNumber = number;

  if (mode === "campaign" && number <= LEVELS.length) {
    const level = LEVELS[number - 1];
    enemy = { ...level.enemy, bannerScale: 1, fixedKegs: true };
    wind = level.wind;
    name = level.name;
    foe = level.foe;
    blurb = level.blurb;
    par = level.par;
    starShot = level.starShot || "";
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
    name = `Second siege · ${spec.foe}`;
    foe = spec.foe;
    blurb = "The eight are down. This keep is remixed, and only Ida plus one crew came back out.";
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
      name = !date || date === localDateString() ? "Today's keep" : `The keep of ${date}`;
      starShot = spec.bridge ? "the timber span" : spec.arch ? "the gold stone" : spec.kegs ? "the casks" : "both feet under the cloth";
      blurb = `${foe} stood up overnight. Ida and one other crew are lent. Fewest shots is the mark.`;
    } else {
      id = `seed-${(rngSeed >>> 0).toString(36)}`;
      name = "Shared keep";
      blurb = `${foe}, raised from a shared seed. The crews are lent.`;
    }
    levelNumber = 0;
  }

  const pspec = playerSpec(safeSave);
  if (levelNumber === 8) pspec.playerFeet = 340;
  const player = placeCastle(pspec, "player", mulberry32((layoutSeed ^ 0x9e3779b9) >>> 0));
  const foeCastle = placeCastle(enemy, "enemy", mulberry32((layoutSeed ^ 0x85ebca6b) >>> 0));
  const blocks = withNeighbors([...player.blocks, ...foeCastle.blocks]);
  seatBannerKegs(blocks, enemy);
  if (mode !== "campaign") braceDailyStandard(blocks);
  thickenPlayerStandard(blocks);
  const lentCrew = ["keg", "harpoon", "boulder"][(layoutSeed >>> 0) % 3];
  let weapons;
  if (mode === "campaign" && levelNumber <= LEVELS.length) weapons = safeSave.weapons.slice();
  else if (mode === "campaign" || mode === "daily") weapons = ["roundshot", lentCrew];
  else weapons = WEAPONS.map((w) => w.id);

  return {
    mode,
    id,
    number: levelNumber,
    name,
    foe,
    blurb,
    par,
    starShot,
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
          const host = banner && blocks.find((b) => (banner.neighbors?.below || []).includes(b.id));
          const foot = host && host.neighbors && host.neighbors.below.includes(target.id);
          const holdsBanner = banner && banner.neighbors && banner.neighbors.below.includes(target.id);
          if (target.material === "banner") score = 1;
          else if (dropsBanner(blocks, target, harm)) score += 140;
          else if (target.material === "keystone" || target.arch) score += 72;
          else if (foot && target.material === "keg") score += 68;
          else if (foot) score += 46;
          else if (holdsBanner) score += 8;
          else if (target.material === "keg") score += 20;
          else if (target.material === "foundation") score += 4;
          else if (target.material === "timber") score += 16;
          else if (under) score += 10;
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

function pointerBlock(point, blocks) {
  let inside = null;
  let insideArea = Infinity;
  let near = null;
  let nearD = Infinity;
  for (const block of blocks) {
    if (!block || block.hp <= 0 || block.material === "banner") continue;
    const dx = Math.abs(point.x - block.x) - block.w / 2;
    const dy = Math.abs(point.y - block.y) - block.h / 2;
    const outside = Math.hypot(Math.max(0, dx), Math.max(0, dy));
    const area = block.w * block.h;
    if (dx <= 0 && dy <= 0 && area < insideArea) {
      inside = block;
      insideArea = area;
    } else if (outside <= 12 && outside < nearD) {
      near = block;
      nearD = outside;
    }
  }
  if (inside) return { block: inside, inside: true };
  if (near) return { block: near, inside: false };
  return null;
}

function rankAim(cannon, point, weapon, blocks, wind, angle, power, wanted, locked) {
  const vel = shotVelocity(weapon, angle, power);
  const pts = integrate(cannon.x, cannon.y, vel.vx, vel.vy, wind, 96, weapon.air);
  const hit = firstHit(pts, blocks, weapon.radius);
  let bestD = Infinity;
  let approach = Infinity;
  const stop = hit ? hit.index : pts.length - 1;
  for (let p = 0; p <= stop; p += 1) {
    const q = pts[p];
    const d = (q.x - point.x) ** 2 + (q.y - point.y) ** 2;
    if (d < bestD) bestD = d;
    if (locked) {
      const gap = Math.hypot(q.x - locked.x, q.y - locked.y);
      if (gap < approach) approach = gap;
    }
  }
  if (hit && hit.type === "block") {
    const dHit = (hit.x - point.x) ** 2 + (hit.y - point.y) ** 2;
    if (dHit < bestD) bestD = dHit;
  }
  const onWanted = Boolean(wanted && hit && hit.id === wanted.id);
  let rank = bestD;
  // A block under the finger wins outright. A rank bonus still let the
  // neighbour take the outline when its arc passed closer to the point.
  if (locked && onWanted) rank = bestD - 1e9;
  else if (locked) rank = bestD + 1e6;
  else if (onWanted) rank -= 10000;
  else if (wanted && hit && hit.type === "block") {
    const struck = blocks.find((b) => b.id === hit.id);
    if (struck && struck.heavy && struck.w >= 48 && wanted.id !== struck.id) rank += 4000;
  }
  if (!locked && onWanted) {
    const beams = blocks.filter((b) => b.heavy && b.w >= 48 && b.id !== wanted.id);
    const skim = pts.slice(0, hit.index).some((q) => beams.some((b) => Math.abs(q.x - b.x) < b.w / 2 + 8 && Math.abs(q.y - b.y) < b.h / 2 + 8));
    if (skim) rank += 6000;
  }
  return { angle, power, distance: bestD, rank, hit, approach };
}

export function aimToward(cannon, point, weapon, blocks, wind, side) {
  const picked = pointerBlock(point, blocks.filter((b) => b.side && b.side !== side));
  const wanted = picked ? picked.block : null;
  const locked = picked && picked.inside ? picked.block : null;
  const angles = angleRange(side, locked ? 36 : (wanted ? 28 : 18));
  const steps = locked ? 14 : (wanted ? 11 : 8);
  let best = null;
  let lockedAim = null;
  const seeds = [];
  for (const angle of angles) {
    for (let i = 0; i < steps; i++) {
      const power = 0.28 + i * (0.72 / (steps - 1));
      const aim = rankAim(cannon, point, weapon, blocks, wind, angle, power, wanted, locked);
      if (locked && aim.hit && aim.hit.id === locked.id) {
        if (!lockedAim || aim.distance < lockedAim.distance) lockedAim = aim;
      }
      if (!best || aim.rank < best.rank) best = aim;
      if (locked) seeds.push(aim);
    }
  }
  // The uniform grid can step over a narrow lane. Refine around the arcs
  // that came closest to the block under the pointer.
  if (locked && !lockedAim && seeds.length) {
    seeds.sort((a, b) => a.approach - b.approach);
    const angleStep = (angles[1] - angles[0]) / 4;
    const powerStep = (0.72 / (steps - 1)) / 3;
    for (const seed of seeds.slice(0, 8)) {
      for (let da = -3; da <= 3; da++) {
        for (let dp = -3; dp <= 3; dp++) {
          const angle = seed.angle + da * angleStep;
          const power = clamp(seed.power + dp * powerStep, 0.28, 1);
          const aim = rankAim(cannon, point, weapon, blocks, wind, angle, power, wanted, locked);
          if (aim.hit && aim.hit.id === locked.id && (!lockedAim || aim.distance < lockedAim.distance)) lockedAim = aim;
        }
      }
      if (lockedAim) break;
    }
  }
  return lockedAim || best;
}

export function starsFor(shots, par, won, clever = false) {
  if (!won) return 0;
  if (shots <= par && clever) return 3;
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

export function recordResult(save, layout, outcome, today = null) {
  const next = structuredClone(save);
  next.stats = { ...next.stats, shots: next.stats.shots + (outcome.shots | 0) };
  if (!outcome.won) {
    next.stats.losses += 1;
    return next;
  }
  next.stats.wins += 1;
  const stars = starsFor(outcome.shots, layout.par, true, outcome.clever === true);
  const prev = next.best[layout.id];
  if (!prev || stars > prev.stars || (stars === prev.stars && outcome.shots < prev.shots)) {
    next.best = { ...next.best, [layout.id]: { stars, shots: outcome.shots } };
  }
  if (layout.mode === "campaign") {
    if (!next.cleared[layout.id]) {
      next.cleared = { ...next.cleared, [layout.id]: true };
      const earned = outcome.rubble | 0;
      next.rubble += layout.number === 1 ? Math.max(earned, FIRST_HIRE) : earned;
    }
    next.unlocked = Math.max(next.unlocked, (layout.number || 1) + 1);
  } else if (layout.mode === "daily") {
    const played = layout.date;
    const recorded = next.daily;
    const older = recorded && recorded.date && played && played < recorded.date;
    if (!older) {
      if (!recorded || recorded.date !== played || recorded.won !== true || outcome.shots < recorded.shots) {
        next.daily = { date: played, shots: outcome.shots, won: true, stars };
      }
    }
    if (played && today && played === today && next.dailyBonusDate !== today) {
      next.dailyBonusDate = today;
      next.rubble += 8;
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

const STONE_WORDS = {
  foundation: "footing",
  stone: "course",
  merlon: "merlon",
  timber: "timber",
  keystone: "gold stone",
  keg: "keg",
};

export function lossLine(blocks, broken) {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const banner = blocks.find((b) => b.side === "player" && b.material === "banner");
  const under = new Set();
  const queue = banner && banner.neighbors ? [...banner.neighbors.below] : [];
  while (queue.length) {
    const id = queue.shift();
    if (under.has(id)) continue;
    under.add(id);
    const block = byId.get(id);
    if (block && block.neighbors) queue.push(...block.neighbors.below);
  }
  const mine = (broken || []).filter((b) => b.side === "player" && b.material !== "banner");
  const support = mine.find((b) => under.has(b.id));
  if (support) return `Your ${STONE_WORDS[support.material] || "stone"} gave way, and the cloth went with it.`;
  if (mine.length) return `They broke ${mine.length} of your stones, and the cloth came down.`;
  return "Their shot shook your cloth loose.";
}

export function shareText(layout, outcome) {
  const stars = "★".repeat(outcome.stars) + "☆".repeat(3 - outcome.stars);
  const shots = `${outcome.shots} ${outcome.shots === 1 ? "shot" : "shots"}`;
  if (!outcome.won) {
    return `Grokstone · ${layout.name} · the standard fell`;
  }
  if (layout.mode === "daily") {
    return `Grokstone · daily ${layout.date} · ${shots} ${stars}`;
  }
  return `Grokstone · ${layout.name} · ${shots} ${stars}`;
}

export function hashFor(layout) {
  if (!layout) return "";
  if (layout.mode === "daily") {
    return layout.date && /^\d{4}-\d{2}-\d{2}$/.test(layout.date) ? `#daily=${layout.date}` : "#daily";
  }
  if (layout.mode === "seed") return `#s=${(layout.seed >>> 0).toString(36)}`;
  if (layout.mode === "campaign" && layout.number) return `#l=${layout.number}`;
  return "";
}

export function parseHash(hash) {
  const h = String(hash || "").replace(/^#/, "").trim();
  if (!h) return { mode: "campaign" };
  if (h === "daily") return { mode: "daily" };
  const dated = /^daily=(\d{4}-\d{2}-\d{2})$/.exec(h);
  if (dated) return { mode: "daily", date: dated[1] };
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
