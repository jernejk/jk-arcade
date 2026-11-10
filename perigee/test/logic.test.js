import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TAU,
  TUNING,
  TRAILS,
  activeStreak,
  angleGrace,
  arcCenterFor,
  coerceSave,
  createRun,
  dailySeed,
  expireStreak,
  fling,
  isUnlocked,
  isWild,
  leadAngle,
  loadSave,
  localDateString,
  lockProgress,
  nextOmega,
  omegaAt,
  prevDate,
  registerDaily,
  selectTrail,
  settleRun,
  shrinkFor,
  step,
  viewAngle,
  withUnlocks,
  wrap,
  writeSave,
  zone,
} from "../logic.js";

function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
}

function tapPerfect(run) {
  const armed = { ...run, progress: run.centerP };
  return fling(armed);
}

function tapGood(run) {
  const armed = { ...run, progress: run.centerP + run.perfectHalf + 0.03 };
  return fling(armed);
}

test("wrap keeps angles inside a turn", () => {
  assert.equal(wrap(0), 0);
  assert.ok(Math.abs(wrap(TAU) ) < 1e-9);
  assert.ok(Math.abs(wrap(-0.2) - (TAU - 0.2)) < 1e-9);
  assert.ok(Math.abs(wrap(TAU + 0.4) - 0.4) < 1e-9);
});

test("a center tap is a perfect fling and scores a combo", () => {
  const run = createRun(7);
  const first = tapPerfect(run);
  assert.equal(first.event.type, "perfect");
  assert.equal(first.event.scoreGain, TUNING.perfectBase);
  assert.equal(first.run.score, TUNING.perfectBase);
  assert.equal(first.run.combo, 1);
  assert.equal(first.run.flings, 1);
  assert.equal(first.run.perfects, 1);
  assert.equal(first.run.phase, "playing");
  assert.equal(first.run.progress, 0);
  const second = tapPerfect(first.run);
  assert.equal(second.event.type, "perfect");
  assert.equal(second.run.combo, 2);
  assert.equal(second.run.score, TUNING.perfectBase + TUNING.perfectBase + TUNING.perfectCombo);
});

test("a good fling scores less and breaks the combo", () => {
  let run = tapPerfect(createRun(3)).run;
  const good = tapGood(run);
  assert.equal(good.event.type, "good");
  assert.equal(good.event.scoreGain, TUNING.goodScore);
  assert.equal(good.run.combo, 0);
  assert.equal(good.run.goods, 1);
  assert.equal(good.run.bestCombo, 1);
});

test("perfects keep more arc than goods", () => {
  let perfect = createRun(5);
  let good = createRun(5);
  for (let i = 0; i < 10; i++) {
    perfect = tapPerfect(perfect).run;
    good = tapGood(good).run;
  }
  assert.ok(perfect.arcHalf > good.arcHalf);
  assert.ok(perfect.score > good.score);
  assert.ok(perfect.arcHalf >= TUNING.minArc);
  assert.ok(good.arcHalf >= TUNING.minArc);
  assert.ok(perfect.omega > TUNING.startOmega);
  assert.ok(perfect.omega <= TUNING.maxOmega);
});

test("flings do not mutate the previous state", () => {
  const run = createRun(9);
  const snapshot = JSON.stringify(run);
  fling({ ...run, progress: run.centerP });
  assert.equal(JSON.stringify(run), snapshot);
});

test("tapping before the lock is a wait, not a death", () => {
  const run = createRun(4);
  assert.ok(lockProgress(run) > 0);
  const waited = fling(run);
  assert.equal(waited.event.type, "wait");
  assert.equal(waited.run.phase, "playing");
  assert.equal(waited.run, run);
});

test("an early tap just outside the arc ends the run, and a near one says so", () => {
  const run = createRun(4);
  const grace = angleGrace(run.omega);
  const close = fling({ ...run, progress: run.entryP - grace - 0.04 });
  assert.equal(close.event.type, "miss");
  assert.equal(close.event.reason, "early");
  assert.equal(close.event.nearMiss, true);
  assert.equal(close.run.phase, "over");
  const far = fling({ ...run, progress: lockProgress(run) + 0.01 });
  assert.equal(far.event.reason, "early");
  assert.equal(far.event.nearMiss, false);
});

test("grace forgives a tap slightly before the painted arc", () => {
  const run = createRun(4);
  const grace = angleGrace(run.omega);
  const eased = fling({ ...run, progress: run.entryP - grace * 0.5 });
  assert.equal(eased.event.type, "good");
  assert.equal(eased.run.phase, "playing");
});

test("idling through the window is an overshoot", () => {
  let run = createRun(2);
  let guard = 0;
  while (run.phase === "playing" && guard < 20000) {
    run = step(run, 1 / 60).run;
    guard++;
  }
  assert.equal(run.overReason, "overshot");
  assert.equal(run.flings, 0);
  assert.ok(run.elapsed < 4, `elapsed ${run.elapsed}`);
  assert.equal(run.nearMiss, false);
});

test("stepping never skips the opening approach", () => {
  let run = createRun(11);
  const entry = run.entryP;
  let sawApproach = false;
  for (let i = 0; i < 20; i++) {
    assert.ok(run.progress < entry);
    sawApproach = true;
    run = step(run, 1 / 120).run;
  }
  assert.equal(sawApproach, true);
  assert.equal(run.phase, "playing");
});

test("a perfect policy survives and outscores idling", () => {
  let run = createRun(12345);
  let t = 0;
  const dt = 1 / 120;
  while (t < 28 && run.phase === "playing") {
    const core = run.centerP;
    const inCore = Math.abs(run.progress - core) <= run.perfectHalf
      && run.kind !== "relic";
    if (run.kind === "relic") {
      const live = Math.abs(run.progress - (run.centerP));
      if (zone(run) === "perfect") {
        const res = fling(run);
        assert.equal(res.event.type, "perfect");
        run = res.run;
        continue;
      }
    }
    if (inCore && zone(run) === "perfect") {
      const res = fling(run);
      assert.equal(res.event.type, "perfect");
      run = res.run;
    } else {
      run = step(run, dt).run;
    }
    t += dt;
  }
  assert.equal(run.phase, "playing");
  assert.ok(run.flings >= 10, `flings ${run.flings}`);
  assert.ok(run.score >= 700, `score ${run.score}`);
  assert.ok(Math.abs(run.arcHalf - TUNING.startArc) < 0.02, `arc ${run.arcHalf}`);
});

test("windows stay reachable across seeds", () => {
  for (let seed = 1; seed <= 24; seed++) {
    let run = createRun(seed);
    for (let i = 0; i < 36 && run.phase === "playing"; i++) {
      const grace = angleGrace(run.omega);
      assert.ok(run.entryP > run.progress);
      assert.ok(run.centerP > run.entryP && run.centerP < run.exitP);
      assert.ok(run.entryP > 0.2, `no approach for seed ${seed}`);
      assert.ok(lockProgress(run) < run.entryP - grace, "early band disappeared");
      assert.equal(isWild(run.seed, 0), false);
      const theta = viewAngle({ ...run, progress: run.centerP });
      assert.ok(Math.abs(theta - run.arcCenter) < 1e-6 || Math.abs(theta - run.arcCenter + TAU) < 1e-9);
      run = tapPerfect(run).run;
    }
  }
});

test("wild speed stays positive and bounded", () => {
  const base = 2;
  for (let p = 0; p < 20; p++) {
    const w = omegaAt(base, p, 0.4, true);
    assert.ok(w > base * 0.6 && w < base * 1.4);
    assert.equal(omegaAt(base, p, 0.4, false), base);
  }
});

test("omega caps and shrink grows with the run", () => {
  let omega = TUNING.startOmega;
  for (let i = 0; i < 200; i++) omega = nextOmega(omega);
  assert.equal(omega, TUNING.maxOmega);
  assert.ok(shrinkFor(0) < shrinkFor(12));
  assert.ok(shrinkFor(12) < shrinkFor(30));
});

test("the same seed builds the same orbit", () => {
  const a = createRun(99, "daily");
  const b = createRun(99, "daily");
  assert.equal(a.arcCenter, b.arcCenter);
  assert.equal(a.entryP, b.entryP);
  assert.notEqual(arcCenterFor(99, 0), arcCenterFor(99, 3));
  let left = a;
  let right = b;
  for (let i = 0; i < 40; i++) {
    left = step(left, 0.016).run;
    right = step(right, 0.016).run;
  }
  assert.equal(left.progress, right.progress);
});

test("lead never plants the moon inside the arc", () => {
  for (const arc of [TUNING.startArc, 0.4, TUNING.minArc]) {
    for (const omega of [TUNING.startOmega, 3, TUNING.maxOmega]) {
      const lead = leadAngle(omega, arc);
      assert.ok(lead > 0.2);
      assert.ok(lead + arc * 2 < TAU - 0.2);
    }
  }
});

test("zone names the approach, the core, and the shoulder", () => {
  const run = createRun(8);
  assert.equal(zone(run), "approach");
  assert.equal(zone({ ...run, progress: run.centerP }), "perfect");
  assert.equal(zone({ ...run, progress: run.entryP }), "good");
});

test("daily seeds are stable and date-shaped", () => {
  assert.equal(dailySeed("2026-11-10"), dailySeed("2026-11-10"));
  assert.notEqual(dailySeed("2026-11-10"), dailySeed("2026-11-11"));
  assert.equal(prevDate("2026-03-01"), "2026-02-28");
  assert.equal(prevDate("2024-03-01"), "2024-02-29");
  assert.equal(prevDate("2026-01-01"), "2025-12-31");
  const stamped = localDateString(new Date(2026, 10, 10, 23, 30));
  assert.equal(stamped, "2026-11-10");
});

test("a nightly star counts once a day and a gap breaks the streak", () => {
  const starRun = {
    ...createRun(1, "daily", "score"),
    mode: "daily",
    score: 800,
    bestCombo: 4,
    flings: 12,
    perfects: 8,
    echoCleared: 2,
    relicsBanked: 2,
    riftPerfects: 2,
    veilPerfects: 3,
    phase: "over",
  };
  let save = coerceSave(null, "2026-11-08");
  save = settleRun(save, starRun, "2026-11-08").save;
  assert.equal(save.streak, 1);
  assert.equal(save.nightsCleared, 1);
  save = settleRun(save, starRun, "2026-11-08").save;
  assert.equal(save.streak, 1);
  assert.equal(save.nightsCleared, 1);
  save = settleRun(save, {
    ...starRun,
    score: 0,
    bestCombo: 0,
    perfects: 0,
    echoCleared: 0,
    relicsBanked: 0,
    riftPerfects: 0,
    veilPerfects: 0,
  }, "2026-11-09").save;
  assert.equal(save.streak, 1);
  save = settleRun(save, starRun, "2026-11-09").save;
  assert.equal(save.streak, 2);
  assert.equal(save.nightsCleared, 2);
  assert.equal(activeStreak({ ...save, lastStreakDate: "2026-11-01", streak: 4 }, "2026-11-10"), 0);
});

test("settle records a best, a nightly clear, and a persisted unlock", () => {
  const today = "2026-11-10";
  let save = coerceSave({
    streak: 2,
    lastStreakDate: "2026-11-09",
    best: 100,
    lifetimeFlings: 40,
  }, today);
  const run = {
    ...createRun(1, "daily"),
    score: 1600,
    bestCombo: 8,
    flings: 18,
    perfects: 10,
    echoCleared: 2,
    relicsBanked: 2,
    riftPerfects: 2,
    veilPerfects: 4,
    mode: "daily",
    phase: "over",
  };
  const settled = settleRun(save, run, today);
  assert.equal(settled.isBest, true);
  assert.equal(settled.save.best, 1600);
  assert.equal(settled.save.streak, 3);
  assert.equal(settled.save.daily.best, 1600);
  assert.equal(settled.save.daily.cleared, true);
  assert.ok(settled.unlocked.includes("pearl"));
  assert.ok(settled.unlocked.includes("aurora"));
  assert.equal(isUnlocked(settled.save, "aurora"), true);
  const later = coerceSave({ ...settled.save, streak: 3, lastStreakDate: "2026-11-10" }, "2026-11-20");
  assert.equal(later.streak, 0);
  assert.equal(isUnlocked(later, "aurora"), true);
  assert.equal(selectTrail(later, "aurora").trail, "aurora");
  assert.equal(selectTrail(later, "comet").trail, "ember");
});

test("saves round-trip and reject garbage", () => {
  const storage = memoryStorage();
  const save = withUnlocks({ ...coerceSave(null, "2026-11-10"), best: 50, mute: true, motion: "reduce" });
  writeSave(storage, save);
  const loaded = loadSave(storage, "2026-11-10");
  assert.equal(loaded.best, 50);
  assert.equal(loaded.mute, true);
  assert.equal(loaded.motion, "reduce");
  assert.deepEqual(loadSave(memoryStorage({ "perigee-v1": "{nope" }), "2026-11-10").best, 0);
  assert.equal(coerceSave({ best: -4, motion: "nope", trail: "nope", unlocked: ["nope"] }, "2026-11-10").trail, "ember");
});

test("every trail id is selectable once unlocked", () => {
  assert.equal(TRAILS[0].id, "ember");
  const rich = withUnlocks({
    ...coerceSave(null, "2026-11-10"),
    best: 2000,
    lifetimeFlings: 80,
    relics: 8,
    riftPerfects: 4,
    nightsCleared: 3,
    streak: 3,
    lastStreakDate: "2026-11-10",
  });
  for (const trail of TRAILS) assert.equal(isUnlocked(rich, trail.id), true);
});
