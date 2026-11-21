import { test } from 'node:test';
import assert from 'node:assert/strict';
import { key, DIRS, fromPixel, toPixel } from '../src/hex.js';
import { boundsOf, rayCells, replayMoves, firstBlocker } from '../src/board.js';
import { solveLevel } from '../src/solver.js';
import { generateLevel, placePanes } from '../src/generator.js';
import { makeRng } from '../src/rng.js';
import { shapeCells, SHAPE_NAMES } from '../src/shapes.js';
import { campaignLevel, CAMPAIGN_SIZE, trailLevel, dailyLevel, localDateId, isDateId } from '../src/levels.js';
import { createGame, tap, undo, hint, isFree, grade, solveFrom } from '../src/game.js';
import { defaultProgress, recordWin, isUnlocked } from '../src/storage.js';
import { neighbourKeys } from '../src/board.js';

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
  const search = solveLevel(level, { budget: 50000 });
  assert.equal(search.status, 'solved', `${level.id}: search found no solution (${search.status})`);
  assert.ok(replayMoves(level.cells, level.tiles, search.moves), `${level.id}: searched solution does not replay`);
  assert.ok(replayMoves(level.cells, level.tiles, level.solution), `${level.id}: stored solution fails`);
  const mask = new Set(level.cells.map(([q, r]) => key(q, r)));
  for (const t of level.tiles) assert.ok(mask.has(key(t.q, t.r)), `${level.id} pane outside its window`);
  assert.equal(new Set(level.tiles.map((t) => key(t.q, t.r))).size, level.tiles.length);
}

function assertLegalPlacement(level) {
  const bounds = boundsOf(level.cells);
  const placed = new Map();
  const byKey = new Map(level.tiles.map((t) => [key(t.q, t.r), t]));
  for (const k of level.placement) {
    if (placed.has(k)) continue;
    const t = byKey.get(k);
    const group = t.pair ? [t, byKey.get(t.pair)] : [t];
    if (t.pair) {
      assert.equal(byKey.get(t.pair).pair, k, `${level.id}: ${k} pair is not mutual`);
      assert.ok(neighbourKeys(t.q, t.r).includes(t.pair), `${level.id}: ${k} pair is not adjacent`);
      assert.ok(!t.keystone && !byKey.get(t.pair).keystone);
    }
    for (const g of group) {
      assert.equal(firstBlocker(bounds, placed, g.q, g.r, g.dir), null, `${level.id}: ${key(g.q, g.r)} placed with a blocked path`);
      if (g.keystone) assert.ok(neighbourKeys(g.q, g.r).every((n) => !placed.has(n)), `${level.id}: keystone ${k} placed beside a pane`);
    }
    for (const g of group) placed.set(key(g.q, g.r), g);
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

test('hint never points at an illegal move, even after slides and out-of-order play', () => {
  for (const level of [campaignLevel(12), campaignLevel(19), campaignLevel(24), trailLevel(40), dailyLevel('2026-11-22')]) {
    assert.ok(level.tiles.some((t) => t.keystone) && level.tiles.some((t) => t.pair) && level.tiles.some((t) => t.weighted), `${level.id} lacks the rules`);
    for (let run = 0; run < 4; run++) {
      const game = createGame(level);
      const rng = makeRng(`hint-check/${level.id}/${run}`);
      let steps = 0;
      let followHint = false;
      while (game.status === 'playing' && steps++ < 300) {
        const h = hint(game);
        if (h.stuck) {
          assert.ok(undo(game), `${level.id}: stuck with nothing to undo`);
          followHint = true;
          continue;
        }
        assert.ok(isFree(game, h.key), `${level.id}: hint ${h.key} is blocked`);
        const legal = [...game.tiles.keys()].filter((k) => isFree(game, k));
        const pick = followHint || rng.next() < 0.5 ? h.key : rng.pick(legal);
        followHint = false;
        assert.notEqual(tap(game, pick).type, 'bump');
      }
      assert.equal(game.status, 'won', `${level.id}: run ${run} did not finish`);
    }
  }
});

function ruleBoard(tiles) {
  const cells = [];
  for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) if (Math.abs(q + r) <= 3) cells.push([q, r]);
  return { id: 'rules', name: 'Rules', cells, tiles, solution: [], cracks: 3 };
}

test('a keystone tapped before its neighbours are gone bumps and stays', () => {
  const game = createGame(ruleBoard([
    { q: 0, r: 0, dir: 0, keystone: true, colour: 'gold' },
    { q: 0, r: -1, dir: 2, colour: 'ruby' },
  ]));
  const res = tap(game, '0,0');
  assert.equal(res.type, 'bump');
  assert.equal(res.reason, 'keystone');
  assert.equal(res.blocker, '0,-1');
  assert.equal(game.tiles.has('0,0'), true);
  assert.equal(game.cracks, 1);
  assert.equal(tap(game, '0,-1').type, 'fly');
  assert.equal(tap(game, '0,0').type, 'fly');
  assert.equal(game.status, 'won');
});

test('a keystone with a clear neighbourhood still needs a clear path', () => {
  const game = createGame(ruleBoard([
    { q: 0, r: 0, dir: 0, keystone: true, colour: 'gold' },
    { q: 2, r: 0, dir: 3, colour: 'ruby' },
  ]));
  assert.equal(tap(game, '0,0').reason, 'path');
  assert.equal(game.tiles.size, 2);
});

test('a leaded pair bumps when its partner is blocked and leaves together when both are clear', () => {
  const game = createGame(ruleBoard([
    { q: 0, r: 0, dir: 2, pair: '1,0', colour: 'emerald' },
    { q: 1, r: 0, dir: 0, pair: '0,0', colour: 'emerald' },
    { q: 3, r: 0, dir: 2, colour: 'ruby' },
  ]));
  const res = tap(game, '0,0');
  assert.equal(res.type, 'bump');
  assert.equal(res.reason, 'pair');
  assert.equal(res.from, '1,0');
  assert.equal(res.blocker, '3,0');
  assert.equal(game.tiles.size, 3);
  assert.equal(tap(game, '3,0').type, 'fly');
  const fly = tap(game, '1,0');
  assert.equal(fly.type, 'fly');
  assert.deepEqual(fly.keys.sort(), ['0,0', '1,0']);
  assert.equal(game.status, 'won');
});

test('a pane pointing at its own partner is not blocked by it', () => {
  const game = createGame(ruleBoard([
    { q: 0, r: 0, dir: 0, pair: '1,0', colour: 'emerald' },
    { q: 1, r: 0, dir: 0, pair: '0,0', colour: 'emerald' },
  ]));
  assert.equal(tap(game, '0,0').type, 'fly');
});

test('undo brings a leaded pair back together', () => {
  const game = createGame(ruleBoard([
    { q: 0, r: 0, dir: 2, pair: '1,0', colour: 'emerald' },
    { q: 1, r: 0, dir: 0, pair: '0,0', colour: 'emerald' },
    { q: -3, r: 0, dir: 3, colour: 'ruby' },
  ]));
  tap(game, '0,0');
  assert.equal(game.tiles.size, 1);
  const res = undo(game);
  assert.deepEqual(res.keys.sort(), ['0,0', '1,0']);
  assert.equal(game.tiles.get('0,0').pair, '1,0');
  assert.equal(game.tiles.size, 3);
});

function trapBoard() {
  return ruleBoard([
    { q: -2, r: 0, dir: 0, weighted: true, colour: 'sapphire' },
    { q: 1, r: 0, dir: 2, colour: 'ruby' },
    { q: 1, r: -1, dir: 4, colour: 'gold' },
  ]);
}

test('a weighted pane parks against the next pane instead of leaving', () => {
  const game = createGame(trapBoard());
  const res = tap(game, '-2,0');
  assert.equal(res.type, 'slide');
  assert.equal(res.to, '0,0');
  assert.equal(game.tiles.has('-2,0'), false);
  assert.equal(game.tiles.get('0,0').weighted, true);
  assert.equal(game.tiles.size, 3);
  assert.equal(game.cracks, 0);
});

test('a weighted pane with a clear run stops at the rim, then lifts out from there', () => {
  const game = createGame(ruleBoard([{ q: -2, r: 0, dir: 0, weighted: true, colour: 'sapphire' }]));
  const first = tap(game, '-2,0');
  assert.equal(first.type, 'slide');
  assert.equal(first.to, '3,0');
  assert.equal(game.status, 'playing');
  const second = tap(game, '3,0');
  assert.equal(second.type, 'fly');
  assert.equal(game.status, 'won');
});

test('a weighted pane with a pane right in front bumps and stays', () => {
  const game = createGame(ruleBoard([
    { q: 0, r: 0, dir: 0, weighted: true, colour: 'sapphire' },
    { q: 1, r: 0, dir: 2, colour: 'ruby' },
  ]));
  const res = tap(game, '0,0');
  assert.equal(res.type, 'bump');
  assert.equal(res.blocker, '1,0');
  assert.equal(game.tiles.has('0,0'), true);
  assert.equal(game.cracks, 1);
});

test('an early weighted slide can wall the window in, and undo gets it back', () => {
  const game = createGame(trapBoard());
  assert.equal(solveFrom(game).status, 'solved');
  assert.equal(tap(game, '-2,0').type, 'slide');
  assert.equal(solveFrom(game).status, 'stuck');
  assert.deepEqual(hint(game), { key: null, stuck: true, proven: true });
  for (const k of game.tiles.keys()) assert.equal(isFree(game, k), false, `${k} should be held`);
  const back = undo(game);
  assert.equal(back.kind, 'slide');
  assert.equal(game.tiles.get('-2,0').weighted, true);
  assert.equal(game.tiles.has('0,0'), false);
  const plan = solveFrom(game);
  assert.equal(plan.status, 'solved');
  assert.equal(hint(game).key, plan.moves[0]);
  for (const k of plan.moves) assert.notEqual(tap(game, k).type, 'bump');
  assert.equal(game.status, 'won');
});

test('weighted panes roll in from window 12 and later ones can trap you', () => {
  for (let n = 1; n < 12; n++) assert.equal(campaignLevel(n).tiles.filter((t) => t.weighted).length, 0);
  let trapped = 0;
  for (let n = 12; n <= 24; n++) {
    const level = campaignLevel(n);
    assert.ok(level.stats.weighted >= 1, `window ${n} has no weighted panes`);
    if (level.stats.traps > 0) trapped++;
  }
  assert.ok(trapped >= 10, `only ${trapped} late windows have a trapping slide`);
});

test('keystones and pairs roll in after the first windows', () => {
  const rules = (n) => {
    const l = campaignLevel(n);
    return { k: l.tiles.filter((t) => t.keystone).length, p: l.tiles.filter((t) => t.pair).length / 2 };
  };
  for (const n of [1, 2, 3]) assert.deepEqual(rules(n), { k: 0, p: 0 });
  assert.ok(rules(4).k >= 1);
  assert.equal(rules(7).p, 0);
  assert.ok(rules(8).p >= 1);
  let late = 0;
  for (let n = 18; n <= 24; n++) late += rules(n).k + rules(n).p;
  assert.ok(late >= 50, `late windows only have ${late} rule panes`);
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

test('the generator never places a pane that the rules would hold in place', () => {
  for (let s = 0; s < 40; s++) {
    const rng = makeRng(`fuzz-${s}`);
    const kind = SHAPE_NAMES[s % SHAPE_NAMES.length];
    const cells = shapeCells({ kind, radius: 5 + (s % 3), hole: 2, halfWidth: 4, height: 13, offset: 3, arm: 3, reach: 8 });
    const { placed, placement } = placePanes(cells, rng, { fill: 1, bias: s % 6, keystones: (s % 4) * 0.08, pairs: (s % 3) * 0.1 });
    const tiles = placement.map((k) => ({ ...placed.get(k), colour: 'ruby' }));
    const level = { id: `fuzz-${s}`, cells, tiles, placement, solution: [...placement].reverse() };
    assertLegalPlacement(level);
    assertPlayable(level);
  }
});

test('generateLevel honours fill and colour count', () => {
  const level = generateLevel({ seed: 'x', shape: { kind: 'hexagon', radius: 3 }, fill: 0.5, bias: 1, colours: 3, pattern: 'mosaic' });
  assert.equal(level.tiles.length, Math.round(37 * 0.5));
  assert.ok(new Set(level.tiles.map((t) => t.colour)).size <= 3);
  assert.ok(level.tiles.every((t) => t.dir >= 0 && t.dir < DIRS.length));
});

test('winning a window unlocks only the next one, in order', () => {
  const p = defaultProgress();
  assert.equal(isUnlocked(p, 1), true);
  assert.equal(isUnlocked(p, 2), false);
  recordWin(p, { kind: 'campaign', number: 1 }, 3, 24);
  assert.equal(p.unlocked, 2);
  recordWin(p, { kind: 'campaign', number: 20 }, 3, 24);
  assert.equal(p.unlocked, 2);
  assert.equal(p.best[20], undefined);
  recordWin(p, { kind: 'campaign', number: 2 }, 1, 24);
  recordWin(p, { kind: 'campaign', number: 1 }, 2, 24);
  assert.equal(p.unlocked, 3);
  assert.equal(p.best[1], 3);
  p.unlocked = 24;
  recordWin(p, { kind: 'campaign', number: 24 }, 3, 24);
  assert.equal(p.unlocked, 24);
});
