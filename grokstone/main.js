import { createAudio } from "./audio.js";
import {
  LEVELS,
  UPGRADES,
  WEAPONS,
  WORLD,
  aimToward,
  bestAim,
  buildLayout,
  buy,
  dailyLayout,
  defaultSave,
  enemyAim,
  firstHit,
  hashFor,
  inscription,
  integrate,
  lossLine,
  layoutByNumber,
  loadSave,
  localDateString,
  nextLevelNumber,
  parseHash,
  recordResult,
  seedLayout,
  shareText,
  shotVelocity,
  stepClock,
  cleverClear,
  missingStar,
  starsFor,
  weaponById,
  windLabel,
  writeSave,
} from "./logic.js";
import {
  SHARD_CUTS,
  bannerStatus,
  consumeFx,
  createSiege,
  destroySiege,
  fireProjectile,
  forceSettle,
  isSettled,
  sideIntegrity,
  stepSiege,
} from "./physics.js";

const canvas = document.querySelector("#view");
const ctx = canvas.getContext("2d");
const audio = createAudio();
const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");

const ui = {
  hud: document.querySelector("#hud"),
  tray: document.querySelector("#tray"),
  callout: document.querySelector("#callout"),
  title: document.querySelector("#title"),
  help: document.querySelector("#help-sheet"),
  map: document.querySelector("#map-sheet"),
  result: document.querySelector("#result"),
  yard: document.querySelector("#yard-sheet"),
  pause: document.querySelector("#pause-sheet"),
  live: document.querySelector("#live"),
};

const state = {
  save: defaultSave(),
  screen: "title",
  layout: null,
  siege: null,
  phase: "aim",
  angle: -0.62,
  power: 0.66,
  weaponId: "roundshot",
  shots: 0,
  rubble: 0,
  paused: false,
  result: null,
  shake: 0,
  recoil: 0,
  flash: 0,
  slow: 0,
  calloutUntil: 0,
  time: 0,
  enemyAt: 0,
  dragging: false,
  pointer: null,
  particles: [],
  vista: null,
  eggTaps: 0,
};

let view = { scale: 1, ox: 0, oy: 0, dpr: 1, w: 360, h: 640, top: 0, bottom: 0 };
let last = 0;
let simAcc = 0;
const STEP_MS = 1000 / 60;

function reduced() {
  if (state.save.settings.motion === "reduce") return true;
  if (state.save.settings.motion === "full") return false;
  return reducedQuery.matches;
}

function say(text) {
  ui.live.textContent = text;
}

function browserStorage() {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function persist() {
  const storage = browserStorage();
  if (!storage || !writeSave(storage, state.save)) say("Progress could not be saved.");
}

function show(screen) {
  state.screen = screen;
  ui.title.hidden = screen !== "title";
  ui.help.hidden = screen !== "help";
  ui.map.hidden = screen !== "map";
  ui.result.hidden = screen !== "result";
  ui.yard.hidden = screen !== "yard";
  ui.pause.hidden = screen !== "pause";
  const battle = screen === "battle" || screen === "pause";
  ui.hud.hidden = !battle;
  ui.tray.hidden = screen !== "battle";
  document.body.dataset.screen = screen;
  resize();
}

function motionLabel() {
  const m = state.save.settings.motion;
  return m === "reduce" ? "Motion calm" : m === "full" ? "Motion full" : "Motion auto";
}

function syncPrefs() {
  document.documentElement.dataset.motion = state.save.settings.motion === "auto" ? "" : state.save.settings.motion;
  if (state.save.settings.motion === "auto") delete document.documentElement.dataset.motion;
  audio.setMuted(state.save.settings.muted);
  const mute = document.querySelector("#mute");
  const titleMute = document.querySelector("#title-mute");
  mute.setAttribute("aria-pressed", String(state.save.settings.muted));
  mute.textContent = state.save.settings.muted ? "×" : "♪";
  mute.setAttribute("aria-label", state.save.settings.muted ? "Unmute sound" : "Mute sound");
  titleMute.setAttribute("aria-pressed", String(state.save.settings.muted));
  titleMute.textContent = state.save.settings.muted ? "Sound off" : "Sound on";
  document.querySelector("#motion").textContent = motionLabel();
}

function freshVista() {
  state.vista = buildLayout({ mode: "campaign", number: 2, save: state.save });
}

function startBattle(layout) {
  if (state.siege) destroySiege(state.siege);
  state.layout = layout;
  state.siege = createSiege({ ...layout, powder: state.save.upgrades.powder === true });
  state.phase = "aim";
  state.shots = 0;
  state.rubble = 0;
  state.earned = 0;
  state.paidSpoil = new Set();
  state.paused = false;
  state.angle = layout.wind > 0.15 ? -0.78 : -0.62;
  state.power = 0.68;
  state.weaponId = layout.weapons.includes(state.save.lastWeapon) ? state.save.lastWeapon : layout.weapons[0];
  state.particles = [];
  show("battle");
  paintHud();
  paintWeapons();
  const line = `${layout.name}. ${layout.blurb} ${windLabel(layout.wind)}`;
  callout(windLabel(layout.wind));
  say(line);
  document.querySelector("#level-name").textContent = layout.name;
  document.querySelector("#foe-name").textContent = layout.foe;
  resize();
}

function callout(text) {
  ui.callout.hidden = false;
  ui.callout.textContent = text;
  state.calloutUntil = performance.now() + 2400;
}

const hudShown = {};

function paintHudPart(selector, key, value) {
  if (hudShown[selector] === value) return;
  hudShown[selector] = value;
  const el = document.querySelector(selector);
  if (key === "width") el.style.width = value;
  else el.textContent = value;
}

function paintHud() {
  const you = state.siege ? sideIntegrity(state.siege, "player") : 1;
  const foe = state.siege ? sideIntegrity(state.siege, "enemy") : 1;
  paintHudPart("#you-bar", "width", `${Math.round(you * 100)}%`);
  paintHudPart("#foe-bar", "width", `${Math.round(foe * 100)}%`);
  const par = state.layout ? state.layout.par : "";
  paintHudPart("#shot-count", "text", state.phase === "enemy" ? "Their shot" : `Shot ${state.shots + (state.phase === "aim" ? 1 : 0)} · par ${par}`);
}

function paintWeapons() {
  const root = document.querySelector("#weapons");
  root.replaceChildren();
  const lent = state.layout && state.layout.mode !== "campaign";
  for (const weapon of WEAPONS) {
    const unlocked = state.layout.weapons.includes(weapon.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "weapon" + (lent && unlocked ? " lent" : "");
    button.setAttribute("aria-pressed", String(weapon.id === state.weaponId));
    button.disabled = !unlocked;
    button.dataset.weapon = weapon.id;
    button.innerHTML = `<b>${weapon.short}</b><small>${unlocked ? weapon.crew.split(" ")[0] : "Locked"}</small>`;
    button.setAttribute("aria-label", unlocked ? `${weapon.crew}, ${weapon.name}. ${weapon.line}` : `${weapon.name} is hired in the yard`);
    button.addEventListener("click", (event) => {
      if (!unlocked) {
        callout("Hire that crew in the mason's yard.");
        return;
      }
      state.weaponId = weapon.id;
      state.save.lastWeapon = weapon.id;
      persist();
      paintWeapons();
      if (event.detail === 0) root.querySelector(`[data-weapon="${weapon.id}"]`).focus();
      audio.blip();
    });
    root.append(button);
  }
}

function currentWeapon() {
  return weaponById(state.weaponId);
}

function predicted() {
  if (!state.layout) return null;
  const weapon = currentWeapon();
  const vel = shotVelocity(weapon, state.angle, state.power);
  const points = integrate(state.layout.playerCannon.x, state.layout.playerCannon.y, vel.vx, vel.vy, state.layout.wind, 90, weapon.air);
  const blocks = aimBlocks();
  const hit = firstHit(points, blocks, weapon.radius);
  return { points, hit, weapon };
}

function aimBlocks() {
  if (!state.siege) return state.layout ? state.layout.blocks : [];
  const list = [];
  for (const body of state.siege.bodies.values()) {
    if (!body.isStatic || body.grok.hp <= 0) continue;
    list.push({
      id: body.grok.id,
      side: body.grok.side,
      x: body.position.x,
      y: body.position.y,
      w: body.grok.w,
      h: body.grok.h,
      hp: body.grok.hp,
      maxHp: body.grok.maxHp,
      material: body.grok.material,
      rooted: body.grok.rooted,
      pin: body.grok.pin === true,
      heavy: body.grok.heavy === true,
      arch: body.grok.arch,
      neighbors: body.grok.neighbors,
      loose: false,
      col: body.grok.col,
      row: body.grok.row,
      variant: body.grok.variant,
    });
  }
  return list;
}

function fire(owner, angle, power, weapon) {
  const layout = state.layout;
  const origin = owner === "player" ? layout.playerCannon : layout.enemyCannon;
  const vel = shotVelocity(weapon, angle, power);
  fireProjectile(state.siege, owner, weapon, vel, origin);
  state.recoil = 1;
  state.phase = "sim";
  state.simFor = owner;
  state.siege.frame = 0;
  audio.cannon();
  if (!reduced() && navigator.vibrate) navigator.vibrate(12);
}

function firePlayer() {
  if (state.screen !== "battle" || state.phase !== "aim" || state.paused) return;
  state.shots += 1;
  fire("player", state.angle, state.power, currentWeapon());
  say(`Shot ${state.shots}.`);
  paintHud();
}

function finishSim() {
  const enemy = bannerStatus(state.siege, "enemy");
  const player = bannerStatus(state.siege, "player");
  if (enemy !== "up" || player !== "up") {
    const both = enemy !== "up" && player !== "up";
    state.phase = "hold";
    state.holdUntil = performance.now() + (reduced() ? 280 : 1200);
    state.holdWon = enemy !== "up" && !both;
    if (state.holdWon && state.siege) {
      for (const body of state.siege.bodies.values()) {
        if (body.grok.side === "enemy" && !body.isStatic) puff(body.position.x, body.position.y, "#efe6d4");
      }
    }
    state.holdNote = both ? "Both standards are in the dust." : (player !== "up" ? lossLine(state.layout.blocks, state.siege.broken) : "");
    return;
  }
  if (state.simFor === "player") {
    state.phase = "enemy";
    state.enemyAt = performance.now() + (reduced() ? 180 : 520);
    const blocks = aimBlocks();
    state.enemyPlan = enemyAim({ ...state.layout, blocks }, state.shots);
    say("Their shot.");
    paintHud();
    return;
  }
  state.phase = "aim";
  state.enemyPlan = null;
  paintHud();
}

function endBattle(won, note) {
  const clever = won && cleverClear(state.layout.blocks, state.siege ? state.siege.broken : []);
  const stars = starsFor(state.shots, state.layout.par, won, clever);
  const outcome = { won, shots: state.shots, rubble: state.rubble, stars, clever };
  state.phase = "over";
  state.result = outcome;
  const had = state.save.rubble;
  state.save = recordResult(state.save, state.layout, outcome, localDateString());
  const gained = state.save.rubble - had;
  persist();
  const text = shareText(state.layout, { ...outcome, stars });
  const url = new URL(location.href);
  url.search = "";
  url.hash = hashFor(state.layout);
  document.querySelector("#share-text").value = `${text}\n${url}`;
  document.querySelector("#result-kicker").textContent = state.layout.name;
  document.querySelector("#result-title").textContent = won ? "The banner falls" : "Your standard is down";
  const gap = missingStar(state.layout, stars, won);
  document.querySelector("#result-detail").textContent = won
    ? `${state.shots} shot${state.shots === 1 ? "" : "s"} · par ${state.layout.par}${state.layout.mode === "campaign" && gained > 0 ? ` · +${gained} rubble` : ""}${gap ? `. ${gap}` : ""}`
    : (note || "The rival keep is still standing.");
  document.querySelector("#result-stars").textContent = won ? "★".repeat(stars) + "☆".repeat(3 - stars) : "☆☆☆";
  document.querySelector("#yard").hidden = !won;
  show("result");
  say(won ? `${text}.` : `Your standard is down. ${note || ""}`.trim());
  if (won) audio.win(); else audio.lose();
}

function openYard() {
  const rubble = document.querySelector("#yard-rubble");
  rubble.textContent = `${state.save.rubble} rubble in the yard.`;
  const plaque = document.querySelector("#yard-plaque");
  if (state.save.rubble === 42) {
    plaque.hidden = false;
    plaque.textContent = "Load on the lintel: 42.";
  } else plaque.hidden = true;
  const list = document.querySelector("#yard-list");
  list.replaceChildren();
  for (const item of UPGRADES) {
    const owned = item.kind === "weapon" ? state.save.weapons.includes(item.weapon) : state.save.upgrades[item.id] === true;
    const row = document.createElement("button");
    row.type = "button";
    row.className = "yard-row";
    row.disabled = owned || state.save.rubble < item.cost;
    const short = owned ? 0 : item.cost - state.save.rubble;
    row.innerHTML = `<span><b>${item.name}</b><small>${item.blurb}</small></span><span class="price">${owned ? "Kept" : item.cost}${short > 0 ? `<small>${short} more</small>` : ""}</span>`;
    row.addEventListener("click", () => {
      const bought = buy(state.save, item.id);
      if (!bought.ok) return;
      state.save = bought.save;
      persist();
      audio.blip();
      openYard();
    });
    list.append(row);
  }
  const next = nextLevelNumber(state.save);
  const upcoming = layoutByNumber(next, state.save);
  document.querySelector("#next-siege").textContent = next <= LEVELS.length ? `Next · ${upcoming.name}` : `Next · ${upcoming.name}`;
  show("yard");
}

function openMap() {
  document.querySelector("#map-rubble").textContent = `${state.save.rubble} rubble · ${state.save.stats.wins} keeps down`;
  const list = document.querySelector("#map-list");
  list.replaceChildren();
  const total = Math.max(LEVELS.length, state.save.unlocked);
  for (let n = 1; n <= total; n++) {
    const layout = layoutByNumber(n, state.save);
    const best = state.save.best[layout.id];
    const locked = n > state.save.unlocked;
    const row = document.createElement("button");
    row.type = "button";
    row.className = "map-row";
    row.disabled = locked;
    const stars = best ? "★".repeat(best.stars) + "☆".repeat(3 - best.stars) : "☆☆☆";
    row.innerHTML = `<span><b>${layout.name}</b><small>${layout.foe}${locked ? " · locked" : ""}</small></span><span>${locked ? "–" : stars}</span>`;
    row.addEventListener("click", () => startBattle(layoutByNumber(n, state.save)));
    list.append(row);
  }
  show("map");
}

function paintTitle() {
  const next = nextLevelNumber(state.save);
  const layout = layoutByNumber(Math.min(next, Math.max(state.save.unlocked, 1)), state.save);
  const begun = state.save.stats.wins + state.save.stats.losses > 0 || state.save.unlocked > 1;
  const hash = parseHash(location.hash);
  const today = localDateString();
  const linked = hash.mode === "campaign" && hash.number ? layoutByNumber(hash.number, state.save) : null;
  const button = document.querySelector("#continue");
  if (hash.mode === "daily") button.textContent = hash.date && hash.date !== today ? `Open ${hash.date}` : "Open today's keep";
  else if (hash.mode === "seed") button.textContent = "Open the shared keep";
  else if (linked) button.textContent = `Open ${linked.name}`;
  else button.textContent = begun ? `Continue · ${layout.name}` : "Begin the siege";
  const daily = state.save.daily;
  document.querySelector("#daily").textContent = daily && daily.date === today && daily.won ? `Today's keep · ${daily.shots} shots` : "Today's keep";
}

function toggleMute() {
  state.save.settings.muted = !state.save.settings.muted;
  persist();
  syncPrefs();
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1);
  const nextW = Math.max(1, Math.round(rect.width * dpr));
  const nextH = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== nextW) canvas.width = nextW;
  if (canvas.height !== nextH) canvas.height = nextH;
  const battle = state.screen === "battle" || state.screen === "pause";
  const top = battle ? ui.hud.getBoundingClientRect().height : 0;
  const bottom = state.screen === "battle" ? ui.tray.getBoundingClientRect().height : (state.screen === "title" ? Math.min(rect.height * 0.42, 320) : 0);
  const bandH = Math.max(120, rect.height - top - bottom);
  const crop = 100;
  const worldH = WORLD.h - crop;
  const scale = Math.min(rect.width / WORLD.w, bandH / worldH);
  view = {
    dpr,
    w: rect.width,
    h: rect.height,
    scale,
    ox: (rect.width - WORLD.w * scale) / 2,
    oy: top + (bandH - worldH * scale) / 2 - crop * scale,
    top,
    bottom,
  };
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left - view.ox) / view.scale,
    y: (clientY - rect.top - view.oy) / view.scale,
  };
}

function puff(x, y, chip) {
  const dustN = reduced() ? 4 : 22;
  for (let i = 0; i < dustN; i++) {
    const spread = 6 + (i % 5) * 7;
    state.particles.push({
      dust: true,
      x: x + (Math.random() - 0.5) * spread,
      y: y + (Math.random() - 0.35) * spread * 0.7,
      vx: (Math.random() - 0.5) * 1.15,
      vy: -0.2 - Math.random() * 0.85,
      life: 340 + Math.random() * 80,
      max: 420,
      r: 10 + Math.random() * 18,
      color: i % 3 === 0 ? "rgba(232, 214, 186, 0.38)" : "rgba(168, 148, 124, 0.32)",
      g: 0.002,
    });
  }
  const chipN = reduced() ? 3 : 16;
  for (let i = 0; i < chipN; i++) {
    state.particles.push({
      chip: true,
      x: x + (Math.random() - 0.5) * 8,
      y,
      vx: (Math.random() - 0.5) * 4.4,
      vy: -1.4 - Math.random() * 3.1,
      life: 40,
      max: 40,
      r: 1.6 + Math.random() * 2.6,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.32,
      color: chip,
      g: 0.24,
    });
  }
  if (state.particles.length > 280) state.particles.splice(0, state.particles.length - 280);
}

function burst(x, y, n, color, speed, life) {
  const count = reduced() ? Math.min(4, n) : n;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random());
    state.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 0.6,
      life, max: life,
      r: 1.2 + Math.random() * 2.4,
      color,
      g: 0.18,
    });
    if (state.particles.length > 140) state.particles.shift();
  }
}

function handleFx(events) {
  for (const fx of events) {
    if (fx.kind === "impact" || fx.kind === "chip") {
      burst(fx.x, fx.y, fx.kind === "impact" ? 10 : 5, "#d9c7ae", 2.2, 28);
      state.shake = Math.min(10, state.shake + (fx.speed > 8 ? 3.5 : 1.6));
      audio.hit(fx.speed > 8);
    } else if (fx.kind === "spoil") {
      if (fx.side === "enemy" && fx.id && !state.paidSpoil.has(fx.id)) {
        state.paidSpoil.add(fx.id);
        if (fx.material !== "banner" && state.earned < 7) {
          state.earned += 1;
          state.rubble += 1;
        }
      }
    } else if (fx.kind === "break") {
      puff(fx.x, fx.y, fx.material === "timber" ? "#c4844a" : "#efe6d4");
      if (fx.material === "keystone") callout("The gold stone gives.");
      else if (fx.material === "timber") callout("Timber snaps.");
    } else if (fx.kind === "explode") {
      burst(fx.x, fx.y, 28, "#e7b15a", 4.2, 40);
      burst(fx.x, fx.y, 12, "#6e2c2a", 2.4, 46);
      state.shake = Math.min(12, state.shake + 7);
      puff(fx.x, fx.y, "#e7b15a");
      if (!reduced()) state.slow = Math.max(state.slow, 48);
      audio.boom();
      callout("The pantry answers.");
    } else if (fx.kind === "collapse") {
      puff(fx.x, fx.y, "#cbbba4");
      if (!fx.quiet) {
        state.shake = Math.min(14, state.shake + Math.min(8, (fx.n || 1) / 2));
        if (!reduced()) state.slow = Math.max(state.slow, fx.n >= 8 ? 100 : 72);
        audio.crumble();
        callout("The courses slip.");
      }
    } else if (fx.kind === "clink") {
      audio.clink();
      callout("Cloth won't do it. Drop the stone.");
    } else if (fx.kind === "yank") {
      burst(fx.x, fx.y, 8, "#d7c4a4", 2, 24);
      callout(fx.heavy
        ? (fx.material === "keystone" ? "The gold stone stays." : "The beam holds.")
        : fx.cracked ? "The crack gives."
          : fx.material === "timber" ? "The hook has the timber."
            : "The hook has it.");
    } else if (fx.kind === "fire") {
      state.flash = 1;
    }
  }
}

function drawBackground() {
  const { w, h } = view;
  const ground = view.oy + WORLD.groundTop * view.scale;
  const sky = ctx.createLinearGradient(0, 0, 0, Math.max(ground, 1));
  sky.addColorStop(0, "#1a1030");
  sky.addColorStop(0.42, "#6a3a5c");
  sky.addColorStop(0.72, "#e4845c");
  sky.addColorStop(1, "#f2c08a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const drift = reduced() ? 0 : state.time * 0.012;
  ctx.fillStyle = "rgba(255, 214, 170, 0.9)";
  const sunX = w * 0.72;
  const sunY = ground - 78;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 120);
  glow.addColorStop(0, "rgba(255, 220, 170, 0.45)");
  glow.addColorStop(1, "rgba(255, 220, 170, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 236, 214, 0.18)";
  for (let i = 0; i < 3; i++) {
    const x = ((i * 220 + drift) % (w + 180)) - 80;
    const y = 48 + i * 28;
    ctx.beginPath();
    ctx.ellipse(x, y, 54, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 36, y + 6, 36, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#3d4d73";
  ctx.beginPath();
  ctx.moveTo(0, ground - 70);
  for (let x = 0; x <= w; x += 20) ctx.lineTo(x, ground - 78 - Math.sin(x * 0.01 + 1) * 18);
  ctx.lineTo(w, ground);
  ctx.lineTo(0, ground);
  ctx.fill();
  ctx.fillStyle = "#314056";
  ctx.beginPath();
  ctx.moveTo(0, ground - 36);
  for (let x = 0; x <= w; x += 16) ctx.lineTo(x, ground - 48 - Math.sin(x * 0.02) * 10);
  ctx.lineTo(w, ground);
  ctx.lineTo(0, ground);
  ctx.fill();
  ctx.fillStyle = "#6b4632";
  ctx.fillRect(0, ground, w, h - ground);
  ctx.fillStyle = "#3f6b45";
  ctx.fillRect(0, ground - 8, w, 10);
  ctx.fillStyle = "#2f5336";
  for (let x = 8; x < w; x += 18) {
    ctx.fillRect(x, ground - 14, 2, 8);
  }
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function shiftHex(hex, amount) {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (value) => Math.max(0, Math.min(255, value + amount));
  const r = channel(n >> 16);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return `rgb(${r} ${g} ${b})`;
}

const STONE_TONES = [
  ["#f6efe4", "#dccab0", "#b09a84"],
  ["#e4e0d6", "#b7b0a4", "#7e7870"],
  ["#edd4a4", "#c4964e", "#8a5e2c"],
  ["#f0d5c8", "#c99280", "#8d5b4c"],
];

function blockColors(material, variant = 1) {
  const tone = Math.abs(variant | 0) % STONE_TONES.length;
  if (material === "stone" || material === "foundation" || material === "merlon") return STONE_TONES[tone];
  const shift = (tone - 1) * 16;
  let colors = STONE_TONES[0];
  if (material === "timber") colors = ["#e7b07a", "#c4844a", "#8d5430"];
  else if (material === "keystone") colors = ["#ffe3a4", "#e7b15a", "#a87428"];
  else if (material === "keg") colors = ["#a14a42", "#6e2c2a", "#3a2424"];
  else if (material === "banner") colors = ["#f4efe6", "#cbbba4", "#8c7864"];
  return colors.map((hex) => shiftHex(hex, shift));
}

const SHARD_POLY = [
  [[-0.5, -0.15], [0.55, -0.4], [0.2, 0.45], [-0.45, 0.2]],
  [[-0.15, -0.55], [0.4, -0.1], [0.1, 0.55], [-0.45, 0.15]],
  [[-0.5, -0.35], [0.48, -0.05], [0.15, 0.4], [-0.2, 0.15]],
  [[-0.35, -0.5], [0.3, -0.45], [0.45, 0.2], [-0.1, 0.5]],
];

function drawShard(b) {
  const poly = SHARD_POLY[(b.shard || 0) % SHARD_POLY.length];
  const [hi, mid, lo] = blockColors(b.material, b.variant || 0);
  ctx.beginPath();
  poly.forEach(([px, py], i) => {
    const x = px * b.w;
    const y = py * b.h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  const grad = ctx.createLinearGradient(-b.w / 2, -b.h / 2, b.w / 2, b.h / 2);
  grad.addColorStop(0, hi);
  grad.addColorStop(1, lo);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(70, 46, 32, 0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = mid;
  ctx.fillRect(-b.w * 0.1, -1, b.w * 0.35, 1.4);
}

function stoneSilhouette(x, y, w, h, variant) {
  const cut = 3 + (variant % 3) * 2;
  const which = variant % 4;
  ctx.beginPath();
  ctx.moveTo(x + (which === 0 ? cut : 2), y);
  ctx.lineTo(x + w - (which === 1 ? cut : 2), y);
  if (which === 1) ctx.lineTo(x + w, y + cut);
  else ctx.lineTo(x + w, y + 2);
  ctx.lineTo(x + w - (which === 2 ? cut : 0), y + h);
  ctx.lineTo(x + (which === 3 ? cut : 2), y + h);
  if (which === 3) ctx.lineTo(x, y + h - cut);
  else ctx.lineTo(x, y + h - 2);
  ctx.closePath();
}

// A standing course that has been hit loses a corner the size of a fallen
// shard (SHARD_CUTS), with a crack running into the gap. The 7px nick did
// not read at play size.
function shardBite(w, h, variant) {
  const cut = SHARD_CUTS[(variant || 0) % SHARD_CUTS.length];
  const long = Math.max(cut.w, cut.h);
  return {
    biteW: Math.min(w * 0.64, Math.max(w * 0.5, w * long)),
    biteH: Math.min(h * 0.72, Math.max(h * 0.55, h * long)),
    corner: (variant || 0) % 4,
  };
}

function bittenSilhouette(x, y, w, h, variant) {
  const { biteW, biteH, corner } = shardBite(w, h, variant);
  const left = x;
  const top = y;
  const right = x + w;
  const bot = y + h;
  ctx.beginPath();
  if (corner === 0) {
    ctx.moveTo(left, top);
    ctx.lineTo(right - biteW, top);
    ctx.lineTo(right - biteW * 0.42, top + biteH * 0.38);
    ctx.lineTo(right, top + biteH);
    ctx.lineTo(right, bot);
    ctx.lineTo(left, bot);
  } else if (corner === 1) {
    ctx.moveTo(left, top);
    ctx.lineTo(right, top);
    ctx.lineTo(right, bot);
    ctx.lineTo(left + biteW, bot);
    ctx.lineTo(left + biteW * 0.4, bot - biteH * 0.42);
    ctx.lineTo(left, bot - biteH);
  } else if (corner === 2) {
    ctx.moveTo(left, top);
    ctx.lineTo(right, top);
    ctx.lineTo(right, bot - biteH);
    ctx.lineTo(right - biteW * 0.38, bot - biteH * 0.4);
    ctx.lineTo(right - biteW, bot);
    ctx.lineTo(left, bot);
  } else {
    ctx.moveTo(left + biteW, top);
    ctx.lineTo(right, top);
    ctx.lineTo(right, bot);
    ctx.lineTo(left, bot);
    ctx.lineTo(left, top + biteH);
    ctx.lineTo(left + biteW * 0.36, top + biteH * 0.4);
  }
  ctx.closePath();
  const anchor = [
    [right - biteW * 0.42, top + biteH * 0.38, -1, 1],
    [left + biteW * 0.4, bot - biteH * 0.42, 1, -1],
    [right - biteW * 0.38, bot - biteH * 0.4, -1, -1],
    [left + biteW * 0.36, top + biteH * 0.4, 1, 1],
  ][corner];
  return { x: anchor[0], y: anchor[1], ix: anchor[2], iy: anchor[3] };
}

function drawBlock(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle || 0);
  if (b.shard != null) {
    drawShard(b);
    ctx.restore();
    return;
  }
  const course = (b.material === "stone" || b.material === "merlon" || b.material === "foundation") && b.w < 48 && !String(b.id).includes("haunch");
  if (course) {
    const v = b.variant || 0;
    ctx.scale(0.8 + (v % 3) * 0.12, 0.76 + (v % 4) * 0.1);
  }
  ctx.fillStyle = "rgba(30, 16, 12, 0.28)";
  ctx.beginPath();
  ctx.ellipse(1, b.h / 2 + 1, b.w * 0.42, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  const [hi, mid, lo] = blockColors(b.material, b.variant || 0);
  const grad = ctx.createLinearGradient(-b.w / 2, -b.h / 2, b.w / 2, b.h / 2);
  grad.addColorStop(0, hi);
  grad.addColorStop(0.55, mid);
  grad.addColorStop(1, lo);
  const hurt = b.maxHp ? b.hp / b.maxHp < 0.98 : false;
  const crack = hurt ? bittenSilhouette(-b.w / 2, -b.h / 2, b.w, b.h, b.variant || 0) : null;
  if (!hurt) stoneSilhouette(-b.w / 2, -b.h / 2, b.w, b.h, b.variant || 0);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(-b.w, -b.h, b.w * 2, b.h * 2);
  ctx.fillStyle = "rgba(255, 248, 236, 0.28)";
  ctx.fillRect(-b.w / 2 + 3, -b.h / 2 + 2, b.w - 6, 1.4);
  ctx.fillStyle = "rgba(90, 68, 48, 0.45)";
  ctx.fillRect(-b.w / 2, b.h / 2 - 2.2, b.w, 2.2);
  ctx.fillRect(-b.w / 2, -b.h / 2, 1.6, b.h);
  const grain = 7 + (b.variant || 0);
  for (let i = 0; i < grain; i++) {
    const px = ((b.variant * 17 + i * 29) % (b.w - 8)) - b.w / 2 + 4;
    const py = ((b.variant * 11 + i * 19) % (b.h - 8)) - b.h / 2 + 4;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255, 248, 236, 0.28)" : "rgba(70, 46, 32, 0.32)";
    ctx.fillRect(px, py, i % 3 === 0 ? 4 : 2, 1.2);
  }
  if (b.material === "keg") {
    ctx.strokeStyle = "#d7c4a4";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-b.w / 2 + 2, -4);
    ctx.lineTo(b.w / 2 - 2, -4);
    ctx.moveTo(-b.w / 2 + 2, 5);
    ctx.lineTo(b.w / 2 - 2, 5);
    ctx.stroke();
  }
  const seed = (state.layout || state.vista) && (state.layout || state.vista).seed;
  const mark = seed ? inscription(b, seed) : "";
  if (mark) {
    ctx.fillStyle = "rgba(80, 48, 20, 0.75)";
    ctx.font = "8px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(mark, 0, 3);
  }
  ctx.restore();
  if (hurt) bittenSilhouette(-b.w / 2, -b.h / 2, b.w, b.h, b.variant || 0);
  else stoneSilhouette(-b.w / 2, -b.h / 2, b.w, b.h, b.variant || 0);
  ctx.strokeStyle = "rgba(60, 36, 24, 0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();
  if (crack) {
    ctx.strokeStyle = "rgba(42, 24, 16, 0.95)";
    ctx.lineWidth = 1.8;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(crack.x, crack.y);
    ctx.lineTo(crack.x + crack.ix * b.w * 0.24, crack.y + crack.iy * b.h * 0.32);
    ctx.lineTo(crack.x + crack.ix * b.w * 0.06, crack.y + crack.iy * b.h * 0.62);
    ctx.stroke();
  }
  if (b.flash > 0.08) {
    ctx.fillStyle = `rgba(255,244,220,${b.flash * 0.45})`;
    roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 3);
    ctx.fill();
  }
  ctx.restore();
}

function drawBanner(b) {
  const wave = reduced() ? 1 : Math.sin(state.time * 0.005 + b.x) * 5;
  const color = b.side === "player" ? "#1f8f86" : "#d4534e";
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle || 0);
  ctx.fillStyle = "#efe6d4";
  ctx.fillRect(-2, -b.h / 2, 4, b.h);
  ctx.fillStyle = "#8c7864";
  ctx.fillRect(-4, -b.h / 2 - 3, 8, 4);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(2, -b.h / 2 + 4);
  ctx.quadraticCurveTo(16 + wave, -b.h / 2 + 10, 14, -b.h / 2 + 20);
  ctx.quadraticCurveTo(18 + wave, -b.h / 2 + 24, 2, -b.h / 2 + 26);
  ctx.fill();
  ctx.restore();
}

function drawCannon(cannon, angle, recoil) {
  ctx.save();
  ctx.translate(cannon.x, cannon.y);
  ctx.fillStyle = "#6b4632";
  ctx.beginPath();
  ctx.arc(-10, 8, 7, 0, Math.PI * 2);
  ctx.arc(10, 8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8d5a32";
  roundRect(-16, -2, 32, 10, 3);
  ctx.fill();
  ctx.translate((cannon.side === "player" ? -1 : 1) * recoil * 8, 0);
  ctx.rotate(angle);
  ctx.fillStyle = "#2c3138";
  roundRect(0, -5, 28, 10, 4);
  ctx.fill();
  ctx.fillStyle = "#d7c4a4";
  ctx.fillRect(24, -3, 5, 6);
  ctx.restore();
  ctx.fillStyle = cannon.side === "player" ? "#1f8f86" : "#d4534e";
  ctx.beginPath();
  ctx.moveTo(cannon.x, cannon.y - 16);
  ctx.lineTo(cannon.x + (cannon.side === "player" ? 12 : -12), cannon.y - 12);
  ctx.lineTo(cannon.x, cannon.y - 8);
  ctx.fill();
}

function drawTrajectory(pred) {
  if (!pred) return;
  const pts = pred.points;
  const stop = pred.hit ? pred.hit.index : pts.length - 1;
  const px = 1 / view.scale;
  for (let i = 2; i <= stop; i += 2) {
    const p = pts[i];
    const near = i > stop - 6;
    ctx.globalAlpha = near ? 1 : 0.55 + 0.4 * (i / Math.max(1, stop));
    ctx.fillStyle = near ? "#ffe3a4" : "#ffecd2";
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(near ? 3.1 : 2.2, (near ? 3 : 2.2) * px), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (pred.hit && pred.hit.type === "block") {
    const block = aimBlocks().find((b) => b.id === pred.hit.id);
    if (!block) return;
    ctx.strokeStyle = block.side === "player" ? "#d4534e" : (block.material === "banner" ? "#f2c08a" : "#ffe3a4");
    ctx.lineWidth = 2.5;
    roundRect(block.x - block.w / 2 - 2, block.y - block.h / 2 - 2, block.w + 4, block.h + 4, 4);
    ctx.stroke();
  }
}

function drawWorld(blocks, cannons, pred) {
  ctx.save();
  if (!reduced() && state.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  ctx.translate(view.ox, view.oy);
  ctx.scale(view.scale, view.scale);
  const sorted = blocks.slice().sort((a, b) => a.y - b.y);
  for (const block of sorted) {
    if (block.shot) {
      ctx.save();
      ctx.translate(block.x, block.y);
      ctx.fillStyle = block.material === "keg" ? "#6e2c2a" : "#2c3138";
      ctx.beginPath();
      ctx.arc(0, 0, block.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,244,220,0.35)";
      ctx.beginPath();
      ctx.arc(-block.w * 0.15, -block.w * 0.15, block.w * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (block.material === "banner") drawBanner(block);
    else drawBlock(block);
  }
  if (cannons) {
    drawCannon(cannons.player, state.screen === "battle" && state.phase !== "enemy" ? state.angle : -0.4, state.simFor === "player" ? state.recoil : 0);
    const enemyAngle = state.enemyPlan ? state.enemyPlan.angle : Math.PI + 0.55;
    drawCannon(cannons.enemy, enemyAngle, state.simFor === "enemy" ? state.recoil : 0);
    if (state.phase === "enemy" && state.enemyPlan) {
      const weapon = weaponById(state.enemyPlan.weaponId);
      const vel = shotVelocity(weapon, state.enemyPlan.angle, state.enemyPlan.power);
      const pts = integrate(cannons.enemy.x, cannons.enemy.y, vel.vx, vel.vy, state.layout.wind, 70, weapon.air);
      ctx.fillStyle = "rgba(212, 83, 78, 0.8)";
      for (let i = 2; i < pts.length; i += 4) {
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (pred && state.screen === "battle" && state.phase === "aim") drawTrajectory(pred);
  for (const p of state.particles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = Math.max(0, p.life / p.max) * (p.dust ? 0.55 : 1);
    ctx.fillStyle = p.color;
    if (p.chip) {
      ctx.rotate(p.rot || 0);
      ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.dust ? p.r * (1.15 - p.life / p.max) : p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (state.flash > 0.05 && cannons) {
    const c = state.simFor === "enemy" ? cannons.enemy : cannons.player;
    const glow = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 36);
    glow.addColorStop(0, `rgba(255,220,160,${state.flash})`);
    glow.addColorStop(1, "rgba(255,220,160,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 36, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function bodiesToDraw() {
  const list = [];
  if (!state.siege) return list;
  for (const body of state.siege.bodies.values()) {
    list.push({
      ...body.grok,
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
      flash: body.grok.flash || 0,
    });
  }
  for (const body of state.siege.debris) {
    list.push({
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
      w: body.grok.w,
      h: body.grok.h,
      material: body.grok.material,
      hp: 1,
      maxHp: 1,
      variant: body.grok.variant,
      side: body.grok.side,
      shard: body.grok.shard,
      flash: 0,
    });
  }
  for (const shot of state.siege.shots) {
    const speed = Math.hypot(shot.velocity.x, shot.velocity.y) || 1;
    list.push({
      x: shot.position.x - (shot.velocity.x / speed) * shot.circleRadius * 0.85,
      y: shot.position.y - (shot.velocity.y / speed) * shot.circleRadius * 0.85,
      angle: 0,
      w: shot.circleRadius * 2,
      h: shot.circleRadius * 2,
      material: shot.grok.weapon.id === "keg" ? "keg" : "foundation",
      hp: 1,
      maxHp: 1,
      variant: 1,
      side: shot.grok.owner,
      flash: 0,
      shot: true,
    });
  }
  return list;
}

function stepSimulation() {
  if (state.slow > 0) {
    state.siege.timeScale = reduced() ? 1 : 0.55;
    state.slow -= 1;
  } else state.siege.timeScale = 1;
  stepSiege(state.siege);
  handleFx(consumeFx(state.siege));
  if (isSettled(state.siege) || state.siege.frame > 340) {
    if (state.siege.frame > 340) forceSettle(state.siege);
    simAcc = 0;
    finishSim();
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = last ? Math.min(48, now - last) : STEP_MS;
  const k = dt / STEP_MS;
  last = now;
  state.time = now;
  if (state.calloutUntil && now > state.calloutUntil) ui.callout.hidden = true;
  if (state.screen === "battle" && !state.paused && state.siege) {
    if (state.phase === "enemy" && now >= state.enemyAt && state.enemyPlan && !state.enemyPlan.fired) {
      const plan = state.enemyPlan;
      state.enemyPlan = { ...plan, fired: true };
      simAcc = 0;
      fire("enemy", plan.angle, plan.power, weaponById(plan.weaponId));
    } else if (state.phase === "hold") {
      if (now >= state.holdUntil) endBattle(state.holdWon, state.holdNote);
    } else if (state.phase === "sim") {
      const clock = stepClock(simAcc, dt);
      simAcc = clock.acc;
      for (let i = 0; i < clock.steps && state.phase === "sim"; i++) stepSimulation();
    } else simAcc = 0;
  } else simAcc = 0;
  state.shake *= 0.86 ** k;
  state.recoil *= 0.8 ** k;
  state.flash *= 0.86 ** k;
  for (const p of state.particles) {
    p.life -= k;
    p.vy += p.g * k;
    p.x += p.vx * k;
    p.y += p.vy * k;
    if (p.chip) p.rot = (p.rot || 0) + (p.vr || 0) * k;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  resize();
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  drawBackground();
  if (state.screen === "battle" || state.screen === "pause" || state.screen === "result") {
    const pred = state.phase === "aim" ? predicted() : null;
    drawWorld(bodiesToDraw(), state.layout && { player: state.layout.playerCannon, enemy: state.layout.enemyCannon }, pred);
    paintHud();
  } else if (state.vista) {
    drawWorld(state.vista.blocks, { player: state.vista.playerCannon, enemy: state.vista.enemyCannon }, null);
  }
}

function bind() {
  document.querySelector("#continue").addEventListener("click", () => {
    const hash = parseHash(location.hash);
    const save = state.save;
    if (hash.mode === "daily") startBattle(dailyLayout(save, hash.date || localDateString()));
    else if (hash.mode === "seed") startBattle(seedLayout(save, hash.seed));
    else startBattle(layoutByNumber(hash.number || nextLevelNumber(save), save));
    audio.blip();
  });
  document.querySelector("#daily").addEventListener("click", () => {
    startBattle(dailyLayout(state.save, localDateString()));
    audio.blip();
  });
  document.querySelector("#map").addEventListener("click", () => openMap());
  document.querySelector("#help").addEventListener("click", () => show("help"));
  document.querySelector("#help-back").addEventListener("click", () => { show("title"); paintTitle(); });
  document.querySelector("#map-back").addEventListener("click", () => { show("title"); paintTitle(); });
  document.querySelector("#title-mute").addEventListener("click", toggleMute);
  document.querySelector("#mute").addEventListener("click", toggleMute);
  document.querySelector("#motion").addEventListener("click", () => {
    const order = ["auto", "reduce", "full"];
    const i = order.indexOf(state.save.settings.motion);
    state.save.settings.motion = order[(i + 1) % order.length];
    persist();
    syncPrefs();
  });
  document.querySelector("#logo").addEventListener("click", () => {
    state.eggTaps += 1;
    if (state.eggTaps >= 4) {
      document.querySelector("#egg").hidden = false;
      state.save.seenEgg = true;
      persist();
    }
  });
  document.querySelector("#pause").addEventListener("click", pause);
  document.querySelector("#resume").addEventListener("click", resume);
  document.querySelector("#pause-retry").addEventListener("click", () => startBattle(rebuild()));
  document.querySelector("#retry").addEventListener("click", () => startBattle(rebuild()));
  document.querySelector("#pause-title").addEventListener("click", goTitle);
  document.querySelector("#result-title-btn").addEventListener("click", goTitle);
  document.querySelector("#yard").addEventListener("click", openYard);
  document.querySelector("#yard-back").addEventListener("click", goTitle);
  document.querySelector("#next-siege").addEventListener("click", () => {
    startBattle(layoutByNumber(nextLevelNumber(state.save), state.save));
  });
  document.querySelector("#share").addEventListener("click", async () => {
    const value = document.querySelector("#share-text").value;
    try {
      await navigator.clipboard.writeText(value);
      document.querySelector("#share").textContent = "Copied";
    } catch {
      document.querySelector("#share-text").focus();
      document.querySelector("#share-text").select();
      document.querySelector("#share").textContent = "Select the line";
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (state.screen !== "battle" || state.phase !== "aim") return;
    canvas.setPointerCapture(event.pointerId);
    state.dragging = true;
    aimFrom(event);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    aimFrom(event);
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!state.dragging) return;
    state.dragging = false;
    aimFrom(event);
    const dx = state.pointer ? state.pointer.dist : 0;
    if (dx > 18) firePlayer();
  });
  canvas.addEventListener("pointercancel", () => { state.dragging = false; });

  addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "m" || event.key === "M") {
      toggleMute();
      event.preventDefault();
      return;
    }
    if ((event.key === "r" || event.key === "R") && (state.screen === "battle" || state.screen === "result" || state.screen === "pause")) {
      startBattle(rebuild());
      event.preventDefault();
      return;
    }
    if (event.key === "Escape") {
      if (state.screen === "battle") pause();
      else if (state.screen === "pause") resume();
      return;
    }
    if (state.screen !== "battle" || state.phase !== "aim") return;
    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") state.angle -= 0.045;
    else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") state.angle += 0.045;
    else if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") state.power += 0.04;
    else if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") state.power -= 0.04;
    else if (event.key === " " || event.key === "Enter") {
      const focused = event.target && event.target.closest && event.target.closest("button, a, input, textarea, select");
      if (focused) return;
      firePlayer();
    }
    else if (event.key >= "1" && event.key <= "4") {
      const weapon = WEAPONS[Number(event.key) - 1];
      if (weapon && state.layout.weapons.includes(weapon.id)) {
        state.weaponId = weapon.id;
        state.save.lastWeapon = weapon.id;
        persist();
        paintWeapons();
      }
    } else return;
    state.angle = clampAngle(state.angle);
    state.power = Math.max(0.28, Math.min(1, state.power));
    event.preventDefault();
  });
  addEventListener("resize", resize);
}

function pause() {
  state.paused = true;
  state.pausedAt = performance.now();
  show("pause");
}

function resume() {
  const held = state.pausedAt ? performance.now() - state.pausedAt : 0;
  state.enemyAt += held;
  state.holdUntil = (state.holdUntil || 0) + held;
  state.pausedAt = 0;
  state.paused = false;
  show("battle");
}

function clampAngle(angle) {
  return Math.max(-1.45, Math.min(0.12, angle));
}

function aimFrom(event) {
  const point = screenToWorld(event.clientX, event.clientY);
  const cannon = state.layout.playerCannon;
  const dist = Math.hypot(point.x - cannon.x, point.y - cannon.y);
  state.pointer = { ...point, dist };
  const weapon = currentWeapon();
  const aim = aimToward(cannon, point, weapon, aimBlocks(), state.layout.wind, "player");
  if (aim) {
    state.angle = clampAngle(aim.angle);
    state.power = aim.power;
  }
}

function rebuild() {
  const layout = state.layout;
  if (!layout) return layoutByNumber(1, state.save);
  if (layout.mode === "daily") return dailyLayout(state.save, layout.date || localDateString());
  if (layout.mode === "seed") return seedLayout(state.save, layout.seed);
  return layoutByNumber(layout.number || 1, state.save);
}

function goTitle() {
  if (state.siege) destroySiege(state.siege);
  state.siege = null;
  state.paused = false;
  freshVista();
  history.replaceState(null, "", location.pathname + location.search);
  show("title");
  paintTitle();
}

function boot() {
  const storage = browserStorage();
  state.save = storage ? loadSave(storage) : defaultSave();
  syncPrefs();
  freshVista();
  paintTitle();
  show("title");
  bind();
  resize();
  const params = new URLSearchParams(location.search);
  if (params.has("test")) {
    window.__grokstone = {
      get screen() { return state.screen; },
      get phase() { return state.phase; },
      get shots() { return state.shots; },
      get won() { return !!(state.result && state.result.won); },
      get time() { return state.time; },
      get layout() { return state.layout && { mode: state.layout.mode, date: state.layout.date, seed: state.layout.seed, name: state.layout.name }; },
      fireSolution() {
        const aim = bestAim(state.layout.playerCannon, currentWeapon(), aimBlocks(), state.layout.wind, "player", state.save.upgrades.powder);
        state.angle = aim.angle;
        state.power = aim.power;
        firePlayer();
        return aim && aim.targetId;
      },
      use(id) {
        const button = document.querySelector(`[data-weapon="${id}"]`);
        if (button && !button.disabled) button.click();
      },
      outline() {
        const pred = predicted();
        return pred && pred.hit && pred.hit.type === "block" ? pred.hit.id : null;
      },
      clientFor(id, dx = 0, dy = 0) {
        const block = aimBlocks().find((b) => b.id === id) || (id === "cannon" ? state.layout.playerCannon : null);
        if (!block) return null;
        const rect = canvas.getBoundingClientRect();
        return {
          x: rect.left + view.ox + (block.x + dx) * view.scale,
          y: rect.top + view.oy + (block.y + dy) * view.scale,
        };
      },
      feet() {
        const blocks = aimBlocks();
        const live = new Set(blocks.map((b) => b.id));
        const banner = blocks.find((b) => b.side === "enemy" && b.material === "banner");
        const host = banner && blocks.find((b) => (banner.neighbors.below || []).includes(b.id));
        const ids = new Set((host && host.neighbors && host.neighbors.below) || []);
        if (host && !ids.size) ids.add(host.id);
        const key = blocks.find((b) => b.side === "enemy" && b.material === "keystone");
        if (key) ids.add(key.id);
        return [...ids].filter((id) => live.has(id));
      },
      aimAt(id) {
        const block = aimBlocks().find((b) => b.id === id);
        if (!block) return null;
        const aim = aimToward(state.layout.playerCannon, { x: block.x, y: block.y }, currentWeapon(), aimBlocks(), state.layout.wind, "player");
        if (!aim) return null;
        state.angle = clampAngle(aim.angle);
        state.power = aim.power;
        return aim.hit && aim.hit.type === "block" ? aim.hit.id : null;
      },
      fireAimed() {
        firePlayer();
      },
      status() {
        const blocks = [];
        if (state.siege) {
          for (const body of state.siege.bodies.values()) {
            const g = body.grok;
            if (!g || g.role !== "block") continue;
            blocks.push({ id: g.id, hp: Math.round(g.hp), maxHp: g.maxHp, material: g.material, side: g.side, up: body.isStatic && !g.loose });
          }
        }
        return {
          screen: state.screen,
          phase: state.phase,
          shots: state.shots,
          won: !!(state.result && state.result.won),
          stars: state.result ? state.result.stars : 0,
          clever: !!(state.result && state.result.clever),
          detail: document.querySelector("#result-detail") ? document.querySelector("#result-detail").textContent : "",
          dust: state.particles.filter((p) => p.dust && p.life > 0).length,
          blocks,
        };
      },
    };
  }
  requestAnimationFrame(frame);
}

boot();
