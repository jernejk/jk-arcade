# Craterwake

Kettle and Rivet are wind-up tin tanks duelling across the Saltpan Twins. Win two rounds by wearing down the other hull, or by taking the ground out from under its tracks. The islands rebuild between rounds.

## Play

Run `npx serve` from the arcade repository root and open `/craterwake/`. The game runs directly from static files with no build step. After a first visit on localhost or HTTPS, the game caches its assets for offline play. Sound preferences use local storage when available.

| Action | Touch / mouse | Keyboard |
| --- | --- | --- |
| Turn the turret | Drag the battlefield | A/D or ←/→ |
| Set elevation | Slide the left brass knob or use the wheel | ↑/↓ |
| Set power | Drag the right rail or tap/hold ▲/▼ | W/S |
| Pick ammunition | Open the ammo tray | 1 Pebble, 2 Corkscrew, 3 Gull Strike |
| Fire | Press FIRE, or let the 20-second timer expire | Space or Enter |
| Skip the impact | Tap the field or Skip after 0.8 seconds | Space or Enter |
| Pause / sound | Use the top buttons | Esc / M |

The cream pips trace the first 35% of a windless arc. The wind tag gives strength and direction from the active tank's seat. Its horizontal arrow shows lateral drift, ▲ carries a shot farther, and ▼ shortens it. After your shot, the range call tells you how far to correct. Pebbles are unlimited. The two Corkscrews bore through cover. The single Gull Strike calls three clockwork birds down the flare line. An intact hull still loses if it sinks.

The game follows the device’s reduced-motion setting. This holds camera positions during flight and impact and turns off shake, debris animation, vibration and sound effects. Tab moves between controls. Enter activates a focused button.

## Replay and judge

Use `/craterwake/?seed=824` for a repeatable arena. The results card shows the starting seed and the final round’s voxel checksum. Rematch replays the seed. A loss gives Kettle a third Corkscrew each round of the rematch. Bullseye rewards a direct hit, Undertow a ring-out win, and Untouched a round won at full hull.

At the browser console, `window.__craterwake` reports the current camera beat, render scale, draw calls, triangles, pending chunk rebuilds, score and aim. `window.__craterwake.checksum()` hashes the live voxel grid. For the physical-device performance check, record an impact orbit in Safari Web Inspector. The target is 16.7 ms per frame and at most 70 draws.

## Tests

From this folder, run:

```sh
npm ci
npm test
```

The deterministic simulation tests need only Node. Browser checks use Playwright Core and a local Chromium or Google Chrome. Set `CRATERWAKE_CHROME` to a specific executable if needed. Browser tests skip when Playwright or a compatible browser is absent. They cover 390 × 844 portrait, centred desktop play, offline reload, the four camera beats, keyboard and pointer controls, and a full match through rematch. `npm run shot` reproduces the arcade launcher image from the supplied panoramic key art.

## Implementation and credits

The simulation advances shots at 120 Hz against a 48 × 40 × 112 voxel volume. The renderer greedily meshes exposed faces in 16-block chunks. A module worker rebuilds dirty chunks after a blast and discards obsolete results. Browsers without module workers rebuild those chunks on the main thread. The sea, scenery, tanks, ammunition and particles use local geometry and materials. No real-time shadow or post-processing passes run.

Craterwake, its tanks, setting, artwork and game copy are original. Title, launcher and ammunition art come from JK’s Craterwake v2 concept pack. The live HUD and battlefield are rendered by the game. Three.js r160 is vendored under its MIT licence in `vendor/THREE-LICENSE.txt`. Bungee uses the arcade’s existing SIL Open Font License in `../fonts/OFL-Bungee.txt`.
