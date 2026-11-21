import { toPixel, key } from './hex.js';

const EPS = 1e-6;
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r + EPS;

// Shapes are tested in pixel space with a unit hex (corner radius 1): one cell is √3 wide, rows are 1.5 apart.
const SHAPES = {
  rose: ({ radius }) => (x, y) => inCircle(x, y, 0, 0, radius),
  hexagon: ({ radius }) => (x, y, q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= radius,
  ring: ({ radius, hole }) => (x, y) => inCircle(x, y, 0, 0, radius) && !inCircle(x, y, 0, 0, hole),
  lancet: ({ halfWidth, height }) => {
    const spring = -height / 2 + halfWidth;
    const offset = halfWidth * 0.45;
    const reach = halfWidth + offset;
    return (x, y) => {
      if (Math.abs(x) > halfWidth + EPS || y > height / 2 + EPS) return false;
      if (y >= spring) return true;
      return inCircle(x, y, -offset, spring, reach) && inCircle(x, y, offset, spring, reach);
    };
  },
  vesica: ({ radius, offset }) => (x, y) => inCircle(x, y, -offset, 0, radius) && inCircle(x, y, offset, 0, radius),
  fanlight: ({ radius }) => (x, y) => y <= radius * 0.35 + EPS && inCircle(x, y, 0, radius * 0.35, radius),
  quatrefoil: ({ radius }) => {
    const lobe = radius * 0.5;
    const centres = [[lobe, 0], [-lobe, 0], [0, lobe], [0, -lobe]];
    return (x, y) => centres.some(([cx, cy]) => inCircle(x, y, cx, cy, lobe * 1.08));
  },
  cross: ({ arm, reach }) => (x, y) =>
    (Math.abs(x) <= arm + EPS && Math.abs(y) <= reach + EPS) || (Math.abs(y) <= arm + EPS && Math.abs(x) <= reach * 0.72 + EPS),
};

export const SHAPE_NAMES = Object.keys(SHAPES);

export function shapeCells(shape) {
  const test = SHAPES[shape.kind](shape);
  const cells = [];
  for (let r = -16; r <= 16; r++) {
    for (let q = -16; q <= 16; q++) {
      const { x, y } = toPixel(q, r);
      if (test(x, y, q, r)) cells.push([q, r]);
    }
  }
  return dropIslands(cells);
}

function dropIslands(cells) {
  const set = new Set(cells.map(([q, r]) => key(q, r)));
  const seen = new Set();
  let best = [];
  for (const [q, r] of cells) {
    const k = key(q, r);
    if (seen.has(k)) continue;
    const group = [];
    const stack = [[q, r]];
    seen.add(k);
    while (stack.length) {
      const [cq, cr] = stack.pop();
      group.push([cq, cr]);
      for (const [dq, dr] of [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]) {
        const nk = key(cq + dq, cr + dr);
        if (set.has(nk) && !seen.has(nk)) {
          seen.add(nk);
          stack.push([cq + dq, cr + dr]);
        }
      }
    }
    if (group.length > best.length) best = group;
  }
  const keep = new Set(best.map(([q, r]) => key(q, r)));
  return cells.filter(([q, r]) => keep.has(key(q, r)));
}
