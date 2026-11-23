# Grokstone

Aim a cannon at a rival keep. The banner only falls when the stone under it does.

Drag to aim and let go. You take a shot, then the other keep answers. Gold stone, timber, and cinder kegs give up before ashlar does. Rubble from a keep you bring down spends in the mason's yard.

Eight sieges, then a trail. Today's keep is seeded by the date, and a share link opens that same keep. Progress stays in `localStorage` under `grokstone-v1`.

Ida Flint fires roundshot. Puck Harrow, Sable Quinn, and Bram Holt are hired in the yard. Nothing here is taken from another siege game: the keeps, crews, and pictures are original.

## How to play

Drag on the field, release to fire. Arrows aim, Space fires, 1–4 pick a crew, M mutes, R selects Retry (Enter confirms), Esc holds.

Sound is synthesized in the browser. Motion follows the device, or can be set calm or full. Calm drops the shake and the slow collapse.

## Checks

```bash
npm test
```

The browser check uses Playwright's Chromium. Install it once with `npx playwright install chromium`. Without it, the check falls back to the installed Google Chrome. To point it at another browser, set `GROKSTONE_CHROME` to that executable.

Core rules live in `logic.js`. The page is static: `index.html`, `style.css`, `main.js`, `audio.js`, `physics.js`, and Matter boxed up in `vendor/` so the folder works offline. Serve it with `npx serve grokstone` from the repo.
