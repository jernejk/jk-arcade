# Perigee

Fling a moon through a shrinking gold arc. Perfect flings hold the arc open. Miss, and it drifts into the dark.

A tap before the gold ends the run at once. Runs that catch the arc last about 45–110 seconds. The arc shrinks when you play safe and holds when you hit the white core, so the choice is on the screen as a meter, not only as a score.

## Inside a run

The moon never jumps. The next gold is placed a seeded distance ahead of wherever the moon already is, so a fixed beat dies within a few seconds. The opening orbit is steady and already moving; the second orbit is a twist. A perfect gives back the arc that orbit just took, and the white core stays at least about 50ms wide. Speed, a reverse, a sliding relic, and an off-centre core are what make later orbits harder.

The first orbit is steady. After that the ring changes:

- **Wild** surges and slows. Ride it into the core.
- **Echo** offers a silver arc first. Tapping it cashes out and breaks the chain. Waiting for the gold keeps the chain. The gap counts as a late cash, so the choice is not a trick death.
- **Veil** leaves the gold dim until the core ignites. Take the dim gold or wait.
- **Rift** turns the moon around. A perfect opens the arc a little wider.
- Every seventh orbit from the sixth is a **relic** core: a star on the bead. Hitting it banks a relic. Missing it and taking the gold is safe.

Three perfects raise the multiplier (Kindled, Bright, Corona). Quiet hour, after three finished runs, does not shrink the arc and closes itself at 100 seconds.

## Across days

Tonight's goal rotates through seven seals (score, perfects, combo, echo, relic, rift, veil). Clearing it lights that seal and keeps the streak. Moons, trails, and skies unlock from deeds: five perfects, a nightly clear, cash-then-perfect, a relic, a rift perfect, a second night, a three-day streak, a fourth day, three different goals, seven nights. Records are kept for free play, tonight, and quiet hour. Saves live in `localStorage` under `perigee-v2` (a v1 save still loads).

## How to play

Tap while the moon sits in the gold. The white core chains. On an echo, silver cashes out and gold pays more. Miss the gold and the run ends.

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
