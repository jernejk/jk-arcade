import { WIDTH, HEIGHT, LENGTH, CHUNK } from './world.js';

// Merge coplanar exposed faces of equal material inside a chunk. Neighbours outside
// the chunk still occlude faces, so a cut on a boundary dirties both meshes.
export function greedyMesh(world, id) {
  const base = [
    (id % 3) * 16,
    (Math.floor(id / 3) % 3) * 16,
    Math.floor(id / 9) * 16,
  ];
  const size = [WIDTH, HEIGHT, LENGTH].map((n, d) =>
    Math.min(CHUNK, n - base[d]),
  );
  const positions = [],
    colors = [],
    materials = [],
    indices = [],
    mask = new Int16Array(256);
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3,
      v = (d + 2) % 3;
    for (let layer = 0; layer < size[d]; layer++)
      for (const sign of [-1, 1]) {
        const p = [...base];
        p[d] += layer;
        for (let j = 0; j < size[v]; j++)
          for (let i = 0; i < size[u]; i++) {
            p[u] = base[u] + i;
            p[v] = base[v] + j;
            const m = world.get(p[0], p[1], p[2]);
            p[d] += sign;
            mask[j * size[u] + i] = m && !world.get(p[0], p[1], p[2]) ? m : 0;
            p[d] -= sign;
          }
        for (let j = 0; j < size[v]; j++)
          for (let i = 0; i < size[u]; ) {
            const n = j * size[u] + i,
              m = mask[n];
            if (!m) {
              i++;
              continue;
            }
            let w = 1,
              h = 1;
            while (i + w < size[u] && mask[n + w] === m) w++;
            outer: while (j + h < size[v]) {
              for (let k = 0; k < w; k++)
                if (mask[n + h * size[u] + k] !== m) break outer;
              h++;
            }
            const start = positions.length / 3;
            const tint = faceTint[m],
              light = [
                [0.83, 1.02],
                [0.65, 1.15],
                [0.79, 0.94],
              ][d][sign > 0 ? 1 : 0];
            for (const [a, b] of [
              [0, 0],
              [w, 0],
              [w, h],
              [0, h],
            ]) {
              const q = [...base];
              q[d] += layer + (sign > 0 ? 1 : 0);
              q[u] += i + a;
              q[v] += j + b;
              positions.push(...q);
              materials.push(m);
              // Sample the blocks outside each corner for a small baked contact shadow.
              const s = [...p];
              s[d] = base[d] + layer + sign;
              s[u] = q[u] + (a ? -1 : 0);
              s[v] = q[v] + (b ? -1 : 0);
              s[u] += a ? 1 : -1;
              const sideU = !!world.get(s[0], s[1], s[2]);
              s[v] += b ? 1 : -1;
              const corner = !!world.get(s[0], s[1], s[2]);
              s[u] -= a ? 1 : -1;
              const sideV = !!world.get(s[0], s[1], s[2]);
              const ao =
                1 - 0.07 * (Number(sideU) + Number(sideV) + Number(corner));
              colors.push(...tint.map((c) => c * light * ao));
            }
            for (const k of sign > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2])
              indices.push(start + k);
            for (let row = 0; row < h; row++)
              mask.fill(0, n + row * size[u], n + row * size[u] + w);
            i += w;
          }
      }
  }
  return { positions, colors, materials, indices };
}
export const palette = [
  '#000000',
  '#444758',
  '#b9664d',
  '#eec18f',
  '#929647',
  '#408c89',
  '#f3dfba',
  '#cb6552',
  '#be935d',
  '#8b6557',
  '#d54d32',
];
const faceTint = palette.map((hex) =>
  [1, 3, 5].map((i) => {
    const s = parseInt(hex.slice(i, i + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }),
);
