# emberfall — The Last Lantern

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/rizko-d/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/rizko-d/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A neon arena survival shooter. You are the last lantern warden, keeping one
light alive against the dark. Survive 10 waves of shadow creatures, then slay
the Dusk Warden boss — and dawn breaks.

## How to play

- **WASD / Arrows** — move
- **Mouse** — aim, **hold click** — shoot ember bolts
- **Shift** — dash (brief speed + invulnerability)
- **Q** — Nova burst: burns everything near you (needs a full Nova charge)
- **P / Esc** — pause, **M** — mute, **Space** — start / restart

Motes chase you, spitters keep their distance and shoot, brutes soak up
bolts. Kills build a combo and drop embers — collect them to recharge Nova.
Between waves, grab a power-up: Spread Shot, Rapid Fire, Piercing Bolts,
+1 Heart, or a full Nova. Three hearts; lose them all and the light goes out.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or hand it in the way the grader does:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
```

No build step, no network, no libraries: plain static files under `game/`,
sound synthesised with WebAudio, art drawn on canvas. Best score is kept in
your browser's localStorage.

---

<sub>Entered on [make.fun](https://make.fun/?ref=rizko-f&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
