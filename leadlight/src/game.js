import { key } from './hex.js';
import { boundsOf, firstBlocker } from './board.js';

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
  };
}

export function tap(game, k) {
  if (game.status !== 'playing') return { type: 'none' };
  const tile = game.tiles.get(k);
  if (!tile) return { type: 'none' };
  const blocker = firstBlocker(game.bounds, game.tiles, tile.q, tile.r, tile.dir);
  if (blocker) {
    game.cracks++;
    game.bumps++;
    if (game.cracks >= game.maxCracks) game.status = 'lost';
    return { type: 'bump', key: k, tile, blocker, status: game.status };
  }
  game.tiles.delete(k);
  game.history.push(k);
  game.lastRemoved = tile;
  if (game.tiles.size === 0) game.status = 'won';
  return { type: 'fly', key: k, tile, status: game.status };
}

export function undo(game) {
  if (game.status !== 'playing' || !game.history.length) return null;
  const k = game.history.pop();
  const tile = game.level.tiles.find((t) => key(t.q, t.r) === k);
  const id = game.level.tiles.indexOf(tile);
  const restored = { ...tile, id };
  game.tiles.set(k, restored);
  return { key: k, tile: restored };
}

// The earliest remaining pane in the stored solution is always free: everything that blocked it came before it.
export function hint(game) {
  if (game.status !== 'playing') return null;
  for (const k of game.level.solution) {
    if (game.tiles.has(k)) {
      game.hintsUsed++;
      return k;
    }
  }
  return null;
}

export function isFree(game, k) {
  const t = game.tiles.get(k);
  return !!t && !firstBlocker(game.bounds, game.tiles, t.q, t.r, t.dir);
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
