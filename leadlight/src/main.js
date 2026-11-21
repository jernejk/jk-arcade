import { campaignLevel, CAMPAIGN_SIZE, trailLevel, dailyLevel, localDateId, isDateId } from './levels.js';
import { createGame, tap, undo, hint, cracksLeft, grade, solveFrom } from './game.js';
import { createRenderer, PIGMENT_COLOURS } from './render.js';
import { createAudio } from './audio.js';
import { loadProgress, saveProgress, recordWin, isUnlocked } from './storage.js';

const $ = (id) => document.getElementById(id);
const canvas = $('board');
const renderer = createRenderer(canvas);
const audio = createAudio();
const progress = loadProgress();
const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

let game = null;
let level = null;
let combo = 0;
let lastFly = 0;
let timers = [];
let toastTimer = 0;

const later = (fn, ms) => timers.push(setTimeout(fn, ms));

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

const calm = () => progress.calm ?? reduceMotion;
audio.setMuted(progress.muted);

function persist() {
  saveProgress(progress);
}

function show(id) {
  for (const s of ['home', 'levels', 'result']) $(s).hidden = s !== id;
  const playing = id === null || id === 'result';
  $('hud').hidden = !playing;
  $('controls').hidden = !playing;
  $('tip').hidden = id !== null || !$('tip').dataset.tip;
  syncReserve();
}

function syncReserve() {
  const tip = $('tip');
  renderer.reserve(tip.hidden ? 0 : tip.getBoundingClientRect().height + 12);
}

function toast(text, { ms = 1600, low = false } = {}) {
  const el = $('toast');
  el.textContent = text;
  el.classList.toggle('low', low);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function setStuck(on) {
  $('undo-btn').classList.toggle('glow', on);
}

function levelFor(spec) {
  if (spec.kind === 'campaign') return campaignLevel(spec.n);
  if (spec.kind === 'trail') return trailLevel(spec.n);
  return dailyLevel(spec.date);
}

function hashFor(lv) {
  if (lv.kind === 'campaign') return `#window-${lv.number}`;
  if (lv.kind === 'trail') return `#trail-${lv.number}`;
  return `#daily-${lv.date}`;
}

const TIPS = {
  intro: '<strong>Tap a pane</strong> whose arrow has a clear run to the edge of the window. It slides out. If another pane is in the way, it bumps and the frame cracks.',
  keystone: '<strong>Keystones</strong> wear a gold-leaded ring. A keystone only leaves once every pane touching it has gone, so clear around it first.',
  pair: '<strong>Leaded pairs</strong> are joined by a lead bar and leave together. Both arrows need a clear run, or the pair bumps.',
  weighted: '<strong>Weighted panes</strong> (lead band and weight) slide until they hit a pane or the rim, then lift out with a second tap. Slide one too early and it can wall others in.',
};

const SHORT_TIPS = {
  keystone: '<strong>Keystones</strong> (gold ring) leave only once nothing touches them.',
  pair: '<strong>Leaded pairs</strong> leave together, so both arrows need a clear run.',
  weighted: '<strong>Weighted panes</strong> slide until they hit something, then lift out from the rim.',
};

function tipsFor(lv) {
  if (!progress.tipSeen && lv.kind === 'campaign' && lv.number === 1) return ['intro'];
  return ['keystone', 'pair', 'weighted'].filter((rule) => !progress.seen[rule] && lv.tiles.some((t) => t[rule]));
}

function tipHtml(rules) {
  if (rules.length === 1) return TIPS[rules[0]];
  return rules.map((r) => SHORT_TIPS[r]).join(' ');
}

function start(spec) {
  clearTimers();
  level = levelFor(spec);
  game = createGame(level);
  combo = 0;
  setStuck(false);
  const tips = tipsFor(level);
  $('tip').dataset.tip = tips.join(',');
  if (tips.length) $('tip-text').innerHTML = tipHtml(tips);
  show(null);
  history.replaceState(null, '', hashFor(level));
  $('level-kicker').textContent =
    level.kind === 'campaign' ? `Window ${level.number}/${CAMPAIGN_SIZE}` : level.kind === 'trail' ? `Trail · ${level.number}` : `Today · ${prettyDate(level.date)}`;
  $('level-name').textContent = level.name;
  renderer.setLevel(level);
  updateHud();
  const current = game;
  if (tips[0] === 'intro') later(() => current === game && showHint(false), 700);
}

function restart() {
  if (!level) return;
  clearTimers();
  start(specOf(level));
  audio.tick();
}

function specOf(lv) {
  return lv.kind === 'campaign' ? { kind: 'campaign', n: lv.number } : lv.kind === 'trail' ? { kind: 'trail', n: lv.number } : { kind: 'daily', date: lv.date };
}

function prettyDate(id) {
  const d = new Date(`${id}T12:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function updateHud(hitIndex = -1) {
  const wrap = $('cracks');
  wrap.replaceChildren();
  const left = cracksLeft(game);
  for (let i = 0; i < game.maxCracks; i++) {
    const pip = document.createElement('span');
    pip.className = 'crack-pip' + (i >= left ? ' spent' : '') + (i === hitIndex ? ' hit' : '');
    wrap.append(pip);
  }
  wrap.setAttribute('aria-label', `Frame can take ${left} more crack${left === 1 ? '' : 's'}`);
  const n = game.tiles.size;
  $('panes-left').textContent = `${n} pane${n === 1 ? '' : 's'}`;
  $('undo-btn').disabled = !game.history.length || game.status !== 'playing';
}

function onTap(k) {
  if (!game || game.status !== 'playing') return;
  audio.unlock();
  const res = tap(game, k);
  if (res.type === 'none') return;
  if ($('tip').dataset.tip && res.type !== 'bump') dismissTip();
  if (res.type === 'slide') {
    combo = 0;
    const dur = renderer.slide(k, res.to, calm());
    audio.slide(dur);
    const [dq, dr] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]][res.tile.dir];
    const ahead = `${res.tile.q + dq},${res.tile.r + dr}`;
    const current = game;
    later(() => current === game && renderer.landed(res.to, res.tile.colour, game.tiles.has(ahead) ? ahead : null), dur);
    navigator.vibrate?.(14);
  } else if (res.type === 'fly') {
    const now = performance.now();
    combo = now - lastFly < 1600 ? combo + 1 : 0;
    lastFly = now;
    renderer.fly(res.tiles, calm());
    audio.chime(combo);
    if (res.tiles.length > 1) setTimeout(() => audio.chime(combo + 2), 70);
    navigator.vibrate?.(8);
  } else {
    combo = 0;
    const blocked = game.tiles.get(res.from);
    renderer.bump(res.from, blocked, res.blocker, calm());
    if (res.from !== k) renderer.nudge(k);
    if (res.reason === 'keystone') toast('Keystone: clear every pane touching it first');
    else if (res.reason === 'pair') toast('Leaded pair: its partner is blocked');
    renderer.crack(`${level.id}/crack/${game.bumps}`);
    audio.bump();
    audio.crack();
    navigator.vibrate?.([20, 40, 30]);
  }
  updateHud(res.type === 'bump' ? cracksLeft(game) : -1);
  if (game.status === 'won') finishWin();
  else if (game.status === 'lost') finishLoss();
  else if (res.type !== 'bump') checkStuck();
}

function checkStuck() {
  if (!game.weighted) return;
  const status = solveFrom(game, { ms: 150 }).status;
  setStuck(status !== 'solved');
  if (status === 'stuck') toast('Walled in: this window can’t be cleared from here. Undo (U) to step back.', { ms: 3200 });
  else if (status === 'unknown') toast('I can’t find a way out from here. Undo (U) may help.', { ms: 3200 });
}

function finishWin() {
  const g = grade(game);
  recordWin(progress, level, g, CAMPAIGN_SIZE);
  persist();
  const current = game;
  later(() => {
    renderer.win(calm());
    audio.win();
  }, calm() ? 200 : 650);
  later(() => showResult(current, true, g), calm() ? 900 : 2300);
}

function finishLoss() {
  const current = game;
  later(() => {
    renderer.lose(calm());
    audio.lose();
  }, 260);
  later(() => showResult(current, false, 0), 1300);
}

function showResult(current, won, g) {
  if (!game || current !== game || !$('home').hidden || !$('levels').hidden) return;
  if (won ? game.status !== 'won' : game.status !== 'lost') return;
  const gradeEl = $('result-grade');
  gradeEl.replaceChildren();
  gradeEl.hidden = !won;
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    if (i < g) s.className = 'on';
    gradeEl.append(s);
  }
  const next = $('result-next');
  const share = $('result-share');
  share.hidden = !(won && level.kind === 'daily');
  if (won) {
    $('result-title').textContent = g === 3 ? 'Flawless window' : 'Window clear';
    const bits = [];
    bits.push(game.cracks === 0 ? 'Not a single crack in the frame.' : `${game.cracks} crack${game.cracks === 1 ? '' : 's'} in the frame.`);
    if (game.hintsUsed) bits.push(`${game.hintsUsed} hint${game.hintsUsed === 1 ? '' : 's'}.`);
    if (g < 3) bits.push('Clear it without cracks or hints for all three gems.');
    $('result-text').textContent = bits.join(' ');
    if (level.kind === 'campaign' && level.number < CAMPAIGN_SIZE) {
      next.textContent = 'Next window';
      next.onclick = () => start({ kind: 'campaign', n: level.number + 1 });
    } else if (level.kind === 'campaign') {
      next.textContent = 'Walk the trail';
      next.onclick = () => start({ kind: 'trail', n: progress.trail });
    } else if (level.kind === 'trail') {
      next.textContent = 'Next on the trail';
      next.onclick = () => start({ kind: 'trail', n: level.number + 1 });
    } else {
      next.textContent = 'Walk the trail';
      next.onclick = () => start({ kind: 'trail', n: progress.trail });
    }
    next.hidden = false;
    $('result-again').textContent = 'Play again';
  } else {
    $('result-title').textContent = 'The frame gave way';
    const extra = [];
    if (level.tiles.some((t) => t.keystone)) extra.push('clear around keystones first');
    if (level.tiles.some((t) => t.weighted)) extra.push('mind where weighted panes will stop');
    const more = extra.length ? ` ${extra.join(' and ').replace(/^./, (c) => c.toUpperCase())}.` : '';
    $('result-text').textContent = `Too many bumps cracked the frame. Look for an arrow with nothing in front of it.${more}`;
    next.hidden = true;
    $('result-again').textContent = 'Try again';
  }
  show('result');
  (won ? next : $('result-again')).focus({ preventScroll: true });
}

function showHint(count = true) {
  if (!game || game.status !== 'playing') return;
  const h = hint(game);
  if (!h) return;
  if (h.stuck) {
    setStuck(true);
    toast(h.proven ? 'No way out from here. Undo (U) to step back, or restart.' : 'I can’t find a way out from here. Try Undo (U).', { ms: 3200 });
    return;
  }
  if (!count) game.hintsUsed--;
  renderer.showHint(game.tiles.get(h.key));
  if (count) audio.tick();
}

function doUndo() {
  if (!game) return;
  const res = undo(game);
  if (!res) return;
  if (res.kind === 'slide') renderer.slide(res.from, res.key, calm());
  else for (const k of res.keys) renderer.appear(k);
  audio.tick();
  combo = 0;
  updateHud();
  if ($('undo-btn').classList.contains('glow')) checkStuck();
}

function dismissTip() {
  const tips = $('tip').dataset.tip.split(',').filter(Boolean);
  $('tip').hidden = true;
  $('tip').dataset.tip = '';
  for (const tip of tips) {
    if (tip === 'intro') progress.tipSeen = true;
    else progress.seen = { ...progress.seen, [tip]: true };
  }
  syncReserve();
  persist();
}

function openHome() {
  clearTimers();
  const next = Math.min(progress.unlocked, CAMPAIGN_SIZE);
  const allDone = Object.keys(progress.best).length >= CAMPAIGN_SIZE;
  $('continue-btn').innerHTML = allDone ? `Trail <small>window ${progress.trail}</small>` : `Continue <small>window ${next}</small>`;
  $('trail-btn').innerHTML = `Trail <small>${progress.trailCleared ? `${progress.trailCleared} cleared` : 'endless'}</small>`;
  const today = localDateId();
  $('daily-btn').innerHTML = `Today’s window <small>${progress.daily[today] ? 'done ✓' : prettyDate(today)}</small>`;
  $('trail-btn').hidden = allDone;
  syncToggles();
  show('home');
  history.replaceState(null, '', location.pathname + location.search);
  $('continue-btn').focus({ preventScroll: true });
}

function openLevels() {
  clearTimers();
  const grid = $('level-grid');
  grid.replaceChildren();
  const pigments = Object.values(PIGMENT_COLOURS);
  for (let n = 1; n <= CAMPAIGN_SIZE; n++) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    const locked = n > progress.unlocked;
    const [l, m, d] = pigments[(n - 1) % pigments.length];
    b.style.setProperty('--l', l);
    b.style.setProperty('--m', m);
    b.style.setProperty('--d', d);
    if (locked) {
      b.className = 'locked';
      b.disabled = true;
      b.setAttribute('aria-label', `Window ${n}, locked`);
      b.textContent = n;
    } else {
      const best = progress.best[n] || 0;
      if (n === progress.unlocked && !best) li.classList.add('current');
      if (level?.kind === 'campaign' && level.number === n) li.classList.add('selected');
      const gems = best ? `<span class="gems">${[0, 1, 2].map((i) => `<i class="${i < best ? 'on' : ''}"></i>`).join('')}</span>` : '';
      b.innerHTML = `<span>${n}</span>${gems}`;
      b.setAttribute('aria-label', `Window ${n}${best ? `, ${best} of 3 gems` : ''}`);
      b.onclick = () => start({ kind: 'campaign', n });
    }
    li.append(b);
    grid.append(li);
  }
  show('levels');
}

function syncToggles() {
  const hudMute = $('mute-btn');
  hudMute.classList.toggle('muted', progress.muted);
  hudMute.setAttribute('aria-label', progress.muted ? 'Sound off (M)' : 'Sound on (M)');
  hudMute.setAttribute('aria-pressed', String(!progress.muted));
  const s = $('sound-btn');
  s.textContent = progress.muted ? 'Sound off' : 'Sound on';
  s.setAttribute('aria-pressed', String(!progress.muted));
  const c = $('calm-btn');
  c.textContent = calm() ? 'Calm on' : 'Calm off';
  c.setAttribute('aria-pressed', String(calm()));
  document.body.classList.toggle('calm', calm());
}

function toggleMute() {
  progress.muted = !progress.muted;
  audio.setMuted(progress.muted);
  persist();
  syncToggles();
  if (!$('hud').hidden) toast(progress.muted ? 'Sound off' : 'Sound on');
}

function toggleCalm() {
  progress.calm = !calm();
  persist();
  syncToggles();
}

async function shareDaily() {
  const url = `${location.origin}${location.pathname}#daily-${level.date}`;
  const text = `I finished the Leadlight window for ${prettyDate(level.date)}${game.cracks === 0 ? ' without a crack' : ''}.`;
  try {
    if (navigator.share) await navigator.share({ title: 'Leadlight', text, url });
    else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast('Link copied');
    }
  } catch {}
}

function route() {
  const h = location.hash.slice(1);
  let m;
  if ((m = /^window-(\d+)$/.exec(h)) && +m[1] >= 1 && +m[1] <= CAMPAIGN_SIZE) {
    if (isUnlocked(progress, +m[1])) return start({ kind: 'campaign', n: +m[1] });
    history.replaceState(null, '', location.pathname + location.search);
    openLevels();
    toast(`Window ${m[1]} is still locked`, { low: true });
    return;
  }
  if ((m = /^trail-(\d+)$/.exec(h)) && +m[1] >= 1) return start({ kind: 'trail', n: +m[1] });
  if ((m = /^daily-(.+)$/.exec(h)) && isDateId(m[1])) return start({ kind: 'daily', date: m[1] });
  if (h === 'daily') return start({ kind: 'daily', date: localDateId() });
  openHome();
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.button > 0) return;
  e.preventDefault();
  const k = renderer.pick(e.clientX, e.clientY);
  if (k) onTap(k);
});

$('menu-btn').onclick = openHome;
$('mute-btn').onclick = toggleMute;
$('undo-btn').onclick = doUndo;
$('hint-btn').onclick = () => showHint(true);
$('restart-btn').onclick = restart;
$('tip').onclick = (e) => {
  e.stopPropagation();
  dismissTip();
};
$('continue-btn').onclick = () => {
  audio.unlock();
  if (Object.keys(progress.best).length >= CAMPAIGN_SIZE) start({ kind: 'trail', n: progress.trail });
  else start({ kind: 'campaign', n: Math.min(progress.unlocked, CAMPAIGN_SIZE) });
};
$('windows-btn').onclick = openLevels;
$('levels-back').onclick = openHome;
$('trail-btn').onclick = () => {
  audio.unlock();
  start({ kind: 'trail', n: progress.trail });
};
$('daily-btn').onclick = () => {
  audio.unlock();
  start({ kind: 'daily', date: localDateId() });
};
$('sound-btn').onclick = toggleMute;
$('calm-btn').onclick = toggleCalm;
$('result-again').onclick = restart;
$('result-menu').onclick = openHome;
$('result-share').onclick = shareDaily;

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      doUndo();
    }
    return;
  }
  const k = e.key.toLowerCase();
  if (k === 'escape') {
    if (!$('levels').hidden) openHome();
    else if (!$('home').hidden && game?.status === 'playing') show(null);
    else openHome();
    return;
  }
  if (k === 'm') return toggleMute();
  if (!$('home').hidden || !$('levels').hidden) return;
  if (k === 'u' || k === 'z') doUndo();
  else if (k === 'h') showHint(true);
  else if (k === 'r') restart();
});

window.addEventListener('hashchange', route);
new ResizeObserver(() => renderer.resize()).observe($('stage'));

function frame(now) {
  renderer.draw(now, game, calm());
  requestAnimationFrame(frame);
}

syncToggles();
route();
requestAnimationFrame(frame);

globalThis.__leadlight = {
  get game() { return game; },
  get level() { return level; },
  start,
  tapKey: onTap,
  paneSize: () => renderer.view.size * Math.sqrt(3),
  pixelOf(k) {
    const [q, r] = k.split(',').map(Number);
    const rect = canvas.getBoundingClientRect();
    const v = renderer.view;
    return { x: rect.left + v.ox + v.size * Math.sqrt(3) * (q + r / 2), y: rect.top + v.oy + v.size * 1.5 * r };
  },
};
