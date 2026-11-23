import * as T from '../vendor/three.module.min.js';
import { random, SEA } from './world.js';

const box = new T.BoxGeometry(),
  ball = new T.SphereGeometry(1, 18, 12),
  tube = new T.CylinderGeometry(1, 1, 1, 16);
const bolt = new T.SphereGeometry(1, 9, 6);
const ring = new T.TorusGeometry(1, 0.16, 7, 20);
const part = new T.Object3D(),
  vertex = new T.Vector3(),
  normal = new T.Vector3(),
  nm = new T.Matrix3();
export const paint = new T.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.62,
  metalness: 0.2,
});
export class Batch {
  constructor() {
    this.xyz = [];
    this.normals = [];
    this.rgb = [];
    this.ids = [];
  }
  add(geo, pos, scale, color, rotation = [0, 0, 0]) {
    part.position.set(...pos);
    part.scale.set(...scale);
    part.rotation.set(...rotation);
    part.updateMatrix();
    nm.getNormalMatrix(part.matrix);
    const tint = new T.Color(color),
      p = geo.attributes.position,
      n = geo.attributes.normal;
    const base = this.xyz.length / 3;
    for (let i = 0; i < p.count; i++) {
      vertex.fromBufferAttribute(p, i).applyMatrix4(part.matrix);
      normal.fromBufferAttribute(n, i).applyNormalMatrix(nm);
      this.xyz.push(vertex.x, vertex.y, vertex.z);
      this.normals.push(normal.x, normal.y, normal.z);
      this.rgb.push(tint.r, tint.g, tint.b);
    }
    if (geo.index) for (const id of geo.index.array) this.ids.push(base + id);
    else for (let i = 0; i < p.count; i++) this.ids.push(base + i);
  }
  box(pos, scale, c, rot) {
    this.add(box, pos, scale, c, rot);
  }
  ball(pos, scale, c, rot) {
    this.add(Math.max(...scale) < 0.38 ? bolt : ball, pos, scale, c, rot);
  }
  tube(pos, scale, c, rot) {
    this.add(tube, pos, scale, c, rot);
  }
  ring(pos, scale, c, rot) {
    this.add(ring, pos, scale, c, rot);
  }
  mesh(material = paint) {
    const g = new T.BufferGeometry();
    for (const [name, data] of [
      ['position', this.xyz],
      ['normal', this.normals],
      ['color', this.rgb],
    ]) {
      g.setAttribute(name, new T.Float32BufferAttribute(data, 3));
    }
    g.setIndex(this.ids);
    g.computeBoundingSphere();
    return new T.Mesh(g, material);
  }
}

const brass = '#e5b765',
  gold = '#f5d995',
  iron = '#303743',
  rubber = '#34333a',
  ivory = '#ffe2a7';
export function makeToy(rival) {
  const enamel = rival ? '#bb5542' : '#398e82',
    top = rival ? '#e77854' : '#60ac98';
  const chassis = new Batch(),
    cap = new Batch(),
    gun = new Batch(),
    group = new T.Group();
  for (const side of [-1, 1]) {
    const x = side * 0.93;
    chassis.box([x, 0.54, 0], [0.55, 0.88, 2.85], rubber);
    chassis.box([x, 1.03, -0.02], [0.67, 0.16, 2.98], enamel);
    for (let i = -1; i <= 1; i++) {
      const z = i * 0.86;
      chassis.tube([x + side * 0.29, 0.5, z], [0.42, 0.09, 0.42], brass, [
        0,
        0,
        Math.PI / 2,
      ]);
      chassis.tube([x + side * 0.345, 0.5, z], [0.29, 0.06, 0.29], iron, [
        0,
        0,
        Math.PI / 2,
      ]);
      chassis.tube([x + side * 0.39, 0.5, z], [0.13, 0.08, 0.13], gold, [
        0,
        0,
        Math.PI / 2,
      ]);
    }
    for (let i = 0; i < 10; i++) {
      const z = -1.48 + i * 0.329;
      chassis.box([x, 0.15, z], [0.59, 0.17, 0.11], '#65554b');
      if (i === 0 || i === 9)
        for (let j = 1; j <= 4; j++)
          chassis.box([x, 0.1 + j * 0.17, z], [0.56, 0.11, 0.13], '#716050');
    }
  }
  chassis.box([0, 0.87, 0], [1.72, 0.64, 2.4], enamel);
  chassis.box([0, 1.18, 0], [1.87, 0.12, 2.52], ivory);
  // A stamped rear plate with bolts, exhaust slots and a working wind-up key.
  chassis.box([0, 0.9, -1.25], [1.28, 0.48, 0.09], top);
  for (const x of [-0.52, 0.52])
    for (const y of [0.73, 1.06])
      chassis.ball([x, y, -1.31], [0.055, 0.055, 0.045], gold);
  for (let i = 0; i < 5; i++)
    chassis.box([-0.17 + i * 0.1, 0.9, -1.31], [0.045, 0.22, 0.04], iron);
  chassis.tube([-0.64, 1.28, -1.36], [0.12, 0.48, 0.12], brass, [
    Math.PI / 2,
    0,
    0,
  ]);
  for (const x of [-0.88, -0.42])
    chassis.ring([x, 1.4, -1.58], [0.29, 0.26, 0.47], brass);
  cap.tube([0, 0.06, 0], [0.85, 0.18, 0.85], brass);
  if (rival) {
    cap.box([0, 0.39, 0], [1.5, 0.68, 1.48], enamel);
    cap.box([0, 0.75, 0], [1.57, 0.11, 1.51], ivory);
  } else cap.ball([0, 0.12, 0], [0.92, 0.78, 0.88], top);
  cap.tube([0, 0.84, -0.1], [0.42, 0.1, 0.42], brass);
  cap.tube([0, 0.9, -0.1], [0.32, 0.08, 0.32], enamel);
  cap.ring([0, 1.07, -0.12], [0.34, 0.22, 0.45], brass);
  for (const x of [-0.45, 0.45]) {
    cap.ball([x, 0.38, -0.72], [0.095, 0.095, 0.085], brass);
    cap.ball([x, 0.39, -0.78], [0.045, 0.045, 0.04], ivory);
  }
  // The longitudinal cream band and brass muzzle are visible in shoulder view.
  gun.tube([0, 0, 0.88], [0.18, 1.68, 0.18], ivory, [Math.PI / 2, 0, 0]);
  for (const [z, r, len, c] of [
    [0.17, 0.31, 0.46, enamel],
    [0.64, 0.23, 0.12, brass],
    [1.55, 0.23, 0.24, brass],
    [1.78, 0.25, 0.12, ivory],
    [1.85, 0.155, 0.024, iron],
  ]) {
    gun.tube([0, 0, z], [r, len, r], c, [Math.PI / 2, 0, 0]);
  }
  // A cream maker's medallion stamped into the back of each turret.
  cap.tube([0, 0.35, -0.815], [0.245, 0.065, 0.245], brass, [
    Math.PI / 2,
    0,
    0,
  ]);
  cap.tube([0, 0.35, -0.857], [0.202, 0.034, 0.202], ivory, [
    Math.PI / 2,
    0,
    0,
  ]);
  cap.box([0, 0.36, -0.88], [0.035, 0.25, 0.02], enamel);
  if (rival) {
    cap.ring([0, 0.45, -0.895], [0.045, 0.045, 0.045], enamel);
    for (const side of [-1, 1])
      cap.box([side * 0.061, 0.285, -0.895], [0.12, 0.03, 0.023], enamel, [
        0,
        0,
        side * 0.5,
      ]);
  } else {
    for (const side of [-1, 1]) {
      cap.ball([side * 0.067, 0.445, -0.894], [0.082, 0.027, 0.015], enamel, [
        0,
        0,
        side * -0.32,
      ]);
      cap.ball([side * 0.065, 0.395, -0.895], [0.08, 0.025, 0.015], enamel, [
        0,
        0,
        side * -0.62,
      ]);
    }
  }
  for (let i = 0; i < 14; i++) {
    const a = (i * Math.PI) / 7;
    cap.ball(
      [Math.cos(a) * 0.8, 0.18, Math.sin(a) * 0.8],
      [0.043, 0.043, 0.043],
      brass,
    );
  }
  for (const x of [-0.78, 0.78]) {
    chassis.box([x, 1.24, -0.83], [0.17, 0.1, 0.65], enamel);
    for (const z of [-1.08, -0.58])
      chassis.ball([x, 1.32, z], [0.042, 0.034, 0.042], brass);
  }
  const turret = new T.Group(),
    barrel = gun.mesh();
  turret.position.y = 1.19;
  barrel.position.set(0, 0.53, 0);
  group.add(chassis.mesh(), turret);
  turret.add(cap.mesh(), barrel);
  return { group, turret, barrel };
}

// Folded palm leaves and segmented trunks share a draw call with the beach grass.
const leaf = new T.BufferGeometry();
{
  const pts = [],
    idx = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8,
      width = Math.sin(Math.PI * Math.pow(t, 0.76)) * (k % 2 ? 0.125 : 0.092);
    const rise = Math.sin(t * Math.PI) * 0.23 - t * t * 0.28;
    pts.push(
      -width,
      rise - width * 0.48,
      t,
      0,
      rise,
      t,
      width,
      rise - width * 0.48,
      t,
    );
    if (k < 8) {
      const n = k * 3;
      for (const i of [
        0, 3, 1, 3, 4, 1, 1, 4, 2, 4, 5, 2, 1, 3, 0, 1, 4, 3, 2, 4, 1, 2, 5, 4,
      ])
        idx.push(n + i);
    }
  }
  leaf.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
  leaf.setIndex(idx);
  leaf.computeVertexNormals();
  // Explicit normals keep both sides of the folded tin leaves lit.
  const norm = leaf.attributes.normal;
  for (let i = 0; i < norm.count; i++)
    norm.setXYZ(i, ((i % 3) - 1) * 0.42, 0.82, 0.14);
}
function palm(batch, x, y, z, h, rng) {
  const lean = rng() * 0.9 - 0.45;
  for (let i = 0; i < 7; i++) {
    const t = i / 7,
      r = h * (0.052 - 0.019 * t);
    batch.box(
      [x + lean * t, y + (h * (i + 0.5)) / 7, z],
      [r * 2, h / 7 + 0.07, r * 2],
      i % 2 ? '#ad7350' : '#d6a071',
      [0, t * 0.65, -lean / h],
    );
  }
  const cx = x + lean;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + rng() * 0.32;
    const length = h * (0.51 + rng() * 0.17);
    batch.add(
      leaf,
      [cx, y + h, z],
      [length, length, length],
      ['#537249', '#818c43', '#9daa54', '#5e7d47'][i % 4],
      [0, angle, 0],
    );
  }
}
export function islandProps(world, seed) {
  const rng = random(seed ^ 0xcaf3),
    batch = new Batch(),
    anchors = [];
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 105; i++) {
      const x = 3 + rng() * 42,
        local = 4 + rng() * 30,
        z = side ? 111 - local : local,
        y = world.top(x, z);
      if (
        y < SEA + 2 ||
        (Math.abs(x - 24) < 8 && local > 19) ||
        world.get(x | 0, y - 1, z | 0) > 4
      )
        continue;
      const first = batch.ids.length;
      if (i < 8) palm(batch, x, y, z, 3.7 + rng() * 3, rng);
      else
        for (let k = 0; k < 4; k++) {
          const a = rng() * 6.28,
            h = 0.24 + rng() * 0.49;
          batch.box(
            [x + Math.sin(a) * 0.16, y + h * 0.4, z + Math.cos(a) * 0.16],
            [0.12, h, 0.14],
            k === 0 && i % 4 === 0 ? '#ed8b57' : k % 2 ? '#83954a' : '#c2bb60',
            [0.4 * Math.cos(a), a, 0.4 * Math.sin(a)],
          );
        }
      anchors.push({
        x: x | 0,
        y: y - 1,
        z: z | 0,
        first,
        end: batch.ids.length,
      });
    }
  }
  const mesh = batch.mesh();
  mesh.userData.anchors = anchors;
  return mesh;
}

export function backdrop() {
  const batch = new Batch(),
    rng = random(1953);
  for (let i = 0; i < 72; i++) {
    const a = i * 2.4,
      dist = 68 + rng() * 63;
    const x = 24 + Math.sin(a) * dist,
      z = 56 + Math.cos(a) * dist * 1.25;
    const w = 3 + rng() * 8,
      h = 2 + rng() * 11;
    batch.box([x, SEA + h * 0.5 - 1, z], [w, h, w * 0.8], '#8e7c89');
    batch.box([x, SEA + h - 1, z], [w * 0.96, 1, w * 0.76], '#d09e90');
    if (i % 4 === 0) palm(batch, x, SEA + h - 0.5, z, 2.8 + rng() * 2, rng);
  }
  return batch.mesh();
}
