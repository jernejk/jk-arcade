import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, SEA, M, settle } from '../src/world.js';
import { greedyMesh } from '../src/mesher.js';
import {
  Match,
  makeRound,
  gunner,
  freshAim,
  fly,
  resolve,
  adjust,
  preview,
  launch,
  gridHit,
  GRAVITY,
} from '../src/duel.js';
const fixed = () => makeRound(824);
const fire = (r, i, a) => {
  assert.ok(r.tanks[i].stock[a.ammo] > 0);
  r.tanks[i].stock[a.ammo]--;
  return resolve(r, i, a.ammo, fly(r, i, a));
};

test('heading, elevation and power clamp and snap to whole steps', () => {
  const aim = freshAim();
  for (const [key, lo, hi] of [
    ['heading', -30, 30],
    ['angle', 5, 80],
    ['power', 10, 100],
  ]) {
    adjust(aim, key, -999);
    assert.equal(aim[key], lo);
    adjust(aim, key, 999);
    assert.equal(aim[key], hi);
    adjust(aim, key, (lo + hi) / 2 + 0.1);
    assert.ok(Number.isInteger(aim[key]));
  }
});
test('arena is seeded, mirror symmetric and has deep water between stable spawn piers', () => {
  const r = fixed(),
    w = r.world;
  for (let z = 0; z < 56; z++)
    for (let y = 0; y < 40; y += 2)
      for (let x = 0; x < 48; x++)
        assert.equal(w.get(x, y, z), w.get(x, y, 111 - z));
  assert.ok(w.top(24, 56) < SEA);
  assert.notEqual(w.checksum(), new World(42).checksum());
  for (const t of r.tanks) {
    const s = settle(w, t);
    assert.equal(s.tipped, false);
    assert.equal(t.hp, 100);
  }
});
test('the last ghost pip is at 35% of an ideal flight and wind moves only the real shell', () => {
  const r = fixed(),
    a = freshAim(),
    t = r.tanks[0],
    pips = preview(t, a),
    { origin, velocity } = launch(t, a);
  const duration =
    (velocity.y + Math.sqrt(velocity.y ** 2 + 2 * GRAVITY * (origin.y - t.y))) /
    GRAVITY;
  assert.ok(
    Math.abs((pips.at(-1).z - origin.z) / velocity.z / duration - 0.35) < 1e-9,
  );
  r.wind = { x: 0, y: 0, z: 0 };
  const still = fly(r, 0, a).p;
  r.wind = { x: 4, y: 0, z: 2 };
  assert.deepEqual(preview(t, a), pips);
  const windy = fly(r, 0, a).p;
  assert.ok(windy.x > still.x + 1 && windy.z > still.z);
});
test('3D grid traversal catches a single block crossed between two samples', () => {
  const w = fixed().world;
  w.set(18, 27, 52, M.teal);
  assert.equal(
    gridHit(w, { x: 12, y: 27.6, z: 52.3 }, { x: 25, y: 27.6, z: 52.3 }).x,
    18,
  );
  assert.equal(
    gridHit(w, { x: 12, y: 28.6, z: 52.3 }, { x: 25, y: 28.6, z: 52.3 }),
    null,
  );
});
test('flat Pebble hits the near cover row and splinters it before reaching Rivet', () => {
  const r = fixed(),
    a = { ...freshAim(), angle: 5 },
    s = fly(r, 0, a);
  assert.equal(s.hit, 'terrain');
  assert.equal(s.p.z, 44);
  const result = resolve(r, 0, 0, s);
  assert.ok(result.debris.some((p) => [M.teal, M.brass].includes(p.m)));
  assert.equal(r.tanks[1].hp, 100);
});
test('a Corkscrew cuts a continuous six-block bore through a thick barrier', () => {
  const r = fixed(),
    a = { ...freshAim(), angle: 5 };
  for (let z = 33; z < 44; z++)
    for (let y = 12; y < 17; y++) r.world.set(24, y, z, M.teal);
  const shot = fly(r, 0, a),
    res = resolve(r, 0, 1, shot);
  assert.equal(res.drill.length, 13);
  const end = res.drill.at(-1);
  assert.ok(
    Math.abs(
      Math.hypot(end.x - shot.p.x, end.y - shot.p.y, end.z - shot.p.z) - 6,
    ) < 1e-8,
  );
  for (const p of res.drill.slice(1))
    assert.equal(
      r.world.get(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)),
      0,
    );
});
test('Gull Strike spaces three craters across nine blocks and drifts sideways', () => {
  const r = fixed(),
    s = fly(r, 0, freshAim());
  const result = resolve(r, 0, 2, s);
  assert.equal(result.blasts.length, 3);
  const [a, b, c] = result.blasts;
  assert.ok(Math.abs(Math.hypot(c.x - a.x, c.z - a.z) - 9) < 1e-8);
  assert.equal(b.x, s.p.x + r.wind.x * 0.28);
});
test('water miss stops at the sea and leaves terrain and hulls intact', () => {
  const r = fixed(),
    before = r.world.checksum();
  const s = fly(r, 0, { ...freshAim(), power: 27, angle: 55 });
  assert.equal(s.hit, 'water');
  assert.equal(s.p.y, SEA);
  const result = resolve(r, 0, 0, s);
  assert.deepEqual(result.damage, [0, 0]);
  assert.equal(r.world.checksum(), before);
});
test('a direct Pebble knocks 18 off the target hull', () => {
  const r = fixed(),
    t = r.tanks[1];
  const res = resolve(r, 0, 0, {
    p: { x: t.x, y: t.y + 1.9, z: t.z - 1 },
    direct: 1,
    hit: 'tank',
    vector: { x: 0, y: -1, z: 0 },
  });
  assert.equal(res.damage[1], 18);
  assert.equal(t.hp, 82);
});
test('spherical carve leaves bedrock and the tough outer clay shell', () => {
  const w = fixed().world;
  w.set(10, 7, 50, M.clay);
  w.set(11, 7, 50, M.clay);
  w.set(12, 7, 50, M.clay);
  w.set(10, 8, 50, M.basalt);
  w.carve({ x: 10.5, y: 7.5, z: 50.5 }, 2.5);
  assert.equal(w.get(11, 7, 50), 0);
  assert.equal(w.get(12, 7, 50), M.clay);
  assert.equal(w.get(10, 8, 50), M.basalt);
});
test('dropping six blocks onto stable ground costs six hull points', () => {
  const r = fixed(),
    t = r.tanks[0];
  for (let x = 23; x <= 25; x++)
    for (let z = 29; z <= 31; z++)
      for (let y = 7; y < 13; y++) r.world.set(x, y, z, 0);
  t.y = 13;
  r.world.set(24, 6, 30, M.clay);
  const res = settle(r.world, t);
  assert.equal(res.drop, 6);
  assert.equal(t.hp, 94);
  assert.equal(t.sunk, false);
});
test('an undermined edge tips, slides and rings the tank out to end the round', () => {
  const r = fixed(),
    t = r.tanks[1];
  t.x = 24.5;
  t.z = 55.5;
  t.y = 12;
  // A narrow lip still touches three of nine footprint columns.
  for (let z = 54; z <= 56; z++) r.world.set(23, 11, z, M.teal);
  const result = resolve(r, 0, 0, {
    p: { x: 27, y: 12, z: 55 },
    direct: null,
    hit: 'terrain',
    vector: { x: 0, y: -1, z: 0 },
  });
  assert.ok(result.settles[1].tipped && t.x > 24.5);
  assert.ok(t.sunk);
  assert.equal(t.hp, 0);
  assert.equal(result.winner, 0);
});
test('greedy meshing merges two blocks and invalidates the neighbouring chunk at a seam', () => {
  const w = fixed().world;
  w.cells.fill(0);
  w.dirty.clear();
  w.set(14, 18, 48, M.sand);
  w.set(15, 18, 48, M.sand);
  const g = greedyMesh(w, 30);
  assert.equal(g.indices.length, 36);
  assert.ok(w.dirty.has(31));
  w.set(16, 18, 48, M.sand);
  assert.equal(greedyMesh(w, 30).indices.length, 30);
});
test('same seed and inputs give the same post-impact voxel checksum', () => {
  const run = () => {
    const r = fixed(),
      original = r.world.checksum();
    for (const [angle, power, ammo] of [
      [5, 72, 1],
      [43, 72, 0],
      [49, 64, 2],
    ])
      fire(r, 0, { heading: 0, angle, power, ammo });
    assert.notEqual(r.world.checksum(), original);
    return r.world.checksum();
  };
  assert.equal(run(), run());
});
test('Gunner damages Kettle by shot four on at least three of five seeded rounds', () => {
  let successes = 0;
  for (const seed of [1, 2, 3, 4, 5]) {
    const r = makeRound(seed);
    for (let i = 0; i < 4; i++) {
      fire(r, 0, freshAim());
      if (fire(r, 1, gunner(r)).damage[0]) {
        successes++;
        break;
      }
    }
  }
  assert.ok(successes >= 3, 'successful seeds: ' + successes);
});
test('best of three rebuilds terrain and stocks, awards medals and grants a loss rematch', () => {
  const m = new Match(14),
    r = m.round;
  fire(r, 0, { ...freshAim(), angle: 5, ammo: 1 });
  r.tanks[1].sunk = true;
  r.tanks[0].hp = 100;
  assert.equal(m.finish(0), false);
  assert.deepEqual([...m.medals], ['Undertow', 'Untouched']);
  m.nextRound();
  assert.notEqual(m.round.world, r.world);
  assert.equal(m.round.tanks[0].stock[1], 2);
  assert.equal(m.round.number, 2);
  assert.equal(m.finish(1), false);
  m.nextRound();
  assert.equal(m.round.number, 3);
  assert.equal(m.finish(1), true);
  const rematch = m.rematch();
  assert.equal(rematch.seed, 14);
  assert.deepEqual(rematch.score, [0, 0]);
  assert.equal(rematch.round.tanks[0].stock[1], 3);
});

test('stock Saltpan cargo encloses the six-block flat Corkscrew bore from either pier', () => {
  for (const shooter of [0, 1]) {
    const round = fixed(),
      aim = { ...freshAim(), angle: 5, ammo: 1 };
    const shot = fly(round, shooter, aim);
    const cell = (p) =>
      round.world.get(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
    const path = Array.from({ length: 13 }, (_, i) => {
      const d = i === 0 ? 0.01 : i / 2;
      return {
        x: shot.p.x + d * shot.vector.x,
        y: shot.p.y + d * shot.vector.y,
        z: shot.p.z + d * shot.vector.z,
      };
    });
    assert.ok(path.every((p) => cell(p) === M.teal));
    const result = resolve(round, shooter, 1, shot);
    assert.ok(result.debris.length > 20);
    assert.ok(path.every((p) => cell(p) === M.air));
    const mouth = path[0];
    for (const offset of [
      { x: -1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]) {
      assert.notEqual(
        cell({ ...mouth, x: mouth.x + offset.x, y: mouth.y + offset.y }),
        M.air,
      );
    }
  }
});
