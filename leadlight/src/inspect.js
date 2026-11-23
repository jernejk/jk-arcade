import { analyseMove, groupOf, neighbourKeys, rayCells } from './board.js';
import { DIR_NAMES } from './hex.js';

// Describe the same move the game would commit, without changing the board.
export function inspectPane(game, k) {
  const { bounds, mask, tiles } = game;
  const tile = tiles.get(k);
  const move = analyseMove(bounds, mask, tiles, k);
  const origins = groupOf(tiles, k);
  const paths = origins.map((origin) => {
    const t = tiles.get(origin);
    const cells = [origin];
    let blocker = null;
    for (const cell of rayCells(bounds, t.q, t.r, t.dir)) {
      if (t.weighted && !mask.has(cell)) break;
      cells.push(cell);
      if (cell !== t.pair && tiles.has(cell)) {
        blocker = cell;
        break;
      }
    }
    // Ordinary panes can cross a gap and re-enter glass. End the preview at the last window cell.
    while (!mask.has(cells.at(-1)) && cells.length > 1) cells.pop();
    return { cells, blocker, direction: DIR_NAMES[t.dir] };
  });
  const landing = move.type === 'slide' ? move.to : null;
  let outcome;
  if (landing) {
    outcome = paths[0].blocker ? `Parks at ${landing} because ${paths[0].blocker} is occupied.` : `Parks at ${landing} on the rim.`;
  } else if (move.type === 'bump') {
    if (move.reason === 'keystone') outcome = `Would bump: the keystone touches ${move.key}.`;
    else if (move.reason === 'pair') outcome = `Would bump: its partner at ${move.from} is blocked by ${move.key}.`;
    else outcome = `Would bump against ${move.key}.`;
  } else {
    outcome = origins.length === 2 ? 'Both panes leave together.' : 'Leaves the window.';
  }
  const route = paths.map(({ cells, direction }) => `From ${cells[0]} ${direction}: ${cells.slice(1).join(' → ') || 'at the rim'}.`).join(' ');
  const neighbours = neighbourKeys(tile.q, tile.r).map((cell, i) => {
    const other = tiles.get(cell);
    const contents = other ? `${other.colour}, pointing ${DIR_NAMES[other.dir]}` : mask.has(cell) ? 'empty' : 'outside the window';
    return `${DIR_NAMES[i]} ${cell}: ${contents}`;
  });
  return {
    paths, landing,
    blocker: move.type === 'bump' ? move.key : paths[0].blocker,
    summary: `${tile.colour} ${tile.weighted ? 'weighted pane' : tile.keystone ? 'keystone' : 'pane'} at ${k}. ${outcome} ${route}`,
    neighbours: neighbours.join('; ') + '.',
  };
}
