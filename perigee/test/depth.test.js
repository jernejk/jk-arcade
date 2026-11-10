import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KIND_COPY,
  TUNING,
  createRun,
  fling,
  goldWindowSeconds,
  kindFor,
  missionsFor,
  multiplierFor,
  nextDate,
  playRun,
  sampleSkill,
  simulateWeek,
  step,
  zone,
} from "../logic.js";

function force(run, kind) {
  const target = kind === "cash"
    ? run.echo.center
    : kind === "good"
      ? run.centerP + run.perfectHalf + 0.03
      : run.centerP;
  return fling({ ...run, progress: target });
}

test("the syllabus introduces one idea at a time", () => {
  assert.equal(kindFor(1, 0), "steady");
  assert.equal(kindFor(1, 2), "steady");
  assert.equal(kindFor(4, 3), "wild");
  assert.equal(kindFor(4, 5), "echo");
  assert.equal(kindFor(4, 8), "veil");
  assert.equal(kindFor(4, 11), "rift");
  assert.equal(kindFor(9, 6), "steady");
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

test("relic cores add a bonus and a banked relic", () => {
  let run = createRun(5);
  while (!run.relic && run.flings < 20) run = force(run, "good").run;
  assert.equal(run.relic, true);
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
  assert.ok(week.save.themes.includes("ink"));
  assert.equal(missionsFor(nextDate("2026-11-10")).nightly.id === missionsFor("2026-11-10").nightly.id, false);
});

test("skill bands stay inside a minute-and-a-bit and separate", () => {
  const novice = sampleSkill("novice", 24);
  const casual = sampleSkill("casual", 24);
  const sharp = sampleSkill("sharp", 24);
  for (const [name, row] of [["novice", novice], ["casual", casual], ["sharp", sharp]]) {
    assert.ok(row.time.p50 >= 40 && row.time.p50 <= 120, `${name} median ${row.time.p50}`);
    assert.ok(row.cruelRate < 0.15, `${name} cruel ${row.cruelRate}`);
  }
  assert.ok(sharp.score.p50 > casual.score.p50);
  assert.ok(casual.score.p50 > novice.score.p50);
  assert.ok(novice.cashes > 0);
  assert.ok(sharp.earlyRate < 0.2, `sharp early ${sharp.earlyRate}`);
  assert.ok(goldWindowSeconds(createRun(1)) > 0.8);
});
