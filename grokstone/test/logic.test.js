import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LEVELS,
  buy,
  collapseIds,
  coerceSave,
  dailyLayout,
  dailySeed,
  defaultSave,
  hashFor,
  layoutByNumber,
  loadSave,
  localDateString,
  parseHash,
  recordResult,
  seedLayout,
  shareText,
  stableIds,
  starsFor,
  weaponById,
  writeSave,
} from "../logic.js";

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test("every campaign keep stands until something is removed", () => {
  for (const level of LEVELS) {
    const layout = layoutByNumber(level.number, defaultSave());
    assert.equal(collapseIds(layout.blocks).length, 0, level.name);
    assert.ok(layout.blocks.some((b) => b.side === "enemy" && b.material === "banner"));
    assert.equal(stableIds(layout.blocks).size, layout.blocks.length);
  }
});

function fallenCols(layout, id) {
  const fallen = collapseIds(layout.blocks.map((b) => (b.id === id ? { ...b, hp: 0 } : b)));
  const cols = new Set(fallen.map((fid) => layout.blocks.find((b) => b.id === fid)?.col).filter((c) => c != null));
  return { fallen, cols };
}

test("the bonded foot brings down more than one column", () => {
  const layout = layoutByNumber(1, defaultSave());
  const banner = layout.blocks.find((b) => b.side === "enemy" && b.material === "banner");
  const feet = layout.blocks.filter((b) => b.side === "enemy" && b.material === "foundation");
  const foot = feet.sort((a, b) => Math.abs(a.x - banner.x) - Math.abs(b.x - banner.x))[0];
  const { fallen, cols } = fallenCols(layout, foot.id);
  assert.ok(fallen.includes(banner.id));
  assert.ok(cols.size >= 3, `cols ${[...cols]}`);
  const cap = layout.blocks.find((b) => b.side === "enemy" && b.material === "merlon");
  const nick = collapseIds(layout.blocks.map((b) => (b.id === cap.id ? { ...b, hp: 0 } : b)));
  assert.equal(nick.includes(banner.id), false);
});

test("the arch crown falls together when the keystone goes", () => {
  const layout = layoutByNumber(2, defaultSave());
  const key = layout.blocks.find((b) => b.material === "keystone" && b.side === "enemy");
  assert.ok(key);
  assert.equal(key.arch, true);
  const { fallen, cols } = fallenCols(layout, key.id);
  assert.ok(fallen.includes("ebanner"));
  assert.ok(cols.size >= 3, `cols ${[...cols]}`);
  assert.ok(fallen.length >= 8);
});

test("the bridge banner stands on the span", () => {
  const layout = layoutByNumber(5, defaultSave());
  const span = layout.blocks.find((b) => b.side === "enemy" && b.arch && b.material === "timber");
  const { fallen } = fallenCols(layout, span.id);
  assert.ok(fallen.includes("ebanner"));
  assert.ok(fallen.some((id) => id.startsWith("edeck")));
});

test("a daily keep is the same all day and different tomorrow", () => {
  const a = dailyLayout(defaultSave(), "2026-11-18");
  const b = dailyLayout(defaultSave(), "2026-11-18");
  const c = dailyLayout(defaultSave(), "2026-11-19");
  assert.equal(a.seed, b.seed);
  assert.deepEqual(a.blocks.map((block) => [block.id, block.x, block.y, block.material]), b.blocks.map((block) => [block.id, block.x, block.y, block.material]));
  assert.notEqual(a.seed, c.seed);
  assert.equal(collapseIds(a.blocks).length, 0);
  assert.notEqual(dailySeed("2026-11-18"), dailySeed("2026-11-19"));
});

test("stars, rubble and a shared seed stick", () => {
  assert.equal(starsFor(2, 2, true), 3);
  assert.equal(starsFor(4, 2, true), 2);
  assert.equal(starsFor(6, 2, true), 1);
  assert.equal(starsFor(1, 2, false), 0);
  const layout = layoutByNumber(1, defaultSave());
  let save = recordResult(defaultSave(), layout, { won: true, shots: 2, rubble: 11 });
  assert.equal(save.rubble, 11);
  assert.equal(save.best.foot.stars, 3);
  assert.equal(save.unlocked, 2);
  save = recordResult(save, layout, { won: true, shots: 1, rubble: 99 });
  assert.equal(save.rubble, 11, "a cleared keep does not pay twice");
  assert.equal(save.best.foot.shots, 1);
  const daily = dailyLayout(save, "2026-11-18");
  save = recordResult(save, daily, { won: true, shots: 4, rubble: 0 }, "2026-11-18");
  assert.equal(save.rubble, 19);
  assert.equal(save.daily.shots, 4);
  const older = dailyLayout(defaultSave(), "2026-11-16");
  save = recordResult(save, older, { won: true, shots: 1, rubble: 0 }, "2026-11-18");
  assert.equal(save.daily.date, "2026-11-18");
  assert.equal(save.daily.shots, 4);
  assert.equal(save.rubble, 19);
  save = recordResult(save, daily, { won: true, shots: 6, rubble: 0 }, "2026-11-18");
  assert.equal(save.daily.shots, 4);
  assert.equal(save.rubble, 19);
  const seeded = seedLayout(defaultSave(), 0xabc);
  save = recordResult(save, seeded, { won: true, shots: 3, rubble: 50 });
  assert.equal(save.seeds[(seeded.seed >>> 0).toString(36)], 3);
  assert.equal(save.rubble, 19);
});

test("the yard hires a crew once", () => {
  let save = defaultSave();
  save.rubble = 8;
  const hired = buy(save, "keg");
  assert.equal(hired.ok, true);
  assert.ok(hired.save.weapons.includes("keg"));
  assert.equal(hired.save.rubble, 0);
  const again = buy(hired.save, "keg");
  assert.equal(again.ok, false);
  assert.equal(again.reason, "owned");
  const broke = buy(defaultSave(), "boulder");
  assert.equal(broke.reason, "rubble");
});

test("saves survive junk and round-trip", () => {
  assert.equal(coerceSave(null).unlocked, 1);
  assert.deepEqual(coerceSave({ weapons: ["nope", "boulder", "boulder"], rubble: -4, unlocked: 99 }).weapons, ["roundshot", "boulder"]);
  const storage = memoryStorage();
  const save = defaultSave();
  save.rubble = 12;
  save.settings.muted = true;
  writeSave(storage, save);
  const loaded = loadSave(storage);
  assert.equal(loaded.rubble, 12);
  assert.equal(loaded.settings.muted, true);
  storage.setItem("grokstone-v1", "{");
  assert.equal(loadSave(storage).unlocked, 1);
});

test("share links reopen the same keep", () => {
  const daily = dailyLayout(defaultSave(), "2026-11-18");
  assert.equal(hashFor(daily), "#daily=2026-11-18");
  assert.equal(parseHash("#daily").mode, "daily");
  assert.equal(parseHash("#daily").date, undefined);
  assert.equal(parseHash(hashFor(daily)).date, "2026-11-18");
  assert.equal(dailyLayout(defaultSave(), parseHash(hashFor(daily)).date).seed, daily.seed);
  const seeded = seedLayout(defaultSave(), 123456);
  assert.equal(parseHash(hashFor(seeded)).seed, seeded.seed);
  assert.equal(parseHash("#l=4").number, 4);
  assert.equal(parseHash("#nope").mode, "campaign");
  const text = shareText(daily, { won: true, shots: 3, stars: 2 });
  assert.match(text, /Grokstone/);
  assert.match(text, /2026-11-18/);
  assert.match(text, /3 shots/);
  assert.match(shareText(daily, { won: true, shots: 1, stars: 3 }), /1 shot /);
});

test("a full quota does not throw, and upgrades do not move the rival keep", () => {
  const storage = {
    getItem() { return null; },
    setItem() { throw new Error("quota"); },
  };
  assert.equal(writeSave(storage, defaultSave()), false);
  const plain = dailyLayout(defaultSave(), "2026-11-18");
  const upgraded = defaultSave();
  upgraded.upgrades.buttress = true;
  upgraded.upgrades.thick = true;
  const shifted = dailyLayout(upgraded, "2026-11-18");
  const face = (layout) => layout.blocks.filter((block) => block.side === "enemy").map((block) => [block.id, block.x, block.y, block.material, block.variant]);
  assert.deepEqual(face(plain), face(shifted));
  assert.notEqual(
    plain.blocks.filter((block) => block.side === "player").length,
    shifted.blocks.filter((block) => block.side === "player").length,
  );
});

test("roundshot is the crew you start with", () => {
  assert.equal(weaponById("roundshot").crew, "Ida Flint");
  assert.equal(localDateString(new Date(2026, 10, 18)), "2026-11-18");
});
