// The collider, armour count and three instanced render batches share these cells.
// All coordinates are local to the chassis, swivelling turret or elevating barrel.
import {
  Box3,
  Euler,
  Quaternion,
  Ray,
  Vector3,
} from '../vendor/three.module.min.js';

export const PIVOT = 1.72;
export const mounts = ['chassis', 'turret', 'barrel'];
export const armour = [];
function cell(part, mount, x, y, z, w, h, d, paint) {
  const centre = new Vector3(x, y, z);
  const size = new Vector3(w, h, d);
  const box = new Box3().setFromCenterAndSize(centre, size);
  armour.push({ id: armour.length, part, mount, centre, size, box, paint });
}
const dx = 0.51,
  dy = 0.43,
  dz = 0.45;
function block(part, x, y, z, paint) {
  cell(
    part,
    part === 'turret' ? 'turret' : 'chassis',
    x * dx,
    (y + 0.5) * dy,
    z * dz,
    dx,
    dy,
    dz,
    paint,
  );
}
for (const x of [-2, 2])
  for (let z = -3; z <= 3; z++)
    for (let y = 0; y < 2; y++)
      block(
        'track',
        x,
        y,
        z,
        y && z % 2 === 0 ? 'brass' : z % 2 ? 'tread' : 'iron',
      );

for (let x = -2; x <= 2; x++)
  for (let z = -2; z <= 2; z++) {
    if (Math.abs(x) < 2) {
      if (Math.abs(z) < 2) block('hull', x, 0, z, 'iron');
      block('hull', x, 1, z, 'enamel');
    }
    block(
      'hull',
      x,
      2,
      z,
      x === 0 && z === 0 ? 'core' : Math.abs(x) === 2 ? 'trim' : 'enamel',
    );
  }
for (let x = -1; x <= 1; x++)
  for (let z = -1; z <= 1; z++) {
    block('turret', x, 3, z, 'enamel');
    block('turret', x, 4, z, x === 0 ? 'trim' : 'light');
  }
cell('turret', 'turret', 0, 2.21, -0.14, 0.49, 0.13, 0.5, 'brass');
for (let i = 0; i < 4; i++) {
  const width = i === 0 || i === 3 ? 0.43 : 0.33;
  cell(
    'turret',
    'barrel',
    0,
    0,
    0.34 + i * 0.43,
    width,
    width,
    0.43,
    ['enamel', 'trim', 'iron', 'brass'][i],
  );
}
export const core = armour.find((v) => v.paint === 'core');
const guards = armour.filter(
  (v) => v !== core && v.centre.distanceTo(core.centre) < 0.52,
);
const palettes = [
  { enamel: 0x398e82, light: 0x69baa5 },
  { enamel: 0xbb5542, light: 0xed8261 },
];
const metal = {
  iron: 0x313745,
  tread: 0x534b48,
  trim: 0xffe2a7,
  brass: 0xd7a454,
  core: 0xffbd2e,
};
export function cellColor(v, side) {
  return metal[v.paint] ?? palettes[side === 1 ? 0 : 1][v.paint];
}

export function chassisYaw(side) {
  return side === 1 ? 0.27 : Math.PI - 0.19;
}
const rotations = mounts.map(() => new Quaternion());
const angles = new Euler(0, 0, 0, 'YXZ');
const rad = Math.PI / 180;
function orient(tank) {
  const yaw = (tank.side === 1 ? 0 : Math.PI) - tank.heading * rad;
  rotations[0].setFromEuler(angles.set(0, chassisYaw(tank.side), 0));
  rotations[1].setFromEuler(angles.set(0, yaw, 0));
  rotations[2].setFromEuler(angles.set(-tank.angle * rad, yaw, 0));
}

const ray = new Ray(),
  end = new Vector3(),
  contact = new Vector3();
const inverse = new Quaternion();
const mounted = mounts.map((name) => armour.filter((v) => v.mount === name));
export function tankHit(tank, a, b) {
  // A ballistic step is shorter than half a block. Reject the open air before
  // testing individual plates, including during the gunner's trajectory search.
  if (
    Math.abs(b.x - tank.x) > 3 ||
    Math.abs(b.z - tank.z) > 3 ||
    b.y < tank.y - 0.5 ||
    b.y > tank.y + 4.2
  )
    return null;
  orient(tank);
  let best = Infinity,
    struck;
  for (const [i, cells] of mounted.entries()) {
    inverse.copy(rotations[i]).invert();
    const y = tank.y + (i === 2 ? PIVOT : 0);
    ray.origin
      .set(a.x - tank.x, a.y - y, a.z - tank.z)
      .applyQuaternion(inverse);
    end.set(b.x - tank.x, b.y - y, b.z - tank.z).applyQuaternion(inverse);
    ray.direction.subVectors(end, ray.origin);
    const length = ray.direction.length();
    if (!length) continue;
    ray.direction.multiplyScalar(1 / length);
    for (const v of cells) {
      if (!tank.cells.has(v)) continue;
      let t = 0;
      if (!v.box.containsPoint(ray.origin)) {
        if (!ray.intersectBox(v.box, contact)) continue;
        t = contact.distanceTo(ray.origin) / length;
      }
      if (t <= 1 && t < best) {
        best = t;
        struck = v;
      }
    }
  }
  return struck ? { t: best, part: struck.part } : null;
}

export function makeTank(x, y, z, side, stock) {
  return {
    x,
    y,
    z,
    side,
    stock,
    heading: 0,
    angle: 43,
    sunk: false,
    cells: new Set(armour),
    get hp() {
      return this.sunk || !this.cells.has(core) ? 0 : this.cells.size;
    },
    chip(point, count, fragments) {
      chipTank(this, point, count, fragments);
    },
  };
}

// Reuse candidate storage across blasts. Only detached cells need a world-space
// position; ranking the rest in mount space also avoids rotating every plate.
const pos = new Vector3();
const candidates = [];
const distances = new Float64Array(armour.length);
const nearestFirst = (a, b) => distances[a.id] - distances[b.id];
function chipTank(tank, point, count, fragments) {
  if (!count || !tank.hp) return;
  orient(tank);
  const shielded = guards.every((v) => tank.cells.has(v));
  candidates.length = 0;
  for (const [i, cells] of mounted.entries()) {
    inverse.copy(rotations[i]).invert();
    pos
      .set(
        point.x - tank.x,
        point.y - tank.y - (i === 2 ? PIVOT : 0),
        point.z - tank.z,
      )
      .applyQuaternion(inverse);
    for (const v of cells) {
      if (!tank.cells.has(v) || (v === core && shielded)) continue;
      distances[v.id] = v.centre.distanceToSquared(pos);
      candidates.push(v);
    }
  }
  candidates.sort(nearestFirst);
  for (let i = 0; i < Math.min(count, candidates.length); i++) {
    const v = candidates[i];
    tank.cells.delete(v);
    pos.copy(v.centre).applyQuaternion(rotations[mounts.indexOf(v.mount)]);
    fragments.push({
      x: pos.x + tank.x,
      y: pos.y + tank.y + (v.mount === 'barrel' ? PIVOT : 0),
      z: pos.z + tank.z,
      color: cellColor(v, tank.side),
    });
  }
}
