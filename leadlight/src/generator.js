import { key, toPixel } from './hex.js';
import { makeRng } from './rng.js';
import { shapeCells } from './shapes.js';
import { boundsOf, rayCells, freeTiles } from './board.js';

export const PIGMENTS = ['ruby', 'amber', 'gold', 'emerald', 'sapphire', 'amethyst'];

export function placePanes(cells, rng, { fill, bias }) {
  const bounds = boundsOf(cells);
  const mask = new Set(cells.map(([q, r]) => key(q, r)));
  const placed = new Map();
  const placement = [];
  const target = Math.max(1, Math.round(cells.length * fill));
  while (placed.size < target) {
    const options = [];
    let total = 0;
    for (const [q, r] of cells) {
      const k = key(q, r);
      if (placed.has(k)) continue;
      for (let dir = 0; dir < 6; dir++) {
        const ray = rayCells(bounds, q, r, dir);
        if (ray.some((c) => placed.has(c))) continue;
        let reach = 0;
        for (const c of ray) if (mask.has(c)) reach++;
        const weight = (reach + 1) ** bias;
        total += weight;
        options.push({ q, r, k, dir, weight });
      }
    }
    if (!options.length) break;
    let roll = rng.next() * total;
    let choice = options[options.length - 1];
    for (const o of options) {
      roll -= o.weight;
      if (roll <= 0) {
        choice = o;
        break;
      }
    }
    placed.set(choice.k, { q: choice.q, r: choice.r, dir: choice.dir });
    placement.push(choice.k);
  }
  return { placed, placement, bounds };
}

export function layerCount(bounds, placed) {
  const tiles = new Map(placed);
  let layers = 0;
  while (tiles.size) {
    const free = freeTiles(bounds, tiles);
    if (!free.length) return Infinity;
    for (const k of free) tiles.delete(k);
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
  const tiles = best.placement.map((k) => {
    const t = best.placed.get(k);
    return { q: t.q, r: t.r, dir: t.dir, colour: colourFor(spec.pattern, t.q, t.r, centre, palette, rng) };
  });
  return {
    id: spec.id,
    name: spec.name,
    cells,
    tiles,
    placement: [...best.placement],
    solution: [...best.placement].reverse(),
    cracks: spec.cracks ?? 3,
    stats: { panes: tiles.length, cells: cells.length, free: best.free, layers: best.layers },
  };
}
