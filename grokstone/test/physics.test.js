import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";

const Matter = createRequire(import.meta.url)("matter-js");
globalThis.Matter = Matter;
const { Engine, Bodies, Body, Composite } = Matter;
import {
  WORLD,
  bestAim,
  defaultSave,
  integrate,
  layoutByNumber,
  shotVelocity,
  weaponById,
} from "../logic.js";
import {
  bannerStatus,
  consumeFx,
  createSiege,
  destroySiege,
  fireProjectile,
  forceSettle,
  isSettled,
  sideIntegrity,
  stepSiege,
  strikeBlock,
} from "../physics.js";

function finite(siege) {
  for (const body of siege.bodies.values()) {
    assert.ok(Number.isFinite(body.position.x) && Number.isFinite(body.position.y));
  }
}

function runShot(siege, layout, angle, power, weapon) {
  const vel = shotVelocity(weapon, angle, power);
  fireProjectile(siege, "player", weapon, vel, layout.playerCannon);
  for (let i = 0; i < 360; i++) {
    stepSiege(siege);
    finite(siege);
    if (isSettled(siege)) return i;
  }
  forceSettle(siege);
  return 360;
}

function staticBlocks(siege) {
  return [...siege.bodies.values()]
    .filter((body) => body.isStatic && body.grok.hp > 0)
    .map((body) => ({
      id: body.grok.id,
      side: body.grok.side,
      x: body.position.x,
      y: body.position.y,
      w: body.grok.w,
      h: body.grok.h,
      hp: body.grok.hp,
      material: body.grok.material,
      rooted: body.grok.rooted,
      arch: body.grok.arch,
      loose: false,
      col: body.grok.col,
      row: body.grok.row,
    }));
}

test("the preview arc matches Matter for a clear shot", () => {
  const weapon = weaponById("roundshot");
  const vel = shotVelocity(weapon, -0.7, 0.75);
  const engine = Engine.create();
  engine.gravity.y = 1;
  engine.gravity.x = 0.2;
  engine.gravity.scale = 0.001;
  const ball = Bodies.circle(40, 180, 7, { frictionAir: weapon.air, friction: 0, restitution: 0 });
  Composite.add(engine.world, ball);
  Body.setVelocity(ball, { x: vel.vx, y: vel.vy });
  const points = integrate(40, 180, vel.vx, vel.vy, 0.2, 40, weapon.air);
  let drift = 0;
  for (let i = 0; i < points.length; i++) {
    Engine.update(engine, 1000 / 60);
    drift = Math.max(drift, Math.abs(ball.position.x - points[i].x), Math.abs(ball.position.y - points[i].y));
  }
  assert.ok(drift < 1.5, `drift ${drift}`);
  assert.ok(points.at(-1).vy > points[0].vy);
  assert.ok(WORLD.groundTop > 500);
});

test("striking the bonded foot brings the banner down", () => {
  const layout = layoutByNumber(1, defaultSave());
  const siege = createSiege(layout);
  const banner = [...siege.bodies.values()].find((b) => b.grok.material === "banner" && b.grok.side === "enemy");
  const feet = [...siege.bodies.values()].filter((b) => b.grok.material === "foundation" && b.grok.side === "enemy");
  const foot = feet.sort((a, b) => Math.abs(a.position.x - banner.position.x) - Math.abs(b.position.x - banner.position.x))[0];
  strikeBlock(siege, foot.grok.id, 500);
  for (let i = 0; i < 240; i++) {
    stepSiege(siege);
    finite(siege);
    if (isSettled(siege) && i > 20) break;
  }
  assert.equal(bannerStatus(siege, "enemy"), "fallen");
  assert.equal(bannerStatus(siege, "player"), "up");
  destroySiege(siege);
});

test("a careful roundshot wins the first keep", () => {
  const layout = layoutByNumber(1, defaultSave());
  const siege = createSiege(layout);
  const weapon = weaponById("roundshot");
  let won = false;
  for (let shot = 0; shot < 4 && !won; shot++) {
    const aim = bestAim(layout.playerCannon, weapon, staticBlocks(siege), layout.wind, "player", false);
    assert.ok(aim.score > 0);
    runShot(siege, layout, aim.angle, aim.power, weapon);
    won = bannerStatus(siege, "enemy") !== "up";
    assert.equal(bannerStatus(siege, "player"), "up");
  }
  assert.equal(won, true);
  destroySiege(siege);
});

test("one roundshot does not clear Brackencrown", () => {
  const layout = layoutByNumber(8, defaultSave());
  const siege = createSiege(layout);
  const key = [...siege.bodies.values()].find((b) => b.grok.material === "keystone");
  strikeBlock(siege, key.grok.id, 130);
  for (let i = 0; i < 40; i++) stepSiege(siege);
  assert.equal(bannerStatus(siege, "enemy"), "up");
  strikeBlock(siege, key.grok.id, 9999);
  let nan = false;
  for (let i = 0; i < 180; i++) {
    stepSiege(siege);
    for (const body of siege.bodies.values()) if (!Number.isFinite(body.position.y)) nan = true;
    if (isSettled(siege) && i > 15) break;
  }
  const fallen = [...siege.bodies.values()].filter((b) => b.grok.side === "enemy" && !b.isStatic);
  const cols = new Set(fallen.map((b) => b.grok.col));
  assert.equal(nan, false);
  assert.equal(bannerStatus(siege, "enemy"), "fallen");
  assert.ok(cols.size >= 3);
  assert.ok(fallen.length >= 10);
  destroySiege(siege);
});

test("breaking a full stone lowers the keep, and a keg still bursts on rubble", () => {
  const layout = layoutByNumber(1, defaultSave());
  const siege = createSiege(layout);
  assert.equal(sideIntegrity(siege, "enemy"), 1);
  const foot = [...siege.bodies.values()].find((b) => b.grok.side === "enemy" && b.grok.material === "foundation");
  foot.grok.hp = foot.grok.maxHp / 2;
  const cracked = sideIntegrity(siege, "enemy");
  strikeBlock(siege, foot.grok.id, 9999);
  assert.ok(sideIntegrity(siege, "enemy") < cracked);
  const debris = siege.debris[0];
  assert.ok(debris);
  consumeFx(siege);
  const keg = weaponById("keg");
  fireProjectile(siege, "player", keg, { vx: 10, vy: 0 }, { x: debris.position.x - 30, y: debris.position.y });
  let exploded = false;
  for (let i = 0; i < 40 && !exploded; i++) {
    stepSiege(siege);
    exploded = consumeFx(siege).some((fx) => fx.kind === "explode");
  }
  assert.equal(exploded, true);
  destroySiege(siege);
});
