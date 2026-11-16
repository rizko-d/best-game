// EMBERFALL's rules and state, with no drawing and no browser in it: the
// lantern warden, the waves of shadow creatures, bolts, orbs, embers, power-ups
// and particles. step() advances one fixed step and returns what happened as
// bit flags, so the caller can react (sound, shake, banners) without the world
// knowing about screens or audio. Pools are allocated once, at boot.

import { ENEMY, FIELD, ORB, PLAYER, POWERUPS, WAVES } from './config.js';

export const KIND_MOTE = 0;
export const KIND_SPITTER = 1;
export const KIND_BRUTE = 2;
export const KIND_BOSS = 3;

export const EVENT_HIT = 1;
export const EVENT_KILL = 2;
export const EVENT_PICKUP = 4;
export const EVENT_POWERUP = 8;
export const EVENT_WAVE = 16;
export const EVENT_WIN = 32;
export const EVENT_OVER = 64;
export const EVENT_NOVA = 128;
export const EVENT_BOSS = 256;

const POOL_ENEMY = 96;
const POOL_BOLT = 64;
const POOL_ORB = 48;
const POOL_EMBER = 96;
const POOL_PARTICLE = 256;
const POOL_FLOATER = 32;

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2, y: FIELD.height / 2, angle: 0,
    hearts: PLAYER.hearts, invulnerable: 0,
    dashTime: 0, dashCooldown: 0, fireTimer: 0,
    spread: 0, rapid: 0, pierce: 0, nova: 0,
  };
  const enemies = [];
  for (let i = 0; i < POOL_ENEMY; i += 1) {
    enemies.push({ active: false, kind: KIND_MOTE, x: 0, y: 0, vx: 0, vy: 0, radius: 0, hp: 0, maxHp: 0, speed: 0, score: 0, ember: 0, fireTimer: 0, wobble: 0, flash: 0 });
  }
  const bolts = [];
  for (let i = 0; i < POOL_BOLT; i += 1) bolts.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, damage: 1 });
  const orbs = [];
  for (let i = 0; i < POOL_ORB; i += 1) orbs.push({ active: false, x: 0, y: 0, vx: 0, vy: 0 });
  const embers = [];
  for (let i = 0; i < POOL_EMBER; i += 1) embers.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, value: 0, life: 0 });
  const particles = [];
  for (let i = 0; i < POOL_PARTICLE; i += 1) particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, color: '#fff' });
  const floaters = [];
  for (let i = 0; i < POOL_FLOATER; i += 1) floaters.push({ active: false, x: 0, y: 0, text: '', life: 0, color: '#fff' });
  const powerups = [];

  const state = {
    player, enemies, bolts, orbs, embers, particles, floaters, powerups,
    score: 0, best: 0, wave: 0, kills: 0, shots: 0, hits: 0,
    combo: 0, comboTimer: 0, elapsed: 0,
    spawnQueue: 0, spawnTimer: 0, spawnKinds: [],
    intermission: 0, banner: '', bannerTimer: 0,
    shake: 0, flash: 0, won: false, over: false,
    bossSpawned: false,
  };

  function free(list) {
    for (let i = 0; i < list.length; i += 1) if (!list[i].active) return list[i];
    return null;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const p = free(particles);
      if (!p) return;
      const a = random() * Math.PI * 2;
      const s = speed * (0.3 + random() * 0.7);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.maxLife = 0.4 + random() * 0.5;
      p.life = p.maxLife;
      p.size = 2 + random() * 3;
      p.color = color;
    }
  }

  function floater(x, y, text, color) {
    const f = free(floaters);
    if (!f) return;
    f.active = true;
    f.x = x;
    f.y = y;
    f.text = text;
    f.color = color;
    f.life = 1.1;
  }

  function edgePoint() {
    // A point on the arena edge, at least 220 px from the player.
    for (let tries = 0; tries < 12; tries += 1) {
      const side = Math.floor(random() * 4);
      let x = 0;
      let y = 0;
      if (side === 0) { x = 30 + random() * (FIELD.width - 60); y = 30; }
      else if (side === 1) { x = 30 + random() * (FIELD.width - 60); y = FIELD.height - 30; }
      else if (side === 2) { x = 30; y = 30 + random() * (FIELD.height - 60); }
      else { x = FIELD.width - 30; y = 30 + random() * (FIELD.height - 60); }
      if (dist(x, y, player.x, player.y) > 220) return { x, y };
    }
    return { x: 40, y: 40 };
  }

  function spawnEnemy(kind) {
    const e = free(enemies);
    if (!e) return;
    const def = kind === KIND_MOTE ? ENEMY.mote : kind === KIND_SPITTER ? ENEMY.spitter : kind === KIND_BOSS ? ENEMY.boss : ENEMY.brute;
    const p = edgePoint();
    e.active = true;
    e.kind = kind;
    e.x = p.x;
    e.y = p.y;
    e.vx = 0;
    e.vy = 0;
    e.radius = def.radius;
    e.hp = def.hp;
    e.maxHp = def.hp;
    e.speed = def.speed;
    e.score = def.score;
    e.ember = def.ember;
    e.fireTimer = 1 + random() * 1.5;
    e.wobble = random() * Math.PI * 2;
    e.flash = 0;
  }

  function waveKinds(wave) {
    // The mix grows harder with the wave: spitters from wave 2, brutes from 3.
    const kinds = [];
    const total = 5 + wave * 3;
    for (let i = 0; i < total; i += 1) {
      const roll = random();
      if (wave >= 3 && roll < 0.16) kinds.push(KIND_BRUTE);
      else if (wave >= 2 && roll < 0.42) kinds.push(KIND_SPITTER);
      else kinds.push(KIND_MOTE);
    }
    return kinds;
  }

  function startWave(wave) {
    state.wave = wave;
    state.spawnKinds = waveKinds(wave);
    state.spawnQueue = state.spawnKinds.length;
    state.spawnTimer = 0.4;
    state.banner = wave === WAVES ? 'FINAL WAVE — THE DUSK WARDEN' : `WAVE ${wave}`;
    state.bannerTimer = 2.2;
    state.bossSpawned = false;
    if (wave === WAVES) {
      // The boss arrives a little after the wave starts, with a warning.
      state.bossSpawned = false;
    }
  }

  function dropPowerup(x, y) {
    const keys = Object.keys(POWERUPS);
    const key = keys[Math.floor(random() * keys.length)];
    powerups.push({ x, y, kind: key, life: 14, bob: random() * Math.PI * 2 });
  }

  function dropEmbers(x, y, count, value) {
    for (let i = 0; i < count; i += 1) {
      const em = free(embers);
      if (!em) return;
      const a = random() * Math.PI * 2;
      em.active = true;
      em.x = x;
      em.y = y;
      em.vx = Math.cos(a) * (40 + random() * 90);
      em.vy = Math.sin(a) * (40 + random() * 90);
      em.value = value;
      em.life = 9;
    }
  }

  function applyPowerup(kind) {
    if (kind === 'spread') player.spread = 1;
    else if (kind === 'rapid') player.rapid = 1;
    else if (kind === 'pierce') player.pierce = 1;
    else if (kind === 'heart') player.hearts = Math.min(PLAYER.maxHearts, player.hearts + 1);
    else if (kind === 'nova') player.nova = PLAYER.novaMax;
  }

  function fireBolt(angle, damage) {
    const b = free(bolts);
    if (!b) return;
    b.active = true;
    b.x = player.x + Math.cos(angle) * (PLAYER.radius + 8);
    b.y = player.y + Math.sin(angle) * (PLAYER.radius + 8);
    b.vx = Math.cos(angle) * PLAYER.boltSpeed;
    b.vy = Math.sin(angle) * PLAYER.boltSpeed;
    b.damage = damage;
  }

  function fireOrbs(x, y, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const o = free(orbs);
      if (!o) return;
      const a = (i / count) * Math.PI * 2;
      o.active = true;
      o.x = x;
      o.y = y;
      o.vx = Math.cos(a) * speed;
      o.vy = Math.sin(a) * speed;
    }
  }

  function killEnemy(e, award) {
    e.active = false;
    state.kills += 1;
    const mult = 1 + Math.min(state.combo, 20) * 0.1;
    const gained = Math.round(e.score * mult);
    if (award) {
      state.score += gained;
      floater(e.x, e.y, `+${gained}`, '#ffd166');
      dropEmbers(e.x, e.y, e.kind === KIND_BOSS ? 10 : e.kind === KIND_BRUTE ? 4 : 2, 1);
    }
    burst(e.x, e.y, e.kind === KIND_MOTE ? '#c77dff' : e.kind === KIND_SPITTER ? '#ff6b9d' : e.kind === KIND_BOSS ? '#b5179e' : '#ff4d4d', e.kind === KIND_BOSS ? 48 : 16, 260);
    state.shake = Math.min(14, state.shake + (e.kind === KIND_BOSS ? 12 : 4));
    if (e.kind === KIND_BOSS) {
      dropPowerup(e.x - 40, e.y);
      dropPowerup(e.x + 40, e.y);
    }
  }

  function hurtPlayer(damage) {
    if (player.invulnerable > 0 || player.dashTime > 0 || state.over || state.won) return false;
    player.hearts -= damage;
    player.invulnerable = PLAYER.invulnerable;
    state.combo = 0;
    state.comboTimer = 0;
    state.shake = 14;
    state.flash = 0.35;
    burst(player.x, player.y, '#ff6b81', 22, 300);
    if (player.hearts <= 0) {
      player.hearts = 0;
      state.over = true;
      return true;
    }
    return false;
  }

  function novaBlast() {
    if (player.nova < PLAYER.novaCost) return 0;
    player.nova = 0;
    let events = EVENT_NOVA;
    burst(player.x, player.y, '#ffd166', 60, 420);
    state.shake = 16;
    state.flash = 0.5;
    for (const e of enemies) {
      if (!e.active) continue;
      if (dist(e.x, e.y, player.x, player.y) <= PLAYER.novaRadius) {
        e.hp -= 3;
        e.flash = 0.15;
        if (e.hp <= 0) {
          killEnemy(e, true);
          events |= EVENT_KILL;
        }
      }
    }
    for (const o of orbs) if (o.active && dist(o.x, o.y, player.x, player.y) <= PLAYER.novaRadius) o.active = false;
    return events;
  }

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.angle = -Math.PI / 2;
    player.hearts = PLAYER.hearts;
    player.invulnerable = 0;
    player.dashTime = 0;
    player.dashCooldown = 0;
    player.fireTimer = 0;
    player.spread = 0;
    player.rapid = 0;
    player.pierce = 0;
    player.nova = 40;
    for (const list of [enemies, bolts, orbs, embers, particles, floaters]) for (const it of list) it.active = false;
    powerups.length = 0;
    state.score = 0;
    state.wave = 0;
    state.kills = 0;
    state.shots = 0;
    state.hits = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.elapsed = 0;
    state.spawnQueue = 0;
    state.spawnTimer = 0;
    state.spawnKinds = [];
    state.intermission = 0;
    state.banner = '';
    state.bannerTimer = 0;
    state.shake = 0;
    state.flash = 0;
    state.won = false;
    state.over = false;
    state.bossSpawned = false;
  }

  /**
   * One fixed step. `ctl` is { move:{x,y}, aim:{x,y}, firing, dash, nova }.
   * With `attract` set (the title screen's backdrop) enemies drift and the
   * player never takes damage and nothing scores.
   */
  function step(dt, ctl, attract) {
    let events = 0;
    state.elapsed += dt;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    if (player.dashTime > 0) player.dashTime = Math.max(0, player.dashTime - dt);
    player.nova = Math.min(PLAYER.novaMax, player.nova + PLAYER.novaRegen * dt);

    // Aim: the warden faces the mouse.
    if (ctl && ctl.aim) {
      player.angle = Math.atan2(ctl.aim.y - player.y, ctl.aim.x - player.x);
    }

    if (!attract && !state.over && !state.won) {
      // Movement + dash.
      const speed = player.dashTime > 0 ? PLAYER.dashSpeed : PLAYER.speed;
      const mx = ctl && ctl.move ? ctl.move.x : 0;
      const my = ctl && ctl.move ? ctl.move.y : 0;
      player.x = clamp(player.x + mx * speed * dt, PLAYER.radius, FIELD.width - PLAYER.radius);
      player.y = clamp(player.y + my * speed * dt, PLAYER.radius, FIELD.height - PLAYER.radius);
      if (ctl && ctl.dash && player.dashCooldown <= 0 && (mx !== 0 || my !== 0)) {
        player.dashTime = PLAYER.dashTime;
        player.dashCooldown = PLAYER.dashCooldown;
      }
      if (ctl && ctl.nova) events |= novaBlast();

      // Firing.
      player.fireTimer -= dt;
      const interval = player.rapid ? PLAYER.fireInterval * 0.55 : PLAYER.fireInterval;
      if (ctl && ctl.firing && player.fireTimer <= 0) {
        player.fireTimer = interval;
        state.shots += 1;
        if (player.spread) {
          fireBolt(player.angle - 0.22, PLAYER.boltDamage);
          fireBolt(player.angle, PLAYER.boltDamage);
          fireBolt(player.angle + 0.22, PLAYER.boltDamage);
        } else {
          fireBolt(player.angle, PLAYER.boltDamage);
        }
      }
    }

    // Wave flow runs even behind the title screen, so the arena is alive
    // there too; nothing scores and nothing hurts the player while attract.
    if (!state.over && !state.won) {
      // Wave flow.
      if (state.wave === 0) {
        startWave(1);
        events |= EVENT_WAVE;
      } else if (state.spawnQueue > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          state.spawnTimer = Math.max(0.25, 0.9 - state.wave * 0.06);
          const kind = state.spawnKinds[state.spawnKinds.length - state.spawnQueue];
          state.spawnQueue -= 1;
          spawnEnemy(kind);
          if (state.wave === WAVES && !state.bossSpawned && state.spawnQueue <= 4) {
            spawnEnemy(KIND_BOSS);
            state.bossSpawned = true;
            events |= EVENT_BOSS;
          }
        }
      } else if (state.intermission <= 0) {
        let alive = 0;
        for (const e of enemies) if (e.active) alive += 1;
        if (alive === 0) {
          if (state.wave >= WAVES) {
            state.won = true;
            events |= EVENT_WIN;
          } else {
            state.intermission = 2.6;
            state.banner = `WAVE ${state.wave} CLEAR`;
            state.bannerTimer = 2.4;
            state.score += state.wave * 50;
            if (state.wave % 2 === 0) dropPowerup(FIELD.width / 2, FIELD.height / 2 - 60);
          }
        }
      } else {
        state.intermission -= dt;
        if (state.intermission <= 0) {
          startWave(state.wave + 1);
          events |= EVENT_WAVE;
        }
      }
    }

    // Enemies move and act.
    for (const e of enemies) {
      if (!e.active) continue;
      if (e.flash > 0) e.flash -= dt;
      e.wobble += dt * 3;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const enraged = e.kind === KIND_BOSS && e.hp < e.maxHp / 2;
      const speed = e.speed * (enraged ? 1.5 : 1);
      if (e.kind === KIND_SPITTER) {
        // Keep a ring around the player, strafe, and shoot.
        const want = 260;
        const radial = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
        const tx = (dx / d) * radial + (-dy / d) * 0.6;
        const ty = (dy / d) * radial + (dx / d) * 0.6;
        e.x += tx * speed * dt;
        e.y += ty * speed * dt;
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && d < 520 && !attract) {
          e.fireTimer = 2.3;
          const o = free(orbs);
          if (o) {
            o.active = true;
            o.x = e.x;
            o.y = e.y;
            o.vx = (dx / d) * ORB.speed;
            o.vy = (dy / d) * ORB.speed;
          }
        }
      } else if (e.kind === KIND_BOSS) {
        e.x += (dx / d) * speed * dt + Math.cos(e.wobble) * 12 * dt;
        e.y += (dy / d) * speed * dt + Math.sin(e.wobble) * 12 * dt;
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && !attract) {
          e.fireTimer = enraged ? 2.2 : 3.2;
          fireOrbs(e.x, e.y, 10, 150);
          if (enraged) {
            for (let i = 0; i < 2; i += 1) spawnEnemy(KIND_MOTE);
          }
        }
      } else {
        // Motes and brutes chase, with a wobble so they never march in a line.
        const wx = Math.cos(e.wobble) * 0.35;
        const wy = Math.sin(e.wobble) * 0.35;
        e.x += ((dx / d) + wx) * speed * dt;
        e.y += ((dy / d) + wy) * speed * dt;
      }
      e.x = clamp(e.x, e.radius, FIELD.width - e.radius);
      e.y = clamp(e.y, e.radius, FIELD.height - e.radius);
      if (!attract && dist(e.x, e.y, player.x, player.y) < e.radius + PLAYER.radius - 2) {
        if (hurtPlayer(e.kind === KIND_BOSS ? 2 : 1)) events |= EVENT_OVER;
        else events |= EVENT_HIT;
        // A mote that touches the player bursts; brutes and the boss bounce off.
        if (e.kind === KIND_MOTE) {
          killEnemy(e, false);
          events |= EVENT_KILL;
        } else {
          e.x -= (dx / d) * 30;
          e.y -= (dy / d) * 30;
        }
      }
    }

    // Bolts fly and hit.
    for (const b of bolts) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) {
        b.active = false;
        continue;
      }
      for (const e of enemies) {
        if (!e.active) continue;
        if (dist(b.x, b.y, e.x, e.y) < e.radius + PLAYER.boltRadius) {
          e.hp -= b.damage;
          e.flash = 0.12;
          state.hits += 1;
          burst(b.x, b.y, '#ffe066', 5, 160);
          if (e.hp <= 0) {
            state.combo += 1;
            state.comboTimer = 2.5;
            killEnemy(e, true);
            events |= EVENT_KILL;
          }
          if (!player.pierce) {
            b.active = false;
            break;
          }
        }
      }
    }

    // Enemy orbs fly and hit the player.
    for (const o of orbs) {
      if (!o.active) continue;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (o.x < -20 || o.x > FIELD.width + 20 || o.y < -20 || o.y > FIELD.height + 20) {
        o.active = false;
        continue;
      }
      if (!attract && dist(o.x, o.y, player.x, player.y) < ORB.radius + PLAYER.radius - 2) {
        o.active = false;
        if (hurtPlayer(1)) events |= EVENT_OVER;
        else events |= EVENT_HIT;
      }
    }

    // Embers drift, magnetise to the player, and are collected.
    for (const em of embers) {
      if (!em.active) continue;
      em.life -= dt;
      if (em.life <= 0) {
        em.active = false;
        continue;
      }
      const d = dist(em.x, em.y, player.x, player.y);
      if (d < 140) {
        em.vx += ((player.x - em.x) / d) * 900 * dt;
        em.vy += ((player.y - em.y) / d) * 900 * dt;
      }
      em.x += em.vx * dt;
      em.y += em.vy * dt;
      em.vx *= 0.96;
      em.vy *= 0.96;
      if (d < PLAYER.radius + 10) {
        em.active = false;
        player.nova = Math.min(PLAYER.novaMax, player.nova + 4);
        state.score += 2;
        events |= EVENT_PICKUP;
      }
    }

    // Power-ups bob and are collected.
    for (let i = powerups.length - 1; i >= 0; i -= 1) {
      const p = powerups[i];
      p.life -= dt;
      p.bob += dt * 3;
      if (p.life <= 0) {
        powerups.splice(i, 1);
        continue;
      }
      if (dist(p.x, p.y, player.x, player.y) < PLAYER.radius + 22) {
        applyPowerup(p.kind);
        floater(p.x, p.y - 20, POWERUPS[p.kind].label, POWERUPS[p.kind].color);
        burst(p.x, p.y, POWERUPS[p.kind].color, 18, 220);
        powerups.splice(i, 1);
        events |= EVENT_POWERUP;
      }
    }

    // Particles and floating text fade.
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
    }
    for (const f of floaters) {
      if (!f.active) continue;
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) f.active = false;
    }

    return events;
  }

  reset();
  return { state, reset, step, startWave, burst, floater };
}
