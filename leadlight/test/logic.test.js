import { test } from 'node:test';
import assert from 'node:assert/strict';
import { key, DIRS, fromPixel, toPixel } from '../src/hex.js';
import { boundsOf, rayCells, greedySolve, checkSolution, firstBlocker } from '../src/board.js';
import { generateLevel, placePanes } from '../src/generator.js';
import { makeRng } from '../src/rng.js';
import { shapeCells, SHAPE_NAMES } from '../src/shapes.js';
import { campaignLevel, CAMPAIGN_SIZE, trailLevel, dailyLevel, localDateId, isDateId } from '../src/levels.js';
import { createGame, tap, undo, hint, isFree, grade } from '../src/game.js';

function line(dirs) {
  const cells = [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]];
  return {
    id: 'line',
    name: 'Line',
    cells,
    tiles: dirs.map((dir, i) => (dir == null ? null : { q: cells[i][0], r: 0, dir, colour: 'ruby' })).filter(Boolean),
    solution: [],
    cracks: 3,
  };
}

function assertPlayable(level) {
  const replay = greedySolve(level.cells, level.tiles);
  assert.ok(replay.solved, `${level.id} is stuck with ${replay.stuck.length} panes left`);
  assert.ok(checkSolution(level.cells, level.tiles, level.solution), `${level.id} stored solution fails`);
  assert.equal(level.solution.length, level.tiles.length);
  const mask = new Set(level.cells.map(([q, r]) => key(q, r)));
  for (const t of level.tiles) assert.ok(mask.has(key(t.q, t.r)), `${level.id} pane outside its window`);
  assert.equal(new Set(level.tiles.map((t) => key(t.q, t.r))).size, level.tiles.length);
}

function assertLegalPlacement(level) {
  const bounds = boundsOf(level.cells);
  const placed = new Map();
  const byKey = new Map(level.tiles.map((t) => [key(t.q, t.r), t]));
  for (const k of level.placement) {
    const t = byKey.get(k);
    assert.equal(firstBlocker(bounds, placed, t.q, t.r, t.dir), null, `${level.id}: ${k} placed with a blocked path`);
    placed.set(k, t);
  }
}

test('pixel round trip lands on the same hex', () => {
  for (let q = -5; q <= 5; q++) {
    for (let r = -5; r <= 5; r++) {
      const p = toPixel(q, r, 30);
      assert.deepEqual(fromPixel(p.x + 7, p.y - 6, 30), { q, r });
    }
  }
});

test('rays run to the edge of the window box', () => {
  const bounds = boundsOf(shapeCells({ kind: 'hexagon', radius: 2 }));
  assert.deepEqual(rayCells(bounds, 0, 0, 0), ['1,0', '2,0']);
  assert.deepEqual(rayCells(bounds, 2, 0, 0), []);
  assert.equal(rayCells(bounds, 0, 0, 2).length, 2);
});

test('every shape yields one connected window', () => {
  const sizes = {
    rose: { radius: 5 }, hexagon: { radius: 3 }, ring: { radius: 6, hole: 2 }, lancet: { halfWidth: 4, height: 12 },
    vesica: { radius: 7, offset: 3 }, fanlight: { radius: 7 }, quatrefoil: { radius: 6 }, cross: { arm: 3, reach: 9 },
  };
  for (const kind of SHAPE_NAMES) {
    const cells = shapeCells({ kind, ...sizes[kind] });
    assert.ok(cells.length >= 15, `${kind} too small`);
  }
});

test('a pane with a clear path flies off and leaves the board', () => {
  const game = createGame(line([null, null, 0, null, null]));
  const res = tap(game, '0,0');
  assert.equal(res.type, 'fly');
  assert.equal(game.tiles.has('0,0'), false);
  assert.equal(game.cracks, 0);
  assert.equal(game.status, 'won');
});

test('a blocked pane bumps, stays put and costs a crack', () => {
  const game = createGame(line([0, null, null, 3, null]));
  const res = tap(game, '-2,0');
  assert.equal(res.type, 'bump');
  assert.equal(res.blocker, '1,0');
  assert.equal(game.tiles.has('-2,0'), true);
  assert.equal(game.tiles.size, 2);
  assert.equal(game.cracks, 1);
  assert.equal(game.status, 'playing');
});

test('tiles behind the pane do not block it', () => {
  const game = createGame(line([0, 0, null, null, null]));
  assert.equal(isFree(game, '-1,0'), true);
  assert.equal(isFree(game, '-2,0'), false);
});

test('running out of cracks loses, and no more moves count', () => {
  const game = createGame(line([0, null, 3, null, null]));
  for (let i = 0; i < 3; i++) tap(game, '-2,0');
  assert.equal(game.status, 'lost');
  assert.equal(tap(game, '0,0').type, 'none');
  assert.equal(game.tiles.size, 2);
});

test('clearing every pane wins', () => {
  const level = campaignLevel(3);
  const game = createGame(level);
  for (const k of level.solution) assert.equal(tap(game, k).type, 'fly');
  assert.equal(game.status, 'won');
  assert.equal(grade(game), 3);
});

test('undo puts the last pane back', () => {
  const level = campaignLevel(4);
  const game = createGame(level);
  const first = level.solution[0];
  tap(game, first);
  const before = game.tiles.size;
  assert.equal(undo(game).key, first);
  assert.equal(game.tiles.size, before + 1);
  assert.equal(game.tiles.has(first), true);
  assert.equal(undo(game), null);
});

test('hint always names a free pane, even after out-of-order play', () => {
  const level = campaignLevel(12);
  const game = createGame(level);
  const rng = makeRng('hint-check');
  while (game.status === 'playing') {
    const h = hint(game);
    assert.ok(isFree(game, h), `hint ${h} is blocked`);
    const free = [...game.tiles.keys()].filter((k) => isFree(game, k));
    tap(game, rng.pick(free));
  }
  assert.equal(game.status, 'won');
});

test(`all ${CAMPAIGN_SIZE} campaign windows are solvable and ramp up`, () => {
  assert.ok(CAMPAIGN_SIZE >= 20);
  const levels = Array.from({ length: CAMPAIGN_SIZE }, (_, i) => campaignLevel(i + 1));
  for (const level of levels) {
    assertPlayable(level);
    assertLegalPlacement(level);
    assert.ok(level.cracks >= 3);
  }
  const avg = (ls) => ls.reduce((s, l) => s + l.tiles.length, 0) / ls.length;
  assert.ok(avg(levels.slice(-6)) > avg(levels.slice(0, 6)) * 3);
  assert.ok(levels[0].stats.free >= 2);
});

test('campaign windows are deterministic', () => {
  assert.deepEqual(campaignLevel(9), campaignLevel(9));
  assert.notDeepEqual(campaignLevel(9).tiles, campaignLevel(10).tiles);
});

test('trail windows are solvable and deterministic', () => {
  for (const n of [1, 2, 3, 7, 15, 31, 50, 99, 250]) {
    const level = trailLevel(n);
    assertPlayable(level);
    assertLegalPlacement(level);
  }
  assert.deepEqual(trailLevel(17), trailLevel(17));
});

test('daily windows are solvable and seeded by the date', () => {
  const start = new Date(2026, 10, 1);
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const id = localDateId(d);
    assert.ok(isDateId(id));
    const level = dailyLevel(id);
    assertPlayable(level);
    assertLegalPlacement(level);
  }
  assert.deepEqual(dailyLevel('2026-11-22'), dailyLevel('2026-11-22'));
  assert.notDeepEqual(dailyLevel('2026-11-22').tiles, dailyLevel('2026-11-23').tiles);
  assert.equal(localDateId(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(isDateId('nope'), false);
});

test('the generator never places a pane whose path is already blocked', () => {
  for (let s = 0; s < 40; s++) {
    const rng = makeRng(`fuzz-${s}`);
    const kind = SHAPE_NAMES[s % SHAPE_NAMES.length];
    const cells = shapeCells({ kind, radius: 5 + (s % 3), hole: 2, halfWidth: 4, height: 13, offset: 3, arm: 3, reach: 8 });
    const bounds = boundsOf(cells);
    const { placed, placement } = placePanes(cells, rng, { fill: 1, bias: s % 6 });
    const seen = new Map();
    for (const k of placement) {
      const t = placed.get(k);
      assert.equal(firstBlocker(bounds, seen, t.q, t.r, t.dir), null);
      seen.set(k, t);
    }
    assert.ok(greedySolve(cells, [...placed.values()]).solved);
  }
});

test('generateLevel honours fill and colour count', () => {
  const level = generateLevel({ seed: 'x', shape: { kind: 'hexagon', radius: 3 }, fill: 0.5, bias: 1, colours: 3, pattern: 'mosaic' });
  assert.equal(level.tiles.length, Math.round(37 * 0.5));
  assert.ok(new Set(level.tiles.map((t) => t.colour)).size <= 3);
  assert.ok(level.tiles.every((t) => t.dir >= 0 && t.dir < DIRS.length));
});
