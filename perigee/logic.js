// Pure rules for Perigee. No DOM, no time source, no storage side effects.
// A run is a flat object. Every function returns a new object and leaves the input alone.

export const TAU = Math.PI * 2;

export const TUNING = {
  startOmega: 1.32,
  maxOmega: 6.4,
  omegaGrowth: 0.062,
  startArc: 0.92,
  minArc: 0.055,
  shrinkIntro: 0.008,
  shrinkBase: 0.02,
  shrinkLate: 0.031,
  shrinkFinal: 0.046,
  restore: 0.016,
  perfectRatio: 0.34,
  perfectSlop: 0.015,
  graceTime: 0.026,
  nearMiss: 0.16,
  lockGap: 0.24,
  goodScore: 25,
  perfectBase: 40,
  perfectCombo: 20,
  par: 250,
};

export const TRAILS = [
  { id: "ember", name: "Ember", hint: "Yours from the start", test: () => true },
  { id: "pearl", name: "Pearl", hint: "Best 400", test: (s) => s.best >= 400 },
  { id: "comet", name: "Comet", hint: "Best 1,600", test: (s) => s.best >= 1600 },
  { id: "brass", name: "Brass", hint: "50 flings", test: (s) => s.lifetimeFlings >= 50 },
  { id: "aurora", name: "Aurora", hint: "3-day streak", test: (s) => s.streak >= 3 },
];

export const TRAIL_LOOK = {
  ember: { core: "#ffe1a8", glow: "#ff8a3d" },
  pearl: { core: "#ffffff", glow: "#8ecbff" },
  comet: { core: "#e7f4ff", glow: "#7aa2ff" },
  brass: { core: "#ffe7a3", glow: "#e0b03a" },
  aurora: { core: "#e9fff6", glow: "#3ee0b0" },
};

const SAVE_KEY = "perigee-v1";

export function defaultSave() {
  return {
    best: 0,
    bestCombo: 0,
    lifetimeFlings: 0,
    lifetimePerfects: 0,
    streak: 0,
    lastStreakDate: null,
    daily: null,
    mute: false,
    motion: "system",
    trail: "ember",
    unlocked: ["ember"],
  };
}

export function wrap(angle) {
  const m = angle % TAU;
  return m < 0 ? m + TAU : m;
}

export function angleGrace(omega) {
  const speed = Math.max(0.4, omega);
  // Early orbits forgive a fat finger. Later ones keep a short, fixed sliver of mercy
  // so a tiny arc is not swallowed by the grace itself.
  const mercy = Math.max(0.011, TUNING.graceTime - Math.max(0, speed - 1.8) * 0.0045);
  return mercy * speed;
}

export function shrinkFor(flings) {
  if (flings < 4) return TUNING.shrinkIntro;
  if (flings >= 32) return TUNING.shrinkFinal;
  if (flings >= 14) return TUNING.shrinkLate;
  return TUNING.shrinkBase;
}

export function nextOmega(omega) {
  return Math.min(TUNING.maxOmega, omega + TUNING.omegaGrowth);
}

export function arcCenterFor(seed, index) {
  const x = Math.sin(seed * 0.017 + (index + 1) * 2.399963) * 43758.5453123;
  const u = x - Math.floor(x);
  return u * TAU;
}

export function isWild(seed, index) {
  if (index < 2) return false;
  if (index >= 28 && index % 2 === 0) return true;
  const n = Math.abs(Math.sin(seed * 0.13 + index * 1.7));
  return n < 0.22;
}

export function leadAngle(omega, arcHalf) {
  const desiredWait = Math.max(0.5, Math.min(1.55, 2.05 / Math.max(1, omega / TUNING.startOmega)));
  let lead = desiredWait * omega;
  const maxLead = TAU - arcHalf * 2 - 0.4;
  if (lead > maxLead) lead = maxLead;
  if (lead < 0.7) lead = 0.7;
  return lead;
}

export function omegaAt(omega, progress, startTheta, wild) {
  if (!wild) return omega;
  const theta = startTheta + progress;
  const swing = omega > 3.4 ? 0.48 : 0.35;
  return Math.max(0.35, omega * (1 + swing * Math.sin(theta * 2)));
}

export function planetHue(seed, flings) {
  return (seed + flings * 23) % 360;
}

export function lockProgress(run) {
  const grace = angleGrace(run.omega);
  const earliestEarly = run.entryP - grace - TUNING.lockGap;
  return Math.max(0, Math.min(run.entryP * 0.5, earliestEarly));
}

export function zone(run) {
  const grace = angleGrace(run.omega);
  if (run.progress < run.entryP - grace) return "approach";
  if (run.progress > run.exitP + grace) return "past";
  if (Math.abs(run.progress - run.centerP) <= run.perfectHalf + TUNING.perfectSlop) return "perfect";
  return "good";
}

export function viewAngle(run) {
  return wrap(run.startTheta + run.progress);
}

function setupWindow(run) {
  const arcCenter = arcCenterFor(run.seed, run.flings);
  const wild = isWild(run.seed, run.flings);
  const perfectHalf = run.arcHalf * TUNING.perfectRatio;
  const lead = leadAngle(run.omega, run.arcHalf);
  const startTheta = wrap(arcCenter - run.arcHalf - lead);
  return {
    ...run,
    arcCenter,
    wild,
    perfectHalf,
    startTheta,
    progress: 0,
    entryP: lead,
    centerP: lead + run.arcHalf,
    exitP: lead + run.arcHalf * 2,
  };
}

export function createRun(seed, mode = "free") {
  const clean = (Number(seed) >>> 0) || 1;
  return setupWindow({
    seed: clean,
    mode: mode === "daily" ? "daily" : "free",
    flings: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    perfects: 0,
    goods: 0,
    arcHalf: TUNING.startArc,
    omega: TUNING.startOmega,
    phase: "playing",
    overReason: null,
    nearMiss: false,
    elapsed: 0,
  });
}

function fail(run, reason, nearMiss) {
  return { ...run, phase: "over", overReason: reason, nearMiss: !!nearMiss };
}

function succeed(run, kind) {
  const perfect = kind === "perfect";
  const combo = perfect ? run.combo + 1 : 0;
  const scoreGain = perfect
    ? TUNING.perfectBase + (combo - 1) * TUNING.perfectCombo
    : TUNING.goodScore;
  let arcHalf = run.arcHalf - shrinkFor(run.flings);
  if (perfect) arcHalf += TUNING.restore;
  arcHalf = Math.min(TUNING.startArc, Math.max(TUNING.minArc, arcHalf));
  const next = {
    ...run,
    score: run.score + scoreGain,
    combo,
    bestCombo: Math.max(run.bestCombo, combo),
    perfects: run.perfects + (perfect ? 1 : 0),
    goods: run.goods + (perfect ? 0 : 1),
    flings: run.flings + 1,
    arcHalf,
    omega: nextOmega(run.omega),
  };
  return { run: setupWindow(next), scoreGain };
}

export function fling(run) {
  if (!run || run.phase !== "playing") return { run, event: null };
  if (run.progress < lockProgress(run)) return { run, event: { type: "wait" } };
  const grace = angleGrace(run.omega);
  const p = run.progress;
  if (p < run.entryP - grace) {
    const nearMiss = p > run.entryP - grace - TUNING.nearMiss;
    const next = fail(run, "early", nearMiss);
    return { run: next, event: { type: "miss", reason: "early", nearMiss, scoreGain: 0 } };
  }
  if (p > run.exitP + grace) {
    const next = fail(run, "late", true);
    return { run: next, event: { type: "miss", reason: "late", nearMiss: true, scoreGain: 0 } };
  }
  const perfect = Math.abs(p - run.centerP) <= run.perfectHalf + TUNING.perfectSlop;
  const { run: next, scoreGain } = succeed(run, perfect ? "perfect" : "good");
  return { run: next, event: { type: perfect ? "perfect" : "good", scoreGain, nearMiss: false } };
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
  const grace = angleGrace(run.omega);
  const moved = { ...run, progress, elapsed: run.elapsed + capped };
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
  return { ...save, daily, streak, lastStreakDate };
}

export function withUnlocks(save) {
  const unlocked = new Set(Array.isArray(save.unlocked) ? save.unlocked : []);
  unlocked.add("ember");
  for (const trail of TRAILS) if (trail.test(save)) unlocked.add(trail.id);
  return { ...save, unlocked: TRAILS.map((t) => t.id).filter((id) => unlocked.has(id)) };
}

export function isUnlocked(save, id) {
  return Array.isArray(save.unlocked) && save.unlocked.includes(id);
}

export function newlyUnlocked(before, after) {
  const had = new Set(before.unlocked || []);
  return (after.unlocked || []).filter((id) => !had.has(id));
}

export function selectTrail(save, id) {
  if (!isUnlocked(save, id) || !TRAIL_LOOK[id]) return save;
  return { ...save, trail: id };
}

function finite(n, fallback) {
  return Number.isFinite(n) ? n : fallback;
}

export function sanitizeSave(raw) {
  const base = defaultSave();
  if (!raw || typeof raw !== "object") return base;
  const motion = raw.motion === "reduce" || raw.motion === "full" || raw.motion === "system" ? raw.motion : "system";
  const trail = TRAIL_LOOK[raw.trail] ? raw.trail : "ember";
  const daily = raw.daily && typeof raw.daily === "object" && /^\d{4}-\d{2}-\d{2}$/.test(raw.daily.date)
    ? { date: raw.daily.date, best: Math.max(0, finite(raw.daily.best, 0)), cleared: !!raw.daily.cleared }
    : null;
  const unlocked = Array.isArray(raw.unlocked)
    ? raw.unlocked.filter((id) => TRAIL_LOOK[id])
    : ["ember"];
  return {
    best: Math.max(0, finite(raw.best, 0)),
    bestCombo: Math.max(0, finite(raw.bestCombo, 0)),
    lifetimeFlings: Math.max(0, finite(raw.lifetimeFlings, 0)),
    lifetimePerfects: Math.max(0, finite(raw.lifetimePerfects, 0)),
    streak: Math.max(0, finite(raw.streak, 0)),
    lastStreakDate: /^\d{4}-\d{2}-\d{2}$/.test(raw.lastStreakDate || "") ? raw.lastStreakDate : null,
    daily,
    mute: !!raw.mute,
    motion,
    trail,
    unlocked: unlocked.includes("ember") ? unlocked : ["ember", ...unlocked],
  };
}

export function coerceSave(raw, today) {
  return expireStreak(withUnlocks(sanitizeSave(raw)), today);
}

export function settleRun(save, run, today) {
  const before = coerceSave(save, today);
  let next = {
    ...before,
    best: Math.max(before.best, run.score),
    bestCombo: Math.max(before.bestCombo, run.bestCombo),
    lifetimeFlings: before.lifetimeFlings + run.flings,
    lifetimePerfects: before.lifetimePerfects + run.perfects,
  };
  if (run.mode === "daily") next = registerDaily(next, today, run.score, TUNING.par);
  next = withUnlocks(next);
  return {
    save: next,
    unlocked: newlyUnlocked(before, next),
    isBest: run.score > before.best && run.score > 0,
  };
}

export function loadSave(storage, today) {
  try {
    const raw = storage.getItem(SAVE_KEY);
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
  const live = expireStreak(save, today);
  return live.streak;
}

export { SAVE_KEY };
