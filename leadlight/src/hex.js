export const SQRT3 = Math.sqrt(3);

// Pointy-top axial directions, counter-clockwise from east; on screen, dir d points at -60°·d.
export const DIRS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export const DIR_NAMES = ['east', 'north-east', 'north-west', 'west', 'south-west', 'south-east'];

export const key = (q, r) => `${q},${r}`;

export function toPixel(q, r, size = 1) {
  return { x: size * SQRT3 * (q + r / 2), y: size * 1.5 * r };
}

export function fromPixel(x, y, size = 1) {
  const q = ((SQRT3 / 3) * x - y / 3) / size;
  const r = ((2 / 3) * y) / size;
  return roundAxial(q, r);
}

export function roundAxial(qf, rf) {
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const s = Math.round(sf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q: q + 0, r: r + 0 };
}

export function dirVector(dir) {
  const a = (-Math.PI / 3) * dir;
  return { x: Math.cos(a), y: Math.sin(a) };
}

export function cornerPoints(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]);
  }
  return pts;
}

// Edge i of cornerPoints sits between corner i and i+1 and faces this neighbour.
export const EDGE_NEIGHBOUR = [0, 5, 4, 3, 2, 1].map((d) => DIRS[d]);
