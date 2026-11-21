import { generateLevel } from './generator.js';
import { makeRng } from './rng.js';

const CAMPAIGN = [
  ['First Light', { kind: 'hexagon', radius: 1 }, 'rings'],
  ['Porch Lamp', { kind: 'lancet', halfWidth: 2.2, height: 7 }, 'bands'],
  ['Little Rose', { kind: 'hexagon', radius: 2 }, 'petals'],
  ['Pantry Door', { kind: 'lancet', halfWidth: 2.7, height: 9 }, 'bands'],
  ['Hall Fanlight', { kind: 'fanlight', radius: 5.4 }, 'rings'],
  ['Garden Rose', { kind: 'rose', radius: 4.4 }, 'petals'],
  ['Bathhouse Oval', { kind: 'vesica', radius: 6.4, offset: 2.4 }, 'weave'],
  ['Stairwell', { kind: 'lancet', halfWidth: 3.6, height: 11 }, 'bands'],
  ['Clover', { kind: 'quatrefoil', radius: 5.2 }, 'petals'],
  ['Well of Light', { kind: 'ring', radius: 5.2, hole: 1.8 }, 'rings'],
  ['Honeycomb', { kind: 'hexagon', radius: 3 }, 'weave'],
  ['Rose of Six', { kind: 'rose', radius: 5.6 }, 'petals'],
  ['Weaver\u2019s Oval', { kind: 'vesica', radius: 8, offset: 3 }, 'rings'],
  ['Chapel Lancet', { kind: 'lancet', halfWidth: 4.4, height: 14 }, 'bands'],
  ['Nave Cross', { kind: 'cross', arm: 2.7, reach: 8 }, 'weave'],
  ['Crypt Ring', { kind: 'ring', radius: 6.8, hole: 2.2 }, 'rings'],
  ['Quatrefoil', { kind: 'quatrefoil', radius: 6.6 }, 'petals'],
  ['Great Fanlight', { kind: 'fanlight', radius: 7.9 }, 'petals'],
  ['Cathedral Oval', { kind: 'vesica', radius: 9.5, offset: 3.5 }, 'weave'],
  ['Hexagon Hall', { kind: 'hexagon', radius: 4 }, 'petals'],
  ['Bell Tower', { kind: 'lancet', halfWidth: 6, height: 17 }, 'weave'],
  ['Twin Lancet', { kind: 'lancet', halfWidth: 5.3, height: 15 }, 'bands'],
  ['Lantern Cross', { kind: 'cross', arm: 3.6, reach: 9.6 }, 'weave'],
  ['The Great Rose', { kind: 'rose', radius: 7.6 }, 'rings'],
];

export const CAMPAIGN_SIZE = CAMPAIGN.length;

function cracksFor(cells) {
  return cells < 40 ? 3 : cells < 70 ? 4 : 5;
}

function attemptsFor(bias) {
  return 1 + Math.round(bias * 1.6);
}

export function campaignLevel(n) {
  const [name, shape, pattern] = CAMPAIGN[n - 1];
  const t = (n - 1) / (CAMPAIGN.length - 1);
  const fill = n === 1 ? 1 : 0.72 + t * 0.24;
  const bias = 0.3 + t * 4.7;
  const colours = 2 + Math.round(t * 4);
  const level = generateLevel({
    id: `window-${n}`,
    name,
    seed: `leadlight/window/${n}`,
    shape,
    fill,
    bias,
    colours,
    pattern,
    attempts: attemptsFor(bias),
  });
  level.cracks = cracksFor(level.cells.length);
  level.kind = 'campaign';
  level.number = n;
  return level;
}

const TRAIL_SHAPES = [
  (rng, d) => ({ kind: 'rose', radius: 4.2 + d * 3 + rng.next() * 0.6 }),
  (rng, d) => ({ kind: 'lancet', halfWidth: 4 + d * 2 + rng.next() * 0.5, height: 12 + d * 5 }),
  (rng, d) => ({ kind: 'vesica', radius: 5.6 + d * 2.6, offset: 2.6 + d }),
  (rng, d) => ({ kind: 'quatrefoil', radius: 5.6 + d * 1.6 }),
  (rng, d) => ({ kind: 'ring', radius: 5.4 + d * 1.6, hole: 1.8 + rng.next() * 0.6 }),
  (rng, d) => ({ kind: 'hexagon', radius: 3 + Math.round(d) }),
  (rng, d) => ({ kind: 'fanlight', radius: 6 + d * 1.8 }),
  (rng, d) => ({ kind: 'cross', arm: 2.8 + d * 0.9, reach: 8 + d * 1.8 }),
];

const PATTERNS = ['rings', 'petals', 'weave', 'bands', 'mosaic'];
const TRAIL_WORDS = ['Ember', 'Vesper', 'Lattice', 'Hollow', 'Meadow', 'Harbour', 'Orchard', 'Tide', 'Saffron', 'Lumen', 'Cinder', 'Halcyon', 'Morrow', 'Thistle', 'Quill', 'Juniper'];
const TRAIL_NOUNS = ['Rose', 'Lancet', 'Oval', 'Clover', 'Ring', 'Comb', 'Fanlight', 'Cross'];

function generatedLevel({ id, seed, difficulty, name }) {
  const rng = makeRng(`${seed}/spec`);
  const d = Math.max(0, Math.min(1, difficulty));
  const shapeIndex = rng.int(TRAIL_SHAPES.length);
  const shape = TRAIL_SHAPES[shapeIndex](rng, d);
  const bias = 2.4 + d * 2.8;
  const level = generateLevel({
    id,
    name: name ?? `${rng.pick(TRAIL_WORDS)} ${TRAIL_NOUNS[shapeIndex]}`,
    seed,
    shape,
    fill: 0.86 + d * 0.1,
    bias,
    colours: 4 + Math.round(d * 2),
    pattern: rng.pick(PATTERNS),
    attempts: attemptsFor(bias),
  });
  level.cracks = cracksFor(level.cells.length);
  return level;
}

export function trailLevel(n) {
  const level = generatedLevel({ id: `trail-${n}`, seed: `leadlight/trail/${n}`, difficulty: Math.min(1, (n - 1) / 30) });
  level.kind = 'trail';
  level.number = n;
  return level;
}

export function localDateId(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dailyLevel(dateId) {
  const level = generatedLevel({ id: `daily-${dateId}`, seed: `leadlight/daily/${dateId}`, difficulty: 0.55 });
  level.kind = 'daily';
  level.date = dateId;
  return level;
}

export function isDateId(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00`));
}
