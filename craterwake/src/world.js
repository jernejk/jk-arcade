// Grid coordinates are in toy blocks. The sea hides the bottom three bedrock layers.
export const WIDTH = 48,
  HEIGHT = 40,
  LENGTH = 112,
  SEA = 6,
  CHUNK = 16;
export const M = Object.freeze({
  air: 0,
  basalt: 1,
  clay: 2,
  sand: 3,
  turf: 4,
  teal: 5,
  cream: 6,
  rust: 7,
  brass: 8,
  scorched: 9,
  spring: 10,
});
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
const index = (x, y, z) => x + WIDTH * (y + HEIGHT * z);
export const chunkId = (x, y, z) => (x >> 4) + 3 * ((y >> 4) + 3 * (z >> 4));
const inside = (x, y, z) =>
  x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && z >= 0 && z < LENGTH;
export class World {
  constructor(seed) {
    this.cells = new Uint8Array(WIDTH * HEIGHT * LENGTH);
    this.dirty = new Set();
    this.charges = [];
    const rng = random(seed);
    const phase = rng() * 6.28,
      offset = rng() * 4;
    for (let z = 0; z < LENGTH / 2; z++) {
      for (let x = 0; x < WIDTH; x++) {
        const edge =
          Math.hypot((x - 24) / 23, (z - 14) / 24) +
          0.075 * Math.sin(x * 0.42 + phase) +
          0.05 * Math.cos(z * 0.65 + offset);
        let h =
          edge > 1
            ? Math.max(3, Math.floor(10 - (edge - 0.98) * 32))
            : 13 +
              Math.floor(1.4 * Math.cos(x * 0.3 + phase) + Math.sin(z * 0.45));
        if (z < 19 && edge < 0.92)
          h += Math.round(
            3 * (1 + Math.cos(x * 0.38 + phase)) + (19 - z) * 0.35,
          );
        // The firing piers are flat, with an erodible lip over deep water.
        if (z >= 24 && z <= 34 && Math.abs(x - 24) <= 7) h = 12;
        if (z >= 31 && z <= 37 && x >= 19 && x <= 23)
          h = Math.max(3, 12 - (z - 30) * 2);
        if (Math.abs(x - 24) <= 5 && z > 34)
          h = Math.min(h, Math.max(3, 12 - (z - 34) * 3));
        for (let y = 0; y < h; y++) {
          const green = Math.sin(x * 0.46 + phase) + Math.cos(z * 0.36) > 0.7;
          const m =
            y < 3 || (y < 7 && edge < 0.83 && x % 13 === 1)
              ? M.basalt
              : y < h - 3
                ? M.clay
                : y === h - 1 && green && h > SEA + 2
                  ? M.turf
                  : M.sand;
          this.cells[index(x, y, z)] = this.cells[index(x, y, LENGTH - 1 - z)] =
            m;
        }
      }
    }
    for (let side = 0; side < 2; side++) {
      for (let x = 13; x < 35; x++) {
        if ((x >= 18 && x <= 28) || x === 32) continue;
        const depth = x < 19 || x > 30 ? 2 : 1;
        const height = 2 + (x % 7 < 2 ? 1 : 0);
        for (let d = 0; d < depth; d++) {
          const z = side ? 78 - d : 33 + d;
          const base = this.top(x, z);
          for (let y = 0; y < height; y++) {
            const material =
              x < 19 || x > 30
                ? y === 1
                  ? M.cream
                  : M.rust
                : x % 5 === 0 || y === height - 1
                  ? M.brass
                  : M.teal;
            this.cells[index(x, base + y, z)] = material;
          }
        }
      }
      // Two spring crates share a loading bay beneath a striped signal beam.
      const mirror = (z) => (side ? LENGTH - 1 - z : z);
      for (const [left, floor, front] of [
        [29, 12, 32],
        [28, 12, 28],
      ]) {
        const centre = {
          x: left + 1,
          y: floor + 1,
          z: side ? LENGTH - front - 1 : front + 1,
          spent: false,
        };
        this.charges.push(centre);
        for (let x = left; x < left + 2; x++)
          for (let z = front; z < front + 2; z++) {
            for (
              let y = Math.min(floor, this.top(x, mirror(z)));
              y < floor;
              y++
            )
              this.cells[index(x, y, mirror(z))] = M.clay;
            for (let y = floor; y < floor + 2; y++)
              this.cells[index(x, y, mirror(z))] = M.spring;
          }
      }
      const postZ = mirror(31);
      for (let y = this.top(32, postZ); y < 20; y++)
        this.cells[index(32, y, postZ)] = M.brass;
      for (let x = 30; x <= 35; x++)
        this.cells[index(x, 20, postZ)] = x % 2 ? M.cream : M.teal;
      // A narrow loading jetty ends in a stack of enamel cargo. The central
      // stack has room for a full Corkscrew bore, with water visible either side.
      for (let d = 0; d < 19; d++) {
        const z = side ? 78 - d : 33 + d;
        for (let x = 23; x <= 26; x++) {
          if (d < 11 && x !== 24 && d !== 6) continue;
          const piling = x !== 24 && d % 6 === 0;
          const foot = piling ? this.top(x, z) : 11;
          const top = d < 11 ? 12 : x === 23 ? 14 : 15;
          for (let y = foot; y < top; y++) {
            const band = y === 14 || (x !== 24 && d % 4 === 1);
            this.cells[index(x, y, z)] = band ? M.brass : M.teal;
          }
        }
      }
    }
    for (let id = 0; id < 63; id++) this.dirty.add(id);
  }
  get(x, y, z) {
    return inside(x, y, z) ? this.cells[index(x, y, z)] : 0;
  }
  set(x, y, z, material) {
    if (!inside(x, y, z) || this.get(x, y, z) === material) return;
    this.cells[index(x, y, z)] = material;
    for (const [dx, dy, dz] of NEIGHBOURS) {
      if (inside(x + dx, y + dy, z + dz))
        this.dirty.add(chunkId(x + dx, y + dy, z + dz));
    }
  }
  top(x, z, ceiling = HEIGHT) {
    x = Math.floor(x);
    z = Math.floor(z);
    for (let y = Math.min(HEIGHT, Math.floor(ceiling)) - 1; y >= 0; y--) {
      if (this.get(x, y, z)) return y + 1;
    }
    return 0;
  }
  checksum() {
    let hash = 2166136261;
    for (const cell of this.cells) hash = Math.imul(hash ^ cell, 16777619);
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  carve(point, radius, scorch = true) {
    const removed = [];
    const { x, y, z } = point;
    for (let k = Math.floor(z - radius - 1); k <= z + radius + 1; k++) {
      for (let j = Math.floor(y - radius - 1); j <= y + radius + 1; j++) {
        for (let i = Math.floor(x - radius - 1); i <= x + radius + 1; i++) {
          const m = this.get(i, j, k);
          if (!m || m === M.basalt) continue;
          const distance = Math.hypot(i + 0.5 - x, j + 0.5 - y, k + 0.5 - z);
          if (distance <= radius * (m === M.clay ? 0.7 : 1)) {
            this.set(i, j, k, 0);
            removed.push({ x: i + 0.5, y: j + 0.5, z: k + 0.5, m });
          } else if (
            scorch &&
            distance <= radius + 0.65 &&
            [M.sand, M.turf].includes(m) &&
            !this.get(i, j + 1, k)
          ) {
            this.set(i, j, k, M.scorched);
          }
        }
      }
    }
    return removed;
  }
}
const NEIGHBOURS = [
  [0, 0, 0],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export function settle(world, tank) {
  const from = { x: tank.x, y: tank.y, z: tank.z };
  let tipped = false;
  for (let step = 0; step < 10; step++) {
    const samples = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        samples.push({
          dx,
          dz,
          h: world.top(tank.x + dx, tank.z + dz, tank.y + 0.01),
        });
      }
    tank.y = Math.max(...samples.map((s) => s.h));
    if (tank.y + 1 < SEA) break;
    const support = samples.filter((s) => s.h >= tank.y - 1);
    if (support.length >= 5) break;
    // Move away from the few remaining contact points, toward the lower ground.
    const vx = -support.reduce((n, s) => n + s.dx, 0),
      vz = -support.reduce((n, s) => n + s.dz, 0);
    const low = samples.reduce((a, b) => (a.h < b.h ? a : b));
    tank.x += Math.sign(vx || (!vz && low.dx));
    tank.z += Math.sign(vz || (!vx && low.dz));
    tipped = true;
  }
  const drop = Math.max(0, from.y - tank.y);
  tank.sunk = tank.y + 1 < SEA;
  tank.hp = tank.sunk ? 0 : Math.max(0, tank.hp - 2 * Math.max(0, drop - 3));
  return {
    from,
    to: { x: tank.x, y: tank.y, z: tank.z },
    drop,
    tipped,
    sunk: tank.sunk,
  };
}
