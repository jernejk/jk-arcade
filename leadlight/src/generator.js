import { key, toPixel } from './hex.js';
import { makeRng } from './rng.js';
import { shapeCells } from './shapes.js';
import { boundsOf, rayCells, freeTiles, neighbourKeys, groupOf, analyseMove, applyMove, tileMap } from './board.js';
import { solveTiles } from './solver.js';

export const PIGMENTS = ['ruby', 'amber', 'gold', 'emerald', 'sapphire', 'amethyst'];

function weightedPick(rng, options) {
  let total = 0;
  for (const o of options) total += o.weight;
  let roll = rng.next() * total;
  for (const o of options) {
    roll -= o.weight;
    if (roll <= 0) return o;
  }
  return options[options.length - 1];
}

const isNeighbour = (a, b) => {
  const dq = b.q - a.q;
  const dr = b.r - a.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) === 1;
};

// Built backwards: each placement must be a legal move in a board holding only the panes placed before it.
export function placePanes(cells, rng, { fill, bias, keystones = 0, pairs = 0 }) {
  const bounds = boundsOf(cells);
  const mask = new Set(cells.map(([q, r]) => key(q, r)));
  const placed = new Map();
  const placement = [];
  const target = Math.max(1, Math.round(cells.length * fill));
  while (placed.size < target) {
    const options = [];
    for (const [q, r] of cells) {
      const k = key(q, r);
      if (placed.has(k)) continue;
      for (let dir = 0; dir < 6; dir++) {
        const ray = rayCells(bounds, q, r, dir);
        if (ray.some((c) => placed.has(c))) continue;
        let reach = 0;
        for (const c of ray) if (mask.has(c)) reach++;
        options.push({ q, r, k, dir, weight: (reach + 1) ** bias });
      }
    }
    if (!options.length) break;
    const step = placement.length;
    const roll = rng.next();
    if (keystones > 0 && (step === 0 || roll < keystones)) {
      const lonely = options.filter((o) => neighbourKeys(o.q, o.r).every((n) => !placed.has(n)));
      if (lonely.length) {
        const o = weightedPick(rng, lonely);
        placed.set(o.k, { q: o.q, r: o.r, dir: o.dir, keystone: true });
        placement.push(o.k);
        continue;
      }
    }
    if (pairs > 0 && placed.size + 2 <= target && ((step === 1 && keystones > 0) || (step === 0 && !keystones) || roll > 1 - pairs)) {
      const a = weightedPick(rng, options);
      const mates = options.filter((o) => o.k !== a.k && isNeighbour(a, o));
      if (mates.length) {
        const b = weightedPick(rng, mates);
        placed.set(a.k, { q: a.q, r: a.r, dir: a.dir, pair: b.k });
        placed.set(b.k, { q: b.q, r: b.r, dir: b.dir, pair: a.k });
        placement.push(a.k, b.k);
        continue;
      }
    }
    const o = weightedPick(rng, options);
    placed.set(o.k, { q: o.q, r: o.r, dir: o.dir });
    placement.push(o.k);
  }
  return { placed, placement, bounds };
}

export function layerCount(bounds, placed) {
  const tiles = new Map(placed);
  let layers = 0;
  while (tiles.size) {
    const free = freeTiles(bounds, tiles);
    if (!free.length) return Infinity;
    for (const k of free) if (tiles.has(k)) for (const g of groupOf(tiles, k)) tiles.delete(g);
    layers++;
  }
  return layers;
}

function centreOf(cells) {
  let sx = 0, sy = 0;
  for (const [q, r] of cells) {
    const p = toPixel(q, r);
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / cells.length, y: sy / cells.length };
}

function colourFor(pattern, q, r, centre, palette, rng) {
  const n = palette.length;
  const p = toPixel(q, r);
  const dx = p.x - centre.x;
  const dy = p.y - centre.y;
  const dist = Math.hypot(dx, dy);
  let i;
  switch (pattern) {
    case 'rings': i = Math.floor(dist / 1.6); break;
    case 'petals': i = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * Math.max(n, 6) + 0.5); break;
    case 'weave': i = (((q - r) % 3) + 3) % 3 + Math.floor(dist / 3.2) * 3; break;
    case 'bands': i = Math.floor((p.y + 40) / 3); break;
    default: i = rng.int(n);
  }
  return palette[((i % n) + n) % n];
}

function slideTraps(bounds, mask, tiles, order, wKey) {
  const sim = new Map(tiles);
  let lastTarget = null;
  let tried = 0;
  for (const k of order) {
    if (k === wKey) break;
    const m = analyseMove(bounds, mask, sim, wKey);
    if (m.type === 'slide' && m.to !== lastTarget) {
      lastTarget = m.to;
      const next = new Map(sim);
      applyMove(next, m);
      if (solveTiles(bounds, mask, next, { budget: 2500 }).status === 'stuck') return true;
      if (++tried >= 4) return false;
    }
    if (!sim.has(k)) continue;
    const step = analyseMove(bounds, mask, sim, k);
    if (step.type !== 'remove') return false;
    applyMove(sim, step);
  }
  return false;
}

// Prefers weights whose tempting early slide walls the window in, so the order of moves matters.
function addWeights(cells, tiles, order, count, rng) {
  if (!count) return 0;
  const bounds = boundsOf(cells);
  const mask = new Set(cells.map(([q, r]) => key(q, r)));
  const base = tileMap(tiles);
  const plain = rng.shuffle(tiles.filter((t) => !t.keystone && !t.pair));
  const traps = [];
  const rest = [];
  let checks = 0;
  for (const t of plain) {
    const k = key(t.q, t.r);
    if (traps.length >= count || checks >= 24) {
      rest.push(t);
      continue;
    }
    checks++;
    const trial = new Map(base);
    trial.set(k, { ...t, weighted: true });
    (slideTraps(bounds, mask, trial, order, k) ? traps : rest).push(t);
  }
  for (const t of [...traps, ...rest].slice(0, count)) t.weighted = true;
  return Math.min(traps.length, count);
}

function expandSolution(cells, tiles, order) {
  const bounds = boundsOf(cells);
  const mask = new Set(cells.map(([q, r]) => key(q, r)));
  const sim = tileMap(tiles);
  const moves = [];
  for (const k of order) {
    let at = k;
    for (let step = 0; step < 2 && sim.has(at); step++) {
      const m = analyseMove(bounds, mask, sim, at);
      if (m.type === 'bump') return null;
      applyMove(sim, m);
      moves.push(at);
      if (m.type === 'remove') break;
      at = m.to;
    }
  }
  return sim.size === 0 ? moves : null;
}

export function generateLevel(spec) {
  const rng = makeRng(spec.seed);
  const cells = shapeCells(spec.shape);
  const attempts = spec.attempts ?? 1;
  let best = null;
  for (let a = 0; a < attempts; a++) {
    const result = placePanes(cells, rng, spec);
    const free = freeTiles(result.bounds, result.placed).length;
    const layers = layerCount(result.bounds, result.placed);
    const score = layers * 4 - free + result.placed.size * 0.25;
    if (!best || score > best.score) best = { ...result, free, layers, score };
  }
  const palette = rng.shuffle([...PIGMENTS]).slice(0, Math.max(1, Math.min(6, spec.colours ?? 3)));
  const centre = centreOf(cells);
  const colours = new Map();
  const tiles = best.placement.map((k) => {
    const t = best.placed.get(k);
    const colour = colours.get(t.pair) ?? colourFor(spec.pattern, t.q, t.r, centre, palette, rng);
    colours.set(k, colour);
    const tile = { q: t.q, r: t.r, dir: t.dir, colour };
    if (t.keystone) tile.keystone = true;
    if (t.pair) tile.pair = t.pair;
    return tile;
  });
  const order = [...best.placement].reverse();
  const traps = addWeights(cells, tiles, order, spec.weighted ?? 0, rng);
  let solution = expandSolution(cells, tiles, order);
  if (!solution) {
    for (const t of tiles) delete t.weighted;
    solution = order;
  }
  return {
    id: spec.id,
    name: spec.name,
    cells,
    tiles,
    placement: [...best.placement],
    solution,
    cracks: spec.cracks ?? 3,
    stats: {
      panes: tiles.length,
      cells: cells.length,
      free: best.free,
      layers: best.layers,
      keystones: tiles.filter((t) => t.keystone).length,
      pairs: tiles.filter((t) => t.pair).length / 2,
      weighted: tiles.filter((t) => t.weighted).length,
      traps,
    },
  };
}
