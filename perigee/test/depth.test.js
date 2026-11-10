import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KIND_COPY,
  TUNING,
  coreProgress,
  createRun,
  fling,
  goldWindowSeconds,
  kindFor,
  missionsFor,
  multiplierFor,
  nextDate,
  playRun,
  sampleSkill,
  rankFor,
  simulateWeek,
  step,
  zone,
} from "../logic.js";

function force(run, kind) {
  if (kind === "cash") return fling({ ...run, progress: run.echo.center });
  if (kind === "good") return fling({ ...run, progress: Math.min(run.exitP - 0.02, run.entryP + 0.04) });
  const core = coreProgress({ ...run, progress: run.centerP });
  return fling({ ...run, progress: core });
}

test("the opening orbit is steady and the next one is a twist", () => {
  assert.equal(kindFor(1, 0), "steady");
  assert.notEqual(kindFor(1, 1), "steady");
  const twists = new Set();
  for (let seed = 1; seed <= 12; seed++) twists.add(kindFor(seed, 1));
  assert.ok(twists.size >= 2);
});

test("an echo cashes the silver and still leaves the gold for later", () => {
  let run = createRun(3);
  while (run.kind !== "echo" && run.flings < 12) run = force(run, "perfect").run;
  assert.equal(run.kind, "echo");
  assert.ok(run.echo);
  assert.ok(run.echo.exit < run.entryP - 0.12, "silver overlaps gold");
  assert.ok(run.echo.entry > 0.2);
  const cashed = force(run, "cash");
  assert.equal(cashed.event.type, "cash");
  assert.equal(cashed.run.phase, "playing");
  assert.equal(cashed.run.combo, 0);
  assert.equal(cashed.run.cashes, 1);
  const later = force(cashed.run, "perfect");
  assert.equal(later.event.type, "perfect");
  assert.equal(later.run.echoThenPerfect, true);
});

test("passing the silver without tapping is not a death", () => {
  let run = createRun(8);
  while (run.kind !== "echo" && run.flings < 12) run = force(run, "perfect").run;
  const pastSilver = { ...run, progress: run.echo.exit + 0.08 };
  assert.equal(zone(pastSilver), "approach");
  const stepped = step(pastSilver, 1 / 120);
  assert.equal(stepped.run.phase, "playing");
});

test("a veil core stays dark until the moon arrives, then it counts", () => {
  let run = createRun(2);
  while (run.kind !== "veil" && run.flings < 20) run = force(run, "perfect").run;
  assert.equal(run.kind, "veil");
  const early = fling({ ...run, progress: run.entryP + 0.02 });
  assert.equal(early.event.type, "good");
  let again = createRun(2);
  while (again.kind !== "veil" && again.flings < 20) again = force(again, "perfect").run;
  const lit = force(again, "perfect");
  assert.equal(lit.event.type, "perfect");
  assert.equal(lit.run.veilPerfects, 1);
});

test("a rift perfect pays the arc back harder than a steady one", () => {
  let steady = createRun(1);
  const steadyArc = force(steady, "perfect").run.arcHalf;
  let rift = createRun(1);
  while (rift.kind !== "rift" && rift.flings < 24) rift = force(rift, "good").run;
  const before = rift.arcHalf;
  const after = force(rift, "perfect").run.arcHalf;
  assert.ok(after > before - TUNING.shrinkLate);
  assert.ok(after >= steadyArc - 0.5);
});

test("relic cores slide and bank a relic when you catch them", () => {
  let run = createRun(5);
  let guard = 0;
  while (run.kind !== "relic" && guard < 40) {
    run = force(run, "perfect").run;
    guard++;
  }
  assert.equal(run.kind, "relic");
  const hit = force(run, "perfect");
  assert.equal(hit.event.relicHit, true);
  assert.ok(hit.event.scoreGain >= TUNING.relicBonus);
  assert.equal(hit.run.relicsBanked, 1);
});

test("combo thirds raise the multiplier", () => {
  assert.equal(multiplierFor(2), 1);
  assert.equal(multiplierFor(3), 2);
  assert.equal(multiplierFor(6), 3);
  let run = createRun(1);
  for (let i = 0; i < 3; i++) run = force(run, "perfect").run;
  assert.equal(run.combo, 3);
  assert.ok(run.score > TUNING.perfectBase * 3);
});

test("quiet hour does not shrink and closes on the hour", () => {
  let run = createRun(4, "quiet");
  const arc = run.arcHalf;
  run = force(run, "good").run;
  assert.equal(run.arcHalf, arc);
  run.elapsed = TUNING.quietSeconds - 0.01;
  const closed = step(run, 0.02);
  assert.equal(closed.run.overReason, "hour");
});

test("seven nights rotate the goal and hand something new each day", () => {
  const week = simulateWeek("casual", "2026-11-10");
  const ids = week.days.map((d) => d.nightly);
  assert.equal(new Set(ids).size, 7);
  for (let i = 1; i < week.days.length; i++) {
    assert.notEqual(week.days[i].nightly, week.days[i - 1].nightly);
    const meaningful = week.days[i].gained.length > 0 || week.days[i].nightly !== week.days[0].nightly;
    assert.equal(meaningful, true);
  }
  assert.ok(week.days[0].gained.length > 0, `day 1 gained nothing: ${week.days[0].gained}`);
  assert.equal(week.save.quietUnlocked, true);
  assert.equal(week.save.days.length, 7);
  assert.equal(week.save.themes.includes("ink"), false);
  assert.equal(week.save.themes.includes("deep"), false);
  assert.equal(week.save.moons.includes("lyre"), false);
  assert.notEqual(rankFor(week.save), "Orrery");
  assert.equal(missionsFor(nextDate("2026-11-10")).nightly.id === missionsFor("2026-11-10").nightly.id, false);
});

test("skill bands separate, and beat-only play dies early", () => {
  const novice = sampleSkill("novice", 18);
  const casual = sampleSkill("casual", 18);
  const sharp = sampleSkill("sharp", 12);
  const beat = sampleSkill("beat", 18);
  const early = sampleSkill("early", 12);
  const random = sampleSkill("random", 12);
  assert.ok(sharp.score.p50 > novice.score.p50, `sharp ${sharp.score.p50} novice ${novice.score.p50}`);
  assert.ok(beat.time.p50 < 22, `beat median ${beat.time.p50}`);
  assert.ok(beat.flings ? beat.flings.p50 < 8 : true);
  assert.ok(early.time.p50 < 8, `early median ${early.time.p50}`);
  assert.ok(random.time.p50 < 18, `random median ${random.time.p50}`);
  assert.ok(novice.cruelRate < 0.2);
  assert.ok(goldWindowSeconds(createRun(1)) > 0.35);
});
