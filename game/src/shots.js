// The screenshot scenes behind ?shot=start|play|boss|win|end. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot (keep a ring around the nearest enemy, shoot
// it, dash away when crowded, nova when swarmed), so the frame is what a real
// game looks like and the same seed always gives the same frame. The win scene
// plays forward first, then shows the real victory panel over that arena.

import { FIELD, STEP, WAVES } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 34;
const BOSS_SECONDS = 26;
const END_LIMIT_SECONDS = 120;

/** Steer the warden: keep ~180 px from the nearest enemy, shoot it, dash/nova when crowded. */
function autopilot(state, reckless) {
  const p = state.player;
  let nearest = null;
  let nearestD = Infinity;
  let close = 0;
  for (const e of state.enemies) {
    if (!e.active) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestD) {
      nearestD = d;
      nearest = e;
    }
    if (d < 200) close += 1;
  }
  let mx = 0;
  let my = 0;
  let aim = { x: p.x, y: p.y - 100 };
  let firing = false;
  let dash = false;
  let nova = false;
  if (reckless) {
    // Walk straight at the nearest shadow, never shoot: a hurried player dies.
    if (nearest) {
      mx = (nearest.x - p.x) / nearestD;
      my = (nearest.y - p.y) / nearestD;
    }
    return { move: { x: mx, y: my }, aim, firing: false, dash: false, nova: false };
  }
  if (nearest) {
    aim = { x: nearest.x, y: nearest.y };
    firing = true;
    // Back away if too close, close in if too far to hit reliably.
    const want = 190;
    const dx = (p.x - nearest.x) / nearestD;
    const dy = (p.y - nearest.y) / nearestD;
    if (nearestD < want - 40) {
      mx = dx;
      my = dy;
    } else if (nearestD > want + 80) {
      mx = -dx;
      my = -dy;
    }
    // Drift toward the centre so the warden never gets cornered.
    mx += (FIELD.width / 2 - p.x) / FIELD.width * 0.4;
    my += (FIELD.height / 2 - p.y) / FIELD.height * 0.4;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    if (nearestD < 70 && p.dashCooldown <= 0) dash = true;
    if (close >= 5 && p.nova >= 100) nova = true;
  } else {
    mx = (FIELD.width / 2 - p.x) / 400;
    my = (FIELD.height / 2 - p.y) / 400;
  }
  return { move: { x: mx, y: my }, aim, firing, dash, nova };
}

function playFor(world, seconds, reckless) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    const ctl = autopilot(world.state, reckless);
    world.step(STEP, ctl, false);
    if (world.state.over || world.state.won) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw and the best
 * score to show. Unknown names stage the title.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    world.startWave(1);
    playFor(world, PLAY_SECONDS, false);
    return { screen: SCREEN_PLAY, best: 0, stats: { accuracy: 0, time: '0:24' } };
  }
  if (name === 'boss') {
    world.startWave(10);
    playFor(world, BOSS_SECONDS, false);
    return { screen: SCREEN_PLAY, best: 0, stats: { accuracy: 0, time: '0:26' } };
  }
  if (name === 'end') {
    world.startWave(1);
    playFor(world, END_LIMIT_SECONDS, true);
    return { screen: SCREEN_OVER, best: world.state.score, stats: { accuracy: 0, time: '1:12' } };
  }
  if (name === 'win') {
    world.startWave(3);
    playFor(world, 14, false);
    world.state.won = true;
    world.state.wave = WAVES;
    world.state.banner = '';
    world.state.bannerTimer = 0;
    world.state.score = Math.max(world.state.score, 2450);
    world.state.kills = Math.max(world.state.kills, 87);
    return { screen: SCREEN_WIN, best: world.state.score, stats: { accuracy: 62, time: '6:41' } };
  }
  // Title: the arena alive behind the panel, nothing scoring.
  world.startWave(1);
  for (let i = 0; i < START_SECONDS / STEP; i += 1) {
    world.step(STEP, { move: { x: 0, y: 0 }, aim: { x: FIELD.width / 2, y: 100 }, firing: false, dash: false, nova: false }, true);
  }
  return { screen: SCREEN_TITLE, best: 0, stats: { accuracy: 0, time: '0:00' } };
}
