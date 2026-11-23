import { CAMPAIGN_SIZE, isDateId } from './levels.js';
import { createGame, tap } from './game.js';

const WINDOW_KEY = 'leadlight-active-v1';
export const STORAGE_KEY = 'leadlight-v1';

export function defaultProgress() {
  return { unlocked: 1, best: {}, trail: 1, trailCleared: 0, daily: {}, muted: false, calm: null, tipSeen: false, seen: {} };
}

function validEntries(value, accepts) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => accepts(key, item)));
}

const isGrade = (n) => Number.isInteger(n) && n >= 1 && n <= 3;

export function loadProgress(store) {
  try {
    if (store === undefined) store = globalThis.localStorage;
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const data = JSON.parse(raw);
    const progress = defaultProgress();
    if (!data || typeof data !== 'object' || Array.isArray(data)) return progress;
    if (Number.isInteger(data.unlocked) && data.unlocked >= 1 && data.unlocked <= CAMPAIGN_SIZE) progress.unlocked = data.unlocked;
    if (Number.isSafeInteger(data.trail) && data.trail >= 1) progress.trail = data.trail;
    if (Number.isSafeInteger(data.trailCleared) && data.trailCleared >= 0) progress.trailCleared = data.trailCleared;
    for (const key of ['muted', 'calm', 'tipSeen']) {
      if (typeof data[key] === 'boolean') progress[key] = data[key];
    }
    progress.best = validEntries(data.best, (key, n) => /^[1-9]\d*$/.test(key) && Number(key) <= CAMPAIGN_SIZE && isGrade(n));
    progress.daily = validEntries(data.daily, (date, n) => isDateId(date) && isGrade(n));
    progress.seen = validEntries(data.seen, (rule, seen) => ['keystone', 'pair', 'weighted'].includes(rule) && typeof seen === 'boolean');
    return progress;
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress, store) {
  try {
    if (store === undefined) store = globalThis.localStorage;
    store?.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

export function isUnlocked(progress, n) {
  return n >= 1 && n <= progress.unlocked;
}

export function recordWin(progress, level, grade, campaignSize) {
  if (level.kind === 'campaign') {
    if (level.number > progress.unlocked) return progress;
    progress.best[level.number] = Math.max(progress.best[level.number] || 0, grade);
    if (level.number === progress.unlocked) progress.unlocked = Math.min(campaignSize, level.number + 1);
  } else if (level.kind === 'trail') {
    if (level.number >= progress.trail) progress.trail = level.number + 1;
    progress.trailCleared = Math.max(progress.trailCleared, level.number);
  } else if (level.kind === 'daily') {
    progress.daily[level.date] = Math.max(progress.daily[level.date] || 0, grade);
  }
  return progress;
}

// A reload belongs to this tab. Campaign progress and grades remain in localStorage.
export function saveActiveWindow(hash, game, inspect, selected) {
  try {
    const store = globalThis.sessionStorage;
    if (game?.status !== 'playing') {
      store.removeItem(WINDOW_KEY);
      return;
    }
    const moves = game.history.map(record => {
      if (record.kind === 'slide') return record.from;
      const { q, r } = record.tiles[0];
      return `${q},${r}`;
    });
    store.setItem(WINDOW_KEY, JSON.stringify({
      hash, moves, keys: [...game.tiles.keys()], cracks: game.cracks, hints: game.hintsUsed, inspect, selected,
    }));
  } catch {}
}

export function loadActiveWindow() {
  try {
    const saved = JSON.parse(globalThis.sessionStorage.getItem(WINDOW_KEY));
    return typeof saved?.hash === 'string' ? saved : null;
  } catch {
    return null;
  }
}

export function replayActiveWindow(level, saved) {
  if (!saved || !Array.isArray(saved.moves) || !Array.isArray(saved.keys) ||
      !Number.isInteger(saved.cracks) || saved.cracks < 0 || saved.cracks >= level.cracks ||
      !Number.isSafeInteger(saved.hints) || saved.hints < 0) return null;
  const restored = createGame(level);
  for (const k of saved.moves) {
    const move = tap(restored, k);
    if (move.type !== 'slide' && move.type !== 'fly') return null;
  }
  // Undo can reinsert tiles at the end. Preserve their order for subsequent searches.
  if (restored.status !== 'playing' || saved.keys.length !== restored.tiles.size) return null;
  const ordered = new Map();
  for (const k of saved.keys) {
    if (!restored.tiles.has(k)) return null;
    ordered.set(k, restored.tiles.get(k));
  }
  if (ordered.size !== restored.tiles.size) return null;
  restored.tiles = ordered;
  restored.cracks = restored.bumps = saved.cracks;
  restored.hintsUsed = saved.hints;
  return restored;
}
