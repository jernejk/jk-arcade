import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COURSE,
  TAU,
  createRun,
  fling,
  goalSlots,
  goalStars,
  goldWindowSeconds,
  kindFor,
  loadSave,
  medalFor,
  missionsFor,
  orbitsUntilEcho,
  perfectWindowSeconds,
  rankFor,
  rememberNight,
  settleRun,
  shareLines,
  step,
  writeSave,
  coreProgress,
} from "../logic.js";

function memory() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

function perfect(run) {
  const core = coreProgress({ ...run, progress: run.centerP });
  return fling({ ...run, progress: core }).run;
}

test("mastery survives a save round-trip", () => {
  const storage = memory();
  const save = {
    mastery: { steady: 4, wild: 2, echo: 0, veil: 1, rift: 3, relic: 6 },
    best: 10,
  };
  writeSave(storage, save);
  const loaded = loadSave(storage, "2026-11-10");
  assert.equal(loaded.mastery.rift, 3);
  assert.equal(loaded.mastery.relic, 6);
  assert.equal(loaded.mastery.steady, 4);
});

test("a cleared Tonight increments nightsCleared even after the live toast", () => {
  const today = "2026-11-10";
  let save = loadSave(memory(), today);
  const run = {
    ...createRun(3, "daily", "score"),
    mode: "daily",
    score: 900,
    bestCombo: 4,
    perfects: 8,
    echoCleared: 2,
    relicsBanked: 2,
    riftPerfects: 2,
    veilPerfects: 3,
    flings: 12,
    phase: "over",
  };
  save = {
    ...save,
    daily: { date: today, best: 0, cleared: true, runsToday: 0, done: { nightly: true }, stars: 1, nightCounted: false },
  };
  const settled = settleRun(save, run, today);
  assert.equal(settled.save.nightsCleared, 1);
  const again = settleRun(settled.save, run, today);
  assert.equal(again.save.nightsCleared, 1);
});

test("gold stays inside one lap", () => {
  for (let seed = 1; seed <= 30; seed++) {
    let run = createRun(seed);
    for (let i = 0; i < 24 && run.phase === "playing"; i++) {
      assert.ok(run.exitP < TAU - 0.2, `seed ${seed} fling ${i} exit ${run.exitP}`);
      assert.ok(run.entryP + run.arcHalf * 2 <= run.exitP + 0.001);
      run = perfect(run);
    }
  }
});

test("a rift flips direction", () => {
  let run = createRun(1);
  let guard = 0;
  while (run.kind !== "rift" && guard < 40) {
    run = perfect(run);
    guard += 1;
  }
  assert.equal(run.kind, "rift");
  const dir = run.dir || 1;
  let flipped = false;
  guard = 0;
  while (run.phase === "playing" && guard < 4000) {
    const stepped = step(run, 1 / 90);
    if (stepped.event && stepped.event.type === "turn") {
      assert.equal(stepped.run.dir, -dir);
      assert.notEqual(stepped.run.dir, dir);
      flipped = true;
      break;
    }
    run = stepped.run;
    guard += 1;
  }
  assert.equal(flipped, true);
});

test("every nightly goal can reach a gold medal", () => {
  for (const goal of ["score", "perfects", "combo", "echo", "relic", "rift", "veil"]) {
    let reachable = 0;
    for (let seed = 1; seed <= 24; seed++) {
      let run = createRun(seed, "daily", goal);
      let steps = 0;
      while (run.phase === "playing" && steps < 4000) {
        if (goal === "echo" && run.kind === "echo" && run.echo && run.pot > 0 && run.progress >= run.echo.entry && run.progress <= run.echo.exit) {
          run = fling(run).run;
        } else if (zoneSafe(run)) {
          run = fling({ ...run, progress: coreProgress(run) }).run;
        } else {
          run = step(run, 1 / 90).run;
        }
        steps += 1;
      }
      const stars = goalStars(run, goal);
      const medal = medalFor(run, goal);
      if (stars >= 3 && (medal === "gold" || medal === "flawless")) reachable += 1;
    }
    assert.ok(reachable >= 20, `${goal} reachable ${reachable}/24`);
    assert.equal(missionsFor("2026-11-10").nightly.label.includes(String(({
      score: 500, perfects: 8, combo: 4, echo: 2, relic: 2, rift: 2, veil: 3,
    })[missionsFor("2026-11-10").nightly.id] || "")), true);
  }
  assert.equal(goalSlots(4, "veil").size, 10);
  assert.ok(kindFor(4, 0) === "steady");
  void COURSE;
});

test("a goal night plants its kind exactly once per slot", () => {
  const quota = { veil: 10, echo: 8, rift: 8, relic: 8 };
  for (const goal of Object.keys(quota)) {
    for (let seed = 1; seed <= 12; seed++) {
      let count = 0;
      for (let i = 0; i < 30; i++) if (kindFor(seed, i, goal) === goal) count += 1;
      assert.equal(count, quota[goal], `${goal} seed ${seed} planted ${count}`);
    }
  }
});

test("the perfect window stays near 35ms while the gold tightens", () => {
  let run = createRun(4);
  const earlyGold = goldWindowSeconds(run);
  for (let i = 0; i < 180 && run.phase === "playing"; i++) run = perfect(run);
  const late = perfectWindowSeconds(run) * 1000;
  assert.ok(late >= 34, `late perfect ${late}`);
  assert.ok(goldWindowSeconds(run) < earlyGold, `gold ${goldWindowSeconds(run)} vs ${earlyGold}`);
});

test("the share row breaks into lines of ten", () => {
  const history = Array.from({ length: 30 }, (_, i) => ({ result: i % 3 === 0 ? "cash" : "perfect" }));
  const lines = shareLines(history);
  assert.equal(lines.length, 3);
  assert.ok(lines.every((line) => [...line].length <= 10));
});

test("a cleared Tonight is remembered, and a week does not reach Orrery", () => {
  const today = "2026-11-10";
  let save = loadSave(memory(), today);
  const run = {
    ...createRun(3, "daily", "score"),
    mode: "daily",
    score: 900,
    bestCombo: 4,
    perfects: 8,
    echoCleared: 2,
    relicsBanked: 2,
    riftPerfects: 2,
    veilPerfects: 3,
    flings: 30,
    overReason: "clear",
    phase: "over",
  };
  save = settleRun(save, run, today).save;
  assert.equal(save.nights.length, 1);
  assert.equal(save.nights[0].date, today);
  const again = settleRun(save, { ...run, score: 100 }, today).save;
  assert.equal(again.nights.length, 1);
  const loaded = loadSave({ getItem: () => JSON.stringify(again), setItem() {} }, today);
  assert.equal(loaded.nights[0].medal, again.nights[0].medal);
  assert.notEqual(rankFor({ mastery: { steady: 80, wild: 70, echo: 40, veil: 70, rift: 70, relic: 50 }, nightsCleared: 4 }), "Orrery");
  assert.equal(orbitsUntilEcho(1, 0, null) >= 1, true);
  assert.equal(rememberNight([], { date: today, medal: "bronze", stars: 1, goal: "rift" })[0].medal, "bronze");
});

function zoneSafe(run) {
  return Math.abs(run.progress - coreProgress(run)) <= run.perfectHalf * 0.5 && run.progress >= run.entryP;
}
