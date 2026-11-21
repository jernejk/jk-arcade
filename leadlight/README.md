# Leadlight

A stained-glass window, set pane by pane in lead. Each pane has an arrow etched into it. Tap a pane and, if nothing stands between it and the edge of the window in that direction, it slides out with a chime and a glitter of light. If another pane is in the way, it bumps against it and the frame cracks. Clear every pane to let the dawn in.

## How to play

- Tap or click a pane to slide it out along its arrow.
- A blocked pane stays put and costs one crack. The gems in the top corner show how many cracks the frame can still take (three on small windows, up to five on the big ones).
- **Keystones** (from window 4) wear a gold-leaded ring. A keystone only leaves once every pane touching it has gone; tap it sooner and it bumps.
- **Leaded pairs** (from window 8) are joined by a lead bar and leave together. Both arrows need a clear run, or the pair bumps.
- Clear the window without cracks or hints for all three gems.
- Keys: **U** or **Z** undo, **H** hint, **R** restart, **M** mute, **Esc** menu.

There are 24 campaign windows, an endless Trail of generated windows, and a daily window seeded by your local date. A daily window can be shared as `#daily-YYYY-MM-DD`. Progress, sound and Calm mode stay in `localStorage` under `leadlight-v1`. Calm follows `prefers-reduced-motion` until you set it yourself.

## How windows are made

Every window is built backwards. The generator starts from an empty window shape and keeps setting a new pane in an empty cell, pointing it in a direction whose path is clear of every pane already in place. A keystone is only set where no pane touches it yet, and a leaded pair only where both arrows are clear. Playing those placements in reverse always works, so every window is solvable, and the reversed order is the solution that hints follow. Later windows favour arrows that point across long stretches of glass, so more panes end up waiting on others. A seeded PRNG makes each window id (`window-7`, `trail-12`, `daily-2026-11-22`) deterministic.

Clearing a pane only ever opens paths and frees keystones, so a window can't be ruined by playing in the wrong order; the only way to lose is to tap panes the rules hold in place. Campaign windows unlock in order, and a link to a locked window opens the windows grid instead.

## Checks

```bash
npm test
```

The logic tests run with Node alone. They check that every campaign window and a sample of trail and daily windows are solvable, that the generator never places a pane the rules would hold in place, and the fly-off, bump, crack, keystone, leaded-pair, win, lose, undo, hint and unlock rules.

`test/play.test.js` also drives the page in Chromium through `playwright-core` (a dev dependency: `npm install`). It uses Playwright's Chromium, then falls back to an installed Chrome, or set `LEADLIGHT_CHROME` to a browser executable. Without one, those tests are skipped and the logic tests still run.

`npm run shot` rebuilds `../shots/leadlight.webp` for the arcade launcher (needs `cwebp`).

## Files

Static and offline: `index.html`, `style.css`, `favicon.svg` and the modules in `src/` (`hex`, `shapes`, `board`, `generator`, `levels`, `game` for the rules; `render`, `audio`, `storage`, `main` for the page). Sounds are synthesized with Web Audio. No fonts, images or network calls. Serve it with `npx serve leadlight` from the repo root.

Leadlight is an original game: its name, windows, art, sounds and copy were made for this arcade.
