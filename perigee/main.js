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
  TUNING,
  COURSE,
  coreProgress,
  goalStars,
  medalFor,
  orbitsUntilEcho,
  missionPulse,
  missionsFor,
  missText,
  multiplierFor,
  rankFor,
  absoluteShareUrl,
  adaptQuality,
  challengeVerdict,
  decodeNight,
  encodeNight,
  nightNumber,
  resultGlyph,
  shareCard,
  shareLines,
  weekSlots,
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
const echoEl = document.querySelector("#echo-when");
let missionFlash = null;
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
const GOLD = { arc: "#ffc14d", core: "#fff6d8", wash: "rgba(255,193,77,0.22)", ghost: "#d7e7f6" };
const KIND_INK = { steady: GOLD, wild: GOLD, echo: GOLD, veil: GOLD, rift: GOLD, relic: GOLD };
const THEME_HUE = { dusk: 28, harbor: 198, ember: 22, aurora: 162, ink: 230 };

let today = localDateString();
let save = loadSave(localStorage, today);
let mode = "title";
let orbit = { cx: 195, cy: 220, r: 100 };
let challenge = decodeNight(location.hash);
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
let hitPause = 0;
let overAt = 0;
let moonSquash = 1;
let collapse = null;
let floats = [];
let shooter = null;
let revealQueue = [];
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
  statsEl.textContent = `${rankFor(save)} · ${moon ? moon.name : "Cinder"} · best ${format(save.best)}`;
  quietBtn.hidden = !save.quietUnlocked;
  renderWeek();
  renderChallenge();
  renderShelf();
}

function renderWeek() {
  const sky = document.querySelector("#week-sky");
  const slots = weekSlots(save.nights, today);
  sky.replaceChildren();
  for (const slot of slots) {
    const star = document.createElement("i");
    star.className = slot.empty ? "empty" : (slot.medal || "none");
    star.title = slot.empty ? slot.date : `${slot.date} · ${slot.medal}`;
    star.setAttribute("aria-label", slot.empty ? `${slot.date} open` : `${slot.date} ${slot.medal}`);
    sky.append(star);
  }
}

function renderChallenge() {
  const card = document.querySelector("#challenge");
  if (!challenge) {
    card.hidden = true;
    document.body.dataset.challenge = "0";
    return;
  }
  card.hidden = false;
  document.body.dataset.challenge = "1";
  document.querySelector("#challenge-k").textContent = `Night ${nightNumber(challenge.date)}`;
  document.querySelector("#challenge-goal").textContent = `${challenge.goal} · beat ${format(challenge.score)}`;
  document.querySelector("#challenge-row").textContent = shareLines(challenge.history).join("\n");
}

function paintPreview(canvas, id, look) {
  const g = canvas.getContext("2d");
  const w = canvas.width;
  const r = w * 0.28;
  g.clearRect(0, 0, w, w);
  g.save();
  g.translate(w / 2, w / 2);
  const body = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  body.addColorStop(0, "#fffef8");
  body.addColorStop(0.42, look.core || "#fff");
  body.addColorStop(1, look.shade || look.glow || "#333");
  g.fillStyle = body;
  if (id === "tide") {
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.fill();
    g.globalCompositeOperation = "destination-out";
    g.beginPath();
    g.arc(r * 0.42, -r * 0.05, r * 0.7, 0, TAU);
    g.fill();
  } else if (id === "crown") {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * TAU;
      const rad = i % 2 === 0 ? r * 1.25 : r * 0.55;
      g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    g.closePath();
    g.fill();
  } else if (id === "hollow" || id === "glass") {
    g.strokeStyle = look.core;
    g.lineWidth = id === "hollow" ? 2 : 4;
    g.beginPath();
    g.arc(0, 0, r * 0.72, 0, TAU);
    g.stroke();
  } else if (id === "lyre") {
    g.strokeStyle = look.core;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(0, r * 0.1, r * 0.72, Math.PI * 0.15, Math.PI * 0.85, true);
    g.stroke();
    g.beginPath();
    g.moveTo(-r * 0.2, -r * 0.2);
    g.lineTo(r * 0.2, -r * 0.55);
    g.lineTo(r * 0.55, -r * 0.05);
    g.stroke();
  } else if (id === "solstice") {
    g.beginPath();
    g.arc(0, 0, r * 0.55, 0, TAU);
    g.fill();
    g.strokeStyle = look.glow;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.stroke();
  } else if (id === "comet") {
    g.beginPath();
    g.ellipse(0, 0, r * 0.7, r, 0.6, 0, TAU);
    g.fill();
  } else {
    g.beginPath();
    g.ellipse(0, 0, id === "iris" ? r * 0.75 : r, r, 0, 0, TAU);
    g.fill();
  }
  g.restore();
}

function paintTrailPreview(canvas, id, look) {
  const g = canvas.getContext("2d");
  const w = canvas.width;
  g.clearRect(0, 0, w, w);
  g.strokeStyle = look.glow || look.core;
  g.fillStyle = look.core || "#fff";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(w * 0.18, w * 0.72);
  g.quadraticCurveTo(w * 0.4, w * 0.2, w * 0.82, w * 0.38);
  if (id === "comet" || id === "ion") g.stroke();
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const x = w * (0.18 + t * 0.64);
    const y = w * (0.72 + t * (0.38 - 0.72) + Math.sin(t * Math.PI) * -0.22);
    g.globalAlpha = 0.45 + t * 0.55;
    g.beginPath();
    if (id === "brass") g.fillRect(x - 1.5, y - 6, 3, 12);
    else if (id === "halo") g.arc(w / 2 + Math.cos(i) * w * 0.22, w / 2 + Math.sin(i) * w * 0.22, 3.5, 0, TAU);
    else g.arc(x, y, id === "pearl" ? 5 : 3.2, 0, TAU);
    if (id !== "brass") g.fill();
  }
}

function paintSkyPreview(canvas, look) {
  const g = canvas.getContext("2d");
  const w = canvas.width;
  g.clearRect(0, 0, w, w);
  const sky = g.createLinearGradient(0, 0, 0, w);
  sky.addColorStop(0, look.sky0 || "#4a2c72");
  sky.addColorStop(0.55, look.sky1 || look.sky0 || "#1a102c");
  sky.addColorStop(1, look.sky2 || "#09060f");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, w);
  g.fillStyle = look.star || "#fff4e4";
  const stars = [[0.18, 0.22, 1.3], [0.72, 0.16, 0.8], [0.42, 0.34, 1.1], [0.84, 0.4, 0.7], [0.28, 0.48, 0.8], [0.6, 0.28, 1.4]];
  for (const [x, y, rad] of stars) {
    g.globalAlpha = 0.75;
    g.beginPath();
    g.arc(x * w, y * w, rad, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
  g.fillStyle = look.brass || "#e7c27a";
  g.beginPath();
  g.arc(w * 0.5, w * 0.7, w * 0.1, 0, TAU);
  g.fill();
  g.strokeStyle = look.ring || look.brass || "#e7c27a";
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(w * 0.5, w * 0.7, w * 0.2, 0, TAU);
  g.stroke();
}

function swatch(list, items, equipped, owned, onPick, kind = "moon") {
  list.replaceChildren();
  for (const item of items) {
    const open = owned(item.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.setAttribute("aria-pressed", equipped === item.id ? "true" : "false");
    btn.setAttribute("aria-disabled", open ? "false" : "true");
    const look = item.look;
    const dot = document.createElement("canvas");
    dot.className = "dot";
    dot.width = 64;
    dot.height = 64;
    if (kind === "trail") paintTrailPreview(dot, item.id, look);
    else if (kind === "sky") paintSkyPreview(dot, look);
    else paintPreview(dot, item.id, look);
    dot.style.setProperty("--glow", look.glow || look.brass || "transparent");
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
  }, "moon");
  swatch(document.querySelector("#trail-list"), TRAILS.map((t) => ({ ...t, look: TRAIL_LOOK[t.id] })), save.trail, (id) => (save.unlocked || []).includes(id), (id) => {
    save = selectTrail(save, id);
    persist();
    renderHome();
  }, "trail");
  swatch(document.querySelector("#theme-list"), THEMES.map((t) => ({ ...t, look: THEME_LOOK[t.id] })), save.theme, (id) => (save.themes || []).includes(id), (id) => {
    save = selectTheme(save, id);
    persist();
    applySettings();
    renderHome();
  }, "sky");
  renderMastery();
  renderCalendar();
}

function renderMastery() {
  const box = document.querySelector("#mastery-bars");
  const mastery = save.mastery || {};
  const max = Math.max(8, ...Object.values(mastery));
  box.replaceChildren();
  for (const key of ["steady", "wild", "echo", "veil", "rift", "relic"]) {
    const row = document.createElement("div");
    row.className = "bar";
    const name = document.createElement("span");
    name.textContent = key;
    const track = document.createElement("i");
    const fill = document.createElement("b");
    fill.style.width = `${Math.round(((mastery[key] || 0) / max) * 100)}%`;
    track.append(fill);
    const count = document.createElement("em");
    count.textContent = String(mastery[key] || 0);
    row.append(name, track, count);
    box.append(row);
  }
}

function renderCalendar() {
  const box = document.querySelector("#night-calendar");
  const nights = save.nights || [];
  box.replaceChildren();
  if (!nights.length) {
    box.textContent = "Clear a Tonight to pin the first star.";
    return;
  }
  for (const night of nights.slice(-21)) {
    const cell = document.createElement("i");
    cell.className = night.medal || "none";
    cell.title = `${night.date} · ${night.medal}`;
    cell.setAttribute("aria-label", `${night.date} ${night.medal}`);
    cell.textContent = { flawless: "✦", gold: "★", silver: "✶", bronze: "·", none: "·" }[night.medal] || "·";
    box.append(cell);
  }
}

function syncChrome() {
  const playing = mode === "play" || (mode === "over" && !overShown);
  const over = mode === "over" && overShown;
  titleHead.hidden = mode !== "title";
  titleDock.hidden = mode !== "title";
  playHead.hidden = mode === "title";
  playDock.hidden = !playing;
  overDock.hidden = !over;
  document.body.dataset.screen = over ? "over" : mode;
  measureOrbit();
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
  const replay = kind === "challenge"
    ? challenge || (run?.challengeDate ? {
      date: run.challengeDate,
      score: run.mark,
      goal: run.goalLabel,
      history: run.theirHistory,
    } : null)
    : null;
  if (replay) {
    const goal = missionsFor(replay.date).nightly;
    run = createRun(dailySeed(replay.date) || 1, "challenge", goal.id);
    run.mark = replay.score;
    run.nightNumber = nightNumber(replay.date);
    run.challengeDate = replay.date;
    run.goalLabel = replay.goal || goal.label;
    run.theirHistory = replay.history || [];
  } else {
    leaveChallenge();
    const seed = kind === "daily" ? (dailySeed(today) || 1) : (crypto.getRandomValues(new Uint32Array(1))[0] || 1);
    const goal = kind === "daily" ? missionsFor(today, save).nightly.id : null;
    run = createRun(seed, kind, goal);
  }
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
  const challenging = run.mode === "challenge";
  const verdict = challenging ? challengeVerdict(run.score || 0, run.mark || 0) : null;
  reasonEl.textContent = !verdict
    ? missText(event)
    : verdict.delta > 0
      ? `Beat it by ${format(verdict.delta)}`
      : verdict.delta < 0
        ? `${format(-verdict.delta)} short`
        : "Matched";
  nearEl.hidden = true;
  const lostPot = run.potLost || 0;
  if (challenging) metaEl.textContent = `Night ${run.nightNumber} · ${format(run.mark || 0)} to beat`;
  else if (run.overReason === "clear") metaEl.textContent = `Tonight ${COURSE}/${COURSE} · best ${format(run.score)}`;
  else metaEl.textContent = lostPot ? `Banked ${format(run.score)} · lost ${format(lostPot)}` : `Banked ${format(run.score)}`;
  finalEl.textContent = format(run.score);
  const record = run.mode === "quiet" ? save.bestQuiet : run.mode === "daily" ? save.bestNight : save.bestFree;
  const bestLine = settled.isBest ? "New best" : `Best ${format(record || save.best)}`;
  const streak = activeStreak(save, today);
  const lost = run.potLost ? ` · lost ${format(run.potLost)} unbanked` : "";
  detailEl.textContent = `${run.flings} flings · ${run.perfects} perfect · ${run.cashes || 0} cashed · ${bestLine}${run.mode === "daily" && streak ? ` · streak ${streak}` : ""}${lost}`;
  scoreEl.textContent = format(run.score);
  lastScore = run.score;
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
  const goal = challenging ? run.goalId : missionsFor(today, save).nightly.id;
  const stars = goalStars(run, goal);
  const medal = medalFor(run, goal);
  const medalEl = document.querySelector("#medal");
  const shareBtn = document.querySelector("#btn-share");
  const shareRow = document.querySelector("#share-row");
  const theirs = document.querySelector("#share-theirs");
  const yoursLabel = document.querySelector("#share-yours-label");
  const theirsLabel = document.querySelector("#share-theirs-label");
  if (medal) {
    medalEl.hidden = false;
    const shown = medal === "flawless" ? 3 : stars;
    medalEl.textContent = `${medal} · ${"★".repeat(shown)}${"☆".repeat(Math.max(0, 3 - shown))}`;
  } else medalEl.hidden = true;
  if (challenging || medal) {
    shareRow.hidden = false;
    shareRow.textContent = shareLines(run.history).join("\n");
    shareBtn.hidden = false;
  } else {
    shareRow.hidden = true;
    shareBtn.hidden = true;
  }
  if (challenging) {
    yoursLabel.hidden = false;
    theirsLabel.hidden = false;
    theirs.hidden = false;
    theirs.textContent = shareLines(run.theirHistory || []).join("\n");
    leaveChallenge();
  } else {
    yoursLabel.hidden = true;
    theirsLabel.hidden = true;
    theirs.hidden = true;
  }
  say(`${reasonEl.textContent}. Score ${format(run.score)}.`);
  queueReveal(settled.fresh);
  renderHome();
  syncChrome();
}

function leaveChallenge() {
  challenge = null;
  if (String(location.hash || "").startsWith("#night")) {
    history.replaceState(null, "", location.pathname + location.search);
  }
}

function clearFx() {
  sparks = [];
  ripples = [];
  trailPts = [];
  floats = [];
  collapse = null;
  shooter = null;
}

function queueReveal(fresh) {
  revealQueue = [
    ...names(fresh.moons || [], MOONS).map((name, i) => ({ kind: "moon", id: fresh.moons[i], name })),
    ...names(fresh.trails || [], TRAILS).map((name, i) => ({ kind: "trail", id: fresh.trails[i], name })),
    ...names(fresh.themes || [], THEMES).map((name, i) => ({ kind: "sky", id: fresh.themes[i], name })),
  ];
  if (fresh.quiet) revealQueue.push({ kind: "mode", id: "quiet", name: "Quiet hour" });
  showReveal();
}

function showReveal() {
  const card = document.querySelector("#reveal");
  const item = revealQueue[0];
  if (!item) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  document.querySelector("#reveal-name").textContent = item.name;
  const sw = document.querySelector("#reveal-swatch");
  const look = item.kind === "moon" ? MOON_LOOK[item.id] : item.kind === "trail" ? TRAIL_LOOK[item.id] : THEME_LOOK[item.id] || MOON_LOOK.cinder;
  sw.replaceChildren();
  const canvas = document.createElement("canvas");
  canvas.width = 72;
  canvas.height = 72;
  if (item.kind === "trail") paintTrailPreview(canvas, item.id, look);
  else if (item.kind === "sky") paintSkyPreview(canvas, look);
  else paintPreview(canvas, item.id, look || MOON_LOOK.cinder);
  sw.append(canvas);
  sw.style.background = "transparent";
  document.querySelector("#reveal-hint").textContent = item.kind === "mode" ? "The arc stays open until the hour closes." : "Yours now.";
}

function revealOver() {
  if (overShown) return;
  overShown = true;
  overAt = performance.now();
  clearFx();
  callout.textContent = "";
  callout.classList.remove("show");
  callout.style.opacity = "0";
  syncChrome();
}

function milestoneName(combo) {
  if (combo >= 20) return "Nova";
  if (combo >= 12) return "Flare";
  if (combo >= 6) return "Corona";
  return "Kindled";
}

function nightGlyph(entry) {
  return resultGlyph(entry);
}

function onPress() {
  audio.unlock();
  if (helpOpen || shelfOpen) return;
  if (mode !== "play" || !run || run.phase !== "playing" || hold) return;
  const oldHalf = run.arcHalf;
  const oldGeo = wrapAngle(run.startTheta + (run.dir || 1) * (run.entryP + run.arcHalf));
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
  if (event.type === "miss" || event.type === "hour" || run.phase === "over") {
    if (event.type === "miss") showCallout(missText(event));
    else if (run.overReason === "clear") showCallout("Clear");
    finish({ ...event, reason: run.overReason || event.reason });
    return;
  }
  const perfect = event.type === "perfect";
  const word = event.relicHit ? "Relic" : event.milestone ? milestoneName(run.combo) : perfect ? "Perigee" : event.type === "cash" ? "Banked" : "Fling";
  showCallout(word);
  const milestoneInk = { Kindled: "#ffb067", Corona: "#ffe7a3", Flare: "#ff7a45", Nova: "#fff4c8" };
  callout.style.color = event.milestone ? (milestoneInk[word] || "#fff6df") : "";
  audio.play(event.relicHit ? "relic" : event.milestone ? "milestone" : perfect ? "perfect" : event.type === "cash" ? "cash" : "good", run.combo);
  audio.setChain(run.combo);
  buzz(perfect ? (event.milestone ? [8, 24, 12] : 10) : 5);
  if (event.milestone || event.relicHit) flare(event.relicHit ? "relic" : "milestone");
  const color = (TRAIL_LOOK[save.trail] || TRAIL_LOOK.ember).glow;
  burst(lastMoon.x, lastMoon.y, event.relicHit ? "#ffe7a3" : color, event.milestone ? 28 : perfect ? 18 : 10, event.milestone ? 160 : 110);
  ripple(lastMoon.x, lastMoon.y, "#fff6d4");
  const pop = clampPop(lastMoon.x, lastMoon.y);
  floats.push({ text: `+${format(event.scoreGain)}${event.mult > 1 ? ` ×${event.mult}` : ""}`, x: pop.x, y: pop.y, age: 0 });
  if (perfect) {
    hitPause = reduced() ? 0.02 : 0.05;
    moonSquash = 1.35;
    collapse = { half: oldHalf, age: 0, life: 0.16, geo: oldGeo };
  }
  if (word === "Nova") novaSweep = 1;
  if (event.milestone && !reduced()) shake = 5;
  ackMissions(run);
  scoreEl.classList.remove("bump");
  void scoreEl.offsetWidth;
  scoreEl.classList.add("bump");
  wasHot = false;
  say(`${word}. Score ${format(run.score)}.`);
  paintHud();
}

function ackMissions(current) {
  const hits = missionPulse(save, current, today);
  if (!hits.length) return;
  const prev = save.daily && save.daily.date === today ? save.daily : { date: today, best: 0, cleared: false, runsToday: 0, done: {}, stars: 0 };
  const done = { ...(prev.done || {}) };
  for (const hit of hits) done[hit.id] = true;
  const nightly = hits.some((hit) => hit.id === "nightly");
  save = {
    ...save,
    daily: {
      ...prev,
      done,
      cleared: prev.cleared || nightly,
      stars: Math.max(prev.stars || 0, goalStars(current, missionsFor(today, save).nightly.id)),
    },
  };
  persist();
  missionFlash = { text: `✓ Done · ${hits[0].label}`, until: performance.now() + 1000 };
  audio.play("milestone");
}

function paintHud() {
  if (!run) return;
  if (run.score !== lastScore) {
    scoreEl.textContent = format(run.score);
    lastScore = run.score;
  }
  const tag = run.mode === "challenge"
    ? `Night ${run.nightNumber || 1}`
    : run.mode === "daily" ? `Tonight ${Math.min(run.flings, COURSE)}/${COURSE}` : run.mode === "quiet" ? "Quiet" : "Free";
  const mult = multiplierFor(run.combo);
  const chase = run.mode === "free" && save.bestFlings > run.flings ? `${save.bestFlings - run.flings} to best` : "";
  metaEl.textContent = `${tag} · ${format(run.banked || 0)} banked · ${format(run.pot || 0)} risk`;
  if (run.kind !== lastKind) {
    lastKind = run.kind;
    if (run.kind === "rift") audio.play("rift");
    if (run.kind === "wild") audio.play("wild");
  }
  ledger.dataset.kind = run.kind;
  kindEl.textContent = `${KIND_COPY[run.kind].name}${run.relic && run.kind !== "relic" ? " · relic" : ""}`;
  coachEl.textContent = coachLine();
  chainEl.textContent = `x${mult} · ${run.combo} chain${run.relicsBanked ? ` · ${run.relicsBanked} relic` : ""}${chase ? ` · ${chase}` : ""}`;
  const away = orbitsUntilEcho(run.seed, run.flings, run.goalId);
  echoEl.textContent = run.kind === "echo" ? "Echo now" : `echo in ${away}`;
  const flashing = missionFlash && performance.now() < missionFlash.until;
  missionEl.textContent = flashing ? missionFlash.text : missionLine(save, today, run.mode);
  missionEl.classList.toggle("done", !!flashing);
}

function coachLine() {
  if (!run || run.phase !== "playing") return "";
  const z = zone(run);
  if (z === "echo") {
    const mult = multiplierFor(run.combo);
    return `bank ${format(run.pot || 0)} · ×${mult} → ×1`;
  }
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
      size: 3.2 + Math.random() * 4.4,
    });
  }
}

function ripple(x, y, color) {
  if (reduced() || ripples.length > 4) return;
  ripples.push({ x, y, age: 0, life: 0.48, color });
}

document.querySelector("#btn-play").addEventListener("click", () => start("free"));
document.querySelector("#btn-challenge").addEventListener("click", () => start("challenge"));
document.querySelector("#btn-daily").addEventListener("click", () => start("daily"));
quietBtn.addEventListener("click", () => start("quiet"));
document.querySelector("#btn-again").addEventListener("click", () => start(run && run.mode ? run.mode : "free"));
document.querySelector("#btn-home").addEventListener("click", () => {
  mode = "title";
  run = null;
  fly = null;
  overShown = false;
  clearFx();
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
document.querySelector("#btn-share").addEventListener("click", async () => {
  const fromChallenge = run?.mode === "challenge";
  const date = fromChallenge ? run.challengeDate : today;
  const night = {
    date,
    number: nightNumber(date),
    goal: fromChallenge ? (run.goalLabel || missionsFor(date).nightly.label) : missionsFor(today, save).nightly.label,
    score: run?.score || 0,
    medal: (document.querySelector("#medal").textContent || "").split("·")[0].trim() || "bronze",
    history: run?.history || [],
  };
  const href = absoluteShareUrl(encodeNight(night), location.href);
  const text = shareCard(night);
  const copied = shareCard(night, href);
  window.__perigee.lastShare = { href, text, date };
  try {
    if (navigator.share) await navigator.share({ text, url: href });
    else if (navigator.clipboard) await navigator.clipboard.writeText(copied);
  } catch {}
});
document.querySelector("#btn-wear").addEventListener("click", () => {
  const item = revealQueue[0];
  if (item?.kind === "moon") save = selectMoon(save, item.id);
  if (item?.kind === "trail") save = selectTrail(save, item.id);
  if (item?.kind === "sky") save = selectTheme(save, item.id);
  persist();
  applySettings();
  revealQueue.shift();
  showReveal();
  renderHome();
});
document.querySelector("#btn-reveal-close").addEventListener("click", () => {
  revealQueue.shift();
  showReveal();
});
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
  if (helpOpen || shelfOpen || !document.querySelector("#reveal").hidden) return;
  if (mode === "over" && overShown && performance.now() - overAt > 600) {
    event.preventDefault();
    start(run && run.mode ? run.mode : "free");
    return;
  }
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
let quality = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
const frameBudget = [];
let turnPulse = 0;
let novaSweep = 0;

function clampPop(x, y) {
  const width = window.innerWidth || 390;
  const height = window.innerHeight || 844;
  return {
    x: Math.max(36, Math.min(width - 36, x)),
    y: Math.max(48, Math.min(height * 0.62, y)),
  };
}
function resize() {
  const dpr = quality;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w === sizedW && h === sizedH && dpr === sizedDpr) return;
  sizedW = w;
  sizedH = h;
  sizedDpr = dpr;
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  skyCache = null;
  ringCache.key = "";
  measureOrbit();
}

let qualityState = { quality, nextProbeAt: 0, cleanWindows: 0, steppedUp: false, backoff: 0 };
function noteFrame(ms) {
  if (!(ms > 0) || ms > 250) return;
  frameBudget.push(ms > 20 ? 1 : 0);
  if (frameBudget.length < 40) return;
  const slow = frameBudget.reduce((sum, value) => sum + value, 0) / frameBudget.length;
  frameBudget.length = 0;
  const device = window.devicePixelRatio || 1;
  const next = adaptQuality({ ...qualityState, quality }, slow, performance.now(), device);
  qualityState = next;
  if (next.changed) {
    quality = next.quality;
    sizedDpr = -1;
    resize();
  }
}

function measureOrbit() {
  const w = window.innerWidth || 390;
  const h = window.innerHeight || 844;
  const score = Math.min(58, Math.max(40, w * 0.11));
  const headerBottom = 10 + score * 0.88 + 22;
  const dockHeight = h <= 720 ? 176 : 184;
  const dockTop = h - dockHeight;
  const gap = 10;
  const moonPad = 16;
  const room = Math.max(48, dockTop - headerBottom - gap * 2 - moonPad);
  const cap = h <= 720 ? 118 : 214;
  const r = Math.max(60, Math.min(w * 0.34, room / 2, cap));
  orbit = { cx: w / 2, cy: headerBottom + gap + moonPad + r, r };
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
  const drift = reduced() ? 0 : Math.sin(performance.now() / 6000) * 8;
  ctx.fillStyle = look.star;
  for (const star of stars) {
    const tw = reduced() ? star.a : star.a * (0.65 + 0.35 * Math.sin(performance.now() / 700 + star.x * 12));
    ctx.globalAlpha = tw;
    ctx.fillRect(star.x * w + drift * star.a, star.y * h, star.r, star.r);
  }
  if (shooter && !reduced()) {
    ctx.globalAlpha = Math.max(0, 1 - shooter.age / 0.7);
    ctx.strokeStyle = look.star;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shooter.x, shooter.y);
    ctx.lineTo(shooter.x - shooter.vx * 0.08, shooter.y - shooter.vy * 0.08);
    ctx.stroke();
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

const tideScratch = document.createElement("canvas");

function drawMoon(x, y, radius, look, time, id) {
  const sx = moonSquash;
  const sy = 1 / Math.max(0.7, moonSquash);
  const glow = look.rainbow ? `hsl(${(time / 18) % 360} 80% 70%)` : look.glow;
  if (!reduced()) {
    const halo = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius * 3.2);
    halo.addColorStop(0, glow);
    halo.addColorStop(0.45, glow);
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.fillStyle = halo;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(x, y, radius * 3.2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  const body = ctx.createRadialGradient(-radius * 0.38, -radius * 0.42, radius * 0.12, 0, 0, radius);
  body.addColorStop(0, "#fffef8");
  body.addColorStop(0.28, look.core);
  body.addColorStop(0.72, look.shade || "#8a5a3a");
  body.addColorStop(1, "#3a2218");
  ctx.fillStyle = body;
  if (id === "glass" || id === "hollow") {
    ctx.strokeStyle = look.core;
    ctx.lineWidth = id === "hollow" ? 2 : 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.72, 0, TAU);
    ctx.stroke();
  } else if (id === "tide") {
    const scratch = paintTide(radius, body);
    const css = radius * 2 + 8;
    ctx.drawImage(scratch, -css / 2, -css / 2, css, css);
  } else if (id === "crown") {
    ctx.fillStyle = look.glow;
    starShape(0, 0, radius * 1.35);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.72, 0, TAU);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * (id === "iris" ? 0.78 : 1), radius, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  if (id === "tide") return;
  ctx.fillStyle = "rgba(40, 24, 48, 0.22)";
  ctx.beginPath();
  ctx.arc(x + radius * 0.28, y + radius * 0.08, radius * 0.32, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(x - radius * 0.32, y - radius * 0.34, radius * 0.16, 0, TAU);
  ctx.fill();
}

function paintTide(radius, body) {
  const q = Math.max(1, quality || 1);
  const css = Math.ceil(radius * 2 + 8);
  const size = Math.max(1, Math.ceil(css * q));
  if (tideScratch.width !== size) {
    tideScratch.width = size;
    tideScratch.height = size;
  }
  const g = tideScratch.getContext("2d");
  g.setTransform(q, 0, 0, q, size / 2, size / 2);
  g.clearRect(-css, -css, css * 2, css * 2);
  g.save();
  g.fillStyle = body;
  g.beginPath();
  g.arc(0, 0, radius, 0, TAU);
  g.fill();
  g.globalCompositeOperation = "destination-out";
  g.beginPath();
  g.arc(radius * 0.45, -radius * 0.1, radius * 0.72, 0, TAU);
  g.fill();
  g.restore();
  return tideScratch;
}

const ringCache = { key: "", canvas: null };

function drawRing(cx, cy, r, look) {
  const q = Math.max(1, quality || 1);
  const key = `${Math.round(r * q)}|${q}|${look.ring}|${look.brass}`;
  const pad = 18;
  const cssSize = r * 2 + pad * 2;
  if (ringCache.key !== key) {
    const size = Math.max(1, Math.ceil(cssSize * q));
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const g = canvas.getContext("2d");
    g.setTransform(q, 0, 0, q, size / 2, size / 2);
    g.strokeStyle = look.ring;
    g.globalAlpha = 0.9;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.stroke();
    g.globalAlpha = 0.45;
    g.lineWidth = 10;
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.stroke();
    g.globalAlpha = 0.55;
    g.strokeStyle = look.brass;
    g.lineWidth = 1.4;
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU;
      const inner = i % 6 === 0 ? r - 12 : r - 7;
      g.beginPath();
      g.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      g.lineTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2));
      g.stroke();
    }
    ringCache.key = key;
    ringCache.canvas = canvas;
  }
  const canvas = ringCache.canvas;
  ctx.drawImage(canvas, cx - r - pad, cy - r - pad, cssSize, cssSize);
}

function drawCourseStars(cx, cy, r, history) {
  const shown = history || [];
  if (!shown.length) return;
  const pts = shown.map((entry, i) => {
    const a = Math.PI + (i / Math.max(1, shown.length - 1)) * Math.PI;
    const rad = r * 0.7;
    return { x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad * 0.82, entry };
  });
  ctx.save();
  ctx.strokeStyle = "rgba(255, 232, 186, 0.45)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  pts.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
  ctx.stroke();
  for (const point of pts) {
    const perfect = point.entry && point.entry.result === "perfect";
    const cash = point.entry && point.entry.result === "cash";
    ctx.fillStyle = perfect ? "#fff6d0" : cash ? "#d7e6f5" : "#e7b56a";
    ctx.globalAlpha = perfect ? 1 : 0.8;
    ctx.beginPath();
    ctx.arc(point.x, point.y, perfect ? 3.4 : 2.2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawScene(w, h, time) {
  drawSky(w, h);
  ctx.save();
  if (shake > 0.25) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  const geom = orbit;
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
  let bead = center;
  if (playing) {
    const dir = run.dir || 1;
    center = wrapAngle(run.startTheta + dir * (run.entryP + run.arcHalf));
    bead = wrapAngle(run.startTheta + dir * coreProgress(run));
    half = run.arcHalf;
    perfectHalf = run.perfectHalf;
    ink = GOLD;
    showEcho = !!run.echo;
    relic = run.kind === "relic";
    lit = true;
    rift = !!run.rift;
    wild = !!run.wild;
    if (fly) {
      const tx = -Math.sin(fly.angle);
      const ty = Math.cos(fly.angle);
      const dist = Math.min(52, fly.age * 140);
      lastMoon.x = cx + Math.cos(fly.angle) * r + tx * dist;
      lastMoon.y = cy + Math.sin(fly.angle) * r + ty * dist;
      moonAngle = fly.angle;
    } else {
      moonAngle = viewAngle(run);
      lastMoon.x = cx + Math.cos(moonAngle) * r;
      lastMoon.y = cy + Math.sin(moonAngle) * r;
    }
    if (showEcho && run.echo) {
      echo = { center: wrapAngle(run.startTheta + (run.dir || 1) * run.echo.center), half: run.echo.half };
    }
  } else {
    lastMoon.x = cx + Math.cos(moonAngle) * r;
    lastMoon.y = cy + Math.sin(moonAngle) * r;
  }

  const cleared = playing && run.overReason === "clear";
  if (novaSweep > 0 && !reduced()) {
    const head = (1 - novaSweep) * TAU - Math.PI / 2;
    ctx.save();
    ctx.strokeStyle = "#fff6d4";
    ctx.globalAlpha = novaSweep * 0.28;
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, head - 0.8, head);
    ctx.stroke();
    ctx.restore();
  }
  if (showEcho && !cleared) {
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
  const veilDim = playing && run.kind === "veil" && run.progress < run.entryP - 0.12;
  const arcAlpha = veilDim ? 0.4 : hot === "perfect" ? 1 : 0.94;
  const open = playing ? Math.max(0.2, (run.arcHalf - TUNING.minArc) / Math.max(0.04, TUNING.startArc - TUNING.minArc)) : 0.85;
  const halo = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r + 28 * open);
  halo.addColorStop(0, "rgba(0,0,0,0)");
  halo.addColorStop(0.72, `rgba(255, 193, 77, ${0.04 + open * 0.14})`);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 34, 0, TAU);
  ctx.fill();
  if (collapse && !reduced()) {
    const left = 1 - collapse.age / collapse.life;
    strokeArc(cx, cy, r, collapse.geo - collapse.half * left, collapse.geo + collapse.half * left, 5, "#ffc14d", left);
  }
  if (!cleared) {
  strokeArc(cx, cy, r, center - half, center + half, 16, GOLD.wash, 1);
  strokeArc(cx, cy, r, center - half, center + half, wild ? 8 : 6, "#ffc14d", arcAlpha, wild || veilDim ? [9, 7] : null);
  if (lit) {
    strokeArc(cx, cy, r, bead - perfectHalf, bead + perfectHalf, 14, "rgba(255,255,255,0.35)", veilDim ? 0.25 : 1);
    strokeArc(cx, cy, r, bead - perfectHalf, bead + perfectHalf, relic ? 8 : 11, "#fff6d8", veilDim ? 0.3 : 1);
    const bx = cx + Math.cos(bead) * r;
    const by = cy + Math.sin(bead) * r;
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
  if (!cleared && rift) {
    const dir = run.dir || 1;
    const entry = dir < 0 ? center + half : center - half;
    const ex = cx + Math.cos(entry) * r;
    const ey = cy + Math.sin(entry) * r;
    const tx = dir * -Math.sin(entry);
    const ty = dir * Math.cos(entry);
    const len = 22 + (turnPulse || 0) * 10;
    const wide = 9 + (turnPulse || 0) * 3;
    ctx.fillStyle = "#ffe7a8";
    ctx.beginPath();
    ctx.moveTo(ex + tx * len, ey + ty * len);
    ctx.lineTo(ex - ty * wide, ey + tx * wide);
    ctx.lineTo(ex + ty * wide, ey - tx * wide);
    ctx.closePath();
    ctx.fill();
  }
  for (const end of [center - half, center + half]) {
    ctx.fillStyle = ink.arc;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(end) * r, cy + Math.sin(end) * r, 3, 0, TAU);
    ctx.fill();
  }
  }

  const hue = (THEME_HUE[save.theme] || 28) + (playing ? Math.min(18, (run.perfects || 0) * 0.4) : 0);
  drawPlanet(cx, cy, Math.min(54, r * 0.28), hue);
  if (playing && run.overReason === "clear") drawCourseStars(cx, cy, r, run.history);

  if (!reduced()) {
    ctx.fillStyle = trail.glow;
    const prev = { x: lastMoon.x, y: lastMoon.y };
    trailPts.forEach((p, i) => {
      const k = (i + 1) / trailPts.length;
      ctx.globalAlpha = 0.25 + k * 0.55;
      ctx.fillStyle = trail.glow;
      ctx.strokeStyle = trail.glow;
      if (save.trail === "pearl") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5 + k * 2, 0, TAU);
        ctx.fill();
      } else if (save.trail === "comet") {
        ctx.lineWidth = 2 + k * 3;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else if (save.trail === "brass") {
        ctx.fillRect(p.x - 1, p.y - 4, 2, 8);
      } else if (save.trail === "aurora" || save.trail === "tideglass") {
        ctx.beginPath();
        ctx.arc(p.x, p.y + Math.sin(i + time / 200) * 5, save.trail === "tideglass" ? 2.2 : 3, 0, TAU);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 + k * multiplierFor(playing ? run.combo : 0), 0, TAU);
        ctx.fill();
      }
      prev.x = p.x;
      prev.y = p.y;
    });
    ctx.globalAlpha = 1;
  }
  ctx.save();
  if (fly) ctx.globalAlpha = Math.max(0, 1 - fly.age / 0.42);
  drawMoon(lastMoon.x, lastMoon.y, Math.max(11, r * 0.11), moonLook, time, save.moon);
  ctx.restore();

  for (const wave of ripples) {
    const k = 1 - wave.age / wave.life;
    ctx.globalAlpha = Math.max(0, k) * 0.8;
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, 10 + wave.age * 160, 0, TAU);
    ctx.stroke();
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const spark of sparks) {
    const k = 1 - spark.age / spark.life;
    ctx.globalAlpha = Math.max(0, k);
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.arc(spark.x + spark.vx * spark.age, spark.y + spark.vy * spark.age, spark.size * k, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.font = "700 18px Palatino, Georgia, serif";
  ctx.textAlign = "center";
  for (const item of floats) {
    const pop = clampPop(item.x, item.y - 18 - item.age * 36);
    ctx.globalAlpha = Math.max(0, 1 - item.age / 0.7);
    ctx.fillStyle = "#fff6d4";
    ctx.fillText(item.text, pop.x, pop.y);
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
  if (hitPause > 0) hitPause = Math.max(0, hitPause - dt);
  moonSquash += (1 - moonSquash) * Math.min(1, dt * 8);
  if (collapse) {
    collapse.age += dt;
    if (collapse.age >= collapse.life) collapse = null;
  }
  for (const item of floats) item.age += dt;
  floats = floats.filter((item) => item.age < 0.7);
  if (!reduced() && !shooter && Math.random() < dt * 0.07) {
    shooter = { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight * 0.45, vx: 420, vy: 140, age: 0 };
  }
  if (shooter) {
    shooter.x += shooter.vx * dt;
    shooter.y += shooter.vy * dt;
    shooter.age += dt;
    if (shooter.age > 0.7) shooter = null;
  }
  if (hitPause <= 0 && mode === "play" && run && run.phase === "playing" && !hold && !helpOpen && !shelfOpen) {
    const before = zone(run);
    const stepped = step(run, dt);
    run = stepped.run;
    const after = run.phase === "playing" ? zone(run) : "past";
    if ((before === "approach" || before === "echo") && (after === "good" || after === "perfect") && !wasHot) {
      wasHot = true;
      audio.play(run.kind === "veil" ? "veil" : "tick");
    }
    if (after === "approach" || after === "echo") wasHot = false;
    if (stepped.event && stepped.event.type === "turn") {
      showCallout("Turned");
      audio.play("rift");
      turnPulse = 1;
    }
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
  if (turnPulse > 0) turnPulse = Math.max(0, turnPulse - dt * 2.2);
  if (novaSweep > 0) novaSweep = Math.max(0, novaSweep - dt * 0.55);
  noteFrame((ts - (frame._prev || ts)));
  frame._prev = ts;

  resize();
  ctx.setTransform(quality, 0, 0, quality, 0, 0);
  drawScene(window.innerWidth, window.innerHeight, ts);
  requestAnimationFrame(frame);
}

window.__perigee = {
  get mode() { return mode; },
  get challenge() { return challenge; },
  get orbit() { return orbit; },
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

measureOrbit();
requestAnimationFrame(frame);
