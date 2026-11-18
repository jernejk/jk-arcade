import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LEVELS,
  aimToward,
  buy,
  cleverClear,
  collapseIds,
  coerceSave,
  dailyLayout,
  dailySeed,
  defaultSave,
  hashFor,
  hookYields,
  layoutByNumber,
  missingStar,
  loadSave,
  localDateString,
  parseHash,
  recordResult,
  sampleAims,
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

test("the banner stays until both supports under it are gone", () => {
  const layout = layoutByNumber(1, defaultSave());
  const banner = layout.blocks.find((b) => b.id === "ebanner");
  const host = layout.blocks.find((b) => banner.neighbors.below.includes(b.id));
  assert.ok(host.neighbors.below.length >= 2);
  for (const id of host.neighbors.below) {
    const { fallen } = fallenCols(layout, id);
    assert.equal(fallen.includes("ebanner"), false, id);
  }
  const both = collapseIds(layout.blocks.map((b) => (host.neighbors.below.includes(b.id) ? { ...b, hp: 0 } : b)));
  assert.ok(both.includes("ebanner"));
  assert.ok(both.includes(host.id));
  assert.ok(both.length >= 4);
  const foundation = fallenCols(layout, "e0x0");
  assert.equal(foundation.fallen.includes("ebanner"), false);
});

test("a two-support course survives losing one support", () => {
  const blocks = [
    { id: "footA", side: "enemy", x: 0, y: 40, w: 32, h: 20, hp: 10, rooted: true, neighbors: { below: [], left: [], right: [], above: ["course"] } },
    { id: "footB", side: "enemy", x: 34, y: 40, w: 32, h: 20, hp: 10, rooted: true, neighbors: { below: [], left: [], right: [], above: ["course"] } },
    { id: "course", side: "enemy", x: 17, y: 18, w: 32, h: 20, hp: 10, neighbors: { below: ["footA", "footB"], left: [], right: [], above: ["cloth"] } },
    { id: "cloth", side: "enemy", x: 17, y: -16, w: 16, h: 34, hp: 10, material: "banner", neighbors: { below: ["course"], left: [], right: [], above: [] } },
  ];
  assert.equal(collapseIds(blocks).includes("cloth"), false);
  const one = collapseIds(blocks.map((b) => (b.id === "footA" ? { ...b, hp: 0 } : b)));
  assert.equal(one.includes("cloth"), false);
  assert.equal(one.includes("course"), false);
  const both = collapseIds(blocks.map((b) => (b.id === "footA" || b.id === "footB" ? { ...b, hp: 0 } : b)));
  assert.ok(both.includes("course"));
  assert.ok(both.includes("cloth"));
});

test("the arch crown falls when the keystone goes, and the door is in the middle", () => {
  const layout = layoutByNumber(2, defaultSave());
  const key = layout.blocks.find((b) => b.material === "keystone" && b.side === "enemy");
  assert.equal(key.col, 2);
  assert.equal(layout.blocks.some((b) => b.side === "enemy" && b.col === key.col && (b.row === 1 || b.row === 2)), false);
  assert.equal(key.pin, true);
  const { fallen } = fallenCols(layout, key.id);
  assert.ok(fallen.includes("ebanner"));
  assert.ok(fallen.includes("elintel"));
  assert.ok(fallen.length >= 4);
  const foot = fallenCols(layout, "e0x0");
  assert.equal(foot.fallen.includes("ebanner"), false);
});

test("a single hook pluck cannot clear Brackencrown", () => {
  const layout = layoutByNumber(8, defaultSave());
  const enemy = layout.blocks.filter((b) => b.side === "enemy" && b.material !== "banner");
  const key = enemy.find((b) => b.material === "keystone");
  assert.equal(key.heavy, true);
  assert.ok(enemy.some((b) => b.heavy && b.material === "stone"));
  for (const block of enemy) {
    if (block.heavy) continue;
    const plucked = collapseIds(layout.blocks.map((b) => (b.id === block.id ? { ...b, loose: true } : b)));
    assert.equal(plucked.includes("ebanner"), false, block.id);
  }
  const spent = collapseIds(layout.blocks.map((b) => (b.id === key.id ? { ...b, hp: 0 } : b)));
  assert.ok(spent.includes("ebanner"));
  const keg = enemy.find((b) => b.material === "keg");
  assert.ok(keg);
  assert.ok(keg.col >= 0 && keg.row >= 0, "the keg is in the masonry");
  const popped = collapseIds(layout.blocks.map((b) => (b.id === keg.id ? { ...b, hp: 0 } : b)));
  assert.equal(popped.includes("ebanner"), false);
});

test("Pantry Fuse comes down by the two casks, not by one ball", () => {
  const layout = layoutByNumber(4, defaultSave());
  const banner = layout.blocks.find((b) => b.id === "ebanner");
  const host = layout.blocks.find((b) => banner.neighbors.below.includes(b.id));
  const kegs = host.neighbors.below.map((id) => layout.blocks.find((b) => b.id === id));
  assert.equal(kegs.length, 2);
  assert.ok(kegs.every((keg) => keg.material === "keg"));
  for (const keg of kegs) {
    assert.ok(keg.maxHp > weaponById("roundshot").damage + weaponById("roundshot").speed[1] * weaponById("roundshot").speedDamage);
    assert.equal(collapseIds(layout.blocks.map((b) => (b.id === keg.id ? { ...b, hp: 0 } : b))).includes("ebanner"), false);
  }
  const both = collapseIds(layout.blocks.map((b) => (kegs.some((keg) => keg.id === b.id) ? { ...b, hp: 0 } : b)));
  assert.ok(both.includes("ebanner"));
  const pot = weaponById("keg");
  const potHit = pot.damage + pot.speed[1] * pot.speedDamage + pot.explode * 0.85;
  assert.ok(potHit > kegs[0].maxHp);
});

test("High Merlon's gold stone is heavy until it cracks", () => {
  const layout = layoutByNumber(7, defaultSave());
  const key = layout.blocks.find((b) => b.side === "enemy" && b.material === "keystone");
  assert.equal(key.heavy, true);
  assert.equal(hookYields(key), false);
  assert.equal(hookYields({ ...key, hp: key.maxHp * 0.8 }), true);
  const ball = weaponById("roundshot");
  const maxBall = ball.damage + ball.speed[1] * ball.speedDamage;
  assert.ok(Math.ceil(key.maxHp / maxBall) > layout.par);
  const hook = weaponById("harpoon");
  const maxHook = hook.damage + hook.speed[1] * hook.speedDamage;
  let hp = key.maxHp;
  let hooks = 0;
  while (hp / key.maxHp > 0.84 && hooks < 8) {
    hp -= maxHook;
    hooks += 1;
  }
  assert.ok(hooks + 1 <= layout.par);
});

test("a roundshot cannot finish Brackencrown inside par, and the hook cannot pluck it", () => {
  const layout = layoutByNumber(8, defaultSave());
  const key = layout.blocks.find((b) => b.side === "enemy" && b.material === "keystone");
  const livedBoulder = 144;
  const livedBall = 120;
  assert.equal(key.sealed, true);
  assert.equal(hookYields({ ...key, hp: 1 }), false);
  assert.ok(4 * livedBoulder < key.maxHp);
  assert.ok(5 * livedBoulder >= key.maxHp);
  assert.ok(Math.ceil(key.maxHp / livedBall) > layout.par);
});

test("the bonded keeps ask for different shots", () => {
  const feetOf = (layout) => {
    const host = layout.blocks.find((b) => b.id === "elintel" && b.side === "enemy");
    return host.neighbors.below.map((id) => layout.blocks.find((b) => b.id === id));
  };
  const foot = feetOf(layoutByNumber(1, defaultSave()));
  const barn = feetOf(layoutByNumber(3, defaultSave()));
  const butt = feetOf(layoutByNumber(6, defaultSave()));
  assert.ok(foot.some((b) => b.material === "keystone"));
  assert.ok(foot.some((b) => b.material === "stone"));
  assert.ok(barn.every((b) => b.material === "timber" && b.arch));
  const gold = butt.find((b) => b.material === "keystone");
  assert.equal(gold.sealed, true);
  assert.equal(missingStar(layoutByNumber(1, defaultSave()), 2, true), "The third star wanted the gold foot.");
  assert.equal(missingStar(layoutByNumber(1, defaultSave()), 3, true), "");
});

test("a daily keep does not rest on one timber or one keg", () => {
  for (let day = 1; day <= 28; day++) {
    const layout = dailyLayout(defaultSave(), `2026-11-${String(day).padStart(2, "0")}`);
    assert.equal(collapseIds(layout.blocks).length, 0, layout.date);
    for (const block of layout.blocks) {
      if (block.side !== "enemy" || (block.material !== "timber" && block.material !== "keg")) continue;
      const fallen = collapseIds(layout.blocks.map((b) => (b.id === block.id ? { ...b, hp: 0 } : b)));
      assert.equal(fallen.includes("ebanner"), false, `${layout.date} ${block.id}`);
    }
  }
});

test("three stars want the clever shot", () => {
  assert.equal(starsFor(2, 3, true, false), 2);
  assert.equal(starsFor(2, 3, true, true), 3);
  assert.equal(starsFor(5, 3, true, true), 2);
  assert.equal(starsFor(8, 3, true, true), 1);
  const layout = layoutByNumber(2, defaultSave());
  const key = layout.blocks.find((b) => b.side === "enemy" && b.material === "keystone");
  assert.equal(cleverClear(layout.blocks, [{ id: key.id, material: "keystone", side: "enemy" }]), true);
  assert.equal(cleverClear(layout.blocks, [{ id: "e0x0", material: "foundation", side: "enemy" }]), false);
});

test("the bridge banner stands on the span, and the span is the shot", () => {
  const layout = layoutByNumber(5, defaultSave());
  const span = layout.blocks.find((b) => b.side === "enemy" && b.arch && b.material === "timber");
  assert.ok(span.maxHp < 80);
  const { fallen } = fallenCols(layout, span.id);
  assert.ok(fallen.includes("ebanner"));
  const aims = sampleAims(layout.playerCannon, weaponById("roundshot"), layout.blocks, layout.wind, "player", false);
  assert.ok(aims.some((aim) => aim.targetId === span.id));
  const foot = fallenCols(layout, "e0x0");
  assert.equal(foot.fallen.includes("ebanner"), false);
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
  assert.equal(starsFor(2, 2, true, true), 3);
  assert.equal(starsFor(2, 2, true, false), 2);
  assert.equal(starsFor(4, 2, true, true), 2);
  assert.equal(starsFor(6, 2, true), 1);
  assert.equal(starsFor(1, 2, false), 0);
  const layout = layoutByNumber(1, defaultSave());
  let save = recordResult(defaultSave(), layout, { won: true, shots: 2, rubble: 11 });
  assert.equal(save.rubble, 11);
  assert.equal(save.best.foot.stars, 2);
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
  save.dailyBonusDate = "2026-11-18";
  writeSave(storage, save);
  const loaded = loadSave(storage);
  assert.equal(loaded.rubble, 12);
  assert.equal(loaded.settings.muted, true);
  assert.equal(loaded.dailyBonusDate, "2026-11-18");
  assert.equal(coerceSave({ dailyBonusDate: "2026-11-18" }).dailyBonusDate, "2026-11-18");
  assert.equal(coerceSave({ dailyBonusDate: "yesterday" }).dailyBonusDate, null);
  const daily = dailyLayout(defaultSave(), "2026-11-18");
  const paid = recordResult(defaultSave(), daily, { won: true, shots: 3, rubble: 0 }, "2026-11-18");
  const reloaded = coerceSave(JSON.parse(JSON.stringify(paid)));
  assert.equal(reloaded.dailyBonusDate, "2026-11-18");
  const farmed = recordResult(reloaded, daily, { won: true, shots: 3, rubble: 0 }, "2026-11-18");
  assert.equal(farmed.rubble, paid.rubble);
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

function beamFeet(layout) {
  const banner = layout.blocks.find((b) => b.side === "enemy" && b.material === "banner");
  const host = banner && layout.blocks.find((b) => (banner.neighbors.below || []).includes(b.id));
  const ids = new Set((host && host.neighbors.below) || []);
  if (host && !ids.size) ids.add(host.id);
  const key = layout.blocks.find((b) => b.side === "enemy" && b.material === "keystone");
  if (key) ids.add(key.id);
  return [...ids].map((id) => layout.blocks.find((b) => b.id === id)).filter(Boolean);
}

test("a pointer on a foot outlines that foot, not the neighbour", () => {
  const sheltered = [];
  for (let number = 1; number <= 9; number++) {
    const layout = layoutByNumber(number, defaultSave());
    for (const foot of beamFeet(layout)) {
      const weapons = ["roundshot", "harpoon", "boulder"].map((id) => weaponById(id));
      const reached = weapons.filter((weapon) => {
        const aim = aimToward(layout.playerCannon, { x: foot.x, y: foot.y }, weapon, layout.blocks, layout.wind, "player");
        return aim && aim.hit && aim.hit.id === foot.id;
      });
      if (!reached.length) {
        sheltered.push(`${number}:${foot.id}`);
        continue;
      }
      const points = [
        [0, 0],
        [foot.w * 0.32, 0],
        [-foot.w * 0.32, 0],
        [0, foot.h * 0.28],
        [0, -foot.h * 0.28],
      ];
      for (const weapon of reached) {
        for (const [dx, dy] of points) {
          const aim = aimToward(
            layout.playerCannon,
            { x: foot.x + dx, y: foot.y + dy },
            weapon,
            layout.blocks,
            layout.wind,
            "player",
          );
          assert.equal(
            aim && aim.hit && aim.hit.id,
            foot.id,
            `${layout.name} ${weapon.id} on ${foot.id} at ${dx.toFixed(1)},${dy.toFixed(1)} outlined ${aim && aim.hit && aim.hit.id}`,
          );
          assert.notEqual(aim.hit.id, "elintel");
        }
      }
    }
  }
  assert.deepEqual(sheltered, ["2:ehaunchR", "7:ehaunchR", "8:ehaunchR"]);
  const barn = layoutByNumber(3, defaultSave());
  const timber = barn.blocks.find((b) => b.id === "e0x7");
  const hook = aimToward(barn.playerCannon, { x: timber.x, y: timber.y }, weaponById("harpoon"), barn.blocks, barn.wind, "player");
  assert.equal(hook.hit.id, "e0x7");
  assert.notEqual(hook.hit.id, "e1x7");
});

test("Bram is affordable before Low Buttress if you hired Sable and Puck", () => {
  let save = defaultSave();
  const pay = (number) => {
    save = recordResult(save, layoutByNumber(number, save), { won: true, shots: 3, rubble: 7, clever: true });
  };
  pay(1);
  pay(2);
  let hired = buy(save, "harpoon");
  assert.equal(hired.ok, true);
  save = hired.save;
  pay(3);
  hired = buy(save, "keg");
  assert.equal(hired.ok, true);
  save = hired.save;
  pay(4);
  pay(5);
  assert.ok(save.rubble >= 15, `rubble ${save.rubble}`);
  hired = buy(save, "boulder");
  assert.equal(hired.ok, true);
});

test("the second siege and today's keep lend one extra crew", () => {
  const trail = layoutByNumber(9, defaultSave());
  assert.match(trail.name, /Second siege/);
  assert.equal(trail.weapons.length, 2);
  assert.equal(trail.weapons[0], "roundshot");
  const daily = dailyLayout(defaultSave(), "2026-11-18");
  assert.equal(daily.weapons.length, 2);
  assert.equal(daily.weapons[0], "roundshot");
  assert.notEqual(daily.weapons[1], "roundshot");
});

test("roundshot is the crew you start with", () => {
  assert.equal(weaponById("roundshot").crew, "Ida Flint");
  assert.equal(localDateString(new Date(2026, 10, 18)), "2026-11-18");
});
