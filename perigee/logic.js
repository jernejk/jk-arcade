// Pure rules for Perigee. No DOM, no clock, no storage side effects.
// Runs are flat objects. Every function returns a new value and leaves its input alone.

export const TAU = Math.PI * 2;

export const TUNING = {
  startOmega: 2.05,
  maxOmega: 7.2,
  omegaGrowth: 0.055,
  startArc: 0.58,
  minArc: 0.46,
  shrinkIntro: 0.014,
  shrinkBase: 0.016,
  shrinkLate: 0.018,
  shrinkFinal: 0.02,
  restore: 0.016,
  perfectRatio: 0.42,
  perfectSlop: 0.02,
  graceTime: 0.026,
  nearMissMs: 45,
  lockGap: 0.16,
  goodScore: 25,
  perfectBase: 40,
  perfectCombo: 20,
  cashScore: 18,
  relicBonus: 80,
  par: 250,
  quietSeconds: 100,
  course: 30,
};

export const COURSE = TUNING.course;

export const TRAILS = [
  { id: "ember", name: "Ember", hint: "Yours from the start", test: () => true },
  { id: "pearl", name: "Pearl", hint: "Best 1,200", test: (s) => s.best >= 1200 },
  { id: "comet", name: "Comet", hint: "Sixteen relics and three nights", test: (s) => s.relics >= 16 && s.nightsCleared >= 3 },
  { id: "brass", name: "Brass", hint: "Four rift perfects and three nights", test: (s) => s.riftPerfects >= 4 && s.nightsCleared >= 3 },
  { id: "aurora", name: "Aurora", hint: "A 3-day streak", test: (s) => s.bestStreak >= 3 || s.streak >= 3 },
  { id: "tideglass", name: "Tideglass", hint: "A second night", test: (s) => s.nightsCleared >= 2 || s.bestStreak >= 2 || s.streak >= 2 },
  { id: "ion", name: "Ion", hint: "Ten nights in a row", test: (s) => s.bestStreak >= 10 || s.streak >= 10 },
  { id: "halo", name: "Halo", hint: "Fifteen of each kind. An echo bank counts.", test: (s) => ["steady", "wild", "echo", "veil", "rift", "relic"].every((key) => (s.mastery?.[key] || 0) >= 15) },
];

export const TRAIL_LOOK = {
  ember: { core: "#ffe1a8", glow: "#ff8a3d" },
  pearl: { core: "#ffffff", glow: "#8ecbff" },
  comet: { core: "#e7f4ff", glow: "#7aa2ff" },
  brass: { core: "#ffe7a3", glow: "#e0b03a" },
  aurora: { core: "#e9fff6", glow: "#3ee0b0" },
  tideglass: { core: "#e7fff8", glow: "#5ee0c5" },
  ion: { core: "#f4f7ff", glow: "#9eb6ff" },
  halo: { core: "#fff8e4", glow: "#ffe08a" },
};

export const MOONS = [
  { id: "cinder", name: "Cinder", hint: "The first moon", test: () => true },
  { id: "glass", name: "Glass", hint: "Eight perfects in one run", test: (s) => s.bestPerfects >= 8 },
  { id: "tide", name: "Tide", hint: "Earn a nightly star", test: (s) => s.nightsCleared >= 1 },
  { id: "wick", name: "Wick", hint: "Bank an echo, then perfect later", test: (s) => s.echoMastered },
  { id: "crown", name: "Crown", hint: "Twenty-four relics", test: (s) => s.relics >= 24 && s.nightsCleared >= 4 },
  { id: "iris", name: "Iris", hint: "A 3-day streak", test: (s) => s.bestStreak >= 3 },
  { id: "hollow", name: "Hollow", hint: "Three rift perfects, two nights", test: (s) => s.riftPerfects >= 3 && s.nightsCleared >= 2 },
  { id: "dusk", name: "Dusk", hint: "Twelve different days", test: (s) => (s.days || []).length >= 12 },
  { id: "choir", name: "Choir", hint: "All seven seals", test: (s) => (s.goalKinds || []).length >= 7 },
  { id: "lyre", name: "Lyre", hint: "Fourteen nights", test: (s) => s.nightsCleared >= 14 },
  { id: "solstice", name: "Solstice", hint: "Every seal, and ten nights", test: (s) => (s.goalKinds || []).length >= 7 && s.nightsCleared >= 10 },
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
  lyre: { core: "#ffe7c2", glow: "#ffb15a", shade: "#a85a28" },
  solstice: { core: "#fff6d4", glow: "#ffe08a", shade: "#c47a28" },
};

export const THEMES = [
  { id: "dusk", name: "Dusk", hint: "The opening sky", test: () => true },
  { id: "harbor", name: "Harbor", hint: "Two nightly stars", test: (s) => s.nightsCleared >= 2 },
  { id: "ember", name: "Ember", hint: "A combo of 8", test: (s) => s.bestCombo >= 8 },
  { id: "aurora", name: "Aurora", hint: "A 9-day streak", test: (s) => s.bestStreak >= 9 },
  { id: "ink", name: "Ink", hint: "Fourteen different days", test: (s) => (s.days || []).length >= 14 },
  { id: "deep", name: "Deep", hint: "Three weeks of sky", test: (s) => (s.days || []).length >= 21 },
  { id: "gilt", name: "Gilt", hint: "A flawless Tonight", test: (s) => !!s.flawless },
];

export const THEME_LOOK = {
  dusk: { sky0: "#4a2c72", sky1: "#1a102c", sky2: "#09060f", star: "#fff4e4", ring: "#7d649e", brass: "#e7c27a" },
  harbor: { sky0: "#1d5670", sky1: "#0c2233", sky2: "#071018", star: "#e7f7ff", ring: "#4e8eaa", brass: "#d7e6c8" },
  ember: { sky0: "#6a2c18", sky1: "#24100c", sky2: "#0c0705", star: "#ffe6cc", ring: "#c47848", brass: "#ffc14d" },
  aurora: { sky0: "#14584e", sky1: "#0c1c28", sky2: "#070c12", star: "#e9fff8", ring: "#3d9a84", brass: "#d6ffe8" },
  ink: { sky0: "#32343c", sky1: "#14151a", sky2: "#07080a", star: "#f4f4f6", ring: "#9aa0ae", brass: "#f0e2c0" },
  deep: { sky0: "#1a2048", sky1: "#0a0c18", sky2: "#04060c", star: "#e8eeff", ring: "#6a78b4", brass: "#d7def8" },
  gilt: { sky0: "#6a4818", sky1: "#24180c", sky2: "#100c06", star: "#fff4d2", ring: "#e0b03a", brass: "#ffe7a3" },
};

export const KIND_COPY = {
  steady: { name: "Steady", line: "Gold is safe. The white core builds the chain." },
  wild: { name: "Wild", line: "It surges. Ride the swell into the core." },
  echo: { name: "Echo", line: "Silver banks the pot. A miss loses whatever is still at risk." },
  veil: { name: "Veil", line: "The white core sits off to one side." },
  rift: { name: "Rift", line: "It will turn around. Gold stays gold." },
  relic: { name: "Relic", line: "The core slides. Stay with it." },
};

export const SEAL_ORDER = ["score", "perfects", "combo", "echo", "relic", "rift", "veil"];

const NIGHTLY = [
  { id: "score", label: "Score 500 tonight", test: (run) => run.mode === "daily" && run.score >= 500 },
  { id: "perfects", label: "Land 8 perfects tonight", test: (run) => run.mode === "daily" && run.perfects >= 8 },
  { id: "combo", label: "Reach a combo of 4 tonight", test: (run) => run.mode === "daily" && run.bestCombo >= 4 },
  { id: "echo", label: "Clear 2 echoes tonight", test: (run) => run.mode === "daily" && run.echoCleared >= 2 },
  { id: "relic", label: "Catch 2 relics tonight", test: (run) => run.mode === "daily" && run.relicsBanked >= 2 },
  { id: "rift", label: "Perfect 2 rifts tonight", test: (run) => run.mode === "daily" && run.riftPerfects >= 2 },
  { id: "veil", label: "Ignite 3 veil cores tonight", test: (run) => run.mode === "daily" && run.veilPerfects >= 3 },
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
    bestFlings: 0,
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
    mastery: { steady: 0, wild: 0, echo: 0, veil: 0, rift: 0, relic: 0 },
    runs: 0,
    quietUnlocked: false,
    days: [],
    nights: [],
    flawless: false,
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

const KIND_POOL = ["steady", "wild", "echo", "veil", "rift", "relic"];

function unit(seed, index, salt) {
  const x = Math.sin((seed + 1) * 0.017 + (index + 1) * salt) * 43758.5453123;
  return x - Math.floor(x);
}

const GOAL_QUOTA = { veil: 10, echo: 8, rift: 8, relic: 8 };

export function goalSlots(seed, goalId) {
  const quota = GOAL_QUOTA[goalId] || 0;
  const chosen = new Set();
  if (!quota) return chosen;
  let n = (seed ^ (goalId.charCodeAt(0) * 131)) >>> 0;
  let guard = 0;
  while (chosen.size < quota && guard < 400) {
    n = (Math.imul(n, 1664525) + 1013904223 + guard) >>> 0;
    chosen.add(1 + (n % (COURSE - 1)));
    guard += 1;
  }
  return chosen;
}

export function kindFor(seed, index, goalId = null) {
  if (index <= 0) return "steady";
  if (goalId && GOAL_QUOTA[goalId] && goalSlots(seed, goalId).has(index)) return goalId;
  if (index % 6 === 5 && goalId !== "echo") return "echo";
  const pool = (index < 2 ? ["wild", "echo", "veil", "rift"] : KIND_POOL).filter((kind) => kind !== goalId);
  return pool[Math.floor(unit(seed, index, 2.31) * pool.length) % pool.length];
}

export function orbitsUntilEcho(seed, index, goalId = null) {
  for (let step = 1; step <= 8; step++) {
    if (kindFor(seed, index + step, goalId) === "echo") return step;
  }
  return 8;
}

export function waitSeconds(seed, index) {
  const u = unit(seed, index, 1.71);
  if (index <= 0) return 0.52 + u * 0.28;
  const max = Math.max(0.78, 1.55 - index * 0.01);
  return 0.42 + u * (max - 0.42);
}

export function isWild(seed, index) {
  return kindFor(seed, index) === "wild";
}

export function isRelic(seed, index) {
  if (typeof index !== "number") return false;
  return kindFor(seed, index) === "relic";
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
  const n = Math.max(0, combo);
  if (n >= 20) return 5;
  if (n >= 12) return 4;
  if (n >= 6) return 3;
  if (n >= 3) return 2;
  return 1;
}

export function coreProgress(run) {
  if (!run) return 0;
  if (run.kind !== "relic") return run.centerP;
  const span = Math.max(0.02, run.arcHalf - run.perfectHalf);
  const slide = Math.sin(run.progress * (run.slideFreq || 2.4) + (run.slidePhase || 0)) * span * 0.9;
  const lo = run.entryP + run.perfectHalf;
  const hi = run.exitP - run.perfectHalf;
  return Math.max(lo, Math.min(hi, run.centerP + slide));
}

export function missText(event) {
  if (!event) return "Drifted";
  const ms = Math.abs(event.ms || 0);
  if (event.reason === "clear") return "Course clear";
  if (event.reason === "hour") return "The hour closes";
  if (event.reason === "overshot") return "Slipped past";
  if (event.reason === "late") return event.nearMiss ? `So close · ${ms} ms late` : `${ms} ms late`;
  if (event.reason === "early") return event.nearMiss ? `So close · ${ms} ms early` : `${ms} ms early`;
  if (event.reason === "gap") return "Between the arcs";
  return "Drifted";
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

export function perfectWindowSeconds(run) {
  return (2 * (run.perfectHalf || 0)) / Math.max(0.35, run.omega);
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
  if (Math.abs(run.progress - coreProgress(run)) <= run.perfectHalf + TUNING.perfectSlop) return "perfect";
  return "good";
}

export function viewAngle(run) {
  return wrap((run.startTheta || 0) + (run.dir || 1) * (run.progress || 0));
}

function setupWindow(run, opts = {}) {
  const kind = opts.keepKind ? run.kind : kindFor(run.seed, run.flings, run.goalId);
  const relic = kind === "relic";
  let ratio = TUNING.perfectRatio;
  if (kind === "veil") ratio = 0.34;
  if (relic) ratio = 0.3;
  let arcHalf = run.arcHalf;
  if (run.mode !== "quiet" && (run.flings || 0) > 155) {
    arcHalf = Math.max(0.18, run.arcHalf - ((run.flings || 0) - 155) * 0.007);
  }
  if ((run.flings || 0) > 90 && run.omega >= TUNING.maxOmega - 0.08) {
    ratio = Math.max(0.3, ratio - ((run.flings || 0) - 90) * 0.0011);
  }
  let perfectHalf = arcHalf * ratio;
  const floorHalf = (0.035 * Math.max(0.4, run.omega)) / 2;
  if (perfectHalf < floorHalf) perfectHalf = Math.min(floorHalf, arcHalf * 0.78);
  const maxTravel = Math.max(0.55, TAU - arcHalf * 2 - 0.55);
  let wait = opts.short ? 0.48 + unit(run.seed, run.flings, 0.77) * 0.2 : waitSeconds(run.seed, run.flings);
  if (kind === "echo") wait = Math.max(wait, Math.min(0.72, maxTravel / Math.max(0.4, run.omega)));
  const travel = Math.max(0.36, Math.min(wait * run.omega, maxTravel));
  const entryP = travel;
  const exitP = travel + arcHalf * 2;
  let centerP = travel + arcHalf;
  if (kind === "veil") {
    const span = Math.max(0, arcHalf - perfectHalf);
    const offset = (unit(run.seed, run.flings, 3.17) * 2 - 1) * span * 0.8;
    centerP += offset;
  }
  centerP = Math.max(entryP + perfectHalf, Math.min(exitP - perfectHalf, centerP));
  const grace = angleGrace(run.omega);
  const lock = Math.max(0, Math.min(entryP * 0.42, entryP - grace - TUNING.lockGap));
  let echo = null;
  if (kind === "echo") {
    echo = placeEcho(entryP, lock, arcHalf);
  }
  const dir = opts.keepKind ? -(run.dir || 1) : (run.dir || 1);
  const startTheta = run.startTheta == null ? wrap(unit(run.seed, 0, 4.2) * TAU) : viewAngle(run);
  const arcCenter = wrap(startTheta + dir * centerP);
  const seen = run.kindsSeen || [];
  const kindsSeen = seen.includes(kind) ? seen : [...seen, kind];
  return {
    ...run,
    kind,
    relic,
    wild: kind === "wild" || ((run.flings || 0) > 100 && run.flings % 3 === 0),
    rift: kind === "rift",
    riftFlipped: opts.keepKind ? true : false,
    riftAt: entryP * (0.34 + unit(run.seed, run.flings, 5.1) * 0.18),
    echo: kind === "echo" ? echo : null,
    arcHalf,
    perfectHalf,
    arcCenter,
    startTheta,
    dir,
    progress: 0,
    entryP,
    centerP,
    exitP,
    slideFreq: 2.1 + unit(run.seed, run.flings, 6.3) * 1.6,
    slidePhase: unit(run.seed, run.flings, 7.1) * TAU,
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
    banked: 0,
    pot: 0,
    potLost: 0,
    stars: 0,
    history: [],
    mastery: { steady: 0, wild: 0, echo: 0, veil: 0, rift: 0, relic: 0 },
    dir: 1,
    startTheta: null,
  };
}

export function createRun(seed, mode = "free", goalId = null) {
  const clean = (Number(seed) >>> 0) || 1;
  const name = mode === "daily" || mode === "quiet" || mode === "challenge" ? mode : "free";
  const run = blankRun(clean, name);
  run.goalId = goalId || null;
  return setupWindow(run);
}

function fail(run, reason, nearMiss, ms) {
  return {
    ...run,
    phase: "over",
    overReason: reason,
    nearMiss: !!nearMiss,
    score: run.banked || 0,
    potLost: run.pot || 0,
    pot: 0,
    missMs: ms || 0,
  };
}

function succeed(run, kind) {
  const perfect = kind === "perfect";
  const cash = kind === "cash";
  const combo = perfect ? run.combo + 1 : 0;
  const mult = multiplierFor(perfect ? combo : 0);
  const steps = Math.min(6, Math.max(0, combo - 1));
  const base = cash
    ? TUNING.cashScore
    : perfect
      ? TUNING.perfectBase + steps * TUNING.perfectCombo
      : TUNING.goodScore;
  let scoreGain = base * mult;
  const relicHit = !!(perfect && run.kind === "relic");
  if (relicHit) scoreGain += TUNING.relicBonus;
  const shrink = shrinkFor(run.flings);
  let arcHalf = run.arcHalf;
  if (run.mode !== "quiet") {
    arcHalf -= shrink;
    if (perfect) arcHalf += shrink;
    arcHalf = Math.min(TUNING.startArc, Math.max(TUNING.minArc, arcHalf));
  }
  let pot = run.pot || 0;
  let banked = run.banked || 0;
  if (perfect) pot += scoreGain;
  else if (cash) {
    banked += pot + scoreGain;
    pot = 0;
  } else banked += scoreGain;
  const mastery = { ...(run.mastery || {}) };
  if (perfect) mastery[run.kind] = (mastery[run.kind] || 0) + 1;
  if (cash && run.kind === "echo") mastery.echo = (mastery.echo || 0) + 1;
    const history = [...(run.history || []), { kind: run.kind, result: perfect ? "perfect" : cash ? "cash" : "good" }].slice(-COURSE);
  const milestone = perfect && (combo === 3 || combo === 6 || combo === 12 || combo === 20);
  const next = {
    ...run,
    banked,
    pot,
    score: banked + pot,
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
    mastery,
    history,
  };
  if ((run.mode === "daily" || run.mode === "challenge") && next.flings >= COURSE) {
    const cleared = { ...next, banked: next.banked + next.pot, pot: 0, phase: "over", overReason: "clear", nearMiss: false };
    cleared.score = cleared.banked;
    return { run: cleared, scoreGain, milestone, relicHit, mult };
  }
  return { run: setupWindow(next), scoreGain, milestone, relicHit, mult };
}

function msBetween(run, from, to) {
  const omega = Math.max(0.35, omegaAt(run.omega, run.progress, run.startTheta, run.wild));
  return Math.round(((to - from) / omega) * 1000);
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
      const { run: next, scoreGain, mult } = succeed(run, "cash");
      return { run: next, event: { type: "cash", scoreGain, nearMiss: false, kind: "echo", late: inGap, mult, ms: 0 } };
    }
  }
  if (p < lockProgress(run)) return { run, event: { type: "wait" } };
  if (p < run.entryP - grace) {
    const ms = msBetween(run, p, run.entryP);
    const nearMiss = ms <= TUNING.nearMissMs;
    const next = fail(run, "early", nearMiss, ms);
    return { run: next, event: { type: "miss", reason: "early", nearMiss, scoreGain: 0, ms } };
  }
  if (p > run.exitP + grace) {
    const ms = msBetween(run, run.exitP, p);
    const nearMiss = ms <= TUNING.nearMissMs;
    const next = fail(run, "late", nearMiss, ms);
    return { run: next, event: { type: "miss", reason: "late", nearMiss, scoreGain: 0, ms } };
  }
  const core = coreProgress(run);
  const perfect = Math.abs(p - core) <= run.perfectHalf + TUNING.perfectSlop;
  const { run: next, scoreGain, milestone, relicHit, mult } = succeed(run, perfect ? "perfect" : "good");
  return {
    run: next,
    event: { type: perfect ? "perfect" : "good", scoreGain, nearMiss: false, milestone, relicHit, mult, ms: msBetween(run, core, p) },
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
  let moved = { ...run, progress, elapsed: run.elapsed + capped };
  if (moved.kind === "rift" && !moved.riftFlipped && progress >= moved.riftAt && progress < moved.entryP) {
    moved = setupWindow(moved, { keepKind: true, short: true });
    return { run: moved, event: { type: "turn" } };
  }
  if (run.mode === "quiet" && moved.elapsed >= TUNING.quietSeconds) {
    const banked = (moved.banked || 0) + (moved.pot || 0);
    const next = { ...moved, phase: "over", overReason: "hour", nearMiss: false, banked, pot: 0, score: banked };
    return { run: next, event: { type: "hour", reason: "hour", nearMiss: false, scoreGain: 0, ms: 0 } };
  }
  const grace = angleGrace(run.omega);
  if (progress > run.exitP + grace) {
    const next = fail(moved, "overshot", false, 0);
    return { run: next, event: { type: "miss", reason: "overshot", nearMiss: false, scoreGain: 0, ms: 0 } };
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

const STAR_TIERS = {
  score: [500, 1200, 2200],
  perfects: [8, 14, 20],
  combo: [4, 8, 12],
  echo: [2, 4, 6],
  relic: [2, 4, 6],
  rift: [2, 4, 6],
  veil: [3, 6, 9],
};

export function goalStars(run, goalId) {
  const tiers = STAR_TIERS[goalId];
  if (!tiers || !run) return 0;
  const value = {
    score: run.score,
    perfects: run.perfects,
    combo: run.bestCombo,
    echo: run.echoCleared,
    relic: run.relicsBanked,
    rift: run.riftPerfects,
    veil: run.veilPerfects,
  }[goalId] || 0;
  return tiers.reduce((n, tier) => n + (value >= tier ? 1 : 0), 0);
}

const MEDAL_RANK = { none: 0, bronze: 1, silver: 2, gold: 3, flawless: 4 };

export function resultGlyph(entry) {
  if (entry && typeof entry === "object") {
    if (entry.result === "perfect") return "★";
    if (entry.result === "cash") return "✶";
    return "☆";
  }
  return "·";
}

export function shareLines(history) {
  const glyphs = (history || []).map(resultGlyph);
  const lines = [];
  for (let i = 0; i < glyphs.length; i += 10) lines.push(glyphs.slice(i, i + 10).join(""));
  return lines;
}

const SHARE_CODE = { perfect: "P", good: "G", cash: "C" };
const SHARE_RESULT = { P: "perfect", G: "good", C: "cash" };

export const LAUNCH_DATE = "2026-11-01";

export function nightNumber(date) {
  const [y, m, d] = String(date).split("-").map(Number);
  const [Y, M, D] = LAUNCH_DATE.split("-").map(Number);
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(Y, M - 1, D)) / 86400000);
  return Math.max(1, days + 1);
}

export function challengeVerdict(score, mark) {
  const delta = Math.round(score) - Math.round(mark);
  if (delta > 0) return { delta, text: `Beat it by ${delta}` };
  if (delta < 0) return { delta, text: `${-delta} short` };
  return { delta: 0, text: "Matched" };
}

export function absoluteShareUrl(hash, base) {
  return new URL(hash, base).href;
}

export function adaptQuality(state, slowRatio, now, device = 2) {
  const quality = state.quality;
  let { nextProbeAt = 0, cleanWindows = 0, steppedUp = false, backoff = 0 } = state;
  const hold = (next, extra = {}) => ({
    quality: next,
    nextProbeAt,
    cleanWindows,
    steppedUp,
    backoff,
    changed: Math.abs(next - quality) > 0.01,
    ...extra,
  });
  if (slowRatio > 0.05) {
    if (steppedUp) {
      const wait = backoff || 30000;
      const next = Math.max(1, +(quality - 0.25).toFixed(2));
      return {
        quality: next,
        nextProbeAt: now + wait,
        cleanWindows: 0,
        steppedUp: false,
        backoff: Math.min(wait * 2, 480000),
        changed: Math.abs(next - quality) > 0.01,
      };
    }
    const next = Math.max(1, +(quality - 0.25).toFixed(2));
    const wait = 30000;
    return {
      quality: next,
      nextProbeAt: now + wait,
      cleanWindows: 0,
      steppedUp: false,
      backoff: wait,
      changed: Math.abs(next - quality) > 0.01,
    };
  }
  if (now < nextProbeAt) return hold(quality, { cleanWindows: 0 });
  cleanWindows += 1;
  if (cleanWindows < 3) return hold(quality, { cleanWindows });
  const next = Math.min(Math.min(device, 2.5), +(quality + 0.25).toFixed(2));
  if (next > quality + 0.01) {
    return { quality: next, nextProbeAt: now + 30000, cleanWindows: 0, steppedUp: true, backoff, changed: true };
  }
  return hold(quality, { cleanWindows: 0 });
}

export function encodeNight(night) {
  const history = (night.history || []).map((entry) => SHARE_CODE[entry.result] || "G").join("");
  const params = new URLSearchParams();
  params.set("d", night.date);
  params.set("n", String(Math.max(1, night.number || 1)));
  params.set("g", night.goal || "");
  params.set("s", String(Math.max(0, night.score || 0)));
  params.set("m", night.medal || "bronze");
  params.set("h", history);
  return `#night?${params.toString()}`;
}

export function decodeNight(hash) {
  const raw = String(hash || "");
  const body = raw.startsWith("#night?") ? raw.slice("#night?".length) : "";
  if (!body) return null;
  const params = new URLSearchParams(body);
  const date = params.get("d") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const history = [...(params.get("h") || "")].filter((mark) => SHARE_RESULT[mark]).map((mark) => ({ result: SHARE_RESULT[mark] }));
  return {
    date,
    number: Math.max(1, Number(params.get("n")) || 1),
    goal: params.get("g") || "",
    score: Math.max(0, Number(params.get("s")) || 0),
    medal: params.get("m") || "bronze",
    history,
  };
}

export function shareCard(night, href) {
  return [
    `Perigee · night ${night.number}`,
    night.goal || "Tonight",
    ...shareLines(night.history),
    `${night.medal || "bronze"} · ${night.score || 0}`,
    href,
  ].join("\n");
}

export function weekSlots(nights, today) {
  let cursor = today;
  for (let i = 0; i < 6; i++) cursor = prevDate(cursor);
  const slots = [];
  for (let i = 0; i < 7; i++) {
    const found = (nights || []).find((night) => night.date === cursor);
    slots.push(found ? { ...found, empty: false } : { date: cursor, medal: "empty", stars: 0, goal: "", empty: true });
    cursor = nextDate(cursor);
  }
  return slots;
}

export function rememberNight(nights, entry) {
  const list = Array.isArray(nights) ? nights.filter((night) => night.date !== entry.date) : [];
  const prev = (nights || []).find((night) => night.date === entry.date);
  const medal = prev && (MEDAL_RANK[prev.medal] || 0) > (MEDAL_RANK[entry.medal] || 0) ? prev.medal : entry.medal;
  const stars = Math.max(prev?.stars || 0, entry.stars || 0);
  list.push({ date: entry.date, medal, stars, goal: entry.goal || prev?.goal || "" });
  return list.slice(-42);
}

export function medalFor(run, goalId = "score") {
  if (!run || run.overReason !== "clear" || run.flings < COURSE) return null;
  if (run.perfects >= COURSE) return "flawless";
  const stars = goalStars(run, goalId);
  if (stars >= 3) return "gold";
  if (stars >= 2) return "silver";
  return "bronze";
}

export function rankFor(save) {
  const mastery = save?.mastery || {};
  const total = Object.values(mastery).reduce((sum, n) => sum + (n || 0), 0) + (save?.nightsCleared || 0) * 2;
  if (total >= 1800) return "Orrery";
  if (total >= 900) return "Corona";
  if (total >= 320) return "Lantern";
  if (total >= 80) return "Wick";
  return "Spark";
}

export function missionPulse(save, run, today) {
  const board = missionsFor(today, save);
  const done = save.daily && save.daily.date === today ? save.daily.done || {} : {};
  const hits = [];
  if (run.mode === "daily" && !done.nightly && goalStars(run, board.nightly.id) >= 1) hits.push({ id: "nightly", label: board.nightly.label });
  if (!done.free && board.free.test(run, save)) hits.push({ id: "free", label: board.free.label });
  if (!done.charm && board.charm.test(run, save, { runsToday: (save.daily?.runsToday || 0) })) hits.push({ id: "charm", label: board.charm.label });
  return hits;
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
    cleared: !!prev.cleared,
  };
  return { ...save, daily };
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
  const stars = goalStars(run, board.nightly.id);
  daily.stars = Math.max(prev.stars || 0, stars);
  if (run.mode === "daily" && !done.nightly && stars >= 1) done.nightly = true;
  if (!done.free && board.free.test(run, save, daily)) done.free = true;
  if (!done.charm && board.charm.test(run, save, daily)) done.charm = true;
  daily.done = done;
  if (run.mode === "daily" && stars >= 1) daily.cleared = true;
  let next = { ...save, daily };
  if (run.mode === "daily" && stars >= 1 && next.lastStreakDate !== today) {
    const streak = next.lastStreakDate === prevDate(today) ? next.streak + 1 : 1;
    next = { ...next, streak, lastStreakDate: today, bestStreak: Math.max(next.bestStreak || 0, streak), daily: { ...daily } };
  }
  if (run.mode === "daily" && stars >= 1 && !prev.nightCounted) {
    const kinds = new Set(next.goalKinds || []);
    kinds.add(board.nightly.id);
    daily.nightCounted = true;
    next = {
      ...next,
      daily: { ...daily, nightCounted: true },
      nightsCleared: (next.nightsCleared || 0) + 1,
      goalKinds: [...kinds],
    };
  }
  if (run.mode === "daily") {
    const medal = medalFor(run, board.nightly.id) || "none";
    next = {
      ...next,
      nights: rememberNight(next.nights, { date: today, medal, stars, goal: board.nightly.id }),
      flawless: next.flawless || medal === "flawless",
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
    quietUnlocked: !!(primed.quietUnlocked || primed.runs >= 6),
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
      nightCounted: !!raw.daily.nightCounted,
      stars: Math.max(0, finite(raw.daily.stars, 0)),
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
  const days = Array.isArray(raw.days) ? raw.days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-42) : [];
  const nights = Array.isArray(raw.nights)
    ? raw.nights.filter((night) => night && /^\d{4}-\d{2}-\d{2}$/.test(night.date)).slice(-42).map((night) => ({
      date: night.date,
      medal: MEDAL_RANK[night.medal] != null ? night.medal : "none",
      stars: Math.max(0, Math.min(3, finite(night.stars, 0))),
      goal: String(night.goal || ""),
    }))
    : [];
  const goalKinds = Array.isArray(raw.goalKinds) ? raw.goalKinds.filter((id) => NIGHTLY.some((g) => g.id === id)) : [];
  return {
    ...base,
    best: Math.max(0, finite(raw.best, 0)),
    bestFlings: Math.max(0, finite(raw.bestFlings, 0)),
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
    mastery: Object.fromEntries(["steady", "wild", "echo", "veil", "rift", "relic"].map((key) => [
      key,
      Math.max(0, finite(raw.mastery && raw.mastery[key], 0)),
    ])),
    runs: Math.max(0, finite(raw.runs, 0)),
    quietUnlocked: !!raw.quietUnlocked,
    days,
    nights,
    flawless: !!raw.flawless,
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
    bestFlings: Math.max(before.bestFlings || 0, run.flings || 0),
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
    mastery: Object.fromEntries(["steady", "wild", "echo", "veil", "rift", "relic"].map((key) => [key, (before.mastery?.[key] || 0) + (run.mastery?.[key] || 0)])),
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
  if (skill === "beat" || skill === "early" || skill === "random") return null;
  if (skill === "sharp") {
    if (zone(run) === "echo") return now + 0.02;
    const eta = (coreProgress(run) - run.progress) / Math.max(0.4, run.omega);
    if (!(eta > 0) || eta > 0.11) return null;
    return now + Math.max(0.004, eta + gauss(rand) * 0.012);
  }
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
  const beat = waitSeconds(seed, 0) + run.arcHalf / Math.max(0.4, run.omega);
  let nextBeat = beat;
  let nextRandom = 0.16 + rand() * 0.25;
  let t = 0;
  const dt = 1 / 90;
  let plan = null;
  while (t < 210 && run.phase === "playing") {
    let tap = false;
    if (skill === "beat" && t >= nextBeat) {
      tap = true;
      nextBeat += beat;
    } else if (skill === "random" && t >= nextRandom) {
      tap = true;
      nextRandom = t + 0.16 + rand() * 0.5;
    } else if (skill === "early") {
      const grace = angleGrace(run.omega);
      tap = run.progress > lockProgress(run) + 0.02 && run.progress < run.entryP - grace - 0.03;
    } else {
      if (plan == null) plan = armPlan(run, skill, rand, t);
      tap = plan != null && t >= plan;
      if (tap) plan = null;
    }
    if (tap) {
      const res = fling(run);
      if (res.event && res.event.type !== "wait") {
        run = res.run;
        if (run.phase !== "playing") break;
      }
    } else {
      const stepped = step(run, dt);
      run = stepped.run;
      if (stepped.event && stepped.event.type === "turn") plan = null;
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
  const flings = rows.map((r) => r.flings || 0).sort((a, b) => a - b);
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
    flings: { p50: percentile(flings, 0.5) },
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
  const tag = (prefix, ids) => (ids || []).map((id) => `${prefix}:${id}`);
  const snap = (current) => new Set([...tag("moon", current.moons), ...tag("trail", current.unlocked), ...tag("sky", current.themes), current.quietUnlocked ? "quiet" : ""]);
  for (let day = 1; day <= 7; day++) {
    const before = snap(save);
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
    const after = snap(save);
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
