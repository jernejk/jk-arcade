# Craterwake

Kettle and Rivet are wind-up tin tanks duelling across the Saltpan Twins. Each tank has 100 armour blocks. Hits strip blocks from the tracks, hull and turret at the point of impact. Each lost block costs one percentage point. Break through to the gold core or sink the tank to win a round. Win two rounds to take the duel. The islands rebuild between rounds.

## Play

Run `npx serve` from the arcade repository root and open `/craterwake/`. The game runs directly from static files with no build step. After a first visit on localhost or HTTPS, the game caches its assets for offline play. Sound preferences use local storage when available.

| Action | Touch / mouse | Keyboard |
| --- | --- | --- |
| Turn the turret | Drag the battlefield | A/D or ←/→ |
| Set elevation | Slide the left brass knob or use the wheel | ↑/↓ |
| Set power | Drag the right rail or tap/hold ▲/▼ | W/S |
| Pick ammunition | Open the ammo tray | 1 Pebble, 2 Corkscrew, 3 Gull Strike, 4 Skipper |
| Fire | Press FIRE, or let the 20-second timer expire | Space or Enter |
| Skip the impact | Tap the field or Skip after 0.8 seconds | Space or Enter |
| Pause / sound | Use the top buttons | Esc / M |

The cream pips trace the first 35% of a windless arc. The wind tag gives strength and direction from the active tank's seat. Its horizontal arrow shows lateral drift, ▲ carries a shot farther, and ▼ shortens it. After your shot, the range call tells you how far to correct. Pebbles are unlimited. The two Corkscrews bore through cover. The single Gull Strike calls three clockwork birds down the flare line. Each round also carries two Skippers. They rebound up to twice off water or flat ground before their final impact. Red crates with a lightning stamp can set off nearby crates. Taking out a support drops the blocks it held, and a close blast can shove a tank over the edge. An intact hull still loses if it sinks.

The game follows the device’s reduced-motion setting. This holds camera positions during flight and impact and turns off shake, debris animation, vibration and sound effects. Tab moves between controls. Enter activates a focused button.

## Replay and judge

Use `/craterwake/?seed=824` for a repeatable arena. The results card shows the starting seed and the final round’s voxel checksum. Rematch replays the seed. A loss gives Kettle a third Corkscrew each round of the rematch. Bullseye rewards a direct hit, Undertow a ring-out win, and Untouched a round won at full hull.

On a fresh seed 824, fire the opening Pebble to set off both spring crates beneath the signal beam. For a knockback hit on Rivet, start fresh and fire a Pebble at +8° heading, 43° elevation and 75 power. For a double water skip, select Skipper at +12°, 23° and 43 power.

At the browser console, `window.__craterwake` reports the current camera beat, render scale, draw calls, triangles, pending chunk rebuilds, score and aim. `window.__craterwake.checksum()` hashes the live voxel grid. For repeatable portrait timing, open `/craterwake/scripts/impact-probe.html` in Safari and run it in the foreground with full motion. It alternates five crate chains and five direct armour hits at 390 × 844, verifies each result, and reports animation-frame intervals from impact entry through exit. For a physical-device check, record an impact orbit in Safari Web Inspector. The target is 16.7 ms per frame and at most 70 draws.

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
