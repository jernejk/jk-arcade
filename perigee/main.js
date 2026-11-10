import {
  TAU,
  TRAILS,
  TRAIL_LOOK,
  activeStreak,
  createRun,
  dailySeed,
  fling,
  loadSave,
  localDateString,
  planetHue,
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
const live = document.querySelector("#live");
const callout = document.querySelector("#callout");
const chip = document.querySelector("#chip");

const titleHead = document.querySelector("#title-head");
const playHead = document.querySelector("#play-head");
const titleDock = document.querySelector("#title-dock");
const playDock = document.querySelector("#play-dock");
const overDock = document.querySelector("#over-dock");
const help = document.querySelector("#help");

const scoreEl = document.querySelector("#score");
const metaEl = document.querySelector("#meta");
const statsEl = document.querySelector("#stats");
const trailsEl = document.querySelector("#trails");
const nextTrailEl = document.querySelector("#next-trail");
const coachEl = document.querySelector("#coach");
const reasonEl = document.querySelector("#reason");
const nearEl = document.querySelector("#near");
const finalEl = document.querySelector("#final");
const detailEl = document.querySelector("#detail");
const unlockEl = document.querySelector("#unlock");
const muteBtn = document.querySelector("#btn-mute");
const motionBtn = document.querySelector("#btn-motion");
const soundWave = document.querySelector("#icon-wave");
const soundSlash = document.querySelector("#icon-slash");

const audio = createAudio();
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let today = localDateString();
let save = loadSave(localStorage, today);
let mode = "title";
let helpOpen = false;
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
let floaters = [];
let sparks = [];
let demoAngle = -Math.PI / 2;
let lastScore = -1;
const stars = makeStars(70);

writeSave(localStorage, save);
applySettings();
renderTrails();
renderStats();
syncChrome();

const REASON = {
  early: "Too soon",
  late: "Too late",
  overshot: "Slipped past",
};

function reduced() {
  if (save.motion === "reduce") return true;
  if (save.motion === "full") return false;
  return motionQuery.matches;
}

function applySettings() {
  document.documentElement.dataset.motion = reduced() ? "reduce" : "full";
  if (save.motion === "system") document.documentElement.dataset.motion = motionQuery.matches ? "reduce" : "full";
  document.documentElement.dataset.muted = save.mute ? "1" : "0";
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
}

function persist() {
  writeSave(localStorage, save);
}

function say(text) {
  live.textContent = "";
  live.textContent = text;
}

function format(n) {
  return Math.round(n).toLocaleString("en-US");
}

function renderStats() {
  const streak = activeStreak(save, today);
  const nightly = save.daily && save.daily.date === today ? save.daily.best : 0;
  const parts = [`Best ${format(save.best)}`];
  if (streak > 0) parts.push(`Streak ${streak}`);
  if (nightly > 0) parts.push(`Tonight ${format(nightly)}`);
  statsEl.textContent = parts.join(" · ");
}

function renderTrails() {
  trailsEl.replaceChildren();
  for (const trail of TRAILS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "trail";
    btn.setAttribute("role", "option");
    const open = save.unlocked.includes(trail.id);
    btn.setAttribute("aria-pressed", save.trail === trail.id ? "true" : "false");
    btn.setAttribute("aria-disabled", open ? "false" : "true");
    btn.textContent = trail.name;
    btn.setAttribute("aria-label", open ? `${trail.name} trail` : `${trail.name} trail locked. ${trail.hint}`);
    btn.addEventListener("click", () => {
      if (!open) return;
      save = selectTrail(save, trail.id);
      persist();
      renderTrails();
    });
    trailsEl.append(btn);
  }
  const next = TRAILS.find((trail) => !save.unlocked.includes(trail.id));
  nextTrailEl.textContent = next ? `Next trail: ${next.name} · ${next.hint}` : "Every trail is lit";
}

function syncChrome() {
  const playing = mode === "play" || (mode === "over" && !overShown);
  const over = mode === "over" && overShown;
  titleHead.hidden = mode !== "title";
  titleDock.hidden = mode !== "title";
  playHead.hidden = mode === "title";
  playDock.hidden = !playing;
  overDock.hidden = !over;
  chip.hidden = !(run && run.phase === "playing" && run.wild);
  if (!chip.hidden) chip.textContent = "Wild orbit";
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
  calloutUntil = performance.now() + 680;
}

function buzz(pattern) {
  if (save.mute || reduced()) return;
  try { navigator.vibrate?.(pattern); } catch {}
}

function start(kind) {
  today = localDateString();
  const seed = kind === "daily" ? dailySeed(today) : (crypto.getRandomValues(new Uint32Array(1))[0] || 1);
  run = createRun(seed, kind);
  mode = "play";
  overShown = false;
  hold = false;
  wasHot = false;
  fly = null;
  trailPts = [];
  floaters = [];
  sparks = [];
  shake = 0;
  lastScore = -1;
  helpOpen = false;
  help.hidden = true;
  audio.unlock();
  audio.play("start");
  say(kind === "daily" ? "Tonight's orbit. Wait for the gold." : "New orbit. Wait for the gold.");
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

function finish(event) {
  mode = "over";
  const angle = viewAngle(run);
  fly = reduced() ? null : { angle, age: 0, hue: planetHue(run.seed, run.flings) };
  if (!fly) overShown = true;
  const settled = settleRun(save, run, today);
  save = settled.save;
  persist();
  const reason = REASON[event.reason] || "Drifted";
  reasonEl.textContent = reason;
  nearEl.hidden = !event.nearMiss;
  finalEl.textContent = format(run.score);
  const nightly = save.daily && save.daily.date === today ? ` · Tonight ${format(save.daily.best)}` : "";
  const bestLine = settled.isBest ? "New best" : `Best ${format(save.best)}`;
  const streak = activeStreak(save, today);
  const streakBit = run.mode === "daily" && streak > 0 ? ` · Streak ${streak}` : "";
  detailEl.textContent = `${run.flings} flings · ${run.perfects} perfect · ${bestLine}${nightly}${streakBit}`;
  if (settled.unlocked.length) {
    const names = settled.unlocked.map((id) => TRAILS.find((t) => t.id === id)?.name || id);
    unlockEl.hidden = false;
    unlockEl.textContent = `${names.join(" & ")} trail unlocked`;
  } else unlockEl.hidden = true;
  audio.play("miss");
  buzz([18, 36, 28]);
  if (!reduced()) shake = 9;
  say(`${reason}. ${event.nearMiss ? "So close. " : ""}Score ${format(run.score)}.`);
  renderStats();
  renderTrails();
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

function onPress() {
  audio.unlock();
  if (helpOpen) return;
  if (mode === "title") return;
  if (mode === "over") return;
  if (!run || run.phase !== "playing" || hold) return;
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
  run = result.run;
  if (result.event.type === "miss") {
    showCallout(REASON[result.event.reason] || "Drifted");
    finish(result.event);
    return;
  }
  const perfect = result.event.type === "perfect";
  showCallout(perfect ? "Perigee" : "Fling");
  audio.play(perfect ? "perfect" : "good");
  buzz(perfect ? 12 : 6);
  spawnBurst(perfect);
  floaters.push({
    text: `+${result.event.scoreGain}`,
    age: 0,
    perfect,
  });
  wasHot = false;
  say(`${perfect ? "Perigee" : "Fling"}. Score ${format(run.score)}.`);
  paintHud();
}

function paintHud() {
  if (!run) return;
  if (run.score !== lastScore) {
    scoreEl.textContent = format(run.score);
    lastScore = run.score;
  }
  const tag = run.mode === "daily" ? "Tonight" : "Free orbit";
  const combo = run.combo >= 2 ? ` · ×${run.combo}` : "";
  metaEl.textContent = `${tag} · Best ${format(Math.max(save.best, run.score))}${combo}`;
  coachEl.textContent = coachLine();
}

function coachLine() {
  if (!run || run.phase !== "playing") return "";
  if (run.flings >= 2 && !run.wild) return run.combo >= 2 ? `×${run.combo} perfect` : "";
  const z = zone(run);
  if (run.wild && z === "approach") return "Wild orbit — watch the speed";
  if (z === "perfect") return "Tap — bright core";
  if (z === "good") return "Tap";
  return "Wait for the gold";
}

function spawnBurst(perfect) {
  if (reduced()) return;
  const geom = orbitGeom();
  if (!geom) return;
  const angle = viewAngle({ ...run, progress: run.centerP });
  const look = TRAIL_LOOK[save.trail] || TRAIL_LOOK.ember;
  const n = perfect ? 16 : 8;
  for (let i = 0; i < n; i++) {
    const a = angle + (Math.random() - 0.5) * 0.8;
    const speed = 30 + Math.random() * (perfect ? 90 : 40);
    sparks.push({
      x: geom.cx + Math.cos(a) * geom.r,
      y: geom.cy + Math.sin(a) * geom.r,
      vx: Math.cos(a) * speed * 0.2 + (Math.random() - 0.5) * 40,
      vy: Math.sin(a) * speed * 0.2 + (Math.random() - 0.5) * 40,
      age: 0,
      life: perfect ? 0.45 : 0.28,
      color: perfect ? look.glow : "#ffe1a8",
    });
  }
}

document.querySelector("#btn-play").addEventListener("click", () => start("free"));
document.querySelector("#btn-daily").addEventListener("click", () => start("daily"));
document.querySelector("#btn-again").addEventListener("click", () => start(run && run.mode === "daily" ? "daily" : "free"));
document.querySelector("#btn-home").addEventListener("click", () => {
  mode = "title";
  run = null;
  fly = null;
  overShown = false;
  callout.textContent = "";
  callout.classList.remove("show");
  callout.style.opacity = "0";
  syncChrome();
  renderStats();
});
muteBtn.addEventListener("click", () => {
  save = { ...save, mute: !save.mute };
  persist();
  applySettings();
  if (!save.mute) audio.unlock();
});
motionBtn.addEventListener("click", () => {
  const order = ["system", "reduce", "full"];
  const next = order[(order.indexOf(save.motion) + 1) % order.length];
  save = { ...save, motion: next };
  persist();
  applySettings();
});
document.querySelector("#btn-help").addEventListener("click", () => (helpOpen ? closeHelp() : openHelp()));
document.querySelector("#btn-resume").addEventListener("click", closeHelp);

document.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button, a, input, label")) return;
  if (helpOpen) return;
  if (mode !== "play") return;
  event.preventDefault();
  onPress();
}, { passive: false });

document.addEventListener("touchmove", (event) => {
  if (event.target.closest(".help-card")) return;
  event.preventDefault();
}, { passive: false });
document.addEventListener("gesturestart", (event) => event.preventDefault());
document.addEventListener("contextmenu", (event) => event.preventDefault());

document.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.code === "Space") {
    event.preventDefault();
    if (helpOpen) return;
    if (mode === "title") start("free");
    else if (mode === "over" && overShown) start(run && run.mode === "daily" ? "daily" : "free");
    else onPress();
  } else if (event.code === "KeyM") {
    muteBtn.click();
  } else if (event.code === "KeyR") {
    if (mode === "play" || mode === "over") start(run && run.mode === "daily" ? "daily" : "free");
  } else if (event.key === "?" || event.code === "Slash" && event.shiftKey) {
    openHelp();
  } else if (event.code === "Escape") {
    if (helpOpen) closeHelp();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (mode === "play" && !hold) hiddenPause = true;
    hold = true;
    lastTs = 0;
  } else if (hiddenPause) {
    hiddenPause = false;
    if (!helpOpen) hold = false;
    lastTs = 0;
  }
});

motionQuery.addEventListener("change", () => {
  if (save.motion === "system") applySettings();
});

function makeStars(n) {
  const out = [];
  let s = 0xdecaf;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out.push({
      x: (s & 1023) / 1023,
      y: ((s >>> 10) & 1023) / 1023,
      r: ((s >>> 20) & 3) + 0.6,
      a: 0.25 + ((s >>> 22) & 7) / 16,
    });
  }
  return out;
}

let sizedW = 0;
let sizedH = 0;
let sizedDpr = 0;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w === sizedW && h === sizedH && dpr === sizedDpr) return;
  sizedW = w;
  sizedH = h;
  sizedDpr = dpr;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

function orbitGeom() {
  const rect = slot.getBoundingClientRect();
  if (rect.width < 20 || rect.height < 20) return null;
  const r = Math.max(72, Math.min(rect.width * 0.46, rect.height * 0.42, 230));
  // Sit the ring high enough that a thumb at the bottom of the phone does not cover the moon.
  const preferred = rect.top + r + Math.min(28, rect.height * 0.06);
  const maxCy = rect.top + rect.height - r - 4;
  return {
    cx: rect.left + rect.width / 2,
    cy: Math.min(Math.max(preferred, rect.top + r), maxCy),
    r,
  };
}

function drawPlanet(cx, cy, radius, hue) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 0.72, radius * 0.2, 0, 0, TAU);
  ctx.fill();
  const body = ctx.createRadialGradient(-radius * 0.35, -radius * 0.4, radius * 0.15, 0, 0, radius);
  body.addColorStop(0, `hsl(${hue} 85% 78%)`);
  body.addColorStop(0.5, `hsl(${hue} 72% 58%)`);
  body.addColorStop(1, `hsl(${hue} 48% 30%)`);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fill();
  ctx.clip();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = `hsl(${(hue + 18) % 360} 60% 40%)`;
  for (const band of [-0.35, 0.05, 0.42]) {
    ctx.beginPath();
    ctx.ellipse(0, radius * band, radius * 1.05, radius * 0.16, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawMoon(x, y, radius, look) {
  ctx.save();
  ctx.translate(x, y);
  if (!reduced()) {
    ctx.fillStyle = look.glow;
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.3, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = look.core;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(90, 70, 110, 0.28)";
  ctx.beginPath();
  ctx.arc(radius * 0.32, -radius * 0.08, radius * 0.78, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawArc(cx, cy, r, center, half, width, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.arc(cx, cy, r, center - half, center + half);
  ctx.stroke();
  ctx.restore();
}

function frame(ts) {
  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
  lastTs = ts;
  if (mode === "play" && run && run.phase === "playing" && !hold && !helpOpen) {
    const before = zone(run);
    const stepped = step(run, dt);
    run = stepped.run;
    const after = run.phase === "playing" ? zone(run) : "past";
    if (before === "approach" && (after === "good" || after === "perfect") && !wasHot) {
      wasHot = true;
      audio.play(run.wild ? "wild" : "tick");
    }
    if (after === "approach") wasHot = false;
    if (stepped.event && stepped.event.type === "miss") {
      showCallout(REASON[stepped.event.reason] || "Drifted");
      finish(stepped.event);
    } else {
      paintHud();
      rememberTrail();
    }
  } else if (mode === "title") {
    demoAngle = wrapAngle(demoAngle + dt * 0.65);
  }

  if (fly) {
    fly.age += dt;
    if (fly.age > 0.48) revealOver();
  }
  if (reduced() && calloutUntil && ts > calloutUntil) {
    callout.style.opacity = "0";
    calloutUntil = 0;
  }
  for (const spark of sparks) spark.age += dt;
  sparks = sparks.filter((s) => s.age < s.life);
  for (const floater of floaters) floater.age += dt;
  floaters = floaters.filter((f) => f.age < 0.7);
  if (shake > 0) shake *= reduced() ? 0 : 0.86;

  draw(dt);
  requestAnimationFrame(frame);
}

function wrapAngle(a) {
  const m = a % TAU;
  return m < 0 ? m + TAU : m;
}

function rememberTrail() {
  if (reduced() || !run) return;
  const geom = orbitGeom();
  if (!geom) return;
  const angle = viewAngle(run);
  trailPts.push({ x: geom.cx + Math.cos(angle) * geom.r, y: geom.cy + Math.sin(angle) * geom.r });
  if (trailPts.length > 16) trailPts.shift();
}

function draw() {
  resize();
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = ctx.createRadialGradient(w * 0.5, h * 0.4, 30, w * 0.5, h * 0.55, Math.max(w, h) * 0.75);
  sky.addColorStop(0, "#3d245f");
  sky.addColorStop(0.42, "#1a0e2e");
  sky.addColorStop(1, "#07040e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  for (const star of stars) {
    ctx.globalAlpha = star.a;
    ctx.fillStyle = "#fff6e8";
    ctx.beginPath();
    ctx.arc(star.x * w, star.y * h, star.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  if (shake > 0.2) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  const geom = orbitGeom();
  if (geom) {
    const { cx, cy, r } = geom;
    const playing = run && (mode === "play" || mode === "over");
    const hue = playing ? planetHue(run.seed, run.flings) : 18;
    const center = playing && run.phase !== "over" ? run.arcCenter : (playing ? run.arcCenter : -Math.PI / 2);
    const half = playing ? run.arcHalf : 0.7;
    const perfectHalf = playing ? run.perfectHalf : 0.24;
    const hot = playing && run.phase === "playing" ? zone(run) : "approach";
    const look = TRAIL_LOOK[save.trail] || TRAIL_LOOK.ember;

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 220, 170, 0.08)";
    ctx.lineWidth = 18;
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = run && run.wild ? "rgba(255, 176, 110, 0.85)" : "rgba(92, 70, 130, 0.95)";
    ctx.lineWidth = 8;
    ctx.setLineDash(run && run.wild ? [6, 8] : []);
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    const glowAlpha = hot === "perfect" ? 1 : hot === "good" ? 0.92 : 0.75;
    drawArc(cx, cy, r, center, half, 18, "rgba(255, 193, 77, 0.16)", 1);
    drawArc(cx, cy, r, center, half, 7, "#d8882a", glowAlpha);
    drawArc(cx, cy, r, center, perfectHalf, 12, "#fff4cc", 1);
    drawArc(cx, cy, r, center, Math.max(0.05, perfectHalf * 0.42), 4, "#ffffff", 1);
    for (const end of [center - half, center + half]) {
      ctx.fillStyle = "#ffd98a";
      ctx.beginPath();
      ctx.arc(cx + Math.cos(end) * r, cy + Math.sin(end) * r, 3.2, 0, TAU);
      ctx.fill();
    }
    const coreX = cx + Math.cos(center) * r;
    const coreY = cy + Math.sin(center) * r;
    ctx.fillStyle = hot === "perfect" ? "#ffffff" : "#fff6d8";
    ctx.beginPath();
    ctx.arc(coreX, coreY, hot === "perfect" ? 7.5 : 5.5, 0, TAU);
    ctx.fill();

    drawPlanet(cx, cy, Math.min(r * 0.3, 54), hue);

    if (!reduced()) {
      const lookTrail = look;
      ctx.fillStyle = lookTrail.glow;
      trailPts.forEach((p, i) => {
        ctx.globalAlpha = (i / trailPts.length) * 0.45;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, TAU);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    let mx;
    let my;
    if (fly) {
      const tangentX = -Math.sin(fly.angle);
      const tangentY = Math.cos(fly.angle);
      const dist = fly.age * 220;
      mx = cx + Math.cos(fly.angle) * r + tangentX * dist;
      my = cy + Math.sin(fly.angle) * r + tangentY * dist;
    } else if (playing && run.phase === "playing") {
      const angle = viewAngle(run);
      mx = cx + Math.cos(angle) * r;
      my = cy + Math.sin(angle) * r;
    } else if (mode === "over" && run) {
      const angle = viewAngle(run);
      mx = cx + Math.cos(angle) * r;
      my = cy + Math.sin(angle) * r;
    } else {
      mx = cx + Math.cos(demoAngle) * r;
      my = cy + Math.sin(demoAngle) * r;
    }
    drawMoon(mx, my, Math.max(7, r * 0.075), look);

    if (!reduced()) {
      for (const spark of sparks) {
        const k = 1 - spark.age / spark.life;
        ctx.globalAlpha = Math.max(0, k);
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x + spark.vx * spark.age, spark.y + spark.vy * spark.age, 2.4 * k, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.font = "700 20px Palatino, Georgia, serif";
      ctx.textAlign = "center";
      for (const floater of floaters) {
        ctx.globalAlpha = 1 - floater.age / 0.7;
        ctx.fillStyle = floater.perfect ? "#fff6d4" : "#ffc14d";
        ctx.fillText(floater.text, cx, cy + r * 0.55 - floater.age * 28);
      }
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

window.__perigee = {
  get mode() { return mode; },
  get run() { return run ? { ...run, zone: run.phase === "playing" ? zone(run) : run.phase } : null; },
  get save() { return { ...save }; },
  get helpOpen() { return helpOpen; },
  get overShown() { return overShown; },
  reduced,
};

requestAnimationFrame(frame);
