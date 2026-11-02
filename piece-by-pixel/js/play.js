import { loadScene, tinted } from './assets.js';
import { store } from './store.js';
import { audio } from './audio.js';
import { TIERS, progressKey } from './tiers.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;
const SPARKS = ['#fff6c2', '#ffd65c', '#ffffff', '#ffb35c', '#9ff0ff'];
const CONFETTI = ['#ff6b4a', '#ffc94a', '#3dbb7d', '#4aa8ff', '#c77dff', '#fff6e6'];
const MANY = 12;
const sideQuery = matchMedia('(min-aspect-ratio: 1/1) and (min-width: 640px)');

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function createPlay({ onExit, onComplete }) {
  const root = $('play');
  const cvs = $('scene');
  const ctx = cvs.getContext('2d');
  const tray = $('tray');
  const slotsEl = $('slots');
  const toastEl = $('toast');
  const hintBtn = $('hint-btn');
  const ui = {
    name: $('scene-name'),
    progress: $('scene-progress'),
    kicker: $('tray-kicker'),
    object: $('object-name'),
    pips: $('pips'),
    hints: $('hint-count'),
  };

  let scene = null;
  let save = null;
  let tier = 'normal';
  let rules = TIERS.normal;
  let current = null;
  let active = false;
  let busy = false;
  let raf = 0;
  let last = 0;
  let dpr = 1;
  let view = { x: 0, y: 0, w: 1, h: 1 };
  const cam = { x: 0, y: 0, z: 1 };
  let camAnim = null;
  let zoomMemory = null;
  let effects = [];
  let particles = [];
  let hint = null;
  let pending = null;
  let drag = null;
  let gesture = null;
  let multiTouch = false;
  let lastTap = { t: 0, x: 0, y: 0 };
  let toastTimer = 0;
  let epoch = 0;
  const pointers = new Map();
  const turns = new Map();
  const missesByPiece = new Map();

  const NONE = Object.freeze([]);
  const isDone = (o) => save.done.includes(o.id);
  const placedOf = (o) => save.placed[o.id] ?? NONE;
  const isPlaced = (o, p) => isDone(o) || placedOf(o).includes(p.index);
  const twistOn = () => rules.twist ?? store.settings.twist;
  const turnOf = (p) => (twistOn() ? turns.get(p) ?? 0 : 0);
  const hintsLeft = () => rules.hints - (save.hintsUsed || 0);
  const canPlay = () => (rules.mixed ? !save.completedAt : Boolean(current));

  // Camera

  function zFit() {
    return Math.min(view.w / scene.width, view.h / scene.height);
  }

  function zMax() {
    return Math.max(zFit() * 5, 9);
  }

  function clampCam({ x, y, z }) {
    z = clamp(z, zFit() * 0.9, zMax());
    const hw = view.w / 2 / z;
    const hh = view.h / 2 / z;
    const m = 28 / z;
    return {
      x: scene.width <= 2 * hw ? scene.width / 2 : clamp(x, hw - m, scene.width - hw + m),
      y: scene.height <= 2 * hh ? scene.height / 2 : clamp(y, hh - m, scene.height - hh + m),
      z,
    };
  }

  function setCam(next) {
    Object.assign(cam, clampCam(next));
  }

  function focusOf(o) {
    const z = clamp(Math.min((view.w * 0.8) / o.w, (view.h * 0.74) / o.h), zFit(), Math.min(zMax(), 7.5));
    return clampCam({ x: o.x + o.w / 2, y: o.y + o.h / 2, z });
  }

  function fitOf() {
    return clampCam({ x: scene.width / 2, y: scene.height / 2, z: zFit() });
  }

  function flyTo(target, ms = 700) {
    camAnim = { from: { ...cam }, to: target, t0: performance.now(), ms };
  }

  function toScreen(x, y) {
    return [view.x + view.w / 2 + (x - cam.x) * cam.z, view.y + view.h / 2 + (y - cam.y) * cam.z];
  }

  function toScene(x, y) {
    return [cam.x + (x - view.x - view.w / 2) / cam.z, cam.y + (y - view.y - view.h / 2) / cam.z];
  }

  function resize() {
    if (!active) return;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = root.clientWidth;
    const h = root.clientHeight;
    cvs.width = Math.round(w * dpr);
    cvs.height = Math.round(h * dpr);
    const top = root.querySelector('.play-top').getBoundingClientRect().bottom + 6;
    const t = tray.getBoundingClientRect();
    view = sideQuery.matches ? { x: 0, y: top, w: t.left, h: h - top } : { x: 0, y: top, w, h: Math.max(80, t.top - top) };
    if (camAnim) camAnim.to = clampCam(camAnim.to);
    setCam(cam);
    for (const el of slotsEl.querySelectorAll('.slot')) drawSlot(el);
  }

  // Lifecycle

  function later(ms, fn) {
    const mine = epoch;
    setTimeout(() => {
      if (active && mine === epoch) fn();
    }, ms);
  }

  async function open(id, nextTier = 'normal') {
    const mine = ++epoch;
    const loaded = await loadScene(id, nextTier);
    if (mine !== epoch) return;
    scene = loaded;
    tier = nextTier;
    rules = TIERS[tier];
    save = store.scene(progressKey(id, tier));
    if (save.cut && save.cut !== scene.cut) save.placed = {};
    save.cut = scene.cut;
    if (!save.completedAt && scene.objects.every(isDone)) {
      save.completedAt = Date.now();
      save.current = null;
    }
    store.save();
    active = true;
    root.hidden = false;
    root.dataset.tier = tier;
    busy = false;
    effects = [];
    particles = [];
    hint = null;
    zoomMemory = null;
    turns.clear();
    missesByPiece.clear();
    ui.name.textContent = scene.name;
    current = null;
    const first = save.current && scene.objects.find((o) => o.id === save.current && !isDone(o));
    const next = rules.mixed ? null : first || scene.objects.find((o) => !isDone(o));
    if (rules.mixed) {
      assignTurns(scene.objects.flatMap((o) => o.pieces));
      updateHud();
      buildTray(!save.completedAt);
    } else if (next) {
      setCurrent(next, true);
    } else {
      updateHud();
      buildTray();
    }
    resize();
    Object.assign(cam, fitOf());
    if (next) later(350, () => current === next && flyTo(focusOf(next), 900));
    updateHintButton();
    introduce();
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function introduce() {
    if (save.completedAt) return;
    const seenKey = tier === 'normal' ? 'seenTip' : `seenTip-${tier}`;
    if (store.settings[seenKey]) return;
    store.settings[seenKey] = true;
    store.save();
    const [title, sub] = rules.intro ?? ['Drag a piece onto the glowing outline', 'Pinch to zoom · tap any outline to switch'];
    toast(title, sub, true, 4800, true);
  }

  function close() {
    epoch++;
    active = false;
    cancelAnimationFrame(raf);
    cancelDrag();
    root.hidden = true;
    toastEl.hidden = true;
  }

  function assignTurns(pieces) {
    if (!twistOn()) return;
    for (const p of pieces) {
      if (!turns.has(p)) turns.set(p, Math.random() < rules.twistShare ? 1 + Math.floor(Math.random() * 3) : 0);
    }
  }

  function setCurrent(o, animate) {
    current = o;
    save.current = o.id;
    store.save();
    hint = null;
    assignTurns(o.pieces);
    updateHud();
    buildTray(animate);
  }

  function updateHud() {
    ui.progress.textContent = `${save.done.length}/${scene.objects.length}`;
    ui.kicker.textContent = tier === 'normal' ? 'Rebuilding' : rules.label;
    ui.pips.replaceChildren();
    if (save.completedAt || (!current && !rules.mixed)) {
      ui.object.textContent = save.completedAt ? 'Postcard restored' : 'Pick an outline';
      return;
    }
    const pool = rules.mixed ? scene.objects : [current];
    const total = pool.reduce((n, o) => n + o.pieces.length, 0);
    const placed = pool.reduce((n, o) => n + (isDone(o) ? o.pieces.length : placedOf(o).length), 0);
    ui.object.textContent = rules.mixed ? 'All landmarks' : rules.hideName ? 'Mystery landmark' : current.name;
    if (total > 14) {
      const count = document.createElement('b');
      count.textContent = `${placed}/${total}`;
      ui.pips.append(count);
      return;
    }
    for (let i = 0; i < total; i++) {
      const pip = document.createElement('i');
      if (i < placed) pip.className = 'on';
      ui.pips.append(pip);
    }
  }

  function updateHintButton() {
    const limited = Number.isFinite(rules.hints);
    ui.hints.hidden = !limited;
    if (limited) ui.hints.textContent = String(Math.max(0, hintsLeft()));
    hintBtn.classList.toggle('spent', limited && hintsLeft() <= 0);
  }

  // Tray

  function buildTray(animate = false) {
    cancelDrag();
    slotsEl.replaceChildren();
    let left = [];
    if (canPlay()) {
      const pool = rules.mixed ? scene.objects.filter((o) => !isDone(o)) : [current];
      left = shuffle(pool.flatMap((o) => o.pieces.filter((p) => !isPlaced(o, p))));
    }
    const many = left.length > MANY;
    if (tray.classList.contains('many') !== many) {
      tray.classList.toggle('many', many);
      resize();
    }
    if (!left.length) {
      const note = document.createElement('div');
      note.className = 'empty-note';
      note.textContent = 'Every landmark is back.';
      const again = document.createElement('button');
      again.className = 'btn ghost';
      again.type = 'button';
      again.textContent = 'Rebuild again';
      again.style.flex = '0 0 auto';
      again.addEventListener('click', restartScene);
      slotsEl.append(note, again);
      return;
    }
    left.forEach((p, i) => slotsEl.append(makeSlot(p, animate ? 0.08 + Math.min(i, 12) * 0.05 : null)));
    slotsEl.scrollLeft = 0;
    slotsEl.scrollTop = 0;
  }

  function makeSlot(p, delay) {
    const el = document.createElement('div');
    el.className = 'slot';
    el.piece = p;
    if (delay != null) {
      el.classList.add('enter');
      el.style.setProperty('--d', `${delay}s`);
      el.addEventListener('animationend', () => el.classList.remove('enter'), { once: true });
    }
    el.append(document.createElement('canvas'));
    el.addEventListener('pointerdown', onSlotDown);
    requestAnimationFrame(() => drawSlot(el));
    return el;
  }

  function slotScale(el, p) {
    const size = el.clientWidth || 72;
    const turned = turnOf(p) % 2 === 1;
    const bw = turned ? p.h : p.w;
    const bh = turned ? p.w : p.h;
    const fit = Math.min((size * 0.8) / bw, (size * 0.8) / bh, 7);
    const device = fit * dpr;
    return (device >= 2 ? Math.floor(device) : device) / dpr;
  }

  function drawSlot(el) {
    const p = el.piece;
    const c = el.firstChild;
    if (!p || !c) return;
    el.dataset.turn = String(turnOf(p));
    const size = el.clientWidth || 72;
    const s = Math.round(size * dpr);
    c.width = s;
    c.height = s;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const k = slotScale(el, p) * dpr;
    g.translate(s / 2, s / 2);
    g.rotate((turnOf(p) * Math.PI) / 2);
    g.drawImage(p.canvas, Math.round((-p.w * k) / 2), Math.round((-p.h * k) / 2), p.w * k, p.h * k);
  }

  function liveSlots() {
    return [...slotsEl.querySelectorAll('.slot')].filter((el) => !el.classList.contains('gone'));
  }

  function slotFor(p) {
    return liveSlots().find((el) => el.piece === p);
  }

  // Drag from tray

  function onSlotDown(e) {
    if (pending && !pending.el.isConnected) pending = null;
    if (drag || pending || busy || !canPlay() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const el = e.currentTarget;
    pending = { el, p: el.piece, id: e.pointerId, x0: e.clientX, y0: e.clientY, type: e.pointerType };
    if (e.pointerType !== 'touch') {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
    }
    el.addEventListener('pointermove', onSlotMove);
    el.addEventListener('pointerup', onSlotUp);
    el.addEventListener('pointercancel', onSlotCancel);
  }

  function unbind(el) {
    el.removeEventListener('pointermove', onSlotMove);
    el.removeEventListener('pointerup', onSlotUp);
    el.removeEventListener('pointercancel', onSlotCancel);
  }

  function onSlotMove(e) {
    if (drag && e.pointerId === drag.id) {
      drag.fx = e.clientX;
      drag.fy = e.clientY;
      placeDrag();
      return;
    }
    if (!pending || e.pointerId !== pending.id) return;
    const dx = e.clientX - pending.x0;
    const dy = e.clientY - pending.y0;
    const toward = sideQuery.matches ? -dx : -dy;
    const across = Math.abs(sideQuery.matches ? dy : dx);
    if (pending.type === 'mouse' ? Math.hypot(dx, dy) > 5 : toward > 7 && toward > across * 0.8) startDrag(e);
  }

  function onSlotUp(e) {
    if (pending && e.pointerId === pending.id) {
      const { el, p } = pending;
      unbind(el);
      pending = null;
      if (twistOn()) rotatePiece(p, el);
      else {
        el.firstChild.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }], { duration: 260 });
        toast(sideQuery.matches ? 'Drag it across into the picture' : 'Drag it up into the picture', '', true, 1400, true);
      }
      return;
    }
    if (drag && e.pointerId === drag.id) {
      unbind(drag.el);
      drop();
    }
  }

  function onSlotCancel(e) {
    if (pending && e.pointerId === pending.id) {
      unbind(pending.el);
      pending = null;
    }
    if (drag && e.pointerId === drag.id) {
      unbind(drag.el);
      const d = drag;
      drag = null;
      flyBack(d);
    }
  }

  function startDrag(e) {
    const { el, p, type } = pending;
    pending = null;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* already captured */
    }
    const r = el.getBoundingClientRect();
    const W = p.w * cam.z;
    const H = p.h * cam.z;
    const c = document.createElement('canvas');
    c.className = 'drag-piece';
    c.width = Math.max(1, Math.round(W * dpr));
    c.height = Math.max(1, Math.round(H * dpr));
    c.style.width = `${W}px`;
    c.style.height = `${H}px`;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(p.canvas, 0, 0, c.width, c.height);
    root.append(c);
    drag = {
      el,
      p,
      c,
      W,
      H,
      type,
      id: e.pointerId,
      turn: turnOf(p),
      fx: e.clientX,
      fy: e.clientY,
      t0: performance.now(),
      from: { x: r.left + r.width / 2, y: r.top + r.height / 2, s: slotScale(el, p) / cam.z },
    };
    el.classList.add('lifted');
    hint = null;
    audio.pick();
    placeDrag();
  }

  function dragTransform(d, cx, cy, s) {
    return `translate3d(${cx - d.W / 2}px, ${cy - d.H / 2}px, 0) rotate(${d.turn * 90}deg) scale(${s})`;
  }

  function placeDrag() {
    const d = drag;
    if (!d) return;
    const t = easeOut(clamp((performance.now() - d.t0) / 150, 0, 1));
    const lift = d.type === 'mouse' ? 0 : Math.min(d.H / 2, 110) + 30;
    const cx = lerp(d.from.x, d.fx, t);
    const cy = lerp(d.from.y, d.fy - lift, t);
    d.cx = cx;
    d.cy = cy;
    d.c.style.transform = dragTransform(d, cx, cy, lerp(d.from.s, 1, t));
  }

  function drop() {
    const d = drag;
    drag = null;
    const p = d.p;
    const t = tray.getBoundingClientRect();
    const overTray = d.fx >= t.left && d.fx <= t.right && d.fy >= t.top && d.fy <= t.bottom;
    const [sx, sy] = toScene(d.cx - d.W / 2, d.cy - d.H / 2);
    const k = rules.tolerance;
    const tolerance = Math.max(Math.min(p.w, p.h) * 0.32 * k, 3.5 * k, (22 * k) / cam.z);
    const close = Math.hypot(sx - p.x, sy - p.y) <= tolerance;
    if (close && d.turn === 0) snap(d);
    else if (close) {
      flyBack(d);
      audio.miss();
      toast('Right spot, wrong way round', 'Tap a piece in the tray to turn it', true, 2200);
    } else if (overTray) flyBack(d);
    else miss(d);
  }

  function snap(d) {
    const { p } = d;
    const o = p.obj;
    const [tx, ty] = toScreen(p.x + p.w / 2, p.y + p.h / 2);
    const anim = d.c.animate([{ transform: d.c.style.transform }, { transform: dragTransform(d, tx, ty, 1) }], {
      duration: 110,
      easing: 'cubic-bezier(.2,.8,.3,1)',
      fill: 'forwards',
    });
    busy = true;
    const mine = epoch;
    anim.onfinish = () => {
      d.c.remove();
      if (mine !== epoch) return;
      busy = false;
      if (!active || (!rules.mixed && current !== o) || isPlaced(o, p)) return;
      (save.placed[o.id] ??= []).push(p.index);
      store.save();
      d.el.classList.remove('lifted');
      d.el.classList.add('gone');
      setTimeout(() => d.el.remove(), 260);
      const now = performance.now();
      effects.push({ kind: 'flash', canvas: p.mask, x: p.x, y: p.y, t0: now, ms: 340 });
      burst(p.x + p.w / 2, p.y + p.h / 2, 12, 140);
      audio.snap(placedOf(o).length - 1);
      updateHud();
      if (placedOf(o).length >= o.pieces.length) completeObject(o);
    };
  }

  function flyBack(d) {
    const el = d.el;
    const r = el.isConnected ? el.getBoundingClientRect() : null;
    const to = r
      ? dragTransform(d, r.left + r.width / 2, r.top + r.height / 2, slotScale(el, d.p) / cam.z)
      : `${d.c.style.transform} scale(.2)`;
    const anim = d.c.animate([{ transform: d.c.style.transform }, { transform: to, opacity: r ? 1 : 0 }], {
      duration: 240,
      easing: 'cubic-bezier(.3,.7,.3,1)',
      fill: 'forwards',
    });
    anim.onfinish = () => {
      d.c.remove();
      el.classList.remove('lifted');
    };
  }

  function miss(d) {
    const o = d.p.obj;
    save.misses[o.id] = (save.misses[o.id] || 0) + 1;
    store.save();
    audio.miss();
    const count = (missesByPiece.get(d.p) || 0) + 1;
    missesByPiece.set(d.p, count);
    const base = d.c.style.transform;
    const shake = d.c.animate(
      [0, -7, 7, -5, 5, 0].map((x) => ({ transform: `translateX(${x}px) ${base}` })),
      { duration: 200, easing: 'ease-out' },
    );
    const mine = epoch;
    shake.onfinish = () => {
      flyBack(d);
      if (rules.autoHint && count >= 3 && active && mine === epoch && current === o) showHint(d.p);
    };
  }

  function cancelDrag() {
    if (pending) unbind(pending.el);
    pending = null;
    if (drag) {
      unbind(drag.el);
      drag.c.remove();
      drag.el.classList.remove('lifted');
      drag = null;
    }
  }

  function rotatePiece(p, el) {
    turns.set(p, (turnOf(p) + 1) % 4);
    drawSlot(el);
    el.firstChild.animate([{ transform: 'rotate(-90deg)' }, { transform: 'rotate(0deg)' }], { duration: 180, easing: 'ease-out' });
    audio.rotate();
  }

  // Progress

  function completeObject(o) {
    save.done.push(o.id);
    delete save.placed[o.id];
    const perfect = !save.misses[o.id];
    if (perfect && !save.perfect.includes(o.id)) save.perfect.push(o.id);
    store.save();
    const now = performance.now();
    if (rules.pop !== false) effects.push({ kind: 'pop', obj: o, t0: now, ms: 560 });
    effects.push({ kind: 'flash', canvas: o.mask, x: o.x, y: o.y, t0: now, ms: 650 });
    burst(o.x + o.w / 2, o.y + o.h / 2, 40, 260);
    audio.done();
    toast(`${o.name} rebuilt!`, perfect ? 'Perfect build: no misses' : '', false, 1800);
    updateHud();
    const finished = scene.objects.every(isDone);
    if (finished) {
      save.completedAt = Date.now();
      save.current = null;
      store.save();
    }
    if (rules.mixed && !finished) return;
    busy = true;
    later(rules.mixed ? 900 : 1350, () => {
      busy = false;
      if (finished) completeScene();
      else advance();
    });
  }

  function advance() {
    const next = scene.objects.find((o) => !isDone(o));
    if (!next) return completeScene();
    setCurrent(next, true);
    flyTo(focusOf(next), 850);
  }

  function completeScene() {
    current = null;
    save.current = null;
    save.completedAt ||= Date.now();
    store.save();
    updateHud();
    buildTray();
    flyTo(fitOf(), 1000);
    audio.fanfare();
    later(350, confetti);
    later(1900, () => onComplete(scene, tier));
  }

  function restartScene() {
    Object.assign(save, { done: [], placed: {}, current: null, misses: {}, perfect: [], completedAt: null, hintsUsed: 0 });
    store.save();
    open(scene.id, tier);
  }

  function switchTo(o) {
    if (busy || drag || o === current) return;
    audio.tap();
    if (rules.mixed) {
      flyTo(focusOf(o), 650);
      return;
    }
    setCurrent(o, true);
    flyTo(focusOf(o), 650);
  }

  // Hints

  function showHint(p) {
    const el = slotFor(p);
    if (!el) return false;
    if (turnOf(p)) {
      turns.set(p, 0);
      drawSlot(el);
    }
    hint = { p, t0: performance.now(), ms: 2400 };
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    el.classList.remove('wiggle');
    void el.offsetWidth;
    el.classList.add('wiggle');
    setTimeout(() => el.classList.remove('wiggle'), 1400);
    const [sx, sy] = toScreen(p.x + p.w / 2, p.y + p.h / 2);
    if (sx < view.x || sx > view.x + view.w || sy < view.y || sy > view.y + view.h || cam.z < zFit() * 1.6) {
      flyTo(focusOf(p.obj), 600);
    }
    audio.hint();
    return true;
  }

  hintBtn.addEventListener('click', () => {
    if (!canPlay() || busy || drag) return;
    if (hintsLeft() <= 0) {
      audio.miss();
      toast('No hints left', `${rules.label} allows ${rules.hints} per postcard`, true, 1800);
      return;
    }
    const slots = liveSlots().filter((el) => !el.classList.contains('lifted'));
    if (!slots.length) return;
    const box = slotsEl.getBoundingClientRect();
    const visible = slots.find((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= box.left - 2 && r.right <= box.right + 2 && r.top >= box.top - 2 && r.bottom <= box.bottom + 2;
    });
    if (!showHint((visible || slots[0]).piece)) return;
    if (Number.isFinite(rules.hints)) {
      save.hintsUsed = (save.hintsUsed || 0) + 1;
      store.save();
      updateHintButton();
    }
  });

  // Effects

  function burst(x, y, n, speed) {
    const [sx, sy] = toScreen(x, y);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.75);
      particles.push({
        x: sx,
        y: sy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - speed * 0.25,
        g: 260,
        life: 0.55 + Math.random() * 0.5,
        age: 0,
        size: 3 + Math.floor(Math.random() * 4),
        color: SPARKS[i % SPARKS.length],
      });
    }
  }

  function confetti() {
    for (let i = 0; i < 140; i++) {
      particles.push({
        x: view.x + Math.random() * view.w,
        y: view.y - 20 - Math.random() * view.h * 0.6,
        vx: (Math.random() - 0.5) * 60,
        vy: 60 + Math.random() * 90,
        g: 40,
        life: 3 + Math.random() * 1.5,
        age: 0,
        size: 5 + Math.floor(Math.random() * 4),
        spin: Math.random() * Math.PI * 2,
        vspin: (Math.random() - 0.5) * 10,
        color: CONFETTI[i % CONFETTI.length],
        confetti: true,
      });
    }
  }

  let toastKey = '';
  function toast(title, sub = '', soft = false, ms = 1800, low = false) {
    toastEl.replaceChildren(title);
    if (sub) {
      const s = document.createElement('small');
      s.textContent = sub;
      toastEl.append(s);
    }
    toastEl.className = soft ? 'toast soft' : 'toast';
    if (toastKey !== title || toastEl.hidden) {
      toastEl.style.animation = 'none';
      void toastEl.offsetWidth;
      toastEl.style.animation = '';
    }
    toastKey = title;
    toastEl.hidden = false;
    toastEl.style.top = low ? `${view.y + view.h - toastEl.offsetHeight - 14}px` : '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, ms);
  }

  // Rendering

  function loop(now) {
    if (!active) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (camAnim) {
      const t = clamp((now - camAnim.t0) / camAnim.ms, 0, 1);
      const e = easeInOut(t);
      const { from, to } = camAnim;
      cam.x = lerp(from.x, to.x, e);
      cam.y = lerp(from.y, to.y, e);
      cam.z = Math.exp(lerp(Math.log(from.z), Math.log(to.z), e));
      if (t >= 1) camAnim = null;
    }
    if (drag) placeDrag();
    for (const p of particles) {
      p.age += dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.confetti) {
        p.spin += p.vspin * dt;
        p.vx += Math.sin(p.age * 3 + p.spin) * 20 * dt;
      }
    }
    particles = particles.filter((p) => p.age < p.life);
    effects = effects.filter((e) => now - e.t0 < e.ms);
    draw(now);
  }

  function draw(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = scene.backdrop;
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    const k = cam.z * dpr;
    const ox = Math.round((view.x + view.w / 2 - cam.x * cam.z) * dpr);
    const oy = Math.round((view.y + view.h / 2 - cam.y * cam.z) * dpr);
    ctx.setTransform(k, 0, 0, k, ox, oy);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(10, 8, 24, .35)';
    ctx.fillRect(-2 / cam.z, 3 / cam.z, scene.width + 4 / cam.z, scene.height + 2 / cam.z);
    ctx.drawImage(scene.image, 0, 0);

    const pulse = 0.5 + 0.5 * Math.sin(now / 240);
    for (const o of scene.objects) {
      const pop = effects.find((e) => e.kind === 'pop' && e.obj === o);
      if (isDone(o) && !pop) continue;
      ctx.drawImage(o.sil, o.x, o.y);
      if (pop) {
        const t = clamp((now - pop.t0) / pop.ms, 0, 1);
        const s = 1 + 0.16 * Math.sin(Math.PI * t) * (1 - t * 0.4);
        const cx = o.x + o.w / 2;
        const by = o.y + o.h;
        ctx.drawImage(o.full, cx - (o.w * s) / 2, by - o.h * s, o.w * s, o.h * s);
        continue;
      }
      if (rules.glow && o === current) {
        ctx.globalAlpha = 0.3 + 0.7 * pulse;
        ctx.drawImage(o.outline, o.x - 1, o.y - 1);
        ctx.globalAlpha = 1;
      }
      for (const i of placedOf(o)) {
        const p = o.pieces[i];
        if (p) ctx.drawImage(p.canvas, p.x, p.y);
      }
    }

    if (hint) {
      const t = (now - hint.t0) / hint.ms;
      if (t >= 1 || isPlaced(hint.p.obj, hint.p)) hint = null;
      else {
        ctx.globalAlpha = (0.5 + 0.5 * Math.sin(t * Math.PI * 6 - Math.PI / 2)) * 0.85;
        ctx.drawImage(tinted(hint.p, '#ffe27a'), hint.p.x, hint.p.y);
        ctx.globalAlpha = 1;
      }
    }

    for (const e of effects) {
      if (e.kind !== 'flash') continue;
      ctx.globalAlpha = (1 - (now - e.t0) / e.ms) * 0.9;
      ctx.drawImage(e.canvas, e.x, e.y);
    }
    ctx.globalAlpha = 1;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const p of particles) {
      ctx.globalAlpha = clamp(1 - p.age / p.life, 0, 1) * (p.confetti ? 1 : 0.95);
      ctx.fillStyle = p.color;
      if (p.confetti) {
        const w = p.size * Math.abs(Math.cos(p.spin));
        ctx.fillRect(Math.round(p.x - w / 2), Math.round(p.y), Math.max(1, Math.round(w)), Math.round(p.size * 1.4));
      } else {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Scene gestures

  function onCanvasDown(e) {
    if (drag || !scene) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size > 1) multiTouch = true;
    try {
      cvs.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone */
    }
    camAnim = null;
    beginGesture();
  }

  function beginGesture() {
    const pts = [...pointers.values()];
    if (pts.length === 1) {
      gesture = { kind: 'pan', x0: pts[0].x, y0: pts[0].y, cam: { ...cam }, moved: false };
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      gesture = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, anchor: toScene(mid.x, mid.y), z0: cam.z, moved: true };
    }
  }

  function onCanvasMove(e) {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.values()];
    if (gesture.kind === 'pan') {
      const dx = pts[0].x - gesture.x0;
      const dy = pts[0].y - gesture.y0;
      if (!gesture.moved && Math.hypot(dx, dy) < 7) return;
      gesture.moved = true;
      setCam({ x: gesture.cam.x - dx / cam.z, y: gesture.cam.y - dy / cam.z, z: cam.z });
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      const z = clamp((gesture.z0 * Math.hypot(a.x - b.x, a.y - b.y)) / gesture.d0, zFit() * 0.9, zMax());
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      setCam({
        x: gesture.anchor[0] - (mx - view.x - view.w / 2) / z,
        y: gesture.anchor[1] - (my - view.y - view.h / 2) / z,
        z,
      });
    }
  }

  function onCanvasUp(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    const wasTap = gesture?.kind === 'pan' && !gesture.moved && e.type === 'pointerup' && !multiTouch;
    if (pointers.size) beginGesture();
    else {
      gesture = null;
      multiTouch = false;
    }
    if (wasTap && !pointers.size) tap(e.clientX, e.clientY);
  }

  function tap(x, y) {
    const now = performance.now();
    if (now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 36) {
      lastTap.t = 0;
      toggleFrame();
      return;
    }
    lastTap = { t: now, x, y };
    const [sx, sy] = toScene(x, y);
    if (sx < 0 || sy < 0 || sx >= scene.width || sy >= scene.height) return;
    const label = scene.labels[Math.floor(sy) * scene.width + Math.floor(sx)];
    if (!label) return;
    const o = scene.objects[(label - 1) >> 5];
    if (o && !isDone(o)) {
      if (o === current) flyTo(focusOf(o), 500);
      else switchTo(o);
    }
  }

  function toggleFrame() {
    const fit = fitOf();
    const atFit = Math.abs(cam.z - fit.z) / fit.z < 0.08;
    if (!atFit) {
      zoomMemory = { ...cam };
      flyTo(fit, 600);
    } else if (current) flyTo(focusOf(current), 600);
    else if (zoomMemory) flyTo(clampCam(zoomMemory), 600);
  }

  cvs.addEventListener('pointerdown', onCanvasDown);
  cvs.addEventListener('pointermove', onCanvasMove);
  cvs.addEventListener('pointerup', onCanvasUp);
  cvs.addEventListener('pointercancel', onCanvasUp);
  cvs.addEventListener(
    'wheel',
    (e) => {
      if (!scene) return;
      e.preventDefault();
      camAnim = null;
      const anchor = toScene(e.clientX, e.clientY);
      const z = clamp(cam.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)), zFit() * 0.9, zMax());
      setCam({
        x: anchor[0] - (e.clientX - view.x - view.w / 2) / z,
        y: anchor[1] - (e.clientY - view.y - view.h / 2) / z,
        z,
      });
    },
    { passive: false },
  );
  $('frame-btn').addEventListener('click', () => {
    audio.tap();
    toggleFrame();
  });
  $('back-btn').addEventListener('click', () => {
    audio.tap();
    close();
    onExit();
  });
  window.addEventListener('resize', () => requestAnimationFrame(resize));
  sideQuery.addEventListener('change', () => requestAnimationFrame(resize));

  return {
    open,
    close,
    refreshTwist() {
      if (!active || tier !== 'normal' || !current) return;
      turns.clear();
      setCurrent(current, false);
    },
    debug: () => ({ scene, save, tier, rules, current, cam: { ...cam }, view: { ...view }, toScreen, busy, turnOf }),
  };
}
