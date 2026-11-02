const status = document.querySelector('#status');
const template = document.querySelector('#machine-t');

const theme = document.querySelector('#theme');
const prefersDark = matchMedia('(prefers-color-scheme: dark)');
function currentTheme() { return document.documentElement.dataset.theme || (prefersDark.matches ? 'dark' : 'light'); }
function labelTheme() { theme.setAttribute('aria-label', `Switch to ${currentTheme() === 'dark' ? 'light' : 'dark'} theme`); }
theme.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('jk-arcade-theme', next); } catch {}
  labelTheme();
});
prefersDark.addEventListener('change', labelTheme);
labelTheme();

const KEY = /(WASD|Arrows?|arrows?|Space|Esc|Enter|Shift|Cmd|Ctrl|\d\s?[–-]\s?\d|\b[A-Z]\b)/g;
function controlsNodes(text) {
  const frag = document.createDocumentFragment();
  text.split(KEY).forEach((part, i) => {
    if (!part) return;
    if (i % 2) { const k = document.createElement('kbd'); k.textContent = part; frag.append(k); }
    else frag.append(part);
  });
  return frag;
}

const ICONS = {
  touch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 11V5a2 2 0 1 1 4 0v6M13 10a2 2 0 1 1 4 0v3M17 12a2 2 0 1 1 4 0v3c0 4-3 7-7 7h-1c-2 0-3.5-1-4.5-2.5L5 15a2 2 0 0 1 3-2.5l1 1.5"/></svg>',
  keyboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>',
  mouse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v4"/></svg>',
};
const LABELS = { touch: 'Touch', keyboard: 'Keyboard', mouse: 'Mouse' };
function playsOn(game) {
  if (Array.isArray(game.playsOn)) return game.playsOn.filter(p => LABELS[p]);
  const c = game.controls || '';
  const out = [];
  if (/\b(tap|drag|touch|pinch|swipe|long press|thumbstick|joystick|finger)/i.test(c)) out.push('touch');
  if (/(WASD|[Aa]rrows?|Space|Esc|Enter|Cmd|Ctrl|keyboard|\b[A-Z] [a-z]|\d\s?[–-]\s?\d)/.test(c)) out.push('keyboard');
  if (/\b(mouse|click|scroll|right-drag|hover)/i.test(c)) out.push('mouse');
  return out;
}

function glowFrom(img) {
  const w = 32, h = 20;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const buckets = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max < 70 || (max - min) / max < 0.3) continue;
    const key = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5);
    const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b;
    buckets.set(key, e);
  }
  let best = null;
  for (const e of buckets.values()) if (!best || e.n > best.n) best = e;
  if (!best) return null;
  const mean = (best.r + best.g + best.b) / (3 * best.n);
  const vivid = [best.r, best.g, best.b].map(c => Math.min(255, Math.max(0, mean + (c / best.n - mean) * 1.5)));
  const scale = 225 / Math.max(...vivid);
  return `rgb(${vivid.map(c => Math.round(c * scale)).join(' ')})`;
}
function applyGlow(article, img) {
  const run = () => { try { const c = article.dataset.accent || glowFrom(img); if (c) article.style.setProperty('--glow', c); } catch {} };
  if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, { once: true });
}

let shown = 0;
function machine(game) {
  const index = shown++;
  const node = template.content.firstElementChild.cloneNode(true);
  node.id = game.id;
  if (game.accent) node.dataset.accent = game.accent;
  const screen = node.querySelector('.screen');
  const img = screen.querySelector('img');
  img.src = game.shot;
  img.alt = `${game.title} screenshot`;
  img.loading = index < 2 ? 'eager' : 'lazy';
  img.addEventListener('error', () => screen.remove(), { once: true });
  screen.href = game.url;
  applyGlow(node, img);

  node.querySelector('.marquee').textContent = game.title;
  node.querySelector('.pitch').textContent = game.pitch;
  if (game.note) { const note = node.querySelector('.note'); note.textContent = game.note; note.hidden = false; }
  const controls = node.querySelector('.controls');
  if (game.controls) controls.append(controlsNodes(game.controls)); else controls.remove();

  const plays = node.querySelector('.plays');
  const modes = playsOn(game);
  if (modes.length) {
    for (const m of modes) {
      const li = document.createElement('li');
      li.innerHTML = ICONS[m];
      li.append(LABELS[m]);
      plays.append(li);
    }
  } else plays.remove();

  const go = node.querySelector('.go');
  const a = document.createElement('a');
  a.className = 'play'; a.href = game.url;
  a.append('Play');
  const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = ` ${game.title}`;
  a.append(sr);
  const where = document.createElement('span'); where.className = 'where';
  const target = new URL(game.url, location.href);
  where.textContent = target.origin === location.origin ? 'plays right here' : target.host;
  go.append(a, where);
  return node;
}

function thumb(game) {
  const li = document.createElement('li');
  const a = document.createElement('a'); a.href = `#${game.id}`;
  const img = document.createElement('img'); img.src = game.shot; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
  const span = document.createElement('span'); span.textContent = game.title;
  a.append(img, span); li.append(a);
  return li;
}

const install = document.querySelector('#install');
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let deferredPrompt = null;
addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  install.hidden = false;
});
install.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  install.hidden = true;
});
addEventListener('appinstalled', () => { install.hidden = true; });
const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (iOS && !standalone) document.querySelector('#ios-hint').hidden = false;

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

try {
  const response = await fetch('./games.json');
  if (!response.ok) throw new Error(`games.json returned ${response.status}`);
  const games = await response.json();
  const list = document.querySelector('#ready-list');
  games.forEach(g => list.append(machine(g)));
  document.querySelector('#ready').hidden = false;
  const strip = document.querySelector('#strip');
  games.forEach(g => strip.append(thumb(g)));
  strip.parentElement.hidden = games.length < 2;
  status.textContent = '';
} catch (error) {
  status.textContent = `Couldn't load the game list (${error.message}). Refresh to try again.`;
}
