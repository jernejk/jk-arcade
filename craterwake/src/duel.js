import { chainAndCollapse, recoilTank } from './destruction.js';
import { World, random, clamp, SEA } from './world.js';

export const DT = 1 / 120,
  GRAVITY = 22,
  RAD = Math.PI / 180;
export const AMMO = ['Pebble', 'Corkscrew', 'Gull Strike', 'Skipper'];
export const freshAim = () => ({ heading: 0, angle: 43, power: 72, ammo: 0 });
export const limits = { heading: [-30, 30], angle: [5, 80], power: [10, 100] };
export function adjust(aim, key, value) {
  aim[key] = clamp(Math.round(value), ...limits[key]);
}
const hitDamage = [18, 22, 12, 16];
const craterRadius = [2.5, 2, 1.8, 2];
const norm = (v) => {
  const m = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / m, y: v.y / m, z: v.z / m };
};
const offset = (p, v, t) => ({
  x: p.x + v.x * t,
  y: p.y + v.y * t,
  z: p.z + v.z * t,
});
export function direction(tank, aim) {
  const h = aim.heading * RAD,
    a = aim.angle * RAD;
  return {
    x: -tank.side * Math.sin(h) * Math.cos(a),
    y: Math.sin(a),
    z: tank.side * Math.cos(h) * Math.cos(a),
  };
}
export function launch(tank, aim) {
  const d = direction(tank, aim);
  const origin = offset({ x: tank.x, y: tank.y + 1.72, z: tank.z }, d, 1.85);
  const speed = 10 + aim.power * 0.34;
  return {
    origin,
    velocity: { x: d.x * speed, y: d.y * speed, z: d.z * speed },
  };
}
export function preview(tank, aim, samples = 14) {
  const { origin, velocity } = launch(tank, aim);
  const duration =
    (velocity.y +
      Math.sqrt(velocity.y ** 2 + 2 * GRAVITY * (origin.y - tank.y))) /
    GRAVITY;
  return Array.from({ length: samples }, (_, i) => {
    const t = (0.35 * duration * (i + 1)) / samples;
    const p = offset(origin, velocity, t);
    p.y -= 0.5 * GRAVITY * t * t;
    return p;
  });
}

// Visit every grid cell crossed by a fixed-step segment, including grazing corner shots.
export function gridHit(world, a, b) {
  let x = Math.floor(a.x),
    y = Math.floor(a.y),
    z = Math.floor(a.z);
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z;
  const sx = Math.sign(dx),
    sy = Math.sign(dy),
    sz = Math.sign(dz);
  const ix = Math.abs(1 / dx),
    iy = Math.abs(1 / dy),
    iz = Math.abs(1 / dz);
  let tx = dx ? ((sx > 0 ? x + 1 : x) - a.x) / dx : Infinity;
  let ty = dy ? ((sy > 0 ? y + 1 : y) - a.y) / dy : Infinity;
  let tz = dz ? ((sz > 0 ? z + 1 : z) - a.z) / dz : Infinity;
  let t = 0;
  while (t <= 1) {
    if (world.get(x, y, z))
      return { t, x: a.x + t * dx, y: a.y + t * dy, z: a.z + t * dz };
    t = Math.min(tx, ty, tz);
    if (tx === t) {
      x += sx;
      tx += ix;
    }
    if (ty === t) {
      y += sy;
      ty += iy;
    }
    if (tz === t) {
      z += sz;
      tz += iz;
    }
  }
  return null;
}
export function fly(round, shooter, aim, record = true) {
  const { origin, velocity: v } = launch(round.tanks[shooter], aim);
  const target = round.tanks[1 - shooter],
    wind = round.wind;
  let p = origin,
    hit = 'water',
    direct = null;
  const path = record ? [p] : null;
  const skips = [];
  for (let i = 0; i < 120 * 12; i++) {
    const next = offset(p, v, DT);
    next.x += 0.5 * wind.x * DT * DT;
    next.y -= 0.5 * GRAVITY * DT * DT;
    next.z += 0.5 * wind.z * DT * DT;
    v.x += wind.x * DT;
    v.y -= GRAVITY * DT;
    v.z += wind.z * DT;
    const wall = gridHit(round.world, p, next);
    if (wall && wall.y >= SEA) {
      p = { x: wall.x, y: wall.y, z: wall.z };
      hit = 'terrain';
    } else if (
      Math.abs(next.x - target.x) <= 1.35 &&
      Math.abs(next.z - target.z) <= 1.55 &&
      next.y >= target.y &&
      next.y <= target.y + 2.25
    ) {
      p = next;
      hit = 'tank';
      direct = 1 - shooter;
    } else if (next.y <= SEA) {
      p = { ...next, y: SEA };
    } else {
      p = next;
      if (record) path.push(p);
      continue;
    }
    const flatTop = hit === 'terrain' && Math.abs(p.y - Math.round(p.y)) < 1e-6;
    if (
      aim.ammo === 3 &&
      v.y < 0 &&
      skips.length < 2 &&
      (hit === 'water' || flatTop)
    ) {
      skips.push({ p: { ...p }, step: i + 1 });
      p = { ...p, y: p.y + 0.035 };
      v.x *= 0.83;
      v.z *= 0.83;
      v.y = Math.min(13, Math.max(3, -v.y * 0.58));
      if (record) path.push(p);
      continue;
    }
    if (record) path.push(p);
    break;
  }
  return { p, path, hit, direct, skips, vector: norm(v) };
}
export const windFor = (rng) => {
  const az = rng() * Math.PI * 2,
    strength = 0.5 + rng() * 4.5;
  return { x: Math.cos(az) * strength, y: 0, z: Math.sin(az) * strength };
};

export function makeRound(seed, number = 1, bonus = false) {
  const world = new World(seed);
  const tanks = [1, -1].map((side, i) => {
    const x = 24.5,
      z = i ? 81.5 : 30.5;
    return {
      x,
      z,
      y: world.top(x, z),
      side,
      hp: 100,
      sunk: false,
      stock: [Infinity, 2 + (!i && bonus ? 1 : 0), 1, 2],
    };
  });
  const rng = random(seed ^ 0xb194d3);
  return {
    world,
    tanks,
    number,
    rng,
    wind: windFor(rng),
    aiTurns: 0,
    previous: null,
  };
}

export function gullTargets(round, shot) {
  const horizontal = norm({ x: shot.vector.x, y: 0, z: shot.vector.z });
  return [-4.5, 0, 4.5].map((distance) => {
    const p = offset(shot.p, horizontal, distance);
    p.x += round.wind.x * 0.28;
    p.z += round.wind.z * 0.28;
    p.y = Math.max(SEA, round.world.top(p.x, p.z));
    return p;
  });
}

export function resolve(round, shooter, ammo, shot) {
  const { world, tanks } = round;
  const debris = [],
    blasts = [],
    damage = [0, 0],
    before = tanks.map((t) => t.hp);
  let echoes = [];
  const drill = [],
    settles = [];
  if (shot.hit !== 'water' || ammo === 2) {
    let centre = { ...shot.p };
    if (ammo === 1) {
      for (let step = 0; step <= 12; step++) {
        centre = offset(shot.p, shot.vector, step * 0.5);
        drill.push(centre);
        debris.push(...world.carve(centre, 0.86, false));
      }
    }
    if (ammo === 2) {
      blasts.push(...gullTargets(round, shot));
    } else blasts.push(centre);
    for (const b of blasts) {
      debris.push(...world.carve(b, craterRadius[ammo]));
    }
    echoes = chainAndCollapse(world, debris);
    if (shot.direct !== null && ammo !== 2)
      damage[shot.direct] = hitDamage[ammo];
    const centres = [...blasts, ...echoes];
    for (const [index, b] of centres.entries()) {
      tanks.forEach((tank, i) => {
        const secondary = index >= blasts.length;
        if (!secondary && i === shot.direct && ammo !== 2) return;
        const d = Math.hypot(
          b.x - tank.x,
          Math.max(0, Math.abs(b.y - (tank.y + 1)) - 1),
          b.z - tank.z,
        );
        damage[i] += Math.round(
          (secondary ? 15 : hitDamage[ammo]) *
            clamp(1 - d / (secondary ? 5 : 4), 0, 1),
        );
      });
    }
    tanks.forEach((tank, i) => {
      tank.hp = Math.max(0, tank.hp - damage[i]);
      settles.push(recoilTank(world, tank, centres, shot.vector));
    });
  }
  if (shooter === 1 && round.previous) {
    const start = launch(tanks[1], round.previous).origin;
    // Remember the lateral bend seen on this flight, independent of where its crater landed.
    const heading = round.previous.heading * RAD;
    round.lastDrift =
      shot.p.x - start.x - (start.z - shot.p.z) * Math.tan(heading);
  }
  const losers = tanks.map((t) => t.hp === 0);
  const winner = losers[shooter]
    ? 1 - shooter
    : losers[1 - shooter]
      ? shooter
      : null;
  return {
    debris,
    blasts,
    drill,
    echoes,
    settles,
    winner,
    direct: shot.direct,
    damage: tanks.map((t, i) => before[i] - t.hp),
  };
}

const gaussian = (rng) =>
  Math.sqrt(-2 * Math.log(Math.max(0.00001, rng()))) *
  Math.cos(2 * Math.PI * rng());
export function gunner(round) {
  const [enemy, self] = round.tanks,
    { rng } = round,
    turn = round.aiTurns++;
  const distance = Math.hypot(enemy.x - self.x, enemy.z - self.z);
  const bearing = Math.atan2(enemy.x - self.x, self.z - enemy.z) / RAD;
  let best,
    score = Infinity;
  for (let i = 0; i < 64; i++) {
    const angle =
      i < 48
        ? 28 + (i % 12) * 3.5
        : clamp((round.previous?.angle ?? 43) + gaussian(rng) * 5, 23, 73);
    const speed = Math.sqrt((distance * GRAVITY) / Math.sin(2 * angle * RAD));
    const time = distance / (speed * Math.cos(angle * RAD));
    const predicted = 0.5 * round.wind.x * time * time;
    const drift =
      round.lastDrift === undefined
        ? predicted
        : 0.8 * predicted + 0.2 * round.lastDrift;
    const correction = Math.atan2(-drift, distance) / RAD;
    const power = (speed - 10) / 0.34 - round.wind.z * self.side * time * 0.65;
    const aim = {
      heading: clamp(
        bearing + correction * (turn ? 1 : 0.6) + (rng() - 0.5) * 2,
        -30,
        30,
      ),
      angle,
      power: clamp(power + (rng() - 0.5) * 12, 10, 100),
      ammo: 0,
    };
    const shot = fly(round, 1, aim, false);
    const value =
      shot.direct === 0
        ? -4
        : Math.hypot(
            shot.p.x - enemy.x,
            shot.p.y - enemy.y - 1,
            shot.p.z - enemy.z,
          );
    if (value < score) {
      best = aim;
      score = value;
    }
  }
  const shrink = 0.65 ** turn;
  for (const [key, base, floor] of [
    ['heading', 4, 1],
    ['angle', 5, 1.2],
    ['power', 8, 2],
  ]) {
    adjust(
      best,
      key,
      best[key] + gaussian(rng) * Math.max(floor, base * shrink),
    );
  }
  let cover = 0;
  for (let d = 1; d <= Math.ceil(distance); d++) {
    const x = Math.floor(self.x + ((enemy.x - self.x) * d) / distance),
      z = Math.floor(self.z + ((enemy.z - self.z) * d) / distance);
    for (let y = self.y + 1; y <= self.y + 3; y++)
      if (round.world.get(x, y, z) >= 5 && round.world.get(x, y, z) <= 8)
        cover++;
  }
  if (cover >= 4 && self.stock[1]) best.ammo = 1;
  else if (
    self.stock[2] &&
    turn > 0 &&
    enemy.y === round.world.top(enemy.x + 1, enemy.z)
  )
    best.ammo = 2;
  round.previous = { ...best };
  return best;
}
export class Match {
  constructor(seed, bonus = false) {
    this.seed = seed >>> 0;
    this.score = [0, 0];
    this.medals = new Set();
    this.bonus = bonus;
    this.nextRound();
  }
  nextRound() {
    this.round = makeRound(
      (this.seed + Math.imul(this.score[0] + this.score[1], 2654435761)) >>> 0,
      this.score[0] + this.score[1] + 1,
      this.bonus,
    );
  }
  finish(winner) {
    this.score[winner]++;
    if (winner === 0) {
      if (this.round.tanks[1].sunk) this.medals.add('Undertow');
      if (this.round.tanks[0].hp === 100) this.medals.add('Untouched');
    }
    return this.score[winner] === 2;
  }
  rematch() {
    return new Match(this.seed, this.score[1] === 2);
  }
}
