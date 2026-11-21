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

const inBox = (b, q, r) => q >= b.minQ && q <= b.maxQ && r >= b.minR && r <= b.maxR;

// Every direction moves q or r monotonically, so leaving the q/r box means the pane is off the window.
export function rayCells(bounds, q, r, dir) {
  const [dq, dr] = DIRS[dir];
  const out = [];
  for (let cq = q + dq, cr = r + dr; inBox(bounds, cq, cr); cq += dq, cr += dr) out.push(key(cq, cr));
  return out;
}

export function firstBlocker(bounds, occupied, q, r, dir, ignore = null) {
  const [dq, dr] = DIRS[dir];
  for (let cq = q + dq, cr = r + dr; inBox(bounds, cq, cr); cq += dq, cr += dr) {
    const k = key(cq, cr);
    if (k !== ignore && occupied.has(k)) return k;
  }
  return null;
}

export function neighbourKeys(q, r) {
  return DIRS.map(([dq, dr]) => key(q + dq, r + dr));
}

export function moveBlocker(bounds, tiles, k) {
  const t = tiles.get(k);
  if (t.keystone) {
    for (const n of neighbourKeys(t.q, t.r)) if (tiles.has(n)) return { key: n, reason: 'keystone', from: k };
  }
  const own = firstBlocker(bounds, tiles, t.q, t.r, t.dir, t.pair);
  if (own) return { key: own, reason: 'path', from: k };
  const p = t.pair && tiles.get(t.pair);
  if (p) {
    const other = firstBlocker(bounds, tiles, p.q, p.r, p.dir, k);
    if (other) return { key: other, reason: 'pair', from: t.pair };
  }
  return null;
}

export function groupOf(tiles, k) {
  const t = tiles.get(k);
  return t.pair && tiles.has(t.pair) ? [k, t.pair] : [k];
}

export function freeTiles(bounds, tiles) {
  const out = [];
  for (const k of tiles.keys()) if (!moveBlocker(bounds, tiles, k)) out.push(k);
  return out;
}

const tileMap = (tileList) => new Map(tileList.map((t) => [key(t.q, t.r), t]));

// Clearing panes only ever opens paths and frees keystones, so greedy removal decides solvability.
export function greedySolve(cells, tileList) {
  const bounds = boundsOf(cells);
  const tiles = tileMap(tileList);
  const order = [];
  let progress = true;
  while (tiles.size && progress) {
    progress = false;
    for (const k of [...tiles.keys()]) {
      if (!tiles.has(k) || moveBlocker(bounds, tiles, k)) continue;
      for (const g of groupOf(tiles, k)) {
        tiles.delete(g);
        order.push(g);
      }
      progress = true;
    }
  }
  return { solved: tiles.size === 0, order, stuck: [...tiles.keys()] };
}

export function checkSolution(cells, tileList, order) {
  const bounds = boundsOf(cells);
  const tiles = tileMap(tileList);
  const gone = new Set();
  for (const k of order) {
    if (gone.has(k)) continue;
    if (!tiles.has(k) || moveBlocker(bounds, tiles, k)) return false;
    for (const g of groupOf(tiles, k)) {
      tiles.delete(g);
      gone.add(g);
    }
  }
  return tiles.size === 0;
}
