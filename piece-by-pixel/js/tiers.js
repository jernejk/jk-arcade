export const TIERS = {
  normal: {
    id: 'normal',
    label: 'Normal',
    blurb: 'One landmark at a time, glowing outline, unlimited hints.',
    intro: null,
    glow: true,
    mixed: false,
    twist: null,
    twistShare: 1,
    tolerance: 1,
    hints: Infinity,
    autoHint: true,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    blurb: 'About twice the pieces, half of them turned, no glow, tighter snap, 3 hints.',
    intro: ['Hard: some pieces arrive turned', 'Tap a piece to rotate it · no glow · 3 hints'],
    glow: false,
    mixed: false,
    twist: true,
    twistShare: 0.5,
    tolerance: 0.65,
    hints: 3,
    autoHint: false,
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    blurb: 'Every landmark mixed into one tray, all pieces turned, tightest snap, 1 hint.',
    intro: ['Expert: every landmark is mixed together', 'Zoom in yourself · all pieces turned · 1 hint'],
    glow: false,
    mixed: true,
    twist: true,
    twistShare: 1,
    tolerance: 0.55,
    hints: 1,
    autoHint: false,
  },
  master: {
    id: 'master',
    label: 'Master',
    blurb: 'Silhouettes swallow the scenery around each landmark. Names hidden, all pieces turned, 2 hints.',
    intro: ['Master: each outline hides its surroundings too', 'Names stay secret until rebuilt · all turned · 2 hints'],
    glow: true,
    mixed: false,
    twist: true,
    twistShare: 1,
    tolerance: 0.55,
    hints: 2,
    autoHint: false,
    hideName: true,
    pop: false,
  },
};

export const TIER_ORDER = ['normal', 'hard', 'expert', 'master'];

export const progressKey = (id, tier) => (tier === 'normal' ? id : `${id}@${tier}`);

export const dataFile = (id, tier) => `assets/scenes/${id}/${tier === 'normal' ? 'data' : `data-${tier}`}.json`;
