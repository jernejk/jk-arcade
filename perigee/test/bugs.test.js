import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COURSE,
  TAU,
  createRun,
  fling,
  goalSlots,
  goalStars,
  kindFor,
  loadSave,
  medalFor,
  missionsFor,
  settleRun,
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
          run = perfect(run);
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

function zoneSafe(run) {
  return Math.abs(run.progress - coreProgress(run)) <= run.perfectHalf * 0.5 && run.progress >= run.entryP;
}
