// Rigid-body siege. Matter is loaded by the page (vendor) or by tests (npm).

import { WORLD, collapseIds, damageOf, integrate, neighborsOf } from "./logic.js";

function matter() {
  const api = globalThis.Matter;
  if (!api) throw new Error("Matter is not loaded");
  return api;
}

function hypot(x, y) {
  return Math.hypot(x, y);
}

export function createSiege(layout) {
  const { Engine, Bodies, Body, Composite, Events, Sleeping, Constraint } = matter();
  const engine = Engine.create({ enableSleeping: false });
  engine.gravity.x = layout.wind || 0;
  engine.gravity.y = 1;
  engine.gravity.scale = 0.001;
  engine.positionIterations = 12;
  engine.velocityIterations = 8;
  engine.constraintIterations = 3;

  const siege = {
    engine,
    layout,
    bodies: new Map(),
    constraints: [],
    shots: [],
    debris: [],
    fx: [],
    hits: [],
    frame: 0,
    timeScale: 1,
    boomDepth: 0,
    dirty: false,
    powder: layout.powder === true,
    sleeping: Sleeping,
    Body,
    Composite,
    Constraint,
  };

  const ground = Bodies.rectangle(WORLD.w / 2, WORLD.groundTop + 28, WORLD.w + 80, 56, {
    isStatic: true,
    friction: 0.9,
    restitution: 0.02,
    label: "ground",
  });
  ground.grok = { role: "ground", id: "ground" };
  const left = Bodies.rectangle(-18, 300, 36, 1400, { isStatic: true, friction: 0.4, label: "wall" });
  left.grok = { role: "wall", id: "wall-l" };
  const right = Bodies.rectangle(WORLD.w + 18, 300, 36, 1400, { isStatic: true, friction: 0.4, label: "wall" });
  right.grok = { role: "wall", id: "wall-r" };
  Composite.add(engine.world, [ground, left, right]);

  for (const block of layout.blocks) {
    addBlock(siege, block);
  }

  Events.on(engine, "collisionStart", (ev) => {
    for (const pair of ev.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      if (!a.grok || !b.grok) continue;
      const speed = hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
      siege.hits.push({ a, b, speed });
    }
  });

  return siege;
}

function addBlock(siege, block) {
  const { Bodies, Body, Composite } = matter();
  // Created dynamic first so Matter stores a finite mass, then pinned.
  // Bodies born static never get that mass back, and the stack turns into NaN.
  const body = Bodies.rectangle(block.x, block.y, block.w - 0.5, block.h - 0.5, {
    isStatic: false,
    friction: 0.75,
    frictionStatic: 0.9,
    restitution: 0.02,
    density: 0.0022,
    slop: 0.04,
    chamfer: { radius: 1.4 },
    label: block.id,
  });
  Body.setStatic(body, true);
  body.grok = {
    role: "block",
    id: block.id,
    side: block.side,
    col: block.col,
    row: block.row,
    w: block.w,
    h: block.h,
    material: block.material,
    hp: block.hp,
    maxHp: block.maxHp,
    rooted: block.rooted,
    arch: block.arch,
    loose: false,
    variant: block.variant,
    neighbors: block.neighbors,
    born: block.y,
    flash: 0,
  };
  Composite.add(siege.engine.world, body);
  siege.bodies.set(block.id, body);
  return body;
}

export function destroySiege(siege) {
  if (!siege) return;
  const { Engine, Composite, Events } = matter();
  Events.off(siege.engine, "collisionStart");
  Composite.clear(siege.engine.world, false, true);
  Engine.clear(siege.engine);
  siege.bodies.clear();
}

function pointBlocked(siege, x, y, radius) {
  if (y + radius >= WORLD.groundTop - 1) return true;
  for (const body of siege.bodies.values()) {
    const g = body.grok;
    if (Math.abs(x - body.position.x) < g.w / 2 + radius && Math.abs(y - body.position.y) < g.h / 2 + radius) return true;
  }
  return false;
}

export function fireProjectile(siege, owner, weapon, velocity, origin) {
  const { Bodies, Body, Composite } = matter();
  const path = integrate(origin.x, origin.y, velocity.vx, velocity.vy, siege.layout.wind || 0, 8, weapon.air);
  let spawn = { x: origin.x, y: origin.y, vx: velocity.vx, vy: velocity.vy };
  for (const point of path) {
    if (!pointBlocked(siege, point.x, point.y, weapon.radius + 1)) {
      spawn = point;
      break;
    }
  }
  const x = spawn.x;
  const y = Math.min(spawn.y, WORLD.groundTop - weapon.radius - 3);
  const area = Math.PI * weapon.radius * weapon.radius;
  const body = Bodies.circle(x, y, weapon.radius, {
    friction: 0.35,
    frictionAir: weapon.air,
    restitution: weapon.restitution,
    density: weapon.mass / area,
    slop: 0.02,
    sleepThreshold: 999,
    label: "shot",
  });
  body.grok = {
    role: "shot",
    id: `shot-${siege.frame}-${owner}`,
    owner,
    weapon,
    hits: 0,
    age: 0,
    done: false,
    prevX: x,
    prevY: y,
    swept: false,
  };
  Composite.add(siege.engine.world, body);
  Body.setVelocity(body, { x: spawn.vx, y: spawn.vy });
  siege.shots.push(body);
  siege.fx.push({ kind: "fire", x, y, owner, weapon: weapon.id });
  return body;
}

function liveStructural(siege) {
  const list = [];
  for (const body of siege.bodies.values()) {
    const g = body.grok;
    if (!body.isStatic || g.loose || g.hp <= 0) continue;
    list.push({
      id: g.id,
      side: g.side,
      x: body.position.x,
      y: body.position.y,
      w: g.w,
      h: g.h,
      hp: g.hp,
      rooted: g.rooted && !g.loose,
      arch: g.arch,
      loose: false,
      neighbors: g.neighbors,
      material: g.material,
    });
  }
  return list;
}

function releaseUnstable(siege) {
  const structural = liveStructural(siege);
  const falling = collapseIds(structural);
  if (!falling.length) return [];
  const released = [];
  for (const id of falling) {
    if (releaseBody(siege, id)) released.push(id);
  }
  if (released.length) linkReleased(siege, new Set(released));
  if (released.length >= 4) siege.fx.push({ kind: "collapse", n: released.length, x: avgX(siege, released), y: avgY(siege, released) });
  return released;
}

function avgX(siege, ids) {
  let s = 0;
  for (const id of ids) s += siege.bodies.get(id)?.position.x || 0;
  return s / ids.length;
}
function avgY(siege, ids) {
  let s = 0;
  for (const id of ids) s += siege.bodies.get(id)?.position.y || 0;
  return s / ids.length;
}

function nudge(id) {
  let n = 2166136261;
  const s = String(id);
  for (let i = 0; i < s.length; i++) n = Math.imul(n ^ s.charCodeAt(i), 16777619);
  return ((n >>> 0) % 1000) / 1000;
}

function releaseBody(siege, id) {
  const body = siege.bodies.get(id);
  if (!body || !body.isStatic) return false;
  const { Body, Sleeping } = matter();
  Body.setStatic(body, false);
  body.restitution = 0.06;
  body.friction = 0.62;
  const sway = nudge(id) - 0.5;
  Body.setVelocity(body, { x: sway * 0.45, y: 0.15 });
  Body.setAngularVelocity(body, sway * 0.04);
  Sleeping.set(body, false);
  siege.fx.push({ kind: "spoil", id: body.grok.id, material: body.grok.material, side: body.grok.side });
  return true;
}

function linkReleased(siege, ids) {
  const { Constraint, Composite } = matter();
  const seen = new Set();
  for (const id of ids) {
    const body = siege.bodies.get(id);
    if (!body) continue;
    const neigh = body.grok.neighbors || {};
    const around = [...(neigh.below || []), ...(neigh.above || []), ...(neigh.left || []), ...(neigh.right || [])];
    for (const otherId of around) {
      if (!ids.has(otherId)) continue;
      const key = id < otherId ? `${id}|${otherId}` : `${otherId}|${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const other = siege.bodies.get(otherId);
      if (!other || other.isStatic) continue;
      const length = hypot(body.position.x - other.position.x, body.position.y - other.position.y);
      const constraint = Constraint.create({
        bodyA: body,
        bodyB: other,
        stiffness: 0.16,
        damping: 0.5,
        length,
      });
      constraint.grok = true;
      Composite.add(siege.engine.world, constraint);
      siege.constraints.push(constraint);
    }
  }
}

function dropConstraint(siege, constraint) {
  const { Composite } = matter();
  const i = siege.constraints.indexOf(constraint);
  if (i >= 0) siege.constraints.splice(i, 1);
  Composite.remove(siege.engine.world, constraint);
}

function breakConstraintsOn(siege, body) {
  for (const constraint of siege.constraints.slice()) {
    if (constraint.bodyA === body || constraint.bodyB === body) dropConstraint(siege, constraint);
  }
}

function stretchConstraints(siege) {
  for (const constraint of siege.constraints.slice()) {
    const a = constraint.bodyA;
    const b = constraint.bodyB;
    if (!a || !b) {
      dropConstraint(siege, constraint);
      continue;
    }
    const d = hypot(a.position.x - b.position.x, a.position.y - b.position.y);
    if (d > constraint.length * 1.55) dropConstraint(siege, constraint);
  }
}

function killBlock(siege, id) {
  const body = siege.bodies.get(id);
  if (!body || body.grok.hp <= 0 && body.grok.role !== "block") return null;
  const { Composite } = matter();
  const g = body.grok;
  const info = {
    id: g.id,
    x: body.position.x,
    y: body.position.y,
    w: g.w,
    h: g.h,
    material: g.material,
    side: g.side,
    angle: body.angle,
  };
  g.hp = 0;
  breakConstraintsOn(siege, body);
  Composite.remove(siege.engine.world, body);
  siege.bodies.delete(id);
  spawnDebris(siege, info);
  siege.fx.push({ kind: "break", ...info });
  siege.dirty = true;
  return info;
}

function spawnDebris(siege, info) {
  const { Bodies, Body, Composite } = matter();
  const pieces = info.material === "banner" ? 1 : 2;
  for (let i = 0; i < pieces; i++) {
    if (siege.debris.length > 40) {
      const old = siege.debris.shift();
      if (old) Composite.remove(siege.engine.world, old);
    }
    const w = Math.max(6, info.w * (i === 0 ? 0.46 : 0.34));
    const h = Math.max(5, info.h * (i === 0 ? 0.42 : 0.3));
    const body = Bodies.rectangle(info.x + (i - 0.5) * 4, info.y + i, w, h, {
      friction: 0.6,
      frictionAir: 0.02,
      restitution: 0.04,
      density: 0.0016,
      chamfer: { radius: 1 },
      angle: info.angle + (i - 0.5) * 0.4,
    });
    body.grok = { role: "debris", id: `deb-${siege.frame}-${i}-${info.id}`, material: info.material, side: info.side, w, h, age: 0, variant: i };
    Composite.add(siege.engine.world, body);
    Body.setVelocity(body, { x: (i - 0.5) * 2.2, y: -1.4 - i });
    Body.setAngularVelocity(body, (i - 0.5) * 0.18);
    siege.debris.push(body);
  }
}

function applyDamage(siege, id, amount) {
  const body = siege.bodies.get(id);
  if (!body || body.grok.role !== "block" || amount <= 0 || body.grok.hp <= 0) return 0;
  if (body.grok.material === "banner") return 0;
  body.grok.hp -= amount;
  body.grok.flash = 1;
  siege.fx.push({ kind: "chip", x: body.position.x, y: body.position.y, material: body.grok.material, amount, side: body.grok.side });
  if (body.grok.hp > 0) return amount;
  const material = body.grok.material;
  const x = body.position.x;
  const y = body.position.y;
  killBlock(siege, id);
  if (material === "keg" && siege.boomDepth < 6) {
    siege.boomDepth += 1;
    explode(siege, x, y, 74, 90);
    siege.boomDepth -= 1;
  }
  return amount;
}

function explode(siege, x, y, radius, damage) {
  siege.fx.push({ kind: "explode", x, y, radius });
  const hits = [];
  for (const body of siege.bodies.values()) {
    const d = hypot(body.position.x - x, body.position.y - y);
    if (d > radius || body.grok.hp <= 0) continue;
    hits.push({ id: body.grok.id, amount: damage * (1 - d / radius), d, body });
  }
  for (const hit of hits) applyDamage(siege, hit.id, hit.amount);
  for (const hit of hits) {
    const body = siege.bodies.get(hit.id);
    if (!body || body.isStatic) continue;
    const dx = body.position.x - x;
    const dy = body.position.y - y;
    const d = Math.max(10, hypot(dx, dy));
    const mag = (1 - Math.min(1, hit.d / radius)) * 0.009 * body.mass;
    siege.Body.applyForce(body, body.position, { x: (dx / d) * mag, y: (dy / d) * mag - mag * 0.35 });
  }
  for (const body of siege.debris) {
    const d = hypot(body.position.x - x, body.position.y - y);
    if (d > radius) continue;
    const dx = body.position.x - x;
    const dy = body.position.y - y;
    const dist = Math.max(8, d);
    siege.Body.applyForce(body, body.position, { x: (dx / dist) * 0.004, y: (dy / dist) * 0.004 });
  }
}

function yank(siege, body, toward) {
  const { Body, Sleeping } = matter();
  body.grok.loose = true;
  body.grok.rooted = false;
  if (body.isStatic) Body.setStatic(body, false);
  Sleeping.set(body, false);
  breakConstraintsOn(siege, body);
  const dx = toward.x - body.position.x;
  const dy = toward.y - body.position.y;
  const d = Math.max(1, hypot(dx, dy));
  Body.setVelocity(body, { x: (dx / d) * 7.5, y: (dy / d) * 7.5 - 1.5 });
  Body.setAngularVelocity(body, 0.12);
  siege.fx.push({ kind: "yank", x: body.position.x, y: body.position.y });
  siege.dirty = true;
}

function retireShot(siege, body) {
  if (!body || body.grok.done) return;
  body.grok.done = true;
  const { Composite } = matter();
  Composite.remove(siege.engine.world, body);
  const i = siege.shots.indexOf(body);
  if (i >= 0) siege.shots.splice(i, 1);
}

function onShotHit(siege, shot, other, speed) {
  const weapon = shot.grok.weapon;
  const g = other.grok;
  if (shot.grok.done || shot.grok.touched) return;
  shot.grok.touched = true;
  if (g.role === "ground" || g.role === "wall") {
    if (weapon.explode) {
      explode(siege, shot.position.x, shot.position.y, weapon.explodeRadius, weapon.explode);
    }
    siege.fx.push({ kind: "thud", x: shot.position.x, y: shot.position.y, hard: speed > 6 });
    retireShot(siege, shot);
    return;
  }
  if (g.role !== "block" && g.role !== "debris") return;
  if (g.role === "block") {
    const cloth = g.material === "banner";
    if (!cloth) {
      const amount = damageOf(weapon, speed, siege.powder && shot.grok.owner === "player");
      applyDamage(siege, g.id, amount);
      if (weapon.yank && siege.bodies.has(g.id)) yank(siege, siege.bodies.get(g.id), shot.grok.owner === "player" ? siege.layout.playerCannon : siege.layout.enemyCannon);
    }
    siege.fx.push({ kind: cloth ? "clink" : "impact", x: other.position.x, y: other.position.y, speed, weapon: weapon.id, material: g.material });
  }
  if (weapon.explode) explode(siege, shot.position.x, shot.position.y, weapon.explodeRadius, weapon.explode);
  shot.grok.hits += 1;
  const pierce = weapon.pierce && shot.grok.hits <= 2 && speed > 6 && g.role === "block" && !siege.bodies.has(g.id);
  if (weapon.explode || weapon.yank || !pierce) {
    if (!(weapon.pierce && pierce)) retireShot(siege, shot);
  }
  if (speed > 3) breakConstraintsOn(siege, other);
}

function onBlockHit(siege, body, other, speed) {
  if (speed < 3.4) return;
  const g = body.grok;
  const o = other.grok;
  if (o.role === "ground" || o.role === "wall") {
    if (speed > 4) breakConstraintsOn(siege, body);
    return;
  }
  if (o.role !== "block" && o.role !== "debris") return;
  if (g.role !== "block") return;
  const rel = Math.min(1.6, body.mass / 1.1);
  const amount = (speed - 2.6) * 12 * rel * (o.role === "debris" ? 0.45 : 1);
  if (amount > 4) applyDamage(siege, g.id, amount);
  if (speed > 3.2) breakConstraintsOn(siege, body);
}

function drainHits(siege) {
  const hits = siege.hits.splice(0, siege.hits.length);
  for (const hit of hits) {
    const { a, b, speed } = hit;
    if (!a.grok || !b.grok) continue;
    if (a.grok.role === "shot") onShotHit(siege, a, b, speed);
    else if (b.grok.role === "shot") onShotHit(siege, b, a, speed);
    else {
      if (a.grok.role === "block") onBlockHit(siege, a, b, speed);
      if (b.grok.role === "block") onBlockHit(siege, b, a, speed);
    }
  }
  if (siege.dirty) {
    releaseUnstable(siege);
    siege.dirty = false;
  }
}

function sweepDebris(siege) {
  const { Composite } = matter();
  for (const body of siege.debris.slice()) {
    body.grok.age += 1;
    const gone = body.grok.age > 220 || body.position.y > WORLD.h + 80 || (body.grok.age > 90 && body.speed < 0.15 && Math.abs(body.angularSpeed) < 0.02);
    if (!gone) continue;
    Composite.remove(siege.engine.world, body);
    siege.debris.splice(siege.debris.indexOf(body), 1);
  }
}

function sweepShots(siege) {
  for (const shot of siege.shots) {
    if (shot.grok.done || shot.grok.swept) continue;
    const r = shot.grok.weapon.radius;
    const x0 = shot.grok.prevX;
    const y0 = shot.grok.prevY;
    const x1 = shot.position.x;
    const y1 = shot.position.y;
    const dist = hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / 4));
    let struck = null;
    for (let i = 1; i <= steps && !struck; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      if (y + r >= WORLD.groundTop) {
        struck = "ground";
        break;
      }
      for (const body of siege.bodies.values()) {
        const g = body.grok;
        if (Math.abs(x - body.position.x) <= g.w / 2 + r && Math.abs(y - body.position.y) <= g.h / 2 + r) {
          struck = body;
          break;
        }
      }
    }
    shot.grok.prevX = shot.position.x;
    shot.grok.prevY = shot.position.y;
    if (!struck || struck === "ground") continue;
    shot.grok.swept = true;
    const speed = hypot(shot.velocity.x, shot.velocity.y);
    onShotHit(siege, shot, struck, Math.max(speed, 4));
  }
  for (const shot of siege.shots) shot.grok.swept = false;
}

export function stepSiege(siege) {
  const { Engine } = matter();
  siege.frame += 1;
  siege.engine.timing.timeScale = siege.timeScale;
  for (const shot of siege.shots) {
    shot.grok.prevX = shot.position.x;
    shot.grok.prevY = shot.position.y;
  }
  Engine.update(siege.engine, 1000 / 60);
  stretchConstraints(siege);
  drainHits(siege);
  sweepShots(siege);
  for (const shot of siege.shots.slice()) {
    shot.grok.touched = false;
    shot.grok.age += 1;
    if (shot.grok.age > 240 || shot.position.y > WORLD.h + 40) retireShot(siege, shot);
  }
  for (const body of siege.bodies.values()) {
    if (body.grok.flash > 0) body.grok.flash *= 0.82;
  }
  sweepDebris(siege);
  if (siege.frame % 8 === 0) {
    const extra = releaseUnstable(siege);
    if (extra.length) siege.dirty = false;
  }
  return siege.fx;
}

export function isSettled(siege) {
  if (siege.frame < 16) return false;
  if (siege.shots.some((s) => !s.grok.done)) return false;
  for (const body of siege.bodies.values()) {
    if (body.isStatic || body.isSleeping) continue;
    if (body.speed > 0.45 || Math.abs(body.angularSpeed) > 0.08) return false;
  }
  for (const body of siege.debris) {
    if (body.isSleeping) continue;
    if (body.speed > 0.55 || Math.abs(body.angularSpeed) > 0.1) return false;
  }
  return true;
}

export function forceSettle(siege) {
  const { Body } = matter();
  for (const shot of siege.shots.slice()) retireShot(siege, shot);
  const moving = [...siege.bodies.values(), ...siege.debris];
  for (const body of moving) {
    if (body.isStatic) continue;
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);
  }
}

export function sideIntegrity(siege, side) {
  let max = 0;
  const layoutBlocks = siege.layout && siege.layout.blocks;
  if (layoutBlocks) {
    for (const block of layoutBlocks) {
      if (block.side === side) max += block.maxHp;
    }
  }
  let hp = 0;
  for (const body of siege.bodies.values()) {
    if (!body.grok || body.grok.side !== side || body.grok.role !== "block") continue;
    if (!layoutBlocks) max += body.grok.maxHp;
    if (!body.isStatic || body.grok.loose) continue;
    hp += Math.max(0, body.grok.hp);
  }
  if (!max) return 0;
  return Math.max(0, Math.min(1, hp / max));
}

export function bannerBody(siege, side) {
  for (const body of siege.bodies.values()) {
    if (body.grok.side === side && body.grok.material === "banner") return body;
  }
  return null;
}

export function bannerStatus(siege, side) {
  const body = bannerBody(siege, side);
  if (!body || body.grok.hp <= 0) return "gone";
  if (!body.isStatic) return "fallen";
  if (body.position.y > WORLD.groundTop - 8) return "fallen";
  return "up";
}

export function consumeFx(siege) {
  return siege.fx.splice(0, siege.fx.length);
}

export function strikeBlock(siege, id, amount) {
  applyDamage(siege, id, amount);
  if (siege.dirty) {
    releaseUnstable(siege);
    siege.dirty = false;
  }
}

export { neighborsOf };
