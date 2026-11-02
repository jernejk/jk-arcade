import { dataFile } from './tiers.js';

const cache = new Map();
const images = new Map();

const GLOW = [255, 214, 92];

function silhouetteTones(hex = '#1b1f3b') {
  const base = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const lift = (d) => base.map((v, i) => Math.min(255, v + d[i]));
  return { fill: base, dot: lift([10, 12, 23]), rim: lift([28, 32, 53]) };
}

export async function loadIndex() {
  const res = await fetch('assets/scenes/index.json');
  return (await res.json()).scenes;
}

export function loadScene(id, tier = 'normal') {
  const key = `${id}:${tier}`;
  if (!cache.has(key)) {
    const pending = buildScene(id, tier);
    pending.catch(() => cache.delete(key));
    cache.set(key, pending);
  }
  return cache.get(key);
}

function sceneImage(id) {
  if (!images.has(id)) {
    const pending = loadImage(`assets/scenes/${id}/scene.png`);
    pending.catch(() => images.delete(id));
    images.set(id, pending);
  }
  return images.get(id);
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function fromImageData(data) {
  const c = makeCanvas(data.width, data.height);
  c.getContext('2d').putImageData(data, 0, 0);
  return c;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function decodeRuns(runs, size) {
  const out = new Uint16Array(size);
  let at = 0;
  for (let i = 0; i < runs.length; i += 2) {
    if (runs[i]) out.fill(runs[i], at, at + runs[i + 1]);
    at += runs[i + 1];
  }
  return out;
}

async function buildScene(id, tier) {
  const [data, img] = await Promise.all([fetch(dataFile(id, tier)).then((r) => r.json()), sceneImage(id)]);
  const W = data.width;
  const H = data.height;
  const image = makeCanvas(W, H);
  const ictx = image.getContext('2d', { willReadFrequently: true });
  ictx.drawImage(img, 0, 0);
  const rgba = ictx.getImageData(0, 0, W, H).data;
  const labels = decodeRuns(data.labels, W * H);
  const tones = silhouetteTones(data.silhouette || undefined);

  const objects = data.objects.map((o, oi) => {
    const [x, y, w, h] = o.bbox;
    const inside = (sx, sy) =>
      sx >= 0 && sy >= 0 && sx < W && sy < H && labels[sy * W + sx] > 0 && (labels[sy * W + sx] - 1) >> 5 === oi;

    const sil = new ImageData(w, h);
    const mask = new ImageData(w, h);
    const full = new ImageData(w, h);
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const sx = x + xx;
        const sy = y + yy;
        if (!inside(sx, sy)) continue;
        const i = (yy * w + xx) * 4;
        const s = (sy * W + sx) * 4;
        const rim = !inside(sx - 1, sy) || !inside(sx + 1, sy) || !inside(sx, sy - 1) || !inside(sx, sy + 1);
        const dot = (sx % 4 === 0 && sy % 4 === 0) || (sx % 4 === 2 && sy % 4 === 2);
        const c = rim ? tones.rim : dot ? tones.dot : tones.fill;
        sil.data.set([c[0], c[1], c[2], 255], i);
        mask.data.set([255, 255, 255, 255], i);
        full.data.set([rgba[s], rgba[s + 1], rgba[s + 2], 255], i);
      }
    }

    const outline = new ImageData(w + 2, h + 2);
    for (let yy = -1; yy <= h; yy++) {
      for (let xx = -1; xx <= w; xx++) {
        const sx = x + xx;
        const sy = y + yy;
        if (inside(sx, sy)) continue;
        if (inside(sx - 1, sy) || inside(sx + 1, sy) || inside(sx, sy - 1) || inside(sx, sy + 1)) {
          outline.data.set([GLOW[0], GLOW[1], GLOW[2], 255], ((yy + 1) * (w + 2) + xx + 1) * 4);
        }
      }
    }

    const pieces = o.pieces.map(([px, py, pw, ph], pi) => {
      const value = (oi << 5) + pi + 1;
      const art = new ImageData(pw, ph);
      const pm = new ImageData(pw, ph);
      let area = 0;
      for (let yy = 0; yy < ph; yy++) {
        for (let xx = 0; xx < pw; xx++) {
          const s = (py + yy) * W + px + xx;
          if (labels[s] !== value) continue;
          const i = (yy * pw + xx) * 4;
          art.data.set([rgba[s * 4], rgba[s * 4 + 1], rgba[s * 4 + 2], 255], i);
          pm.data.set([255, 255, 255, 255], i);
          area++;
        }
      }
      return { index: pi, x: px, y: py, w: pw, h: ph, area, canvas: fromImageData(art), mask: fromImageData(pm), tint: null };
    });

    const object = {
      id: o.id,
      name: o.name,
      index: oi,
      x,
      y,
      w,
      h,
      pieces,
      sil: fromImageData(sil),
      mask: fromImageData(mask),
      full: fromImageData(full),
      outline: fromImageData(outline),
    };
    for (const piece of pieces) piece.obj = object;
    return object;
  });

  return {
    id,
    tier,
    cut: data.cut,
    name: data.name,
    blurb: data.blurb,
    width: W,
    height: H,
    backdrop: data.backdrop,
    image,
    labels,
    objects,
  };
}

export function tinted(piece, color) {
  if (!piece.tint) {
    const c = makeCanvas(piece.w, piece.h);
    const g = c.getContext('2d');
    g.drawImage(piece.mask, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, piece.w, piece.h);
    piece.tint = c;
  }
  return piece.tint;
}

export function drawProgress(scene, canvas, save, withPieces = true) {
  canvas.width = scene.width;
  canvas.height = scene.height;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(scene.image, 0, 0);
  const done = new Set(save?.done ?? []);
  for (const o of scene.objects) {
    if (done.has(o.id)) continue;
    g.drawImage(o.sil, o.x, o.y);
    for (const i of withPieces ? save?.placed?.[o.id] ?? [] : []) {
      const p = o.pieces[i];
      if (p) g.drawImage(p.canvas, p.x, p.y);
    }
  }
}
