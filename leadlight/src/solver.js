import { key } from './hex.js';
import { boundsOf, rayCells, analyseMove, applyMove, tileMap } from './board.js';

const OUT_OF_BUDGET = Symbol('budget');

function stateKey(tiles) {
  const parts = [];
  for (const [k, t] of tiles) parts.push(t.weighted ? `${k}w${t.dir}` : k);
  return parts.sort().join(' ');
}

function weightedRays(bounds, tiles) {
  const cover = new Map();
  for (const [k, t] of tiles) {
    if (!t.weighted) continue;
    for (const c of rayCells(bounds, t.q, t.r, t.dir)) cover.set(c, (cover.get(c) ?? 0) + 1);
  }
  return cover;
}

// Taking a pane that lies on no weighted pane's ray can't change where any weighted pane stops, so it never loses a solution.
function takeSafe(bounds, mask, tiles, moves, greedy) {
  let changed = true;
  while (changed && tiles.size) {
    changed = false;
    const rays = greedy ? new Map() : weightedRays(bounds, tiles);
    for (const k of [...tiles.keys()]) {
      const t = tiles.get(k);
      if (!t || rays.has(k) || (t.pair && rays.has(t.pair))) continue;
      const m = analyseMove(bounds, mask, tiles, k);
      if (m.type !== 'remove') continue;
      applyMove(tiles, m);
      moves.push(k);
      changed = true;
      if (t.weighted) break;
    }
  }
}

function searchFrom(bounds, mask, start, { budget = 20000, ms = Infinity, greedy = false } = {}) {
  const deadline = Date.now() + ms;
  const dead = new Set();
  let nodes = 0;
  function search(tiles) {
    const moves = [];
    takeSafe(bounds, mask, tiles, moves, greedy);
    if (!tiles.size) return moves;
    const id = stateKey(tiles);
    if (dead.has(id)) return null;
    if (++nodes > budget || (nodes % 64 === 0 && Date.now() > deadline)) throw OUT_OF_BUDGET;
    const options = [];
    for (const k of tiles.keys()) {
      const m = analyseMove(bounds, mask, tiles, k);
      if (m.type !== 'bump') options.push([k, m]);
    }
    options.sort((a, b) => (a[1].type === 'slide') - (b[1].type === 'slide'));
    for (const [k, m] of options) {
      const next = new Map(tiles);
      applyMove(next, m);
      const rest = search(next);
      if (rest) return [...moves, k, ...rest];
    }
    dead.add(id);
    return null;
  }
  try {
    const moves = search(new Map(start));
    return moves ? { status: 'solved', moves, nodes } : { status: 'stuck', nodes };
  } catch (e) {
    if (e === OUT_OF_BUDGET) return { status: 'unknown', nodes };
    throw e;
  }
}

// The greedy pass is quick and its answers are always real solutions; only the full search can prove a position is stuck.
export function solveTiles(bounds, mask, start, { budget = 20000, ms = Infinity } = {}) {
  const quick = searchFrom(bounds, mask, start, { budget: 4000, ms, greedy: true });
  if (quick.status === 'solved') return quick;
  return searchFrom(bounds, mask, start, { budget, ms });
}

export function solveLevel(level, options) {
  const bounds = boundsOf(level.cells);
  const mask = new Set(level.cells.map(([q, r]) => key(q, r)));
  return solveTiles(bounds, mask, tileMap(level.tiles), options);
}
