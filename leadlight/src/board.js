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

export const tileMap = (tileList) => new Map(tileList.map((t) => [key(t.q, t.r), t]));

export function weightedStop(bounds, mask, tiles, t) {
  const [dq, dr] = DIRS[t.dir];
  let stop = null;
  for (let q = t.q + dq, r = t.r + dr; inBox(bounds, q, r); q += dq, r += dr) {
    const k = key(q, r);
    if (!mask.has(k) || tiles.has(k)) break;
    stop = k;
  }
  return stop;
}

// Weighted panes never fly straight out: they park in the last empty cell before a pane or the rim, and only leave from the rim.
export function analyseMove(bounds, mask, tiles, k) {
  const t = tiles.get(k);
  if (t.weighted) {
    const stop = weightedStop(bounds, mask, tiles, t);
    if (stop) return { type: 'slide', from: k, to: stop };
    const b = firstBlocker(bounds, tiles, t.q, t.r, t.dir);
    if (b) return { type: 'bump', key: b, reason: 'path', from: k };
    return { type: 'remove', keys: [k] };
  }
  const block = moveBlocker(bounds, tiles, k);
  if (block) return { type: 'bump', ...block };
  return { type: 'remove', keys: groupOf(tiles, k) };
}

export function applyMove(tiles, move) {
  if (move.type === 'remove') {
    const removed = move.keys.map((k) => tiles.get(k));
    for (const k of move.keys) tiles.delete(k);
    return { kind: 'remove', tiles: removed };
  }
  const tile = tiles.get(move.from);
  const [q, r] = move.to.split(',').map(Number);
  const moved = { ...tile, q, r };
  tiles.delete(move.from);
  tiles.set(move.to, moved);
  return { kind: 'slide', from: move.from, to: move.to, tile, moved };
}

export function revertMove(tiles, record) {
  if (record.kind === 'remove') {
    for (const t of record.tiles) tiles.set(key(t.q, t.r), t);
    return;
  }
  tiles.delete(record.to);
  tiles.set(record.from, record.tile);
}

export function replayMoves(cells, tileList, moves) {
  const bounds = boundsOf(cells);
  const mask = new Set(cells.map(([q, r]) => key(q, r)));
  const tiles = tileMap(tileList);
  const partnersGone = new Set();
  for (const k of moves) {
    if (partnersGone.has(k) && !tiles.has(k)) continue;
    if (!tiles.has(k)) return false;
    const m = analyseMove(bounds, mask, tiles, k);
    if (m.type === 'bump') return false;
    applyMove(tiles, m);
    if (m.type === 'remove') for (const g of m.keys) if (g !== k) partnersGone.add(g);
  }
  return tiles.size === 0;
}
