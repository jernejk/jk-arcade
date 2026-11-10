# Perigee

Fling a moon through a shrinking gold arc. Perfect flings hold the arc open. Miss, and it drifts into the dark.

A tap before the gold ends the run at once. A run that actually catches the arc lasts about a minute: the window shrinks and the moon speeds up either way, so a careful run and a messy one finish in a similar span. The score is what separates them. Perfects pay more and give a little of the arc back.

Tonight's orbit uses the date as a seed, so the pattern is the same until midnight. Score 250 on it to keep a streak. Best score, streak, trail, mute, and motion preference stay in `localStorage` under `perigee-v1`.

## How to play

Tap while the moon sits in the gold arc. The bright core is a perfect fling. Perfects give more points and a little of the arc back. Any other fling scores less and lets the arc shrink. Tap too early, too late, or let the moon pass the arc, and the run ends.

Wild orbits speed up and slow down. Watch the moon.

Tap targets are the whole screen except the buttons. Space flings, R restarts, M mutes.

## Why this game

Three concepts were sketched against the arcade that's already here (quilts, pixel postcards, toy physics, cord puzzles, jewel floods, bead shooters, a short story). None of those are timing games, and none of these three borrow their board.

1. **Brim.** One cup of tea. Sip to keep it hot, but every sip sloshes, and a wave over the rim ends the run. The tension is real, and it would have looked cozy. It loses because good play collapses into one patient rhythm, and the fail state is a meter draining rather than a sharp miss you want to replay.

2. **Zipflash.** Drag a zipper up a storm and freeze your thumb while lightning hits a tooth. Very physical, and original. It loses because a vertical drag fights the page, the safe gap is fiddly under a thumb, and the rule takes longer than a few seconds to trust.

3. **Perigee.** Chosen. One tap, a gold window you can see coming, and a perfect core that literally buys the next second of life. The window jumps around the ring and wild orbits break a memorized beat, so it does not flatten into a metronome. Most deaths are near misses, which is the "one more" hook. A nightly seeded orbit, a streak, and cosmetic trails are the reason to open it again tomorrow. Nothing about it needs a second finger, a hover state, or a loading step.

It is not a lane runner, a stacker, a match puzzle, or a flap. The skill is when the moon crosses a moving arc, and the score chase is how long you can keep that arc alive.

## Checks

```bash
npm test
```

Core rules live in `logic.js` and do not touch the DOM. The page is static: `index.html`, `style.css`, `main.js`, `audio.js`, and an SVG favicon. Serve the folder (`npx serve perigee` from the repo, or any static host). No network calls.

Mute silences the synthesized stingers and the vibration. Motion follows the device, or can be forced reduced or full. Reduced motion keeps the moon moving (that is the game) and drops the shake, sparks, trail, and fly-off.
