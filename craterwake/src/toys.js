import * as T from '../vendor/three.module.min.js';
import { armour, cellColor, mounts, PIVOT } from './tank.js';
import { random, SEA } from './world.js';

const box = new T.BoxGeometry(),
  ball = new T.SphereGeometry(1, 18, 12),
  tube = new T.CylinderGeometry(1, 1, 1, 16);
const bolt = new T.SphereGeometry(1, 9, 6);
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

const armourMaterial = new T.MeshStandardMaterial({
  roughness: 0.62,
  metalness: 0.24,
});
// Stamp the fittings onto their parent plates so bolts, track shoes and the
// wind-up handle leave with the armour that carried them.
function armourStamps(v, side) {
  const stamps = [];
  const { x, y, z } = v.centre;
  const { x: w, y: h, z: d } = v.size;
  const gold = 0xf7cb78,
    charcoal = 0x333743,
    cream = 0xffe6ac;
  function stamp(ox, oy, oz, width, height, depth, color, roll = 0) {
    part.position.set(x + ox, y + oy, z + oz);
    part.scale.set(width, height, depth);
    part.rotation.set(0, 0, roll);
    part.updateMatrix();
    stamps.push({
      cell: v,
      matrix: part.matrix.clone(),
      color: new T.Color(color),
    });
  }
  stamp(0, 0, 0, w * 0.965, h * 0.965, d * 0.965, cellColor(v, side));
  if (v.paint === 'core') {
    // The square keyhole and narrow stem match the core badge on the HP plate.
    const dimensions = [w, h, d];
    for (const axis of [0, 1, 2]) {
      const up = axis === 1 ? 2 : 1;
      function face(width, height, level, offset, color) {
        const size = dimensions.map(
          (d, i) => d * (i === axis ? level : i === up ? height : width),
        );
        const centre = [0, 0, 0];
        centre[up] = dimensions[up] * offset;
        stamp(...centre, ...size, color);
      }
      face(0.84, 0.84, 0.978, 0, 0x493c32);
      face(0.71, 0.71, 0.988, 0, 0xffdd75);
      face(0.33, 0.28, 0.997, 0.07, 0x332c30);
      face(0.14, 0.18, 0.997, -0.15, 0x332c30);
    }
  } else if (v.part === 'track') {
    const outer = Math.sign(x) * w * 0.5;
    if (y > 0.43 && v.paint === 'brass') {
      stamp(outer, 0, 0, 0.06, 0.27, 0.27, charcoal);
      stamp(outer * 1.15, 0, 0, 0.06, 0.12, 0.12, gold);
    }
    if (Math.abs(z) > 1.3)
      for (const lift of [-0.1, 0.1])
        stamp(0, lift, Math.sign(z) * d * 0.5, w, 0.09, 0.07, 0x786955);
  } else if (v.part === 'hull' && z < -0.89) {
    if (Math.abs(x) < 0.1) {
      for (const offset of [-0.15, 0, 0.15])
        stamp(offset, 0, -d * 0.5, 0.065, h * 0.55, 0.04, charcoal);
    } else {
      stamp(0, 0, -d * 0.5, 0.11, 0.11, 0.05, gold);
    }
  } else if (v.mount === 'turret' && v.paint === 'brass') {
    stamp(0, 0.19, 0, 0.09, 0.27, 0.12, charcoal);
    for (const end of [-1, 1]) {
      stamp(end * 0.14, 0.31, 0, 0.28, 0.2, 0.11, gold, end * 0.28);
      stamp(end * 0.16, 0.31, -0.01, 0.1, 0.07, 0.12, charcoal, end * 0.28);
    }
  } else if (v.mount === 'turret' && z < -0.44 && y > 1.8) {
    if (!x) {
      stamp(0, 0, -d * 0.51, 0.29, 0.29, 0.05, charcoal, Math.PI / 4);
      stamp(0, 0, -d * 0.57, 0.16, 0.16, 0.04, gold, Math.PI / 4);
    } else stamp(0, -0.09, -d * 0.5, 0.09, 0.09, 0.05, cream);
  } else if (v.mount === 'barrel' && v.paint === 'brass') {
    stamp(0, 0, d * 0.5, w * 0.64, h * 0.64, 0.025, charcoal);
  }
  return stamps;
}

export function makeToy(rival) {
  const group = new T.Group(),
    turret = new T.Group(),
    barrel = new T.Group();
  group.add(turret);
  turret.add(barrel);
  barrel.position.y = PIVOT;
  const batches = mounts.map((name, i) => {
    const stamps = armour
      .filter((v) => v.mount === name)
      .flatMap((v) => armourStamps(v, rival ? -1 : 1));
    const mesh = new T.InstancedMesh(box, armourMaterial, stamps.length);
    mesh.frustumCulled = false;
    [group, turret, barrel][i].add(mesh);
    return { mesh, stamps };
  });
  let previous, count;
  function sync(tank) {
    if (tank === previous && tank.cells.size === count) return;
    previous = tank;
    count = tank.cells.size;
    for (const { mesh, stamps } of batches) {
      mesh.count = 0;
      for (const { cell, matrix, color } of stamps) {
        if (!tank.cells.has(cell)) continue;
        mesh.setMatrixAt(mesh.count, matrix);
        mesh.setColorAt(mesh.count++, color);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  return { group, turret, barrel, sync };
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
