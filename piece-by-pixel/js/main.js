import { hydrateIcons, icon } from './icons.js';
import { loadIndex, loadScene, drawProgress } from './assets.js';
import { store } from './store.js';
import { audio } from './audio.js';
import { createPlay } from './play.js';
import { TIERS, TIER_ORDER, progressKey } from './tiers.js';

const $ = (id) => document.getElementById(id);
const loaded = new Map();
let scenes = [];

const play = createPlay({ onExit: showAlbum, onComplete: showFinale });

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const tierSave = (id, tier) => store.peek(progressKey(id, tier));
const lastTierOf = (id) => (TIERS[store.settings.lastTier?.[id]] ? store.settings.lastTier[id] : 'normal');
const isPerfect = (save, total) => Boolean(save?.completedAt) && save.perfect.length === total;

function bestDone(id) {
  return Math.max(0, ...TIER_ORDER.map((tier) => tierSave(id, tier)?.done.length ?? 0));
}

function unlockNeed(index) {
  if (index === 0) return null;
  const prev = scenes[index - 1];
  const need = Math.ceil(prev.landmarks / 2);
  const have = bestDone(prev.id);
  return have >= need ? null : { prev, need, have };
}

function renderAlbum() {
  const wrap = $('postcards');
  wrap.replaceChildren();
  scenes.forEach((meta, i) => {
    const sc = loaded.get(meta.id);
    const tier = lastTierOf(meta.id);
    const save = tierSave(meta.id, tier);
    const done = save?.done.length ?? 0;
    const total = meta.landmarks;
    const lock = unlockNeed(i);
    const state = lock ? 'locked' : save?.completedAt ? 'done' : 'open';

    const card = el('button', 'postcard');
    card.type = 'button';
    card.dataset.state = state;
    const photo = el('div', 'pc-photo');
    const canvas = el('canvas');
    drawProgress(sc, canvas, save, tier === 'normal');
    if (tier !== 'normal') {
      loadScene(meta.id, tier)
        .then((tiered) => canvas.isConnected && drawProgress(tiered, canvas, save, true))
        .catch(() => {});
    }
    photo.append(canvas);
    if (lock) {
      const note = el('div', 'pc-lock');
      note.innerHTML = icon('lock');
      note.append(el('span', null, `Rebuild ${lock.need - lock.have} more in ${lock.prev.name} to open`));
      photo.append(note);
    }
    if (state === 'done') photo.append(el('span', 'postmark', 'Restored'));

    const stamps = el('div', 'pc-tiers');
    for (const t of TIER_ORDER) {
      const s = tierSave(meta.id, t);
      const stamp = el('span', `pc-tier tier-${t}`, TIERS[t].label[0]);
      stamp.title = TIERS[t].label;
      if (s?.completedAt) stamp.classList.add('on');
      if (isPerfect(s, total)) stamp.classList.add('perfect');
      stamps.append(stamp);
    }
    photo.append(stamps);

    const caption = el('div', 'pc-caption');
    caption.append(el('strong', null, meta.name));
    const status = lock ? 'Sealed' : state === 'done' ? `${TIERS[tier].label} · restored` : `${TIERS[tier].label} · ${done} / ${total}`;
    caption.append(el('span', null, status));
    const bar = el('div', 'pc-bar');
    const fill = el('i');
    fill.style.width = `${(done / total) * 100}%`;
    bar.append(fill);
    card.append(photo, caption, bar);
    card.addEventListener('click', () => {
      if (lock) {
        card.animate([{ translate: '0' }, { translate: '-6px' }, { translate: '6px' }, { translate: '0' }], { duration: 260 });
        return;
      }
      audio.tap();
      openTierSheet(meta);
    });
    wrap.append(card);
  });
}

function openTierSheet(meta) {
  $('tiers-title').textContent = meta.name;
  $('tiers-blurb').textContent = meta.blurb;
  const list = $('tier-list');
  list.replaceChildren();
  for (const t of TIER_ORDER) {
    const rules = TIERS[t];
    const s = tierSave(meta.id, t);
    const row = el('button', `tier-row tier-${t}`);
    row.type = 'button';
    row.dataset.tier = t;
    if (t === lastTierOf(meta.id)) row.classList.add('last');
    const body = el('span', 'tier-body');
    const head = el('span', 'tier-head');
    head.append(el('span', 'tier-badge', rules.label), el('strong', null, `${meta.tiers[t]} pieces`));
    body.append(head, el('small', null, rules.blurb));
    let status = 'New';
    if (s?.completedAt) status = isPerfect(s, meta.landmarks) ? '★ Done' : 'Done';
    else if (s && (s.done.length || Object.keys(s.placed).length)) status = `${s.done.length}/${meta.landmarks}`;
    row.append(body, el('span', 'tier-status', status));
    row.addEventListener('click', () => {
      audio.tap();
      $('tiers').hidden = true;
      openScene(meta.id, t);
    });
    list.append(row);
  }
  $('tiers').hidden = false;
}

function showAlbum() {
  history.replaceState(null, '', location.pathname);
  $('finale').hidden = true;
  $('album').hidden = false;
  renderAlbum();
}

function openScene(id, tier = 'normal') {
  store.settings.tier = tier;
  store.settings.lastTier = { ...store.settings.lastTier, [id]: tier };
  store.save();
  history.replaceState(null, '', `#${encodeURIComponent(id)}${tier === 'normal' ? '' : `@${tier}`}`);
  $('album').hidden = true;
  $('finale').hidden = true;
  play.open(id, tier).catch((err) => {
    console.error(err);
    play.close();
    showAlbum();
    notice('That postcard could not load. Check the connection and try again.');
  });
}

let noticeTimer = 0;
function notice(text) {
  const note = $('album-note');
  note.textContent = text;
  note.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    note.hidden = true;
  }, 5000);
}

function showFinale(sc, tier) {
  const save = store.scene(progressKey(sc.id, tier));
  const rules = TIERS[tier];
  const c = $('finale-canvas');
  c.width = sc.width;
  c.height = sc.height;
  c.getContext('2d').drawImage(sc.image, 0, 0);
  $('finale-kicker').textContent = tier === 'normal' ? 'Postcard collected' : `${rules.label} postcard collected`;
  $('finale-title').textContent = sc.name;
  const pieces = sc.objects.reduce((n, o) => n + o.pieces.length, 0);
  const misses = Object.values(save.misses).reduce((n, v) => n + v, 0);
  const parts = [`${pieces} pieces`, `${misses} ${misses === 1 ? 'miss' : 'misses'}`];
  if (Number.isFinite(rules.hints)) parts.push(`${save.hintsUsed || 0}/${rules.hints} hints`);
  else parts.push(`${save.perfect.length} perfect`);
  $('finale-stats').textContent = parts.join(' · ');

  const index = scenes.findIndex((s) => s.id === sc.id);
  const next = scenes[index + 1];
  const nextBtn = $('finale-next');
  nextBtn.hidden = !next;
  $('finale-album').textContent = next ? 'Album' : 'Back to album';
  nextBtn.onclick = () => {
    audio.tap();
    play.close();
    openScene(next.id, tier);
  };
  $('finale-album').onclick = () => {
    audio.tap();
    play.close();
    showAlbum();
  };
  const harder = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1];
  const harderBtn = $('finale-harder');
  harderBtn.hidden = !harder;
  if (harder) {
    harderBtn.textContent = `Try this postcard on ${TIERS[harder].label} →`;
    harderBtn.onclick = () => {
      audio.tap();
      play.close();
      openScene(sc.id, harder);
    };
  }
  $('finale').hidden = false;
}

function bindSettings() {
  const s = store.settings;
  const sheet = $('sheet');
  const sync = () => {
    $('opt-sfx').checked = s.sfx;
    $('opt-music').checked = s.music;
    $('opt-twist').checked = s.twist;
  };
  const closeSheet = () => {
    sheet.hidden = true;
  };
  $('settings-btn').addEventListener('click', () => {
    audio.tap();
    sync();
    sheet.hidden = false;
  });
  $('sheet-close').addEventListener('click', closeSheet);
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) closeSheet();
  });
  for (const key of ['sfx', 'music', 'twist']) {
    $(`opt-${key}`).addEventListener('change', (e) => {
      s[key] = e.target.checked;
      store.save();
      audio.configure(s);
      if (key === 'twist') play.refreshTwist();
    });
  }
  $('reset-btn').addEventListener('click', () => {
    $('confirm').hidden = false;
  });
  $('confirm-no').addEventListener('click', () => {
    $('confirm').hidden = true;
  });
  $('confirm-yes').addEventListener('click', () => {
    store.reset();
    $('confirm').hidden = true;
    closeSheet();
    renderAlbum();
  });
  const tiers = $('tiers');
  $('tiers-close').addEventListener('click', () => {
    tiers.hidden = true;
  });
  tiers.addEventListener('click', (e) => {
    if (e.target === tiers) tiers.hidden = true;
  });
}

async function boot() {
  hydrateIcons();
  bindSettings();
  audio.configure(store.settings);
  document.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
  scenes = await loadIndex();
  const built = await Promise.all(scenes.map((s) => loadScene(s.id)));
  built.forEach((sc) => loaded.set(sc.id, sc));
  const [wantedId, wantedTier = 'normal'] = decodeURIComponent(location.hash.slice(1)).split('@');
  const index = scenes.findIndex((s) => s.id === wantedId);
  if (index >= 0 && TIERS[wantedTier] && !unlockNeed(index)) openScene(wantedId, wantedTier);
  else showAlbum();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.__pbp = { play, store, scenes, loaded, openScene, showAlbum };
}

boot().catch((err) => {
  console.error(err);
  $('postcards').replaceChildren(el('p', 'tagline', 'The postcards could not load. Check the connection and reload.'));
});
