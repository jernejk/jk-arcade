export const STORAGE_KEY = 'leadlight-v1';

export function defaultProgress() {
  return { unlocked: 1, best: {}, trail: 1, trailCleared: 0, daily: {}, muted: false, calm: null, tipSeen: false };
}

export function loadProgress(store = globalThis.localStorage) {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const data = JSON.parse(raw);
    return { ...defaultProgress(), ...data };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress, store = globalThis.localStorage) {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

export function recordWin(progress, level, grade, campaignSize) {
  if (level.kind === 'campaign') {
    progress.best[level.number] = Math.max(progress.best[level.number] || 0, grade);
    progress.unlocked = Math.min(campaignSize, Math.max(progress.unlocked, level.number + 1));
  } else if (level.kind === 'trail') {
    if (level.number >= progress.trail) progress.trail = level.number + 1;
    progress.trailCleared = Math.max(progress.trailCleared, level.number);
  } else if (level.kind === 'daily') {
    progress.daily[level.date] = Math.max(progress.daily[level.date] || 0, grade);
  }
  return progress;
}
