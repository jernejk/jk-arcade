import { SQRT3, toPixel, fromPixel, key, cornerPoints, dirVector, EDGE_NEIGHBOUR } from './hex.js';
import { makeRng } from './rng.js';

export const PIGMENT_COLOURS = {
  ruby: ['#ff9aa0', '#d42a40', '#5e0818'],
  amber: ['#ffd09a', '#ea7a22', '#6e2804'],
  gold: ['#fff4b0', '#f1c232', '#7d5304'],
  emerald: ['#a6f5c6', '#21a866', '#063d25'],
  sapphire: ['#a8d2ff', '#2d6ad8', '#0a1f5a'],
  amethyst: ['#e6bcff', '#8d43d4', '#330c57'],
};

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeOut = (t) => 1 - (1 - t) ** 3;

function mix(c1, c2, t) {
  const a = parseInt(c1.slice(1), 16);
  const b = parseInt(c2.slice(1), 16);
  const ch = (s) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function hexPath(c, cx, cy, s) {
  const pts = cornerPoints(cx, cy, s);
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < 6; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  return el;
}

const PALE_ARROW = new Set(['gold', 'amber']);

function drawArrow(c, s, dir, colour, heavy) {
  const pale = PALE_ARROW.has(colour);
  const shape = [[-0.44, -0.075], [0.06, -0.075], [0.06, -0.27], [0.5, 0], [0.06, 0.27], [0.06, 0.075], [-0.44, 0.075]];
  const trace = () => {
    c.beginPath();
    shape.forEach(([x, y], i) => (i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s)));
    c.closePath();
  };
  c.save();
  c.lineJoin = 'round';
  c.save();
  c.translate(s * 0.03, s * 0.045);
  c.rotate((-Math.PI / 3) * dir);
  trace();
  c.fillStyle = pale ? 'rgba(255,240,200,0.35)' : 'rgba(20,8,0,0.45)';
  c.fill();
  c.restore();
  c.rotate((-Math.PI / 3) * dir);
  trace();
  const g = c.createLinearGradient(0, -s * 0.3, 0, s * 0.3);
  g.addColorStop(0, pale ? '#6b3a08' : '#fffbe6');
  g.addColorStop(0.45, pale ? '#4a2404' : '#f6d77a');
  g.addColorStop(1, pale ? '#2c1402' : '#c08f2e');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = s * (pale ? 0.045 : 0.03);
  c.strokeStyle = pale ? 'rgba(255,246,214,0.95)' : 'rgba(92,56,8,0.7)';
  c.stroke();
  if (heavy) {
    c.beginPath();
    c.moveTo(-s * 0.86, -s * 0.5);
    c.lineTo(-s * 0.86, s * 0.5);
    c.lineTo(-s * 0.5, s * 0.29);
    c.lineTo(-s * 0.5, -s * 0.29);
    c.closePath();
    const band = c.createLinearGradient(-s * 0.86, 0, -s * 0.5, 0);
    band.addColorStop(0, '#2a2830');
    band.addColorStop(0.45, '#b9b4c6');
    band.addColorStop(0.7, '#77728a');
    band.addColorStop(1, '#3a3842');
    c.fillStyle = band;
    c.fill();
    c.lineWidth = s * 0.03;
    c.strokeStyle = '#0d0c11';
    c.stroke();
    c.beginPath();
    c.moveTo(-s * 0.52, -s * 0.26);
    c.lineTo(-s * 0.52, s * 0.26);
    c.lineWidth = s * 0.03;
    c.strokeStyle = 'rgba(225,220,240,0.6)';
    c.stroke();
    for (const y of [-0.22, 0.22]) {
      c.beginPath();
      c.arc(-s * 0.68, s * y, s * 0.05, 0, Math.PI * 2);
      c.fillStyle = '#2a2830';
      c.fill();
    }
    c.beginPath();
    c.arc(-s * 0.42, 0, s * 0.2, 0, Math.PI * 2);
    const w = c.createRadialGradient(-s * 0.48, -s * 0.07, 0, -s * 0.42, 0, s * 0.2);
    w.addColorStop(0, '#a9a4b8');
    w.addColorStop(0.5, '#4d4a57');
    w.addColorStop(1, '#22202a');
    c.fillStyle = w;
    c.fill();
    c.lineWidth = s * 0.035;
    c.strokeStyle = '#0f0e13';
    c.stroke();
  }
  c.restore();
}

function drawRosette(c, s) {
  c.save();
  c.beginPath();
  c.arc(0, 0, s * 0.62, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,248,225,0.2)';
  c.fill();
  c.lineWidth = s * 0.16;
  c.strokeStyle = '#2a1c08';
  c.stroke();
  c.lineWidth = s * 0.1;
  c.strokeStyle = '#f3cf6a';
  c.stroke();
  c.lineWidth = s * 0.03;
  c.strokeStyle = '#fff8d8';
  c.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    const x = Math.cos(a) * s * 0.62;
    const y = Math.sin(a) * s * 0.62;
    c.beginPath();
    c.arc(x, y, s * 0.085, 0, Math.PI * 2);
    c.fillStyle = '#4a4752';
    c.fill();
    c.beginPath();
    c.arc(x - s * 0.02, y - s * 0.025, s * 0.035, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,240,200,0.6)';
    c.fill();
  }
  c.restore();
}

function paintPane(c, s, colour, dir, keystone, weighted, seed) {
  const [light, mid, dark] = PIGMENT_COLOURS[colour];
  const rng = makeRng(seed);
  hexPath(c, 0, 0, s * 0.97);
  const g = c.createLinearGradient(-s * 0.8, -s * 0.9, s * 0.8, s * 0.9);
  g.addColorStop(0, light);
  g.addColorStop(0.42, mid);
  g.addColorStop(1, dark);
  c.fillStyle = g;
  c.fill();
  c.save();
  c.clip();
  const glow = c.createRadialGradient(-s * 0.22, -s * 0.3, 0, -s * 0.22, -s * 0.3, s * 1.05);
  glow.addColorStop(0, 'rgba(255,255,255,0.5)');
  glow.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = glow;
  c.fillRect(-s, -s, s * 2, s * 2);
  c.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    const y = lerp(-s, s, rng.next());
    c.moveTo(-s, y);
    c.bezierCurveTo(-s * 0.3, y + (rng.next() - 0.5) * s, s * 0.3, y + (rng.next() - 0.5) * s, s, y + (rng.next() - 0.5) * s * 0.6);
    c.lineWidth = s * (0.02 + rng.next() * 0.05);
    c.strokeStyle = `rgba(255,255,255,${0.04 + rng.next() * 0.07})`;
    c.stroke();
  }
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.arc(lerp(-s, s, rng.next()), lerp(-s, s, rng.next()), s * (0.02 + rng.next() * 0.035), 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.fill();
  }
  if (weighted) {
    c.fillStyle = 'rgba(22,18,30,0.1)';
    c.fillRect(-s, -s, s * 2, s * 2);
  }
  c.restore();
  if (weighted) {
    hexPath(c, 0, 0, s * 0.8);
    c.lineWidth = s * 0.17;
    c.strokeStyle = '#1b1a21';
    c.stroke();
    hexPath(c, 0, 0, s * 0.8);
    c.lineWidth = s * 0.1;
    const rim = c.createLinearGradient(-s, -s, s, s);
    rim.addColorStop(0, '#d6d1e2');
    rim.addColorStop(0.5, '#7b768c');
    rim.addColorStop(1, '#46434f');
    c.strokeStyle = rim;
    c.stroke();
  }
  hexPath(c, 0, 0, s * 0.84);
  const bevel = c.createLinearGradient(-s, -s, s, s);
  bevel.addColorStop(0, 'rgba(255,255,255,0.55)');
  bevel.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  bevel.addColorStop(1, 'rgba(0,0,0,0.35)');
  c.lineWidth = s * 0.07;
  c.strokeStyle = bevel;
  c.stroke();
  if (keystone) drawRosette(c, s);
  drawArrow(c, s, dir, colour, weighted);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 0, h: 0, dpr: 1, size: 30, ox: 0, oy: 0 };
  let level = null;
  let cells = [];
  let mask = new Set();
  let boundary = [];
  let leadLayer = null;
  let frameLayer = null;
  let centre = { x: 0, y: 0, reach: 1 };
  let sprites = new Map();
  let light = 0;
  let stars = [];
  const fx = {
    flying: [],
    bumps: new Map(),
    shakes: new Map(),
    appear: new Map(),
    slides: new Map(),
    cracks: [],
    particles: [],
    hint: null,
    win: null,
    lose: null,
    shake: null,
  };

  const px = (q, r) => {
    const p = toPixel(q, r, view.size);
    return { x: p.x + view.ox, y: p.y + view.oy };
  };

  function sprite({ colour, dir, keystone = false, weighted = false }) {
    const id = `${colour}:${dir}:${keystone ? 'k' : ''}${weighted ? 'w' : ''}`;
    let sp = sprites.get(id);
    if (!sp) {
      const s = view.size * view.dpr;
      const dim = Math.ceil(s * 2.1);
      sp = makeCanvas(dim, dim);
      const c = sp.getContext('2d');
      c.translate(dim / 2, dim / 2);
      paintPane(c, s, colour, dir, keystone, weighted, id);
      sprites.set(id, sp);
    }
    return sp;
  }

  function drawSprite(sp, x, y, { scale = 1, sx = 1, sy = 1, rot = 0, alpha = 1, along = 0 } = {}) {
    const d = sp.width / view.dpr;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (sx !== 1 || sy !== 1) {
      ctx.rotate(along);
      ctx.scale(sx, sy);
      ctx.rotate(-along);
    }
    if (rot) ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.drawImage(sp, -d / 2, -d / 2, d, d);
    ctx.restore();
  }

  function layout() {
    const rect = canvas.getBoundingClientRect();
    view.dpr = Math.min(3, globalThis.devicePixelRatio || 1);
    view.w = rect.width;
    view.h = rect.height;
    canvas.width = Math.max(1, Math.round(rect.width * view.dpr));
    canvas.height = Math.max(1, Math.round(rect.height * view.dpr));
    if (!level || rect.width < 40 || rect.height < 40) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [q, r] of level.cells) {
      const p = toPixel(q, r);
      minX = Math.min(minX, p.x - SQRT3 / 2);
      maxX = Math.max(maxX, p.x + SQRT3 / 2);
      minY = Math.min(minY, p.y - 1);
      maxY = Math.max(maxY, p.y + 1);
    }
    const pad = 0.6;
    view.size = Math.min(64, (view.w - 8) / (maxX - minX + pad * 2), (view.h - 8) / (maxY - minY + pad * 2));
    view.ox = view.w / 2 - ((minX + maxX) / 2) * view.size;
    view.oy = view.h / 2 - ((minY + maxY) / 2) * view.size;
    cells = level.cells.map(([q, r]) => ({ q, r, k: key(q, r), ...px(q, r) }));
    let cx = 0, cy = 0;
    for (const c of cells) {
      cx += c.x;
      cy += c.y;
    }
    cx /= cells.length;
    cy /= cells.length;
    centre = { x: cx, y: cy, reach: Math.max(...cells.map((c) => Math.hypot(c.x - cx, c.y - cy))) + view.size };
    boundary = [];
    for (const c of cells) {
      const pts = cornerPoints(c.x, c.y, view.size);
      EDGE_NEIGHBOUR.forEach(([dq, dr], i) => {
        if (!mask.has(key(c.q + dq, c.r + dr))) boundary.push([pts[i], pts[(i + 1) % 6], c]);
      });
    }
    const srng = makeRng(`${level.id}/stars`);
    stars = Array.from({ length: Math.round(cells.length * 0.6) }, () => {
      const c = srng.pick(cells);
      return { x: c.x + (srng.next() - 0.5) * view.size, y: c.y + (srng.next() - 0.5) * view.size, r: 0.5 + srng.next() * 1.3, p: srng.next() * 6 };
    });
    sprites = new Map();
    buildLayers();
    fx.cracks.forEach((cr) => (cr.path = crackPath(cr.seed)));
  }

  function layerCanvas() {
    const c = makeCanvas(canvas.width, canvas.height);
    const g = c.getContext('2d');
    g.scale(view.dpr, view.dpr);
    return [c, g];
  }

  function buildLayers() {
    const s = view.size;
    const [lead, g] = layerCanvas();
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const edges = () => {
      g.beginPath();
      for (const c of cells) {
        const pts = cornerPoints(c.x, c.y, s);
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i <= 6; i++) g.lineTo(pts[i % 6][0], pts[i % 6][1]);
      }
    };
    edges();
    g.lineWidth = s * 0.15;
    g.strokeStyle = '#1a191e';
    g.stroke();
    edges();
    g.lineWidth = s * 0.07;
    g.strokeStyle = '#3d3b44';
    g.stroke();
    edges();
    g.lineWidth = s * 0.022;
    g.strokeStyle = 'rgba(190,185,205,0.45)';
    g.stroke();
    const joints = new Set();
    for (const c of cells) {
      for (const [x, y] of cornerPoints(c.x, c.y, s)) {
        const id = `${Math.round(x)},${Math.round(y)}`;
        if (joints.has(id)) continue;
        joints.add(id);
        g.beginPath();
        g.arc(x, y, s * 0.09, 0, Math.PI * 2);
        g.fillStyle = '#45434c';
        g.fill();
        g.beginPath();
        g.arc(x - s * 0.025, y - s * 0.03, s * 0.035, 0, Math.PI * 2);
        g.fillStyle = 'rgba(220,215,235,0.4)';
        g.fill();
      }
    }
    leadLayer = lead;

    const [frame, f] = layerCanvas();
    f.lineJoin = 'round';
    f.lineCap = 'round';
    const rim = () => {
      f.beginPath();
      for (const [a, b] of boundary) {
        f.moveTo(a[0], a[1]);
        f.lineTo(b[0], b[1]);
      }
    };
    rim();
    f.lineWidth = s * 0.62;
    f.strokeStyle = '#120c0a';
    f.stroke();
    rim();
    f.lineWidth = s * 0.48;
    f.strokeStyle = '#4a3324';
    f.stroke();
    rim();
    f.lineWidth = s * 0.3;
    f.strokeStyle = '#6b4a32';
    f.stroke();
    rim();
    f.lineWidth = s * 0.06;
    f.strokeStyle = 'rgba(232,190,140,0.45)';
    f.stroke();
    frameLayer = frame;
  }

  function crackPath(seed) {
    if (!boundary.length) return [];
    const rng = makeRng(seed);
    const [a, b, c] = rng.pick(boundary);
    const t = 0.25 + rng.next() * 0.5;
    const sx = lerp(a[0], b[0], t);
    const sy = lerp(a[1], b[1], t);
    const nx = sx - c.x;
    const ny = sy - c.y;
    const nl = Math.hypot(nx, ny);
    const ux = nx / nl;
    const uy = ny / nl;
    const s = view.size;
    const main = [[sx - ux * s * 0.35, sy - uy * s * 0.35]];
    let x = main[0][0];
    let y = main[0][1];
    for (let i = 0; i < 6; i++) {
      const tx = -uy;
      const ty = ux;
      const side = (rng.next() - 0.5) * s * 0.5;
      x += ux * s * 0.16 + tx * side;
      y += uy * s * 0.16 + ty * side;
      main.push([x, y]);
    }
    const fork = [main[2]];
    let fx2 = main[2][0];
    let fy2 = main[2][1];
    for (let i = 0; i < 3; i++) {
      const sign = rng.next() > 0.5 ? 1 : -1;
      fx2 += (b[0] - a[0]) * 0.3 * sign + ux * s * 0.08;
      fy2 += (b[1] - a[1]) * 0.3 * sign + uy * s * 0.08;
      fork.push([fx2, fy2]);
    }
    return [main, fork];
  }

  function emit(x, y, n, palette, speed = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (20 + Math.random() * 90) * speed;
      fx.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 20,
        life: 0,
        max: 0.45 + Math.random() * 0.6,
        size: view.size * (0.08 + Math.random() * 0.12),
        colour: palette[Math.floor(Math.random() * palette.length)],
      });
    }
  }

  function drawSky(now, cleared) {
    light = lerp(light, cleared, 0.06);
    const top = mix('#0b1030', '#8fc8ff', light);
    const bottom = mix('#2c1f4c', '#ffe1a6', light);
    ctx.save();
    ctx.beginPath();
    for (const c of cells) {
      const pts = cornerPoints(c.x, c.y, view.size * 1.01);
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
    }
    ctx.clip();
    const g = ctx.createLinearGradient(0, centre.y - centre.reach, 0, centre.y + centre.reach);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
    const sun = ctx.createRadialGradient(centre.x, centre.y - centre.reach * 0.3, 0, centre.x, centre.y - centre.reach * 0.3, centre.reach * 1.2);
    sun.addColorStop(0, `rgba(255,236,190,${0.15 + light * 0.6})`);
    sun.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.fillStyle = '#fff';
    for (const st of stars) {
      ctx.globalAlpha = (1 - light) * (0.35 + 0.35 * Math.sin(now / 700 + st.p));
      ctx.fillRect(st.x, st.y, st.r, st.r);
    }
    ctx.globalAlpha = 1;
    for (const c of cells) {
      hexPath(ctx, c.x, c.y, view.size * 0.97);
      const frost = ctx.createLinearGradient(c.x - view.size, c.y - view.size, c.x + view.size, c.y + view.size);
      frost.addColorStop(0, 'rgba(255,255,255,0.16)');
      frost.addColorStop(0.5, 'rgba(255,255,255,0.03)');
      frost.addColorStop(1, 'rgba(255,255,255,0.1)');
      ctx.fillStyle = frost;
      ctx.fill();
    }
    ctx.restore();
  }

  function drawInspection(inspection) {
    if (!inspection) return;
    const point = (k) => px(...k.split(',').map(Number));
    ctx.save();
    ctx.strokeStyle = '#fff3bc';
    ctx.lineWidth = Math.max(2, view.size * 0.11);
    for (const { cells } of inspection.paths) {
      const start = point(cells[0]);
      hexPath(ctx, start.x, start.y, view.size * 0.93);
      ctx.stroke();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      for (const k of cells.slice(1)) {
        const { x, y } = point(k);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (inspection.landing) {
      const { x, y } = point(inspection.landing);
      ctx.beginPath();
      ctx.arc(x, y, view.size * 0.34, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (inspection.blocker) {
      const { x, y } = point(inspection.blocker);
      const d = view.size * 0.28;
      ctx.strokeStyle = '#ffada6';
      ctx.beginPath();
      ctx.moveTo(x - d, y - d);
      ctx.lineTo(x + d, y + d);
      ctx.moveTo(x + d, y - d);
      ctx.lineTo(x - d, y + d);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHint(now) {
    const h = fx.hint;
    if (!h) return;
    const t = (now - h.t0) / 1000;
    if (t > 3.2) {
      fx.hint = null;
      return;
    }
    const c = px(h.tile.q, h.tile.r);
    const pulse = 0.55 + 0.45 * Math.sin(t * 7);
    const fade = t > 2.6 ? 1 - (t - 2.6) / 0.6 : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    hexPath(ctx, c.x, c.y, view.size * 0.95);
    ctx.fillStyle = `rgba(255,220,130,${0.18 + pulse * 0.22})`;
    ctx.fill();
    ctx.restore();
    hexPath(ctx, c.x, c.y, view.size * (1.0 + pulse * 0.06));
    ctx.lineWidth = view.size * 0.16;
    ctx.strokeStyle = `rgba(255,226,130,${0.7 + pulse * 0.3})`;
    ctx.shadowColor = '#ffd76a';
    ctx.shadowBlur = view.size * 0.6;
    ctx.stroke();
    ctx.shadowBlur = 0;
    const v = dirVector(h.tile.dir);
    const far = Math.max(view.w, view.h);
    const step = view.size * 0.55;
    for (let d = view.size * 1.2, i = 0; d < far; d += step, i++) {
      const x = c.x + v.x * d;
      const y = c.y + v.y * d;
      if (x < -10 || y < -10 || x > view.w + 10 || y > view.h + 10) break;
      const a = clamp01(Math.sin(t * 5 - i * 0.6) * 0.5 + 0.5);
      ctx.beginPath();
      ctx.arc(x, y, view.size * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,230,150,${0.25 + a * 0.6})`;
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWin(now) {
    const w = fx.win;
    if (!w) return;
    const t = (now - w.t0) / 1000;
    if (t > 2.6) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const c of cells) {
      const d = Math.hypot(c.x - centre.x, c.y - centre.y) / centre.reach;
      const wave = Math.exp(-(((t * 1.25 - d) * 5) ** 2));
      if (wave < 0.02) continue;
      hexPath(ctx, c.x, c.y, view.size * 0.97);
      ctx.fillStyle = `rgba(255,232,170,${wave * 0.75})`;
      ctx.fill();
    }
    if (!w.calm) {
      const fade = t < 0.4 ? t / 0.4 : Math.max(0, 1 - (t - 0.4) / 2.2);
      ctx.translate(centre.x, centre.y);
      ctx.rotate(t * 0.25);
      for (let i = 0; i < 14; i++) {
        ctx.rotate((Math.PI * 2) / 14);
        const g = ctx.createLinearGradient(0, 0, centre.reach * 1.6, 0);
        g.addColorStop(0, `rgba(255,240,200,${0.32 * fade})`);
        g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(centre.reach * 1.6, -view.size * 0.5);
        ctx.lineTo(centre.reach * 1.6, view.size * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawParticles(dt) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    fx.particles = fx.particles.filter((p) => (p.life += dt) < p.max);
    for (const p of fx.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy = p.vy * 0.97 + 40 * dt;
      const k = 1 - p.life / p.max;
      const s = p.size * (0.4 + k);
      ctx.globalAlpha = k;
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x + s * 0.22, p.y);
      ctx.lineTo(p.x, p.y + s);
      ctx.lineTo(p.x - s * 0.22, p.y);
      ctx.closePath();
      ctx.moveTo(p.x - s, p.y);
      ctx.lineTo(p.x, p.y + s * 0.22);
      ctx.lineTo(p.x + s, p.y);
      ctx.lineTo(p.x, p.y - s * 0.22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBar(ax, ay, bx, by, alpha = 1) {
    const s = view.size;
    const x1 = lerp(ax, bx, 0.24);
    const y1 = lerp(ay, by, 0.24);
    const x2 = lerp(ax, bx, 0.76);
    const y2 = lerp(ay, by, 0.76);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = s * 0.4;
    ctx.strokeStyle = '#121116';
    ctx.stroke();
    ctx.lineWidth = s * 0.26;
    ctx.strokeStyle = '#d9b75a';
    ctx.stroke();
    ctx.lineWidth = s * 0.1;
    ctx.strokeStyle = '#fff1c2';
    ctx.stroke();
    for (const [x, y] of [[x1, y1], [x2, y2]]) {
      ctx.beginPath();
      ctx.arc(x, y, s * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = '#f3d27a';
      ctx.fill();
      ctx.lineWidth = s * 0.03;
      ctx.strokeStyle = '#3b2606';
      ctx.stroke();
    }
    ctx.restore();
  }

  let last = 0;

  return {
    view,
    setLevel(lv) {
      level = lv;
      mask = new Set(lv.cells.map(([q, r]) => key(q, r)));
      leadLayer = null;
      frameLayer = null;
      this.reset();
      light = 0;
      layout();
    },
    resize: layout,
    reset() {
      fx.flying = [];
      fx.bumps.clear();
      fx.shakes.clear();
      fx.appear.clear();
      fx.slides.clear();
      fx.cracks = [];
      fx.particles = [];
      fx.hint = null;
      fx.win = null;
      fx.lose = null;
      fx.shake = null;
    },
    fly(tiles, calm) {
      const t0 = performance.now();
      const group = tiles.map((tile) => ({ tile, t0, calm }));
      if (group.length === 2) {
        group[0].mate = group[1];
        group[1].mate = group[0];
      }
      fx.flying.push(...group);
      if (fx.hint && tiles.includes(fx.hint.tile)) fx.hint = null;
    },
    bump(k, tile, blockerKey, calm) {
      const now = performance.now();
      const [bq, br] = blockerKey.split(',').map(Number);
      const from = px(tile.q, tile.r);
      const to = px(bq, br);
      const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      fx.bumps.set(k, { tile, t0: now, v: { x: (to.x - from.x) / len, y: (to.y - from.y) / len } });
      if (!calm) {
        fx.shakes.set(blockerKey, now + 90);
        fx.shake = { t0: now, mag: view.size * 0.12 };
      }
    },
    nudge(k) {
      fx.shakes.set(k, performance.now());
    },
    crack(seed) {
      fx.cracks.push({ seed, t0: performance.now(), path: crackPath(seed) });
    },
    slide(fromKey, toKey, calm) {
      const [fq, fr] = fromKey.split(',').map(Number);
      const [tq, tr] = toKey.split(',').map(Number);
      const from = px(fq, fr);
      const to = px(tq, tr);
      const cells = Math.round(Math.hypot(to.x - from.x, to.y - from.y) / (view.size * SQRT3));
      const dur = calm ? 160 : 150 + cells * 55;
      fx.slides.set(toKey, { from: [fq, fr], to: [tq, tr], t0: performance.now(), dur });
      if (fx.hint && fx.hint.tile.q === fq && fx.hint.tile.r === fr) fx.hint = null;
      return dur;
    },
    landed(k, colour, blockerKey) {
      const [q, r] = k.split(',').map(Number);
      const p = px(q, r);
      emit(p.x, p.y, 8, ['#c9c4d6', '#8f8a9c', PIGMENT_COLOURS[colour][0]], 0.7);
      if (blockerKey) fx.shakes.set(blockerKey, performance.now());
    },
    appear(k) {
      fx.flying = fx.flying.filter(({ tile }) => key(tile.q, tile.r) !== k);
      fx.appear.set(k, performance.now());
    },
    showHint(tile) {
      fx.hint = { tile, t0: performance.now() };
    },
    win(calm) {
      fx.win = { t0: performance.now(), calm };
      if (!calm) {
        for (let i = 0; i < 10; i++) {
          const c = cells[Math.floor(Math.random() * cells.length)];
          emit(c.x, c.y, 6, ['#fff3c4', '#ffd76a', '#ffffff'], 1.4);
        }
      }
    },
    lose(calm) {
      fx.lose = { t0: performance.now() };
      if (!calm) fx.shake = { t0: performance.now(), mag: view.size * 0.25 };
    },
    busy() {
      return fx.flying.length > 0;
    },
    pick(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left - view.ox;
      const y = clientY - rect.top - view.oy;
      const { q, r } = fromPixel(x, y, view.size);
      const k = key(q, r);
      return mask.has(k) ? k : null;
    },
    draw(now, game, calm, inspection) {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.clearRect(0, 0, view.w, view.h);
      if (!level || !game || !leadLayer) return;
      ctx.save();
      if (fx.shake) {
        const t = (now - fx.shake.t0) / 260;
        if (t >= 1) fx.shake = null;
        else ctx.translate((Math.random() - 0.5) * fx.shake.mag * (1 - t), (Math.random() - 0.5) * fx.shake.mag * (1 - t));
      }
      const total = level.tiles.length || 1;
      drawSky(now, 1 - game.tiles.size / total);

      for (const [k, tile] of game.tiles) {
        if (fx.bumps.has(k)) continue;
        let { x, y } = px(tile.q, tile.r);
        const sl = fx.slides.get(k);
        if (sl) {
          const t = (now - sl.t0) / sl.dur;
          if (t >= 1) fx.slides.delete(k);
          else {
            const e = t * t * (3 - 2 * t);
            const a = px(sl.from[0], sl.from[1]);
            x = lerp(a.x, x, e);
            y = lerp(a.y, y, e);
          }
        }
        const sh = fx.shakes.get(k);
        if (sh !== undefined) {
          const t = (now - sh) / 320;
          if (t >= 1) fx.shakes.delete(k);
          else if (!calm && t > 0) {
            const v = dirVector(tile.dir);
            const amp = view.size * 0.07 * (1 - t) * Math.sin(t * 38);
            x += -v.y * amp;
            y += v.x * amp;
          }
        }
        const ap = fx.appear.get(k);
        let scale = 1;
        let alpha = 1;
        if (ap !== undefined) {
          const t = (now - ap) / 280;
          if (t >= 1) fx.appear.delete(k);
          else {
            scale = calm ? 1 : lerp(1.25, 1, easeOut(t));
            alpha = easeOut(t);
          }
        }
        drawSprite(sprite(tile), x, y, { scale, alpha });
      }

      ctx.drawImage(leadLayer, 0, 0, view.w, view.h);
      for (const [k, tile] of game.tiles) {
        if (!tile.pair || k > tile.pair || !game.tiles.has(tile.pair) || fx.bumps.has(k) || fx.bumps.has(tile.pair)) continue;
        const mate = game.tiles.get(tile.pair);
        const a = px(tile.q, tile.r);
        const b = px(mate.q, mate.r);
        drawBar(a.x, a.y, b.x, b.y);
      }
      drawHint(now);
      drawInspection(inspection);

      for (const [k, b] of fx.bumps) {
        const t = (now - b.t0) / 340;
        if (t >= 1) {
          fx.bumps.delete(k);
          if (game.tiles.has(k)) {
            const p = px(b.tile.q, b.tile.r);
            drawSprite(sprite(b.tile), p.x, p.y);
          }
          continue;
        }
        const v = b.v;
        const out = t < 0.3 ? easeOut(t / 0.3) : Math.cos(((t - 0.3) / 0.7) * Math.PI * 1.5) * Math.exp(-(t - 0.3) * 4);
        const reach = calm ? 0.12 : 0.3;
        const p = px(b.tile.q, b.tile.r);
        const squash = calm ? 0 : Math.max(0, out) * (t < 0.36 && t > 0.24 ? 1 : 0.4);
        const along = Math.atan2(v.y, v.x);
        drawSprite(sprite(b.tile), p.x + v.x * view.size * reach * out, p.y + v.y * view.size * reach * out, {
          sx: 1 - squash * 0.14,
          sy: 1 + squash * 0.08,
          along,
        });
        hexPath(ctx, p.x + v.x * view.size * reach * out, p.y + v.y * view.size * reach * out, view.size * 0.95);
        ctx.fillStyle = `rgba(255,70,60,${0.35 * (1 - t)})`;
        ctx.fill();
      }

      ctx.drawImage(frameLayer, 0, 0, view.w, view.h);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const cr of fx.cracks) {
        const t = clamp01((now - cr.t0) / 220);
        for (const [i, line] of cr.path.entries()) {
          const n = Math.max(1, Math.round(line.length * (i === 0 ? t : clamp01(t * 2 - 1))));
          ctx.beginPath();
          line.slice(0, n + 1).forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.lineWidth = view.size * 0.11;
          ctx.strokeStyle = 'rgba(10,4,2,0.95)';
          ctx.stroke();
          ctx.lineWidth = view.size * 0.04;
          ctx.strokeStyle = 'rgba(255,220,180,0.9)';
          ctx.stroke();
        }
      }
      ctx.restore();

      fx.flying = fx.flying.filter((f) => {
        const t = (now - f.t0) / 1000;
        const dur = f.calm ? 0.35 : 0.9;
        if (t > dur) return false;
        const v = dirVector(f.tile.dir);
        const start = px(f.tile.q, f.tile.r);
        const dist = f.calm ? view.size * 1.6 * easeOut(t / dur) : view.size * (2.2 * t + 26 * t * t);
        const x = start.x + v.x * dist;
        const y = start.y + v.y * dist;
        const lift = f.calm ? 1 : 1 + 0.16 * Math.sin(Math.min(1, t / 0.25) * Math.PI * 0.5);
        const rot = f.calm ? 0 : Math.sin(t * 9) * 0.08 * Math.min(1, t * 4);
        const alpha = f.calm ? 1 - t / dur : 1;
        if (!f.calm) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const glow = ctx.createRadialGradient(x, y, 0, x, y, view.size * 1.6);
          glow.addColorStop(0, `${PIGMENT_COLOURS[f.tile.colour][0]}66`);
          glow.addColorStop(1, `${PIGMENT_COLOURS[f.tile.colour][0]}00`);
          ctx.fillStyle = glow;
          ctx.fillRect(x - view.size * 2, y - view.size * 2, view.size * 4, view.size * 4);
          ctx.restore();
          drawSprite(sprite(f.tile), x + view.size * 0.12, y + view.size * 0.22, { scale: lift, rot, alpha: 0.25 });
          if (Math.random() < 0.9) emit(x - v.x * view.size * 0.6, y - v.y * view.size * 0.6, 2, [PIGMENT_COLOURS[f.tile.colour][0], '#fff6d6'], 0.6);
        }
        drawSprite(sprite(f.tile), x, y, { scale: lift, rot, alpha });
        f.pos = { x, y };
        return true;
      });
      for (const f of fx.flying) {
        if (f.mate && f.pos && f.mate.pos && fx.flying.includes(f.mate) && f.tile.id < f.mate.tile.id) {
          drawBar(f.pos.x, f.pos.y, f.mate.pos.x, f.mate.pos.y, f.calm ? Math.max(0, 1 - (now - f.t0) / 350) : 1);
        }
      }

      drawWin(now);
      drawParticles(dt);
      if (fx.lose) {
        const t = (now - fx.lose.t0) / 900;
        if (t < 1) {
          ctx.fillStyle = `rgba(120,10,10,${0.35 * (1 - t)})`;
          ctx.fillRect(0, 0, view.w, view.h);
        }
      }
      ctx.restore();
    },
    burst(k, colour) {
      const tile = level.tiles.find((t) => key(t.q, t.r) === k);
      if (!tile) return;
      const p = px(tile.q, tile.r);
      emit(p.x, p.y, 10, [PIGMENT_COLOURS[colour][0], '#ffffff', '#ffe9a8']);
    },
  };
}
