// Pure rules for Perigee. No DOM, no clock, no storage side effects.
// Runs are flat objects. Every function returns a new value and leaves its input alone.

export const TAU = Math.PI * 2;

export const TUNING = {
  startOmega: 1.28,
  maxOmega: 5.6,
  omegaGrowth: 0.05,
  startArc: 0.96,
  minArc: 0.11,
  shrinkIntro: 0.012,
  shrinkBase: 0.022,
  shrinkLate: 0.03,
  shrinkFinal: 0.04,
  restore: 0.012,
  perfectRatio: 0.36,
  perfectSlop: 0.02,
  graceTime: 0.028,
  nearMiss: 0.18,
  lockGap: 0.22,
  goodScore: 25,
  perfectBase: 40,
  perfectCombo: 20,
  cashScore: 18,
  relicBonus: 140,
  par: 250,
  quietSeconds: 100,
};

export const TRAILS = [
  { id: "ember", name: "Ember", hint: "Yours from the start", test: () => true },
  { id: "pearl", name: "Pearl", hint: "Best 400", test: (s) => s.best >= 400 },
  { id: "comet", name: "Comet", hint: "Best 1,600 or 3 relics", test: (s) => s.relics >= 3 || s.best >= 1600 },
  { id: "brass", name: "Brass", hint: "80 flings or 2 rift perfects", test: (s) => s.riftPerfects >= 2 || s.lifetimeFlings >= 80 },
  { id: "aurora", name: "Aurora", hint: "A 3-day streak", test: (s) => s.bestStreak >= 3 || s.streak >= 3 },
  { id: "tideglass", name: "Tideglass", hint: "A second night", test: (s) => s.nightsCleared >= 2 || s.bestStreak >= 2 || s.streak >= 2 },
];

export const TRAIL_LOOK = {
  ember: { core: "#ffe1a8", glow: "#ff8a3d" },
  pearl: { core: "#ffffff", glow: "#8ecbff" },
  comet: { core: "#e7f4ff", glow: "#7aa2ff" },
  brass: { core: "#ffe7a3", glow: "#e0b03a" },
  aurora: { core: "#e9fff6", glow: "#3ee0b0" },
  tideglass: { core: "#e7fff8", glow: "#5ee0c5" },
};

export const MOONS = [
  { id: "cinder", name: "Cinder", hint: "The first moon", test: () => true },
  { id: "glass", name: "Glass", hint: "Five perfects in one run", test: (s) => s.bestPerfects >= 5 },
  { id: "tide", name: "Tide", hint: "Clear a nightly goal", test: (s) => s.nightsCleared >= 1 },
  { id: "wick", name: "Wick", hint: "Cash an echo, then perfect a later gold", test: (s) => s.echoMastered },
  { id: "crown", name: "Crown", hint: "Catch a relic core", test: (s) => s.relics >= 1 },
  { id: "iris", name: "Iris", hint: "A 3-day streak", test: (s) => s.bestStreak >= 3 },
  { id: "hollow", name: "Hollow", hint: "Perfect a rift", test: (s) => s.riftPerfects >= 1 },
  { id: "dusk", name: "Dusk", hint: "Come back on a fourth day", test: (s) => (s.days || []).length >= 4 },
  { id: "choir", name: "Choir", hint: "Clear three different nightly goals", test: (s) => (s.goalKinds || []).length >= 3 },
];

export const MOON_LOOK = {
  cinder: { core: "#ffe1a8", glow: "#ff8a3d", shade: "#b86a3a" },
  glass: { core: "#f4fbff", glow: "#9fd4ff", shade: "#6d94b8" },
  tide: { core: "#d9fff4", glow: "#3ecfb2", shade: "#1d7a78" },
  wick: { core: "#fff1d2", glow: "#ffb020", shade: "#c47a28" },
  crown: { core: "#fff8dc", glow: "#ffe27a", shade: "#c4922e" },
  iris: { core: "#f6e6ff", glow: "#c084fc", shade: "#7c4db5" },
  hollow: { core: "#ececf6", glow: "#9aa4c7", shade: "#3a4158" },
  dusk: { core: "#ffd0c8", glow: "#ff6b6b", shade: "#a33b4a" },
  choir: { core: "#ffffff", glow: "#ffffff", shade: "#b9a6e8", rainbow: true },
};

export const THEMES = [
  { id: "dusk", name: "Dusk", hint: "The opening sky", test: () => true },
  { id: "harbor", name: "Harbor", hint: "Clear a nightly goal", test: (s) => s.nightsCleared >= 1 },
  { id: "ember", name: "Ember", hint: "A combo of 6", test: (s) => s.bestCombo >= 6 },
  { id: "aurora", name: "Aurora", hint: "A 5-day streak", test: (s) => s.bestStreak >= 5 },
  { id: "ink", name: "Ink", hint: "Seven different nights", test: (s) => (s.days || []).length >= 7 },
];

export const THEME_LOOK = {
  dusk: { sky0: "#4a2c72", sky1: "#1a102c", sky2: "#09060f", star: "#fff4e4", ring: "#7d649e", brass: "#e7c27a" },
  harbor: { sky0: "#1d5670", sky1: "#0c2233", sky2: "#071018", star: "#e7f7ff", ring: "#4e8eaa", brass: "#d7e6c8" },
  ember: { sky0: "#6a2c18", sky1: "#24100c", sky2: "#0c0705", star: "#ffe6cc", ring: "#c47848", brass: "#ffc14d" },
  aurora: { sky0: "#14584e", sky1: "#0c1c28", sky2: "#070c12", star: "#e9fff8", ring: "#3d9a84", brass: "#d6ffe8" },
  ink: { sky0: "#32343c", sky1: "#14151a", sky2: "#07080a", star: "#f4f4f6", ring: "#9aa0ae", brass: "#f0e2c0" },
};

export const KIND_COPY = {
  steady: { name: "Steady", line: "Gold is safe. The white core builds the chain." },
  wild: { name: "Wild", line: "It surges. Ride the swell into the core." },
  echo: { name: "Echo", line: "Silver cashes out. Gold pays the chain." },
  veil: { name: "Veil", line: "Take the dim gold, or wait for it to ignite." },
  rift: { name: "Rift", line: "It turned around. A perfect opens the arc." },
};

export const SEAL_ORDER = ["score", "perfects", "combo", "echo", "relic", "rift", "veil"];

const NIGHTLY = [
  { id: "score", label: "Score 400 on tonight's orbit", test: (run) => run.mode === "daily" && run.score >= 400 },
  { id: "perfects", label: "Land 6 perfects tonight", test: (run) => run.mode === "daily" && run.perfects >= 6 },
  { id: "combo", label: "Reach a combo of 4 tonight", test: (run) => run.mode === "daily" && run.bestCombo >= 4 },
  { id: "echo", label: "Clear an echo tonight", test: (run) => run.mode === "daily" && run.echoCleared >= 1 },
  { id: "relic", label: "Catch a relic core tonight", test: (run) => run.mode === "daily" && run.relicsBanked >= 1 },
  { id: "rift", label: "Perfect a rift tonight", test: (run) => run.mode === "daily" && run.riftPerfects >= 1 },
  { id: "veil", label: "Ignite 2 veil cores tonight", test: (run) => run.mode === "daily" && run.veilPerfects >= 2 },
];

const FREE = [
  { id: "free-combo", label: "Build a combo of 5", test: (run) => run.bestCombo >= 5 },
  { id: "free-relic", label: "Bank a relic in a free run", test: (run) => run.mode === "free" && run.relicsBanked >= 1 },
  { id: "free-echo", label: "Cash an echo, then perfect a gold", test: (run) => run.echoThenPerfect },
  { id: "free-score", label: "Score 800 in a free run", test: (run) => run.mode === "free" && run.score >= 800 },
];

const CHARM = [
  { id: "two-runs", label: "Finish two runs today", test: (_run, _save, daily) => (daily?.runsToday || 0) >= 2 },
  { id: "kinds", label: "See three orbit kinds in one run", test: (run) => (run.kindsSeen || []).length >= 3 },
  { id: "quiet", label: "Play Quiet hour", test: (run) => run.mode === "quiet" },
];

export const SAVE_KEY = "perigee-v2";
const SAVE_KEY_V1 = "perigee-v1";

export function defaultSave() {
  return {
    best: 0,
    bestFree: 0,
    bestQuiet: 0,
    bestNight: 0,
    bestCombo: 0,
    bestPerfects: 0,
    bestStreak: 0,
    lifetimeFlings: 0,
    lifetimePerfects: 0,
    relics: 0,
    riftPerfects: 0,
    nightsCleared: 0,
    echoMastered: false,
    runs: 0,
    quietUnlocked: false,
    days: [],
    goalKinds: [],
    streak: 0,
    lastStreakDate: null,
    daily: null,
    mute: false,
    motion: "system",
    trail: "ember",
    moon: "cinder",
    theme: "dusk",
    unlocked: ["ember"],
    moons: ["cinder"],
    themes: ["dusk"],
  };
}

export function wrap(angle) {
  const m = angle % TAU;
  return m < 0 ? m + TAU : m;
}

export function angleGrace(omega) {
  const speed = Math.max(0.4, omega);
  const mercy = Math.max(0.012, TUNING.graceTime - Math.max(0, speed - 1.8) * 0.0035);
  return mercy * speed;
}

export function shrinkFor(flings) {
  if (flings < 4) return TUNING.shrinkIntro;
  if (flings >= 36) return TUNING.shrinkFinal;
  if (flings >= 16) return TUNING.shrinkLate;
  return TUNING.shrinkBase;
}

export function nextOmega(omega, mode = "free") {
  const growth = mode === "quiet" ? TUNING.omegaGrowth * 0.45 : TUNING.omegaGrowth;
  const cap = mode === "quiet" ? 3.15 : TUNING.maxOmega;
  return Math.min(cap, omega + growth);
}

export function arcCenterFor(seed, index) {
  const x = Math.sin(seed * 0.017 + (index + 1) * 2.399963) * 43758.5453123;
  const u = x - Math.floor(x);
  return u * TAU;
}

export function kindFor(seed, index) {
  if (index < 3) return "steady";
  if (index === 3) return "wild";
  if (index === 5 || index === 10) return "echo";
  if (index === 8 || index === 15) return "veil";
  if (index === 11 || index === 17) return "rift";
  if (index < 12) return "steady";
  const cycle = ["steady", "wild", "echo", "steady", "veil", "rift", "steady", "echo"];
  return cycle[(index + (seed % 3)) % cycle.length];
}

export function isWild(seed, index) {
  return kindFor(seed, index) === "wild";
}

export function isRelic(index) {
  return index >= 6 && index % 7 === 6;
}

export function leadAngle(omega, arcHalf) {
  const desiredWait = Math.max(0.55, Math.min(1.6, 2.1 / Math.max(1, omega / TUNING.startOmega)));
  let lead = desiredWait * omega;
  const maxLead = TAU - arcHalf * 2 - 0.45;
  if (lead > maxLead) lead = maxLead;
  if (lead < 0.85) lead = 0.85;
  return lead;
}

export function omegaAt(omega, progress, startTheta, wild) {
  if (!wild) return omega;
  const theta = startTheta + progress;
  const swing = omega > 3.3 ? 0.42 : 0.32;
  return Math.max(0.35, omega * (1 + swing * Math.sin(theta * 2)));
}

export function planetHue(seed, flings) {
  return (seed + flings * 23) % 360;
}

export function multiplierFor(combo) {
  return Math.min(3, 1 + Math.floor(Math.max(0, combo) / 3));
}

export function lockProgress(run) {
  const grace = angleGrace(run.omega);
  const earliestEarly = run.entryP - grace - TUNING.lockGap;
  return Math.max(0, Math.min(run.entryP * 0.48, earliestEarly));
}

export function coreLit(run) {
  if (!run || run.kind !== "veil") return true;
  return run.progress >= run.centerP - run.perfectHalf - 0.02;
}

export function goldWindowSeconds(run) {
  return (run.exitP - run.entryP) / Math.max(0.35, run.omega);
}

function placeEcho(entryP, lock, arcHalf) {
  const gap = 0.24;
  const room = entryP - lock - gap - 0.08;
  const half = Math.min(0.26, Math.max(0.12, room / 2));
  const exit = entryP - gap;
  const entry = exit - half * 2;
  if (!(entry > lock + 0.05) || half < 0.11) return null;
  return { entry, exit, center: (entry + exit) / 2, half };
}

export function zone(run) {
  const grace = angleGrace(run.omega);
  if (run.echo) {
    const eg = grace * 0.45;
    if (run.progress >= run.echo.entry - eg && run.progress <= run.echo.exit + eg) return "echo";
  }
  if (run.progress < run.entryP - grace) return "approach";
  if (run.progress > run.exitP + grace) return "past";
  if (coreLit(run) && Math.abs(run.progress - run.centerP) <= run.perfectHalf + TUNING.perfectSlop) return "perfect";
  return "good";
}

export function viewAngle(run) {
  if (run.rift) return wrap(run.startTheta - run.progress);
  return wrap(run.startTheta + run.progress);
}

function setupWindow(run) {
  let kind = kindFor(run.seed, run.flings);
  const relic = isRelic(run.flings);
  const arcCenter = arcCenterFor(run.seed, run.flings);
  let ratio = TUNING.perfectRatio;
  if (kind === "veil") ratio = 0.24;
  if (relic) ratio = Math.min(ratio, 0.28);
  const perfectHalf = run.arcHalf * ratio;
  const lead = leadAngle(run.omega, run.arcHalf);
  const entryP = lead;
  const centerP = lead + run.arcHalf;
  const exitP = lead + run.arcHalf * 2;
  const grace = angleGrace(run.omega);
  const lock = Math.max(0, Math.min(entryP * 0.48, entryP - grace - TUNING.lockGap));
  let echo = null;
  if (kind === "echo") {
    echo = placeEcho(entryP, lock, run.arcHalf);
    if (!echo) kind = "steady";
  }
  const rift = kind === "rift";
  const startTheta = rift
    ? wrap(arcCenter + run.arcHalf + lead)
    : wrap(arcCenter - run.arcHalf - lead);
  const seen = run.kindsSeen || [];
  const kindsSeen = seen.includes(kind) ? seen : [...seen, kind];
  return {
    ...run,
    kind,
    relic,
    wild: kind === "wild",
    rift,
    echo,
    perfectHalf,
    arcCenter,
    startTheta,
    progress: 0,
    entryP,
    centerP,
    exitP,
    kindsSeen,
  };
}

function blankRun(seed, mode) {
  return {
    seed,
    mode,
    flings: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    perfects: 0,
    goods: 0,
    cashes: 0,
    arcHalf: TUNING.startArc,
    omega: TUNING.startOmega,
    phase: "playing",
    overReason: null,
    nearMiss: false,
    elapsed: 0,
    relicsBanked: 0,
    riftPerfects: 0,
    veilPerfects: 0,
    echoCleared: 0,
    cashed: false,
    echoThenPerfect: false,
    kindsSeen: [],
  };
}

export function createRun(seed, mode = "free") {
  const clean = (Number(seed) >>> 0) || 1;
  const name = mode === "daily" || mode === "quiet" ? mode : "free";
  return setupWindow(blankRun(clean, name));
}

function fail(run, reason, nearMiss) {
  return { ...run, phase: "over", overReason: reason, nearMiss: !!nearMiss };
}

function succeed(run, kind) {
  const perfect = kind === "perfect";
  const cash = kind === "cash";
  const combo = perfect ? run.combo + 1 : 0;
  const mult = multiplierFor(perfect ? combo : 0);
  const steps = Math.min(4, Math.max(0, combo - 1));
  const base = cash
    ? TUNING.cashScore
    : perfect
      ? TUNING.perfectBase + steps * TUNING.perfectCombo
      : TUNING.goodScore;
  let scoreGain = base * mult;
  const relicHit = !!(perfect && run.relic);
  if (relicHit) scoreGain += TUNING.relicBonus;
  let arcHalf = run.arcHalf;
  if (run.mode !== "quiet") {
    arcHalf -= shrinkFor(run.flings);
    if (perfect) arcHalf += TUNING.restore + (run.kind === "rift" ? 0.022 : 0);
    arcHalf = Math.min(TUNING.startArc, Math.max(TUNING.minArc, arcHalf));
  }
  const milestone = perfect && combo > 0 && combo % 3 === 0;
  const next = {
    ...run,
    score: run.score + scoreGain,
    combo,
    bestCombo: Math.max(run.bestCombo, combo),
    perfects: run.perfects + (perfect ? 1 : 0),
    goods: run.goods + (!perfect && !cash ? 1 : 0),
    cashes: (run.cashes || 0) + (cash ? 1 : 0),
    flings: run.flings + 1,
    arcHalf,
    omega: nextOmega(run.omega, run.mode),
    relicsBanked: run.relicsBanked + (relicHit ? 1 : 0),
    riftPerfects: run.riftPerfects + (perfect && run.kind === "rift" ? 1 : 0),
    veilPerfects: run.veilPerfects + (perfect && run.kind === "veil" ? 1 : 0),
    echoCleared: run.echoCleared + (run.kind === "echo" ? 1 : 0),
    cashed: run.cashed || cash,
    echoThenPerfect: run.echoThenPerfect || (perfect && run.cashed),
  };
  return { run: setupWindow(next), scoreGain, milestone, relicHit, mult };
}

export function fling(run) {
  if (!run || run.phase !== "playing") return { run, event: null };
  const grace = angleGrace(run.omega);
  const p = run.progress;
  if (run.echo) {
    const eg = grace * 0.45;
    const inSilver = p >= run.echo.entry - eg && p <= run.echo.exit + eg;
    const inGap = p > run.echo.exit + eg && p < run.entryP - grace;
    if (inSilver || inGap) {
      const { run: next, scoreGain } = succeed(run, "cash");
      return { run: next, event: { type: "cash", scoreGain, nearMiss: false, kind: "echo", late: inGap } };
    }
  }
  if (p < lockProgress(run)) return { run, event: { type: "wait" } };
  if (p < run.entryP - grace) {
    const nearMiss = p > run.entryP - grace - TUNING.nearMiss;
    const gap = !!(run.echo && p > run.echo.exit);
    const next = fail(run, gap ? "gap" : "early", nearMiss);
    return { run: next, event: { type: "miss", reason: next.overReason, nearMiss, scoreGain: 0 } };
  }
  if (p > run.exitP + grace) {
    const next = fail(run, "late", true);
    return { run: next, event: { type: "miss", reason: "late", nearMiss: true, scoreGain: 0 } };
  }
  const perfect = coreLit(run) && Math.abs(p - run.centerP) <= run.perfectHalf + TUNING.perfectSlop;
  const { run: next, scoreGain, milestone, relicHit, mult } = succeed(run, perfect ? "perfect" : "good");
  return {
    run: next,
    event: { type: perfect ? "perfect" : "good", scoreGain, nearMiss: false, milestone, relicHit, mult },
  };
}

export function step(run, dt) {
  if (!run || run.phase !== "playing") return { run, event: null };
  if (!(dt > 0)) return { run, event: null };
  const capped = Math.min(dt, 0.05);
  let progress = run.progress;
  let left = capped;
  while (left > 0) {
    const h = Math.min(0.008, left);
    progress += omegaAt(run.omega, progress, run.startTheta, run.wild) * h;
    left -= h;
  }
  const moved = { ...run, progress, elapsed: run.elapsed + capped };
  if (run.mode === "quiet" && moved.elapsed >= TUNING.quietSeconds) {
    const next = { ...moved, phase: "over", overReason: "hour", nearMiss: false };
    return { run: next, event: { type: "hour", reason: "hour", nearMiss: false, scoreGain: 0 } };
  }
  const grace = angleGrace(run.omega);
  if (progress > run.exitP + grace) {
    const nearMiss = progress < run.exitP + grace + TUNING.nearMiss;
    const next = fail(moved, "overshot", nearMiss);
    return { run: next, event: { type: "miss", reason: "overshot", nearMiss, scoreGain: 0 } };
  }
  return { run: moved, event: null };
}

export function dailySeed(dateStr) {
  let h = 2166136261;
  const s = String(dateStr);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dayIndex(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function prevDate(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export function nextDate(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

export function missionsFor(dateStr, save = null) {
  const i = dayIndex(dateStr);
  const nightly = NIGHTLY[((i % NIGHTLY.length) + NIGHTLY.length) % NIGHTLY.length];
  const free = FREE[((i % FREE.length) + FREE.length) % FREE.length];
  let charm = CHARM[((i % CHARM.length) + CHARM.length) % CHARM.length];
  if (charm.id === "quiet" && save && !save.quietUnlocked) {
    charm = CHARM[0];
  }
  return { nightly, free, charm };
}

export function missionLine(save, today, mode) {
  const board = missionsFor(today, save);
  const done = save.daily && save.daily.date === today ? save.daily.done || {} : {};
  if (mode === "daily" && !done.nightly) return board.nightly.label;
  if (!done.free) return board.free.label;
  if (!done.charm) return board.charm.label;
  return "Today's slate is clear";
}

export function expireStreak(save, today) {
  if (!save.lastStreakDate) return save;
  if (save.lastStreakDate === today || save.lastStreakDate === prevDate(today)) return save;
  return { ...save, streak: 0, lastStreakDate: null };
}

export function registerDaily(save, dateStr, score, par = TUNING.par) {
  const prev = save.daily && save.daily.date === dateStr
    ? save.daily
    : { date: dateStr, best: 0, cleared: false };
  const daily = {
    ...prev,
    date: dateStr,
    best: Math.max(prev.best || 0, score),
    cleared: !!prev.cleared || score >= par,
  };
  let streak = save.streak;
  let lastStreakDate = save.lastStreakDate;
  if (score >= par && lastStreakDate !== dateStr) {
    streak = lastStreakDate === prevDate(dateStr) ? streak + 1 : 1;
    lastStreakDate = dateStr;
  }
  return { ...save, daily, streak, lastStreakDate, bestStreak: Math.max(save.bestStreak || 0, streak) };
}

function applyMissions(save, run, today) {
  const board = missionsFor(today, save);
  const prev = save.daily && save.daily.date === today
    ? save.daily
    : { date: today, best: 0, cleared: !!save.daily?.cleared && save.daily?.date === today, runsToday: 0, done: {} };
  const daily = {
    ...prev,
    date: today,
    runsToday: (prev.runsToday || 0) + 1,
    goals: { nightly: board.nightly.id, free: board.free.id, charm: board.charm.id },
  };
  const done = { ...(prev.done || {}) };
  if (!done.nightly && board.nightly.test(run, save, daily)) done.nightly = true;
  if (!done.free && board.free.test(run, save, daily)) done.free = true;
  if (!done.charm && board.charm.test(run, save, daily)) done.charm = true;
  daily.done = done;
  let next = { ...save, daily };
  if (done.nightly && next.lastStreakDate !== today) {
    const streak = next.lastStreakDate === prevDate(today) ? next.streak + 1 : 1;
    next = { ...next, streak, lastStreakDate: today, bestStreak: Math.max(next.bestStreak || 0, streak), daily: { ...daily, cleared: true } };
  }
  if (done.nightly) {
    const kinds = new Set(next.goalKinds || []);
    kinds.add(board.nightly.id);
    next = {
      ...next,
      nightsCleared: (next.nightsCleared || 0) + (prev.done && prev.done.nightly ? 0 : 1),
      goalKinds: [...kinds],
    };
  }
  return next;
}

function grant(save) {
  const primed = { ...save, bestStreak: Math.max(save.bestStreak || 0, save.streak || 0) };
  const trails = new Set(primed.unlocked || []);
  trails.add("ember");
  for (const trail of TRAILS) if (trail.test(primed)) trails.add(trail.id);
  const moons = new Set(primed.moons || []);
  moons.add("cinder");
  for (const moon of MOONS) if (moon.test(primed)) moons.add(moon.id);
  const themes = new Set(primed.themes || []);
  themes.add("dusk");
  for (const theme of THEMES) if (theme.test(primed)) themes.add(theme.id);
  return {
    ...primed,
    unlocked: TRAILS.map((t) => t.id).filter((id) => trails.has(id)),
    moons: MOONS.map((m) => m.id).filter((id) => moons.has(id)),
    themes: THEMES.map((t) => t.id).filter((id) => themes.has(id)),
    quietUnlocked: !!(primed.quietUnlocked || primed.runs >= 3),
  };
}

export function withUnlocks(save) {
  return grant(save);
}

export function isUnlocked(save, id) {
  return Array.isArray(save.unlocked) && save.unlocked.includes(id);
}

export function newlyUnlocked(before, after) {
  const had = new Set(before.unlocked || []);
  return (after.unlocked || []).filter((id) => !had.has(id));
}

export function freshUnlocks(before, after) {
  const diff = (key) => (after[key] || []).filter((id) => !(before[key] || []).includes(id));
  return {
    moons: diff("moons"),
    trails: diff("unlocked"),
    themes: diff("themes"),
    quiet: !before.quietUnlocked && !!after.quietUnlocked,
  };
}

export function selectTrail(save, id) {
  if (!isUnlocked(save, id) || !TRAIL_LOOK[id]) return save;
  return { ...save, trail: id };
}

export function selectMoon(save, id) {
  if (!MOON_LOOK[id] || !(save.moons || []).includes(id)) return save;
  return { ...save, moon: id };
}

export function selectTheme(save, id) {
  if (!THEME_LOOK[id] || !(save.themes || []).includes(id)) return save;
  return { ...save, theme: id };
}

function finite(n, fallback) {
  return Number.isFinite(n) ? n : fallback;
}

function asList(value, allowed) {
  if (!Array.isArray(value)) return [];
  return value.filter((id) => allowed.has(id));
}

export function sanitizeSave(raw) {
  const base = defaultSave();
  if (!raw || typeof raw !== "object") return base;
  const motion = raw.motion === "reduce" || raw.motion === "full" || raw.motion === "system" ? raw.motion : "system";
  const trail = TRAIL_LOOK[raw.trail] ? raw.trail : "ember";
  const moon = MOON_LOOK[raw.moon] ? raw.moon : "cinder";
  const theme = THEME_LOOK[raw.theme] ? raw.theme : "dusk";
  const daily = raw.daily && typeof raw.daily === "object" && /^\d{4}-\d{2}-\d{2}$/.test(raw.daily.date)
    ? {
      date: raw.daily.date,
      best: Math.max(0, finite(raw.daily.best, 0)),
      cleared: !!raw.daily.cleared,
      runsToday: Math.max(0, finite(raw.daily.runsToday, 0)),
      done: {
        nightly: !!raw.daily.done?.nightly,
        free: !!raw.daily.done?.free,
        charm: !!raw.daily.done?.charm,
      },
      goals: raw.daily.goals && typeof raw.daily.goals === "object" ? {
        nightly: String(raw.daily.goals.nightly || ""),
        free: String(raw.daily.goals.free || ""),
        charm: String(raw.daily.goals.charm || ""),
      } : null,
    }
    : null;
  const trailIds = new Set(TRAILS.map((t) => t.id));
  const moonIds = new Set(MOONS.map((m) => m.id));
  const themeIds = new Set(THEMES.map((t) => t.id));
  let unlocked = asList(raw.unlocked, trailIds);
  if (!unlocked.includes("ember")) unlocked = ["ember", ...unlocked];
  let moons = asList(raw.moons, moonIds);
  if (!moons.includes("cinder")) moons = ["cinder", ...moons];
  let themes = asList(raw.themes, themeIds);
  if (!themes.includes("dusk")) themes = ["dusk", ...themes];
  const days = Array.isArray(raw.days) ? raw.days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-21) : [];
  const goalKinds = Array.isArray(raw.goalKinds) ? raw.goalKinds.filter((id) => NIGHTLY.some((g) => g.id === id)) : [];
  return {
    ...base,
    best: Math.max(0, finite(raw.best, 0)),
    bestFree: Math.max(0, finite(raw.bestFree, 0)),
    bestQuiet: Math.max(0, finite(raw.bestQuiet, 0)),
    bestNight: Math.max(0, finite(raw.bestNight, 0)),
    bestCombo: Math.max(0, finite(raw.bestCombo, 0)),
    bestPerfects: Math.max(0, finite(raw.bestPerfects, 0)),
    bestStreak: Math.max(0, finite(raw.bestStreak, 0)),
    lifetimeFlings: Math.max(0, finite(raw.lifetimeFlings, 0)),
    lifetimePerfects: Math.max(0, finite(raw.lifetimePerfects, 0)),
    relics: Math.max(0, finite(raw.relics, 0)),
    riftPerfects: Math.max(0, finite(raw.riftPerfects, 0)),
    nightsCleared: Math.max(0, finite(raw.nightsCleared, 0)),
    echoMastered: !!raw.echoMastered,
    runs: Math.max(0, finite(raw.runs, 0)),
    quietUnlocked: !!raw.quietUnlocked,
    days,
    goalKinds,
    streak: Math.max(0, finite(raw.streak, 0)),
    lastStreakDate: /^\d{4}-\d{2}-\d{2}$/.test(raw.lastStreakDate || "") ? raw.lastStreakDate : null,
    daily,
    mute: !!raw.mute,
    motion,
    trail,
    moon,
    theme,
    unlocked,
    moons,
    themes,
  };
}

export function coerceSave(raw, today) {
  return expireStreak(grant(sanitizeSave(raw)), today);
}

export function settleRun(save, run, today) {
  const before = coerceSave(save, today);
  const mode = run.mode === "daily" || run.mode === "quiet" ? run.mode : "free";
  let next = {
    ...before,
    best: Math.max(before.best, run.score),
    bestFree: mode === "free" ? Math.max(before.bestFree || 0, run.score) : (before.bestFree || 0),
    bestQuiet: mode === "quiet" ? Math.max(before.bestQuiet || 0, run.score) : (before.bestQuiet || 0),
    bestNight: mode === "daily" ? Math.max(before.bestNight || 0, run.score) : (before.bestNight || 0),
    bestCombo: Math.max(before.bestCombo, run.bestCombo || 0),
    bestPerfects: Math.max(before.bestPerfects || 0, run.perfects || 0),
    lifetimeFlings: before.lifetimeFlings + (run.flings || 0),
    lifetimePerfects: before.lifetimePerfects + (run.perfects || 0),
    relics: (before.relics || 0) + (run.relicsBanked || 0),
    riftPerfects: (before.riftPerfects || 0) + (run.riftPerfects || 0),
    echoMastered: before.echoMastered || !!run.echoThenPerfect,
    runs: (before.runs || 0) + 1,
    days: (before.days || []).includes(today) ? before.days : [...(before.days || []), today],
  };
  if (mode === "daily") next = registerDaily(next, today, run.score, TUNING.par);
  next = applyMissions(next, run, today);
  next = grant(next);
  const fresh = freshUnlocks(before, next);
  const record = mode === "quiet" ? "bestQuiet" : mode === "daily" ? "bestNight" : "best";
  return {
    save: next,
    unlocked: newlyUnlocked(before, next),
    fresh,
    isBest: run.score > (before[record] || 0) && run.score > 0,
    missions: next.daily && next.daily.date === today ? next.daily.done : null,
  };
}

export function loadSave(storage, today) {
  try {
    const raw = storage.getItem(SAVE_KEY) || storage.getItem(SAVE_KEY_V1);
    if (!raw) return coerceSave(null, today);
    return coerceSave(JSON.parse(raw), today);
  } catch {
    return coerceSave(null, today);
  }
}

export function writeSave(storage, save) {
  storage.setItem(SAVE_KEY, JSON.stringify(save));
  return save;
}

export function activeStreak(save, today) {
  return expireStreak(save, today).streak;
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

function gauss(rand) {
  const u = Math.max(1e-6, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

function armPlan(run, skill, rand, now) {
  const z = zone(run);
  if (z === "echo") {
    if (skill === "sharp") return null;
    if (skill === "casual" && rand() > 0.32) return null;
    return now + Math.max(0.012, 0.04 + gauss(rand) * 0.025);
  }
  if (z === "perfect") {
    const sigma = skill === "sharp" ? 0.02 : skill === "casual" ? 0.04 : 0.055;
    return now + Math.max(0.008, gauss(rand) * sigma);
  }
  if (z === "good" && skill !== "sharp") {
    const toCenter = Math.max(0, (run.centerP - run.progress) / Math.max(0.4, run.omega));
    const sigma = skill === "novice" ? 0.06 : 0.042;
    const aim = skill === "novice" ? Math.min(0.05, toCenter) : toCenter * 0.92;
    return now + Math.max(0.012, aim + gauss(rand) * sigma);
  }
  return null;
}

export function playRun(seed, mode, skill, rand = Math.random) {
  let run = createRun(seed, mode);
  let t = 0;
  const dt = 1 / 90;
  let plan = null;
  while (t < 150 && run.phase === "playing") {
    if (plan == null) plan = armPlan(run, skill, rand, t);
    if (plan != null && t >= plan) {
      const res = fling(run);
      plan = null;
      if (res.event && res.event.type !== "wait") {
        run = res.run;
        if (run.phase !== "playing") break;
      }
    } else {
      run = step(run, dt).run;
      if (run.phase !== "playing") break;
    }
    t += dt;
  }
  const cruel = run.phase === "over"
    && run.overReason !== "hour"
    && run.flings < 10
    && goldWindowSeconds(run) < 0.06;
  return { run, cruel: !!cruel };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[i];
}

export function summarizeRuns(rows) {
  const times = rows.map((r) => r.elapsed).sort((a, b) => a - b);
  const scores = rows.map((r) => r.score).sort((a, b) => a - b);
  const reasons = {};
  let near = 0;
  let early = 0;
  let cruel = 0;
  let cashes = 0;
  for (const row of rows) {
    const key = row.reason || "live";
    reasons[key] = (reasons[key] || 0) + 1;
    if (row.nearMiss) near += 1;
    if ((row.flings || 0) < 4 && row.reason && row.reason !== "hour") early += 1;
    if (row.cruel) cruel += 1;
    cashes += row.cashes || 0;
  }
  const n = rows.length || 1;
  return {
    n: rows.length,
    time: { p10: +percentile(times, 0.1).toFixed(1), p50: +percentile(times, 0.5).toFixed(1), p90: +percentile(times, 0.9).toFixed(1) },
    score: { p10: Math.round(percentile(scores, 0.1)), p50: Math.round(percentile(scores, 0.5)), p90: Math.round(percentile(scores, 0.9)) },
    reasons,
    nearRate: +(near / n).toFixed(3),
    earlyRate: +(early / n).toFixed(3),
    cruelRate: +(cruel / n).toFixed(3),
    cashes,
  };
}

export function sampleSkill(skill, count = 30, mode = "free") {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    const seed = (dailySeed(`${skill}-${mode}-${i}`) ^ (i * 997)) >>> 0;
    const played = playRun(seed || 1, mode, skill, mulberry32(seed || 1));
    const run = played.run;
    rows.push({
      elapsed: run.elapsed,
      score: run.score,
      flings: run.flings,
      perfects: run.perfects,
      reason: run.overReason,
      nearMiss: run.nearMiss,
      cashes: run.cashes,
      relics: run.relicsBanked,
      cruel: played.cruel,
      echo: run.echoCleared,
      combo: run.bestCombo,
    });
  }
  return summarizeRuns(rows);
}

export function simulateWeek(skill, start = "2026-11-10") {
  let save = coerceSave(null, start);
  let date = start;
  const days = [];
  for (let day = 1; day <= 7; day++) {
    const before = new Set([...(save.moons || []), ...(save.unlocked || []), ...(save.themes || []), save.quietUnlocked ? "quiet" : ""]);
    const board = missionsFor(date, save);
    const modes = ["daily", "free", save.quietUnlocked ? "quiet" : "free"];
    const runs = [];
    modes.forEach((mode, index) => {
      const seed = mode === "daily" ? (dailySeed(date) || 1) : ((dailySeed(`${date}:${mode}:${index}`) || 1) ^ (day * 17));
      const played = playRun(seed >>> 0 || 1, mode, skill, mulberry32((seed ^ (index * 101)) >>> 0 || 1));
      const settled = settleRun(save, played.run, date);
      save = settled.save;
      runs.push({
        mode,
        score: played.run.score,
        elapsed: +played.run.elapsed.toFixed(1),
        reason: played.run.overReason,
        flings: played.run.flings,
        perfects: played.run.perfects,
      });
    });
    const after = new Set([...(save.moons || []), ...(save.unlocked || []), ...(save.themes || []), save.quietUnlocked ? "quiet" : ""]);
    const gained = [...after].filter((id) => id && !before.has(id));
    days.push({
      day,
      date,
      nightly: board.nightly.id,
      nightlyLabel: board.nightly.label,
      free: board.free.id,
      charm: board.charm.id,
      gained,
      streak: save.streak,
      done: save.daily && save.daily.date === date ? save.daily.done : null,
      runs,
    });
    date = nextDate(date);
  }
  return { days, save };
}
