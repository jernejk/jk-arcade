import { DIRS, key } from './hex.js';

export function boundsOf(cells) {
  let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;
  for (const [q, r] of cells) {
    if (q < minQ) minQ = q;
    if (q > maxQ) maxQ = q;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
  }
  return { minQ, maxQ, minR, maxR };
}

// Every direction moves q or r monotonically, so leaving the q/r box means the pane is off the window.
export function rayCells(bounds, q, r, dir) {
  const [dq, dr] = DIRS[dir];
  const out = [];
  let cq = q + dq;
  let cr = r + dr;
  while (cq >= bounds.minQ && cq <= bounds.maxQ && cr >= bounds.minR && cr <= bounds.maxR) {
    out.push(key(cq, cr));
    cq += dq;
    cr += dr;
  }
  return out;
}

export function firstBlocker(bounds, occupied, q, r, dir) {
  const [dq, dr] = DIRS[dir];
  let cq = q + dq;
  let cr = r + dr;
  while (cq >= bounds.minQ && cq <= bounds.maxQ && cr >= bounds.minR && cr <= bounds.maxR) {
    const k = key(cq, cr);
    if (occupied.has(k)) return k;
    cq += dq;
    cr += dr;
  }
  return null;
}

export function freeTiles(bounds, tiles) {
  const out = [];
  for (const [k, t] of tiles) if (!firstBlocker(bounds, tiles, t.q, t.r, t.dir)) out.push(k);
  return out;
}

// Clearing a pane only ever opens paths, so greedy removal decides solvability.
export function greedySolve(cells, tileList) {
  const bounds = boundsOf(cells);
  const tiles = new Map(tileList.map((t) => [key(t.q, t.r), t]));
  const order = [];
  let progress = true;
  while (tiles.size && progress) {
    progress = false;
    for (const [k, t] of tiles) {
      if (!firstBlocker(bounds, tiles, t.q, t.r, t.dir)) {
        tiles.delete(k);
        order.push(k);
        progress = true;
      }
    }
  }
  return { solved: tiles.size === 0, order, stuck: [...tiles.keys()] };
}

export function checkSolution(cells, tileList, order) {
  const bounds = boundsOf(cells);
  const tiles = new Map(tileList.map((t) => [key(t.q, t.r), t]));
  for (const k of order) {
    const t = tiles.get(k);
    if (!t || firstBlocker(bounds, tiles, t.q, t.r, t.dir)) return false;
    tiles.delete(k);
  }
  return tiles.size === 0;
}
