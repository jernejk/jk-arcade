import { World } from './world.js';
import { greedyMesh } from './mesher.js';

// The simulation owns the live grid. Each job receives an immutable post-blast snapshot.
self.onmessage = ({ data: { cells, ids, revision } }) => {
  const world = Object.create(World.prototype);
  world.cells = cells;
  const transfers = [];
  const chunks = ids.map((id) => {
    const mesh = greedyMesh(world, id);
    for (const key of ['positions', 'colors', 'materials', 'indices']) {
      const array =
        key === 'indices'
          ? new Uint16Array(mesh[key])
          : new Float32Array(mesh[key]);
      transfers.push(array.buffer);
      mesh[key] = array;
    }
    return { id, mesh };
  });
  self.postMessage({ chunks, revision }, transfers);
};
