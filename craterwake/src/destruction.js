import { WIDTH, HEIGHT, LENGTH, SEA, M, clamp, settle } from './world.js';

const neighbours = [
  [0, -1, 0],
  [-1, 0, 0],
  [1, 0, 0],
  [0, 0, -1],
  [0, 0, 1],
  [0, 1, 0],
];
const cellKey = (x, y, z) => x + WIDTH * (y + HEIGHT * z);

// Only a component touching a fresh cut can have lost its connection to
// bedrock. Most searches stop at the first intact column beside the crater.
export function collapseDetached(world, cuts) {
  const supported = new Set(),
    fallen = [];
  function anchoredColumn(x, y, z) {
    for (let h = y; h >= 0; h--) {
      const material = world.get(x, h, z);
      if (!material) return false;
      if (h === 0 || material === M.basalt || supported.has(cellKey(x, h, z)))
        return true;
    }
    return false;
  }
  for (const cut of cuts) {
    const cx = Math.floor(cut.x),
      cy = Math.floor(cut.y),
      cz = Math.floor(cut.z);
    for (const [dx, dy, dz] of neighbours) {
      const x = cx + dx,
        y = cy + dy,
        z = cz + dz;
      if (!world.get(x, y, z) || supported.has(cellKey(x, y, z))) continue;
      if (anchoredColumn(x, y, z)) {
        supported.add(cellKey(x, y, z));
        continue;
      }
      const queue = [[x, y, z]],
        visited = new Set([cellKey(x, y, z)]);
      let anchored = false;
      for (let i = 0; i < queue.length && !anchored; i++) {
        const [a, b, c] = queue[i];
        if (i > 0 && anchoredColumn(a, b, c)) {
          anchored = true;
          break;
        }
        for (const [ix, iy, iz] of neighbours) {
          const nx = a + ix,
            ny = b + iy,
            nz = c + iz;
          if (!world.get(nx, ny, nz)) continue;
          const key = cellKey(nx, ny, nz);
          if (supported.has(key)) {
            anchored = true;
            break;
          }
          if (!visited.has(key)) {
            visited.add(key);
            queue.push([nx, ny, nz]);
          }
        }
      }
      if (anchored) {
        for (const key of visited) supported.add(key);
        continue;
      }
      for (const [a, b, c] of queue) {
        fallen.push({
          x: a + 0.5,
          y: b + 0.5,
          z: c + 0.5,
          m: world.get(a, b, c),
          loose: true,
        });
        world.set(a, b, c, 0);
      }
    }
  }
  return fallen;
}

// Crates that lose their core or their last support unwind once. Keep
// scanning newly removed material so a secondary blast can trigger its neighbour.
export function chainAndCollapse(world, debris) {
  const echoes = [];
  let scan = 0,
    cutStart = 0;
  while (scan < debris.length) {
    for (; scan < debris.length; scan++) {
      const p = debris[scan];
      if (p.m !== M.spring) continue;
      const crate = world.charges.find(
        (c) =>
          !c.spent &&
          Math.abs(p.x - c.x) < 1 &&
          Math.abs(p.y - c.y) < 1 &&
          Math.abs(p.z - c.z) < 1,
      );
      if (!crate) continue;
      crate.spent = true;
      const centre = { x: crate.x, y: crate.y, z: crate.z };
      echoes.push(centre);
      debris.push(...world.carve(centre, 4.15));
    }
    const loose = collapseDetached(world, debris.slice(cutStart));
    cutStart = debris.length + loose.length;
    for (const block of loose) debris.push(block);
  }
  return echoes;
}

export function recoilTank(world, tank, centres, vector, fragments) {
  const landing = settle(world, tank, fragments);
  landing.kick = 0;
  if (tank.sunk || landing.tipped) return landing;
  let dx = 0,
    dz = 0;
  for (const p of centres) {
    const x = tank.x - p.x,
      z = tank.z - p.z,
      radial = Math.hypot(x, z);
    const distance = Math.hypot(radial, tank.y + 1 - p.y);
    const force = 1.65 * Math.max(0, 1 - distance / 4.8);
    dx += force * (radial > 0.05 ? x / radial : vector.x);
    dz += force * (radial > 0.05 ? z / radial : vector.z);
  }
  const magnitude = Math.hypot(dx, dz);
  if (magnitude < 0.06) return landing;
  const travel = Math.min(1.8, magnitude),
    steps = Math.ceil(travel / 0.18);
  for (let i = 0; i < steps; i++) {
    const x = tank.x + ((dx / magnitude) * travel) / steps,
      z = tank.z + ((dz / magnitude) * travel) / steps;
    if (
      [-0.8, 0.8].some((ox) =>
        [-0.8, 0.8].some((oz) =>
          world.get(
            Math.floor(x + ox),
            Math.floor(tank.y + 0.5),
            Math.floor(z + oz),
          ),
        ),
      )
    )
      break;
    tank.x = clamp(x, 0, WIDTH - 1);
    tank.z = clamp(z, 0, LENGTH - 1);
  }
  const after = settle(world, tank, fragments);
  after.from = landing.from;
  after.drop += landing.drop;
  after.kick = Math.hypot(tank.x - landing.to.x, tank.z - landing.to.z);
  return after;
}

function occupied(world, x, y, z) {
  return world.get(Math.floor(x), Math.floor(y), Math.floor(z));
}

// Fixed-step cosmetic bodies collide against the altered voxel grid. Once
// asleep on land they keep their resting pose until the next blast recycles them.
export function stepShard(world, b, dt) {
  if (b.asleep || b.sunk) return;
  b.vy -= 18 * dt;
  const half = b.size * 0.5;
  const nextX = b.x + b.vx * dt;
  if (occupied(world, nextX + Math.sign(b.vx) * half, b.y, b.z)) b.vx *= -0.38;
  else b.x = nextX;
  const nextZ = b.z + b.vz * dt;
  if (occupied(world, b.x, b.y, nextZ + Math.sign(b.vz) * half)) b.vz *= -0.38;
  else b.z = nextZ;
  const next = b.y + b.vy * dt;
  if (b.vy < 0 && occupied(world, b.x, next - half, b.z)) {
    b.y = Math.floor(next - half) + 1 + half;
    b.vy = -b.vy * 0.38;
    b.vx *= 0.6;
    b.vz *= 0.6;
    b.spin *= 0.56;
    b.bounces++;
    if (b.vy < 1.05 && Math.hypot(b.vx, b.vz) < 1.15) {
      b.asleep = true;
      b.pitch = (Math.round(b.pitch / (Math.PI / 2)) * Math.PI) / 2;
    }
  } else if (b.vy > 0 && occupied(world, b.x, next + half, b.z)) {
    b.vy *= -0.3;
  } else b.y = next;
  if (b.y < SEA - 0.2) b.sunk = true;
  if (!b.asleep) b.pitch += b.spin * dt;
}
