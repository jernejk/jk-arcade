import { key } from './hex.js';
import { boundsOf, analyseMove, applyMove, revertMove } from './board.js';
import { solveTiles } from './solver.js';

export function createGame(level) {
  const tiles = new Map();
  level.tiles.forEach((t, i) => tiles.set(key(t.q, t.r), { ...t, id: i }));
  return {
    level,
    bounds: boundsOf(level.cells),
    mask: new Set(level.cells.map(([q, r]) => key(q, r))),
    tiles,
    history: [],
    cracks: 0,
    maxCracks: level.cracks,
    bumps: 0,
    hintsUsed: 0,
    status: 'playing',
    weighted: level.tiles.some((t) => t.weighted),
  };
}

export function tap(game, k) {
  if (game.status !== 'playing') return { type: 'none' };
  const tile = game.tiles.get(k);
  if (!tile) return { type: 'none' };
  const move = analyseMove(game.bounds, game.mask, game.tiles, k);
  if (move.type === 'bump') {
    game.cracks++;
    game.bumps++;
    if (game.cracks >= game.maxCracks) game.status = 'lost';
    return { type: 'bump', key: k, tile, blocker: move.key, reason: move.reason, from: move.from, status: game.status };
  }
  const record = applyMove(game.tiles, move);
  game.history.push(record);
  if (game.tiles.size === 0) game.status = 'won';
  if (move.type === 'slide') return { type: 'slide', key: k, to: move.to, tile: record.moved, from: tile, status: game.status };
  return { type: 'fly', key: k, tile, tiles: record.tiles, keys: move.keys, status: game.status };
}

export function undo(game) {
  if (game.status !== 'playing' || !game.history.length) return null;
  const record = game.history.pop();
  revertMove(game.tiles, record);
  if (record.kind === 'slide') return { kind: 'slide', key: record.from, keys: [record.from], from: record.to, tile: record.tile, tiles: [record.tile] };
  const keys = record.tiles.map((t) => key(t.q, t.r));
  return { kind: 'remove', key: keys[0], keys, tiles: record.tiles, tile: record.tiles[0] };
}

export function solveFrom(game, { budget = 20000, ms = 250 } = {}) {
  return solveTiles(game.bounds, game.mask, game.tiles, { budget, ms });
}

// Hints come from a fresh search of the current position, so they stay legal after any slide.
export function hint(game) {
  if (game.status !== 'playing') return null;
  const result = solveFrom(game);
  if (result.status !== 'solved') return { key: null, stuck: true, proven: result.status === 'stuck' };
  game.hintsUsed++;
  return { key: result.moves[0], stuck: false };
}

export function isFree(game, k) {
  return game.tiles.has(k) && analyseMove(game.bounds, game.mask, game.tiles, k).type !== 'bump';
}

export function cracksLeft(game) {
  return game.maxCracks - game.cracks;
}

export function grade(game) {
  if (game.status !== 'won') return 0;
  if (game.cracks === 0 && game.hintsUsed === 0) return 3;
  if (game.cracks <= 1) return 2;
  return 1;
}
