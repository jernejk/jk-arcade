import * as T from '../vendor/three.module.min.js';
import { random, SEA, M, clamp } from './world.js';
import { palette } from './mesher.js';
import { stepShard } from './destruction.js';

const SHARDS = 96,
  PUFFS = 36,
  FRONTS = 7,
  STEP = 1 / 60;
const dummy = new T.Object3D();
const colors = palette.map((hex) => new T.Color(hex));
const foam = new T.Color('#c5f8e7'),
  salt = new T.Color('#f3d2a0'),
  soot = new T.Color('#716478');
const flare = new T.Color('#fff5bb'),
  copper = new T.Color('#ec914c'),
  tint = new T.Color();
function batch(scene, geometry, material, max) {
  const mesh = new T.InstancedMesh(geometry, material, max);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.setColorAt(0, flare);
  scene.add(mesh);
  return mesh;
}
function pose(mesh, i) {
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}

// Destruction stays in the grid simulation. These three bounded batches only
// present its result, so skipping an orbit never changes the next turn.
export class SalvoEffects {
  constructor(scene) {
    this.shards = batch(
      scene,
      new T.BoxGeometry(),
      new T.MeshLambertMaterial(),
      SHARDS,
    );
    this.cloud = batch(
      scene,
      new T.IcosahedronGeometry(1, 0),
      new T.MeshBasicMaterial({
        transparent: true,
        opacity: 0.57,
        depthWrite: false,
      }),
      PUFFS,
    );
    this.waves = batch(
      scene,
      new T.RingGeometry(0.88, 1, 32),
      new T.MeshBasicMaterial({
        side: T.FrontSide,
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
      FRONTS,
    );
    // Prepare the next salvo while the previous rubble is still on the field.
    this.pools = [0, 1].map(() => Array.from({ length: SHARDS }, () => ({})));
    this.nextPool = 0;
    this.colors = new Float32Array(SHARDS * 3);
    this.bodies = [];
    this.clear();
  }
  clear() {
    this.bodies.length = 0;
    this.fronts = [];
    this.age = 0;
    this.accumulator = 0;
    this.settled = false;
    this.fuses = [];
    this.shards.count = this.cloud.count = this.waves.count = 0;
  }
  prepare(world, shot, result) {
    const bodies = [],
      pool = this.pools[this.nextPool];
    const rng = random(
      Math.round(shot.p.x * 131 + shot.p.z * 331 + shot.p.y * 7),
    );
    const primary = result.blasts.length ? result.blasts : [shot.p];
    const fronts = [...primary, ...result.echoes].map((p, i) => ({
      ...p,
      delay: i < primary.length ? 0 : (i - primary.length + 1) * 0.16,
      splash: p.y <= SEA + 0.01,
      phase: rng() * 6.28,
      surface: Math.max(
        SEA + 0.09,
        p.y + 0.15,
        Math.min(p.y + 1.6, world.top(p.x, p.z) + 0.06),
      ),
    }));
    const splash = shot.hit === 'water' && !result.blasts.length;
    const loose = result.debris.filter((p) => p.loose),
      chips = result.debris.filter((p) => !p.loose);
    const fuses = fronts.slice(primary.length);
    const looseCount = Math.min(48, loose.length);
    const armour = result.tankDebris;
    const armourCount = Math.min(12, armour.length);
    const count = splash
      ? 24
      : Math.min(
          SHARDS - looseCount - armourCount - fuses.length * 2,
          Math.max(14, chips.length * 2),
        );
    for (let i = 0; i < looseCount + count + armourCount; i++) {
      const falling = i < looseCount;
      const armourIndex = i - looseCount - count;
      const p =
        armourIndex >= 0
          ? armour[Math.floor((armourIndex * armour.length) / armourCount)]
          : falling
            ? loose[Math.floor((i * loose.length) / looseCount)]
            : chips[Math.floor(((i - looseCount) * chips.length) / count)] ||
              shot.p;
      let origin = fronts[0],
        best = Infinity;
      for (const f of fronts) {
        const d = (p.x - f.x) ** 2 + (p.y - f.y) ** 2 + (p.z - f.z) ** 2;
        if (d < best) {
          best = d;
          origin = f;
        }
      }
      const a =
        Math.atan2(p.x - origin.x, p.z - origin.z) + (rng() - 0.5) * 0.8;
      const speed = falling ? 0.5 + rng() * 0.4 : 2 + rng() * 5;
      const body = pool[i];
      body.x = p.x;
      body.y = p.y;
      body.z = p.z;
      body.vx = Math.sin(a) * speed;
      body.vy = falling ? 0.1 : 2.3 + rng() * 6.7;
      body.vz = Math.cos(a) * speed;
      body.size =
        armourIndex >= 0
          ? 0.41
          : falling
            ? 0.94
            : splash
              ? 0.12 + rng() * 0.12
              : 0.2 + rng() * 0.34;
      body.spin = falling ? 1.1 : 2 + rng() * 6;
      body.pitch = falling ? 0 : rng() * 3;
      body.yaw = falling ? 0 : rng() * 6.28;
      body.loose = falling;
      body.release = origin.delay + (falling ? 0.12 : 0);
      body.bounces = 0;
      body.asleep = body.sunk = false;
      body.finalPose = false;
      bodies.push(body);
      const color =
        armourIndex >= 0
          ? tint.setHex(p.color)
          : splash
            ? foam
            : colors[p.m] || copper;
      color.toArray(this.colors, 3 * i);
    }
    for (let i = 0; i < fuses.length; i++) {
      const offset = 3 * (bodies.length + i * 2);
      colors[M.spring].toArray(this.colors, offset);
      salt.toArray(this.colors, offset + 3);
    }
    return { fronts, fuses, bodies };
  }
  burst(world, shot, result, prepared = this.prepare(world, shot, result)) {
    this.clear();
    this.nextPool = 1 - this.nextPool;
    this.fronts = prepared.fronts;
    this.fuses = prepared.fuses;
    this.bodies = prepared.bodies;
    this.shards.instanceColor.array.set(this.colors);
    this.shards.instanceColor.needsUpdate = true;
  }
  shardsFrame(world, dt, calm, orbit, blastAge) {
    if (calm) {
      this.shards.count = 0;
      return;
    }
    if (!this.bodies.length || this.settled) return;
    // The first impact frame shows the contact ring. Eject the rubble on the
    // following frame, after the newly exposed terrain and plates are visible.
    if (orbit && blastAge >= 0 && blastAge < STEP) return;
    // Keep delayed crate releases on the blast clock; limit collision work after a stall.
    this.age = blastAge ?? this.age + dt;
    this.accumulator += Math.min(dt, 2 * STEP);
    while (this.accumulator >= STEP) {
      this.accumulator -= STEP;
      const slow = orbit && this.age < 0.32;
      const step = slow ? STEP * 0.48 : STEP;
      for (const b of this.bodies)
        if (this.age >= b.release) stepShard(world, b, step);
    }
    this.bodies.forEach((b, i) => {
      if (b.finalPose) return;
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(b.pitch, b.yaw, b.pitch * 0.31);
      dummy.scale.setScalar(
        (!b.loose && this.age < b.release) || b.sunk ? 0 : b.size,
      );
      pose(this.shards, i);
      b.finalPose = b.asleep || b.sunk;
    });
    // While an adjacent crate is still winding up, leave its red case and
    // brass band in view even if the terrain worker has delivered the final mesh.
    let count = this.bodies.length;
    for (const f of this.fuses) {
      dummy.position.set(f.x, f.y, f.z);
      dummy.rotation.set(0, 0, 0);
      const size = this.age < f.delay ? 1.99 : 0;
      dummy.scale.setScalar(size);
      pose(this.shards, count++);
      dummy.scale.set(size * 1.01, size * 0.13, size * 1.01);
      pose(this.shards, count++);
    }
    this.shards.count =
      this.age > (this.fuses.at(-1)?.delay || 0) ? this.bodies.length : count;
    this.shards.instanceMatrix.needsUpdate = true;
    this.settled = this.bodies.every((b) => b.asleep || b.sunk);
  }
  atmosphere(age, wind, settles, showCore) {
    // Reserve a little of the cloud batch for a sinking hull's spray.
    const perFront = Math.min(16, Math.floor((PUFFS - 8) / this.fronts.length));
    for (const f of this.fronts) {
      const t = age - f.delay;
      if (t < 0 || t > 1.55) continue;
      if (t < 0.67) {
        const q = t / 0.67,
          r = 0.35 + (1 - (1 - q) ** 2) * (f.splash ? 5.2 : 4.7);
        dummy.position.set(f.x, f.surface + 0.2 * q, f.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(r, r, 1);
        tint
          .copy(f.splash ? foam : flare)
          .lerp(f.splash ? salt : copper, q)
          .multiplyScalar(1 - q);
        this.waves.setColorAt(this.waves.count, tint);
        pose(this.waves, this.waves.count++);
      }
      if (t < STEP) continue;
      for (let i = 0; i < perFront; i++) {
        const smoke = i % 3 === 0,
          a = i * 2.39996 + f.phase,
          band = (i % 5) / 5;
        const life = showCore ? (smoke ? 0.85 : 0.7) : smoke ? 1.5 : 1;
        if (t >= life) continue;
        const u = t / life,
          fade = 1 - u * u;
        const r =
          (smoke ? 0.25 : 0.65) +
          (1 - Math.exp(-t * 3.2)) * (smoke ? 1.15 : 2.9 + band);
        dummy.position.set(
          f.x + Math.sin(a) * r + wind.x * t * t * 0.12,
          f.surface +
            (smoke
              ? (1 + band * 2) * t
              : 0.15 + Math.sin(u * Math.PI) * (0.45 + band)),
          f.z + Math.cos(a) * r + wind.z * t * t * 0.12,
        );
        dummy.rotation.set(a + t * 0.5, a, 0);
        const size = (smoke ? 0.48 + t * 0.66 : 0.3 + t * 0.44) * fade;
        dummy.scale.set(size * (smoke ? 1 : 1.35), size, size);
        tint.copy(f.splash ? foam : smoke ? flare : salt);
        if (!f.splash && smoke)
          tint.lerp(t < 0.26 ? copper : soot, clamp(t / 0.24, 0, 1));
        this.cloud.setColorAt(this.cloud.count, tint);
        pose(this.cloud, this.cloud.count++);
      }
    }
    for (const s of settles) {
      if (!s.sunk || age < 0.5 || age > 1.45) continue;
      const t = age - 0.5;
      for (let i = 0; i < 8 && this.cloud.count < PUFFS; i++) {
        const a = i * 2.4,
          r = 0.6 + t * 3;
        dummy.position.set(
          s.to.x + Math.sin(a) * r,
          SEA + Math.max(0, t * (4 + (i % 3)) - 6 * t * t),
          s.to.z + Math.cos(a) * r,
        );
        dummy.scale.setScalar(0.38 * (1 - t));
        this.cloud.setColorAt(this.cloud.count, foam);
        pose(this.cloud, this.cloud.count++);
      }
    }
    for (const mesh of [this.cloud, this.waves]) {
      if (mesh.count) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }
  skipRipples(skips, time, step) {
    for (const skip of skips) {
      const t = time - skip.step * step;
      if (t < 0 || t > 0.38) continue;
      const q = t / 0.38,
        r = 0.25 + q * 1.7;
      dummy.position.set(skip.p.x, skip.p.y + 0.06, skip.p.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(r, r, 1);
      this.waves.setColorAt(
        this.waves.count,
        tint.copy(foam).multiplyScalar(1 - q),
      );
      pose(this.waves, this.waves.count++);
    }
    if (this.waves.count) {
      this.waves.instanceMatrix.needsUpdate = true;
      this.waves.instanceColor.needsUpdate = true;
    }
  }
  trail(shot, index) {
    for (let i = 0; i < 26 && index - 2 - i * 3 >= 0; i++) {
      const p = shot.path[index - 2 - i * 3],
        t = i / 26;
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(0.06 + 0.12 * Math.sin(t * Math.PI));
      dummy.rotation.set(t * 3, i * 0.7, 0);
      this.cloud.setColorAt(i, tint.copy(flare).lerp(soot, t * 0.72));
      pose(this.cloud, i);
      this.cloud.count++;
    }
    this.cloud.instanceColor.needsUpdate = true;
    this.cloud.instanceMatrix.needsUpdate = true;
  }
}
