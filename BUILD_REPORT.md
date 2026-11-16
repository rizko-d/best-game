# BUILD_REPORT — EMBERFALL: The Last Lantern (best-game-01)

## Concept

A neon arena survival shooter. You are the last lantern warden, keeping one
light alive against the dark. Survive 10 waves of shadow creatures, then slay
the Dusk Warden boss — and dawn breaks. Original idea, art (canvas-drawn),
sound (WebAudio synthesis) and names; no library, no images, no sound files,
no network.

- **Enemies:** Motes (fast chasers), Spitters (keep a ring, shoot orbs),
  Brutes (slow, 6 HP, hexagonal), the Dusk Warden boss (wave 10, 42 HP,
  radial orb bursts, spawns motes when enraged below half health).
- **Player:** WASD/arrows move, mouse aims, hold click to shoot ember bolts.
  Shift dashes (speed + brief invulnerability), Q fires a Nova burst that
  burns everything within 220 px (costs a full Nova charge, recharged by
  collecting embers and slowly over time).
- **Progression:** kills build a combo (score multiplier up to x3) and drop
  embers; every even wave clear drops a power-up — Spread Shot, Rapid Fire,
  Piercing Bolts, +1 Heart, or Nova Full. Wave clear also pays a wave bonus.
- **Win / lose:** clear wave 10 → VICTORY screen ("DAWN BREAKS") with
  score, best, kills, time and accuracy. Lose all 3 hearts → GAME OVER
  with the same stats. Both offer restart (Space / click). Title, pause
  (P/Esc, also on tab-hide), mute (M), and a best score in localStorage.

## Controls

| Input | Action |
|---|---|
| WASD / Arrows | Move |
| Mouse | Aim |
| Hold left click | Shoot |
| Shift | Dash |
| Q | Nova burst |
| P / Esc | Pause / resume |
| M | Mute |
| Space / click | Start / restart |

## Files

```
entry/
  main.ts                  # rewritten in this session; copies game/ + screenshots/, writes dossier.json
  serve.ts                 # local static server for play-testing only
  LICENSE                  # MIT
  README.md                # with best-game-01 badges for rizko-d/best-game
  shots.json               # the 4 deterministic shot scenes
  .makefun/owner.json      # {"wallet": "vitaKkZsRToivowgPSba4wCKZ8buCQQzQvxeLXyxoFC"}
  vendor/makefun-game.ts   # kit copy, byte-for-byte (sha256 dc671875…)
  game/
    index.html             # canvas + status line, module script only
    src/config.js          # tuning, palette, waves
    src/random.js          # seeded RNG (mulberry32)
    src/audio.js           # WebAudio synth SFX + drone/pulse music, no files
    src/input.js           # keyboard + mouse, one-shot action flags
    src/world.js           # rules: waves, enemies, bolts, orbs, embers, power-ups, particles
    src/render.js          # neon canvas rendering, shake, flash, HUD, panels
    src/shots.js           # deterministic ?shot= scenes (start/play/boss/win/end)
    src/main.js            # boot, fixed 1/60 s loop, screens
  screenshots/
    1-title.jpg  36 KiB    # title over a live arena (seed 7)
    2-play.jpg   47 KiB    # wave 3, combo x8, score 959 (seed 7)
    3-boss.jpg   55 KiB    # wave 10, Dusk Warden boss, kill bursts (seed 7)
    4-win.jpg    38 KiB    # DAWN BREAKS victory panel (seed 7)
```

Total game source: ~76 KiB, 9 files. Dossier: 293,245 bytes.

## How to run

```sh
node serve.ts            # http://localhost:8080
MAKEFUN_OUTPUT_DIR=/tmp/out-best node main.ts   # grader-style build
```

## What was verified (2026-11-16, Node v24.22.1, Chromium 1255)

1. `MAKEFUN_OUTPUT_DIR=/tmp/out-best node main.ts` — succeeds; output has
   game/ (9 files), screenshots/ (4 files), dossier.json 293,245 bytes.
2. Real screenshots via Playwright + headless Chromium at 1280x720, from
   `?shot=start|play|boss|win&seed=7`, each waiting for `window.__shotReady`.
   All 4 are ≤ 56 KiB (cap 256 KiB), 1280x720. Eyeballed: title clean,
   play shows HUD/score/combo/power-up/kill floater, boss shows the Warden
   with health bar amid a busy fight, win shows the DAWN BREAKS panel.
   The `?shot=end` scene was also rendered and checked (no errors).
3. Live play-test (scripted keyboard + mouse): title → Space starts →
   shooting/moving for ~9 s → hits register ("Hit. One heart left.") →
   P pauses, P resumes. No page errors, no console errors.
4. Built output re-tested separately: served `/tmp/out-best/game` as a
   static root, played 5 s, status "Hit. 2 hearts left.", no errors, and
   **zero requests outside localhost** (no network).
5. Kit check (`makefun.mjs check --repo . --worktree`, no transcripts):
   **4 passed, 1 failed, 14 skipped, 5 checked at submission.**
   Passed: competition_open, snapshot, license_osi, entrypoint.
   Failed: transcripts_present only — expected, because the parent agent
   bundles transcripts at submit time; I did not bundle or submit.
   The 5 at-submission checks (repo public / owner / created-after-open /
   commit-in-repo / duplicate_snapshot) are for submit time. Note: the
   repo rizko-d/best-game was created 2026-11-16 22:27 WIB, public, empty —
   after the competition opened (2026-11-15 18:00 UTC).

## Fixes made during testing

- My first `serve.ts` served `index.html` at `/` while its modules live
  under `/game/src/`, so the modules 404'd. Fixed by serving `game/` as
  the web root (the same layout the finalist review uses).
- The HUD's "NOVA [Q]" label overlapped its charge bar; moved left of it.
- The title backdrop was empty (wave flow was gated behind non-attract
  play); wave spawning now also runs behind the title, so motes drift
  behind the panel.
- The win screenshot showed "WAVE 4 / 10" behind the victory panel;
  the win scene now sets wave 10 and clears the banner.

## Known weaknesses

- **Difficulty is untested by a real human.** The autopilot survives
  waves 1–3 and reaches the boss, but a scripted live player lost a
  heart in ~9 s standing mostly still. A skilled player should do better;
  a casual one may find waves 4+ harsh (spitter orbs + brute HP).
- **The play screenshot is mid-wave but sparse in the centre** — the
  autopilot had just cleared most of wave 3 when the frame was taken.
  The boss screenshot is the busiest frame.
- **The win scene is staged, not a full live win:** it plays 14 s of real
  rules forward, then shows the real victory panel over that arena with
  representative stats. A full live win takes ~7 minutes and was not
  played end-to-end by a human or script.
- **No touch controls** — desktop keyboard + mouse only, as the bounty
  requires; mobile is out of scope.
- **Music is minimal** (a low drone + slow pulse) rather than a composed
  track; SFX carry most of the audio identity.
- **Judge risk:** the game is a 2D arena shooter, a crowded genre among
  6,900+ entries; its edge is the lantern/Nova hook, the boss, and the
  complete loop shown across all four screenshots — not raw novelty.
