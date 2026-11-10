import {
  KIND_COPY,
  MOON_LOOK,
  MOONS,
  SEAL_ORDER,
  TAU,
  THEME_LOOK,
  THEMES,
  TRAIL_LOOK,
  TRAILS,
  activeStreak,
  coreLit,
  createRun,
  dailySeed,
  fling,
  loadSave,
  localDateString,
  missionLine,
  missionsFor,
  TUNING,
  multiplierFor,
  planetHue,
  selectMoon,
  selectTheme,
  selectTrail,
  settleRun,
  step,
  viewAngle,
  writeSave,
  zone,
} from "./logic.js";
import { createAudio } from "./audio.js";

const canvas = document.querySelector("#sky");
const ctx = canvas.getContext("2d");
const slot = document.querySelector("#orbit-slot");
const flashEl = document.querySelector("#flash");
const live = document.querySelector("#live");
const callout = document.querySelector("#callout");
const titleHead = document.querySelector("#title-head");
const playHead = document.querySelector("#play-head");
const titleDock = document.querySelector("#title-dock");
const playDock = document.querySelector("#play-dock");
const overDock = document.querySelector("#over-dock");
const help = document.querySelector("#help");
const shelf = document.querySelector("#shelf");
const ledger = document.querySelector("#ledger");
const scoreEl = document.querySelector("#score");
const metaEl = document.querySelector("#meta");
const statsEl = document.querySelector("#stats");
const coachEl = document.querySelector("#coach");
const kindEl = document.querySelector("#kind-name");
const chainEl = document.querySelector("#chain");
const missionEl = document.querySelector("#mission-line");
const reasonEl = document.querySelector("#reason");
const nearEl = document.querySelector("#near");
const finalEl = document.querySelector("#final");
const detailEl = document.querySelector("#detail");
const unlockEl = document.querySelector("#unlock");
const muteBtn = document.querySelector("#btn-mute");
const motionBtn = document.querySelector("#btn-motion");
const quietBtn = document.querySelector("#btn-quiet");
const soundWave = document.querySelector("#icon-wave");
const soundSlash = document.querySelector("#icon-slash");
const plaqueGoal = document.querySelector("#plaque-goal");
const plaqueMeta = document.querySelector("#plaque-meta");
const sealsEl = document.querySelector("#seals");

const audio = createAudio();
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const KIND_INK = {
  steady: { arc: "#ffc14d", core: "#fff6d8", wash: "rgba(255,193,77,0.2)" },
  wild: { arc: "#ffb03a", core: "#fff1c2", wash: "rgba(255,160,50,0.22)" },
  echo: { arc: "#ffc14d", core: "#fff6d8", wash: "rgba(255,193,77,0.18)", ghost: "#d7e6f5" },
  veil: { arc: "#d9c6ff", core: "#ffffff", wash: "rgba(200,170,255,0.16)" },
  rift: { arc: "#c9b0ff", core: "#f6efff", wash: "rgba(170,140,255,0.2)" },
};

let today = localDateString();
let save = loadSave(localStorage, today);
let mode = "title";
let helpOpen = false;
let shelfOpen = false;
let run = null;
let hold = false;
let hiddenPause = false;
let lastTs = 0;
let shake = 0;
let calloutUntil = 0;
let waitNoteAt = 0;
let wasHot = false;
let fly = null;
let overShown = false;
let trailPts = [];
let sparks = [];
let ripples = [];
let demo = 0;
let lastScore = -1;
let lastKind = "";
let skyCache = null;
let flashTimer = 0;
const frames = [];
const stars = makeStars(42);

const REASON = {
  early: "Too soon",
  late: "Too late",
  overshot: "Slipped past",
  gap: "Between",
  hour: "The hour closes",
};

writeSave(localStorage, save);
applySettings();
renderHome();
syncChrome();

function reduced() {
  if (save.motion === "reduce") return true;
  if (save.motion === "full") return false;
  return motionQuery.matches;
}

function format(n) {
  return Math.round(n).toLocaleString("en-US");
}

function say(text) {
  live.textContent = "";
  live.textContent = text;
}

function applySettings() {
  document.documentElement.dataset.motion = reduced() ? "reduce" : "full";
  if (save.motion === "system") document.documentElement.dataset.motion = motionQuery.matches ? "reduce" : "full";
  document.documentElement.dataset.muted = save.mute ? "1" : "0";
  document.documentElement.dataset.sky = save.theme || "dusk";
  muteBtn.setAttribute("aria-pressed", save.mute ? "true" : "false");
  muteBtn.setAttribute("aria-label", save.mute ? "Unmute sound" : "Mute sound");
  soundWave.style.display = save.mute ? "none" : "";
  soundSlash.hidden = !save.mute;
  audio.setMuted(save.mute);
  const motionLabel = save.motion === "reduce"
    ? "Motion: reduced"
    : save.motion === "full"
      ? "Motion: full"
      : `Motion: device${motionQuery.matches ? " (reduced)" : ""}`;
  motionBtn.textContent = motionLabel;
  skyCache = null;
}

function persist() {
  writeSave(localStorage, save);
}

function renderHome() {
  const board = missionsFor(today, save);
  const streak = activeStreak(save, today);
  plaqueGoal.textContent = board.nightly.label;
  const nightBest = save.daily && save.daily.date === today ? save.daily.best : 0;
  plaqueMeta.textContent = `Streak ${streak}${nightBest ? ` · tonight ${format(nightBest)}` : ""}`;
  sealsEl.replaceChildren();
  for (const id of SEAL_ORDER) {
    const pip = document.createElement("i");
    if ((save.goalKinds || []).includes(id)) pip.className = "on";
    sealsEl.append(pip);
  }
  const moon = MOONS.find((m) => m.id === save.moon);
  statsEl.textContent = `${moon ? moon.name : "Cinder"} · best ${format(save.best)}`;
  quietBtn.hidden = !save.quietUnlocked;
  renderShelf();
}

function swatch(list, items, equipped, owned, onPick) {
  list.replaceChildren();
  for (const item of items) {
    const open = owned(item.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.setAttribute("aria-pressed", equipped === item.id ? "true" : "false");
    btn.setAttribute("aria-disabled", open ? "false" : "true");
    const dot = document.createElement("span");
    dot.className = "dot";
    const look = item.look;
    dot.style.background = `radial-gradient(circle at 35% 32%, #fff, ${look.core} 42%, ${look.shade || look.glow})`;
    dot.style.setProperty("--glow", look.glow);
    const label = document.createElement("span");
    label.textContent = item.name;
    if (!open) {
      const hint = document.createElement("small");
      hint.textContent = item.hint;
      label.append(document.createElement("br"), hint);
    }
    btn.append(dot, label);
    btn.addEventListener("click", () => {
      if (!open) return;
      onPick(item.id);
    });
    list.append(btn);
  }
}

function renderShelf() {
  swatch(document.querySelector("#moon-list"), MOONS.map((m) => ({ ...m, look: MOON_LOOK[m.id] })), save.moon, (id) => (save.moons || []).includes(id), (id) => {
    save = selectMoon(save, id);
    persist();
    renderHome();
  });
  swatch(document.querySelector("#trail-list"), TRAILS.map((t) => ({ ...t, look: { ...TRAIL_LOOK[t.id], shade: "#2a1608" } })), save.trail, (id) => (save.unlocked || []).includes(id), (id) => {
    save = selectTrail(save, id);
    persist();
    renderHome();
  });
  swatch(document.querySelector("#theme-list"), THEMES.map((t) => {
    const look = THEME_LOOK[t.id];
    return { ...t, look: { core: look.sky0, glow: look.brass, shade: look.sky2 } };
  }), save.theme, (id) => (save.themes || []).includes(id), (id) => {
    save = selectTheme(save, id);
    persist();
    applySettings();
    renderHome();
  });
}

function syncChrome() {
  const playing = mode === "play" || (mode === "over" && !overShown);
  const over = mode === "over" && overShown;
  titleHead.hidden = mode !== "title";
  titleDock.hidden = mode !== "title";
  playHead.hidden = mode === "title";
  playDock.hidden = !playing;
  overDock.hidden = !over;
}

function showCallout(text) {
  callout.textContent = text;
  callout.classList.remove("show");
  if (reduced()) {
    callout.style.opacity = "1";
    calloutUntil = performance.now() + 520;
    return;
  }
  callout.style.opacity = "";
  void callout.offsetWidth;
  callout.classList.add("show");
  calloutUntil = performance.now() + 720;
}

function flare(kind) {
  flashEl.dataset.kind = kind || "hit";
  if (reduced()) {
    flashEl.style.opacity = "0.16";
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashEl.style.opacity = "0"; }, 80);
    return;
  }
  flashEl.style.opacity = "";
  flashEl.classList.remove("go");
  void flashEl.offsetWidth;
  flashEl.classList.add("go");
}

function buzz(pattern) {
  if (save.mute || reduced()) return;
  try { navigator.vibrate?.(pattern); } catch {}
}

function start(kind) {
  today = localDateString();
  const seed = kind === "daily" ? (dailySeed(today) || 1) : (crypto.getRandomValues(new Uint32Array(1))[0] || 1);
  run = createRun(seed, kind);
  mode = "play";
  overShown = false;
  hold = false;
  wasHot = false;
  fly = null;
  trailPts = [];
  sparks = [];
  ripples = [];
  shake = 0;
  lastScore = -1;
  lastKind = "";
  helpOpen = false;
  shelfOpen = false;
  help.hidden = true;
  shelf.hidden = true;
  audio.unlock();
  audio.play("start");
  say(kind === "daily" ? "Tonight's orbit." : kind === "quiet" ? "Quiet hour." : "New orbit.");
  syncChrome();
  paintHud();
}

function openHelp() {
  helpOpen = true;
  help.hidden = false;
  if (mode === "play") hold = true;
  document.querySelector("#btn-resume").textContent = mode === "play" ? "Resume" : "Close";
}

function closeHelp() {
  helpOpen = false;
  help.hidden = true;
  if (mode === "play" && !hiddenPause) hold = false;
}

function names(ids, table) {
  return ids.map((id) => table.find((item) => item.id === id)?.name || id);
}

function finish(event) {
  mode = "over";
  const angle = viewAngle(run);
  const hour = event.reason === "hour";
  fly = reduced() || hour ? null : { angle, age: 0 };
  if (!fly) overShown = true;
  const settled = settleRun(save, run, today);
  save = settled.save;
  persist();
  reasonEl.textContent = REASON[event.reason] || "Drifted";
  nearEl.hidden = hour || !event.nearMiss;
  finalEl.textContent = format(run.score);
  const record = run.mode === "quiet" ? save.bestQuiet : run.mode === "daily" ? save.bestNight : save.bestFree;
  const bestLine = settled.isBest ? "New best" : `Best ${format(record || save.best)}`;
  const streak = activeStreak(save, today);
  detailEl.textContent = `${run.flings} flings · ${run.perfects} perfect · ${run.cashes || 0} cashed · ${bestLine}${run.mode === "daily" && streak ? ` · streak ${streak}` : ""}`;
  const bits = [
    ...names(settled.fresh.moons, MOONS).map((n) => `${n} moon`),
    ...names(settled.fresh.trails, TRAILS).map((n) => `${n} trail`),
    ...names(settled.fresh.themes, THEMES).map((n) => `${n} sky`),
  ];
  if (settled.fresh.quiet) bits.push("Quiet hour");
  const done = settled.missions;
  if (done?.nightly) bits.unshift("Tonight's seal lit");
  unlockEl.hidden = bits.length === 0;
  unlockEl.textContent = bits.join(" · ");
  if (hour) audio.play("hour");
  else audio.play("miss");
  if (!hour) {
    buzz([18, 36, 28]);
    if (!reduced()) shake = 8;
    flare("death");
    burst(lastMoon.x, lastMoon.y, "#ffb07a", 16, 90);
  }
  say(`${reasonEl.textContent}. Score ${format(run.score)}.`);
  renderHome();
  syncChrome();
}

function revealOver() {
  if (overShown) return;
  overShown = true;
  callout.textContent = "";
  callout.classList.remove("show");
  callout.style.opacity = "0";
  syncChrome();
}

function milestoneName(combo) {
  if (combo >= 9) return "Corona";
  if (combo >= 6) return "Bright";
  return "Kindled";
}

function onPress() {
  audio.unlock();
  if (helpOpen || shelfOpen) return;
  if (mode !== "play" || !run || run.phase !== "playing" || hold) return;
  const result = fling(run);
  if (!result.event) return;
  if (result.event.type === "wait") {
    const now = performance.now();
    if (now - waitNoteAt > 700) {
      waitNoteAt = now;
      showCallout("Not yet");
      audio.play("wait");
    }
    return;
  }
  const event = result.event;
  run = result.run;
  if (event.type === "miss" || event.type === "hour") {
    if (event.type === "miss") showCallout(REASON[event.reason] || "Drifted");
    finish(event);
    return;
  }
  const perfect = event.type === "perfect";
  const word = event.relicHit ? "Relic" : event.milestone ? milestoneName(run.combo) : perfect ? "Perigee" : event.type === "cash" ? "Cashed" : "Fling";
  showCallout(word);
  audio.play(event.relicHit ? "relic" : event.milestone ? "milestone" : perfect ? "perfect" : event.type === "cash" ? "cash" : "good");
  buzz(perfect ? (event.milestone ? [10, 30, 16] : 12) : 6);
  flare(event.relicHit ? "relic" : event.milestone ? "milestone" : "hit");
  const color = (TRAIL_LOOK[save.trail] || TRAIL_LOOK.ember).glow;
  burst(lastMoon.x, lastMoon.y, event.relicHit ? "#ffe27a" : color, event.milestone ? 22 : perfect ? 14 : 8, event.milestone ? 120 : 70);
  ripple(lastMoon.x, lastMoon.y, perfect ? "#fff6d4" : "#ffc14d");
  if (event.milestone && !reduced()) shake = 4;
  scoreEl.classList.remove("bump");
  void scoreEl.offsetWidth;
  scoreEl.classList.add("bump");
  wasHot = false;
  say(`${word}. Score ${format(run.score)}.`);
  paintHud();
}

function paintHud() {
  if (!run) return;
  if (run.score !== lastScore) {
    scoreEl.textContent = format(run.score);
    lastScore = run.score;
  }
  const tag = run.mode === "daily" ? "Tonight" : run.mode === "quiet" ? "Quiet" : "Free";
  const mult = multiplierFor(run.combo);
  metaEl.textContent = `${tag} · best ${format(Math.max(save.best, run.score))}`;
  if (run.kind !== lastKind) {
    lastKind = run.kind;
    if (run.kind === "rift") audio.play("rift");
    if (run.kind === "wild") audio.play("wild");
  }
  ledger.dataset.kind = run.kind;
  kindEl.textContent = `${KIND_COPY[run.kind].name}${run.relic ? " · relic" : ""}`;
  coachEl.textContent = coachLine();
  chainEl.textContent = `x${mult} · ${run.combo} chain${run.relicsBanked ? ` · ${run.relicsBanked} relic` : ""}`;
  const span = TUNING.startArc - TUNING.minArc;
  const open = Math.max(0, Math.min(1, (run.arcHalf - TUNING.minArc) / span));
  document.querySelector("#arc-fill").style.width = `${Math.round(open * 100)}%`;
  missionEl.textContent = missionLine(save, today, run.mode);
}

function coachLine() {
  if (!run || run.phase !== "playing") return "";
  const z = zone(run);
  if (z === "echo") return "Silver — tap to cash";
  if (z === "perfect" && run.relic) return "Relic core";
  if (z === "perfect") return "White core";
  if (run.kind === "veil" && z === "good" && !coreLit(run)) return "Dim gold — or wait for the light";
  if (z === "good") return "Gold";
  return KIND_COPY[run.kind].line;
}

const lastMoon = { x: 0, y: 0 };

function burst(x, y, color, n, speed) {
  if (reduced()) return;
  for (let i = 0; i < n && sparks.length < 52; i++) {
    const a = Math.random() * TAU;
    const v = speed * (0.35 + Math.random() * 0.75);
    sparks.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      age: 0,
      life: 0.28 + Math.random() * 0.28,
      color,
      size: 1.4 + Math.random() * 2.1,
    });
  }
}

function ripple(x, y, color) {
  if (reduced() || ripples.length > 4) return;
  ripples.push({ x, y, age: 0, life: 0.48, color });
}

document.querySelector("#btn-play").addEventListener("click", () => start("free"));
document.querySelector("#btn-daily").addEventListener("click", () => start("daily"));
quietBtn.addEventListener("click", () => start("quiet"));
document.querySelector("#btn-again").addEventListener("click", () => start(run && run.mode ? run.mode : "free"));
document.querySelector("#btn-home").addEventListener("click", () => {
  mode = "title";
  run = null;
  fly = null;
  overShown = false;
  callout.textContent = "";
  callout.style.opacity = "0";
  renderHome();
  syncChrome();
});
muteBtn.addEventListener("click", () => {
  save = { ...save, mute: !save.mute };
  persist();
  applySettings();
  if (!save.mute) audio.unlock();
});
motionBtn.addEventListener("click", () => {
  const order = ["system", "reduce", "full"];
  save = { ...save, motion: order[(order.indexOf(save.motion) + 1) % order.length] };
  persist();
  applySettings();
});
document.querySelector("#btn-help").addEventListener("click", () => (helpOpen ? closeHelp() : openHelp()));
document.querySelector("#btn-resume").addEventListener("click", closeHelp);
document.querySelector("#btn-shelf").addEventListener("click", () => {
  shelfOpen = true;
  shelf.hidden = false;
  if (mode === "play") hold = true;
});
document.querySelector("#btn-shelf-close").addEventListener("click", () => {
  shelfOpen = false;
  shelf.hidden = true;
  if (mode === "play" && !helpOpen && !hiddenPause) hold = false;
});

document.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button, a, input, label")) return;
  if (helpOpen || shelfOpen) return;
  if (mode !== "play") return;
  event.preventDefault();
  onPress();
}, { passive: false });

document.addEventListener("touchmove", (event) => {
  if (event.target.closest(".sheet-card")) return;
  event.preventDefault();
}, { passive: false });
document.addEventListener("gesturestart", (event) => event.preventDefault());
document.addEventListener("contextmenu", (event) => event.preventDefault());

document.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.code === "Space") {
    event.preventDefault();
    if (helpOpen || shelfOpen) return;
    if (mode === "title") start("free");
    else if (mode === "over" && overShown) start(run && run.mode ? run.mode : "free");
    else onPress();
  } else if (event.code === "KeyM") muteBtn.click();
  else if (event.code === "KeyR" && (mode === "play" || mode === "over")) start(run && run.mode ? run.mode : "free");
  else if (event.key === "?" || (event.code === "Slash" && event.shiftKey)) openHelp();
  else if (event.code === "Escape") {
    if (helpOpen) closeHelp();
    if (shelfOpen) document.querySelector("#btn-shelf-close").click();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (mode === "play" && !hold) hiddenPause = true;
    hold = true;
    lastTs = 0;
  } else if (hiddenPause) {
    hiddenPause = false;
    if (!helpOpen && !shelfOpen) hold = false;
    lastTs = 0;
  }
});
motionQuery.addEventListener("change", () => {
  if (save.motion === "system") applySettings();
});

function makeStars(n) {
  const out = [];
  let s = 0x51a7;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out.push({
      x: (s & 1023) / 1023,
      y: ((s >>> 10) & 1023) / 1023,
      r: (s >>> 20) & 1 ? 1.4 : 0.7,
      a: 0.28 + ((s >>> 22) & 7) / 18,
    });
  }
  return out;
}

let sizedW = 0;
let sizedH = 0;
let sizedDpr = 0;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w === sizedW && h === sizedH && dpr === sizedDpr) return;
  sizedW = w;
  sizedH = h;
  sizedDpr = dpr;
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  skyCache = null;
}

function orbitGeom() {
  const rect = slot.getBoundingClientRect();
  if (rect.width < 20 || rect.height < 20) return null;
  const r = Math.max(84, Math.min(rect.width * 0.43, rect.height * 0.46, 228));
  return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height * 0.48, r };
}

function drawSky(w, h) {
  const theme = save.theme || "dusk";
  if (!skyCache || skyCache.w !== w || skyCache.h !== h || skyCache.theme !== theme) {
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.round(w));
    off.height = Math.max(1, Math.round(h));
    const g = off.getContext("2d");
    const look = THEME_LOOK[theme] || THEME_LOOK.dusk;
    const rad = g.createRadialGradient(w * 0.5, h * 0.4, 24, w * 0.5, h * 0.55, Math.max(w, h) * 0.75);
    rad.addColorStop(0, look.sky0);
    rad.addColorStop(0.5, look.sky1);
    rad.addColorStop(1, look.sky2);
    g.fillStyle = rad;
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.07;
    g.fillStyle = look.brass;
    g.beginPath();
    g.ellipse(w * 0.48, h * 0.42, w * 0.62, h * 0.16, -0.35, 0, TAU);
    g.fill();
    skyCache = { canvas: off, w, h, theme };
  }
  ctx.drawImage(skyCache.canvas, 0, 0, w, h);
  const look = THEME_LOOK[theme] || THEME_LOOK.dusk;
  ctx.fillStyle = look.star;
  for (const star of stars) {
    ctx.globalAlpha = star.a;
    ctx.fillRect(star.x * w, star.y * h, star.r, star.r);
  }
  ctx.globalAlpha = 1;
}

function strokeArc(cx, cy, r, a0, a1, width, color, alpha, dash) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  if (dash) ctx.setLineDash(dash);
  ctx.arc(cx, cy, r, a0, a1);
  ctx.stroke();
  ctx.restore();
}

function starShape(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 ? r * 0.42 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawPlanet(cx, cy, radius, hue) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.92, radius * 0.7, radius * 0.18, 0, 0, TAU);
  ctx.fill();
  const body = ctx.createRadialGradient(-radius * 0.35, -radius * 0.4, radius * 0.1, 0, 0, radius);
  body.addColorStop(0, `hsl(${hue} 90% 78%)`);
  body.addColorStop(0.45, `hsl(${hue} 70% 54%)`);
  body.addColorStop(1, `hsl(${hue} 45% 28%)`);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.clip();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = `hsl(${(hue + 24) % 360} 50% 36%)`;
  for (const band of [-0.32, 0.12, 0.46]) {
    ctx.beginPath();
    ctx.ellipse(0, radius * band, radius * 1.1, radius * 0.13, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 3, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawMoon(x, y, radius, look, time) {
  const glow = look.rainbow ? `hsl(${(time / 18) % 360} 80% 70%)` : look.glow;
  if (!reduced()) {
    ctx.save();
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(x, y, radius * 3.1, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  const body = ctx.createRadialGradient(x - radius * 0.4, y - radius * 0.45, radius * 0.15, x, y, radius);
  body.addColorStop(0, "#fffef8");
  body.addColorStop(0.38, look.core);
  body.addColorStop(1, look.shade || "#8a5a3a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(40, 24, 48, 0.22)";
  ctx.beginPath();
  ctx.arc(x + radius * 0.28, y + radius * 0.08, radius * 0.32, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(x - radius * 0.32, y - radius * 0.34, radius * 0.16, 0, TAU);
  ctx.fill();
}

function drawRing(cx, cy, r, look) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = look.ring;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = look.brass;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU;
    const inner = i % 6 === 0 ? r - 12 : r - 7;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2));
    ctx.stroke();
  }
  ctx.restore();
}

function drawScene(w, h, time) {
  drawSky(w, h);
  ctx.save();
  if (shake > 0.25) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  const geom = orbitGeom();
  const look = THEME_LOOK[save.theme] || THEME_LOOK.dusk;
  const moonLook = MOON_LOOK[save.moon] || MOON_LOOK.cinder;
  const trail = TRAIL_LOOK[save.trail] || TRAIL_LOOK.ember;
  if (!geom) {
    ctx.restore();
    return;
  }
  const { cx, cy, r } = geom;
  drawRing(cx, cy, r, look);
  const playing = run && (mode === "play" || mode === "over");
  let center = -0.9;
  let half = 0.62;
  let perfectHalf = 0.22;
  let ink = KIND_INK.steady;
  let echo = { center: -1.85, half: 0.2 };
  let showEcho = mode === "title";
  let relic = false;
  let lit = true;
  let rift = false;
  let wild = false;
  let moonAngle = demo;
  if (playing) {
    center = run.arcCenter;
    half = run.arcHalf;
    perfectHalf = run.perfectHalf;
    ink = KIND_INK[run.kind] || KIND_INK.steady;
    showEcho = !!run.echo;
    relic = !!run.relic;
    lit = coreLit(run);
    rift = !!run.rift;
    wild = !!run.wild;
    if (fly) {
      const tx = -Math.sin(fly.angle);
      const ty = Math.cos(fly.angle);
      const dist = fly.age * 240;
      lastMoon.x = cx + Math.cos(fly.angle) * r + tx * dist;
      lastMoon.y = cy + Math.sin(fly.angle) * r + ty * dist;
      moonAngle = fly.angle;
    } else {
      moonAngle = viewAngle(run);
      lastMoon.x = cx + Math.cos(moonAngle) * r;
      lastMoon.y = cy + Math.sin(moonAngle) * r;
    }
    if (showEcho && run.echo) {
      const echoCenter = run.rift
        ? wrapAngle(run.startTheta - run.echo.center)
        : wrapAngle(run.startTheta + run.echo.center);
      echo = { center: echoCenter, half: run.echo.half };
    }
  } else {
    lastMoon.x = cx + Math.cos(moonAngle) * r;
    lastMoon.y = cy + Math.sin(moonAngle) * r;
  }

  if (showEcho) {
    strokeArc(cx, cy, r, echo.center - echo.half, echo.center + echo.half, 7, ink.ghost || "#d7e6f5", 0.95, [5, 7]);
    ctx.save();
    ctx.strokeStyle = "#f4fbff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(echo.center) * r, cy + Math.sin(echo.center) * r, 6, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  const hot = playing && run.phase === "playing" ? zone(run) : "approach";
  const arcAlpha = run && run.kind === "veil" && !lit ? 0.32 : hot === "perfect" ? 1 : 0.92;
  strokeArc(cx, cy, r, center - half, center + half, 16, ink.wash, 1);
  strokeArc(cx, cy, r, center - half, center + half, wild ? 8 : 6, ink.arc, arcAlpha, wild ? [10, 8] : null);
  if (lit) {
    strokeArc(cx, cy, r, center - perfectHalf, center + perfectHalf, 14, "rgba(255,255,255,0.35)", 1);
    strokeArc(cx, cy, r, center - perfectHalf, center + perfectHalf, relic ? 8 : 11, ink.core, 1);
    const bx = cx + Math.cos(center) * r;
    const by = cy + Math.sin(center) * r;
    const pulse = relic ? 8 + Math.sin(time / 140) * 1.6 : hot === "perfect" ? 7.5 : 5.6;
    if (!reduced()) {
      ctx.fillStyle = relic ? "rgba(255, 214, 120, 0.45)" : "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(bx, by, pulse + (relic ? 10 : 6), 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = relic ? "#ffe7a3" : "#fff";
    if (relic) starShape(bx, by, pulse + 6);
    else {
      ctx.beginPath();
      ctx.arc(bx, by, pulse, 0, TAU);
      ctx.fill();
    }
  }
  if (rift) {
    const entry = center + half;
    const ex = cx + Math.cos(entry) * r;
    const ey = cy + Math.sin(entry) * r;
    ctx.strokeStyle = "#efe6ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 8, ey - 6);
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 8, ey + 6);
    ctx.stroke();
  }
  for (const end of [center - half, center + half]) {
    ctx.fillStyle = ink.arc;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(end) * r, cy + Math.sin(end) * r, 3, 0, TAU);
    ctx.fill();
  }

  drawPlanet(cx, cy, Math.min(54, r * 0.28), playing ? planetHue(run.seed, run.flings) : 18);

  if (!reduced()) {
    ctx.fillStyle = trail.glow;
    trailPts.forEach((p, i) => {
      ctx.globalAlpha = (i / trailPts.length) * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6, 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  drawMoon(lastMoon.x, lastMoon.y, Math.max(8, r * 0.078), moonLook, time);

  for (const wave of ripples) {
    const k = 1 - wave.age / wave.life;
    ctx.globalAlpha = Math.max(0, k) * 0.8;
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, 10 + wave.age * 160, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const spark of sparks) {
    const k = 1 - spark.age / spark.life;
    ctx.globalAlpha = Math.max(0, k);
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.arc(spark.x + spark.vx * spark.age, spark.y + spark.vy * spark.age, spark.size * k, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function wrapAngle(a) {
  const m = a % TAU;
  return m < 0 ? m + TAU : m;
}

function rememberTrail() {
  if (reduced() || !run || mode !== "play") return;
  trailPts.push({ x: lastMoon.x, y: lastMoon.y });
  if (trailPts.length > 14) trailPts.shift();
}

function frame(ts) {
  if (lastTs) {
    frames.push(ts - lastTs);
    if (frames.length > 90) frames.shift();
  }
  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
  lastTs = ts;
  if (mode === "play" && run && run.phase === "playing" && !hold && !helpOpen && !shelfOpen) {
    const before = zone(run);
    const stepped = step(run, dt);
    run = stepped.run;
    const after = run.phase === "playing" ? zone(run) : "past";
    if ((before === "approach" || before === "echo") && (after === "good" || after === "perfect") && !wasHot) {
      wasHot = true;
      audio.play(run.kind === "veil" ? "veil" : "tick");
    }
    if (after === "approach" || after === "echo") wasHot = false;
    if (stepped.event && (stepped.event.type === "miss" || stepped.event.type === "hour")) {
      if (stepped.event.type === "miss") showCallout(REASON[stepped.event.reason] || "Drifted");
      finish(stepped.event);
    } else {
      paintHud();
      rememberTrail();
    }
  } else if (mode === "title") {
    demo = wrapAngle(demo + dt * 0.55);
  }
  if (fly) {
    fly.age += dt;
    if (fly.age > 0.42) revealOver();
  }
  if (reduced() && calloutUntil && ts > calloutUntil) {
    callout.style.opacity = "0";
    calloutUntil = 0;
  }
  for (const spark of sparks) spark.age += dt;
  sparks = sparks.filter((s) => s.age < s.life);
  for (const wave of ripples) wave.age += dt;
  ripples = ripples.filter((w) => w.age < w.life);
  if (shake > 0) shake *= reduced() ? 0 : 0.86;

  resize();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene(window.innerWidth, window.innerHeight, ts);
  requestAnimationFrame(frame);
}

window.__perigee = {
  get mode() { return mode; },
  get run() { return run ? { ...run, zone: run.phase === "playing" ? zone(run) : run.phase } : null; },
  get save() { return { ...save, goalKinds: [...(save.goalKinds || [])], moons: [...(save.moons || [])] }; },
  get helpOpen() { return helpOpen; },
  get overShown() { return overShown; },
  reduced,
  fps() {
    if (!frames.length) return 0;
    const avg = frames.reduce((sum, n) => sum + n, 0) / frames.length;
    return 1000 / avg;
  },
};

requestAnimationFrame(frame);
