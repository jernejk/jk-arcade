import { key } from './hex.js';
import { boundsOf, moveBlocker, groupOf } from './board.js';

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
  const block = moveBlocker(game.bounds, game.tiles, k);
  if (block) {
    game.cracks++;
    game.bumps++;
    if (game.cracks >= game.maxCracks) game.status = 'lost';
    return { type: 'bump', key: k, tile, blocker: block.key, reason: block.reason, from: block.from, status: game.status };
  }
  const group = groupOf(game.tiles, k);
  const tiles = group.map((g) => game.tiles.get(g));
  for (const g of group) game.tiles.delete(g);
  game.history.push(group);
  if (game.tiles.size === 0) game.status = 'won';
  return { type: 'fly', key: k, tile, tiles, keys: group, status: game.status };
}

export function undo(game) {
  if (game.status !== 'playing' || !game.history.length) return null;
  const group = game.history.pop();
  const restored = group.map((k) => {
    const id = game.level.tiles.findIndex((t) => key(t.q, t.r) === k);
    const tile = { ...game.level.tiles[id], id };
    game.tiles.set(k, tile);
    return tile;
  });
  return { key: group[0], keys: group, tiles: restored, tile: restored[0] };
}

// The earliest remaining pane in the stored solution is always movable: every pane that could hold it came before it.
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
  return game.tiles.has(k) && !moveBlocker(game.bounds, game.tiles, k);
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
