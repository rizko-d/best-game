// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, with a
// neon arena, glow, particles, screen shake and a hit flash. Flat shapes and
// canvas text only — no images, no network.

import { FIELD, FONT, PALETTE, PLAYER, POWERUPS } from './config.js';
import { KIND_BOSS, KIND_BRUTE, KIND_MOTE, KIND_SPITTER } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };

function enemyColor(kind) {
  if (kind === KIND_MOTE) return PALETTE.mote;
  if (kind === KIND_SPITTER) return PALETTE.spitter;
  if (kind === KIND_BOSS) return PALETTE.boss;
  return PALETTE.brute;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, ratio: 1 };
  let time = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.ratio = ratio;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = `${size}:${weight || ''}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || ''} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function circle(x, y, r, color, glow) {
    if (glow) {
      context.shadowColor = color;
      context.shadowBlur = glow;
    }
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
  }

  function drawArena(state) {
    // Deep-space backdrop, a soft grid, and the arena ring.
    context.fillStyle = PALETTE.arena;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.strokeStyle = PALETTE.grid;
    context.lineWidth = 1;
    for (let x = 80; x < FIELD.width; x += 80) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, FIELD.height);
      context.stroke();
    }
    for (let y = 80; y < FIELD.height; y += 80) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
      context.stroke();
    }
    // Stars.
    context.fillStyle = '#2a3468';
    for (let i = 0; i < 60; i += 1) {
      const sx = (i * 173) % FIELD.width;
      const sy = (i * 311) % FIELD.height;
      context.fillRect(sx, sy, 2, 2);
    }
    context.strokeStyle = PALETTE.arenaEdge;
    context.lineWidth = 3;
    context.strokeRect(14, 14, FIELD.width - 28, FIELD.height - 28);
    // The lantern's warm glow at the centre of the arena.
    const glow = context.createRadialGradient(FIELD.width / 2, FIELD.height / 2, 0, FIELD.width / 2, FIELD.height / 2, 260);
    glow.addColorStop(0, 'rgba(255, 209, 102, 0.10)');
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawPowerups(state) {
    for (const p of state.powerups) {
      const bobY = p.y + Math.sin(p.bob) * 5;
      const info = POWERUPS[p.kind];
      circle(p.x, bobY, 20, info.color, 18);
      context.fillStyle = '#0b1026';
      context.font = 'bold 20px ' + FONT;
      context.textAlign = 'center';
      context.fillText(p.kind === 'heart' ? '♥' : p.kind === 'nova' ? '✦' : p.kind === 'spread' ? '∴' : p.kind === 'rapid' ? '»' : '↑', p.x, bobY + 7);
      text(info.label, p.x, bobY + 38, 13, info.color, 'center', 'bold');
    }
  }

  function drawEmbers(state) {
    for (const em of state.embers) {
      if (!em.active) continue;
      circle(em.x, em.y, 4, PALETTE.ember, 10);
    }
  }

  function drawEnemies(state) {
    for (const e of state.enemies) {
      if (!e.active) continue;
      const color = e.flash > 0 ? '#ffffff' : enemyColor(e.kind);
      if (e.kind === KIND_BOSS) {
        // A crowned dark warden: big ring, rotating spikes, health bar.
        circle(e.x, e.y, e.radius + 8, 'rgba(181, 23, 158, 0.25)', 0);
        context.strokeStyle = color;
        context.lineWidth = 3;
        context.beginPath();
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * Math.PI * 2 + time * 0.6;
          const r1 = e.radius + 4;
          const r2 = e.radius + 14;
          context.moveTo(e.x + Math.cos(a) * r1, e.y + Math.sin(a) * r1);
          context.lineTo(e.x + Math.cos(a) * r2, e.y + Math.sin(a) * r2);
        }
        context.stroke();
        circle(e.x, e.y, e.radius, color, 24);
        circle(e.x, e.y, e.radius * 0.55, '#2d0a2e', 0);
        text('☠', e.x, e.y + 10, 26, '#ffb3e6', 'center', 'bold');
        context.fillStyle = '#1a0b1e';
        context.fillRect(e.x - 50, e.y - e.radius - 22, 100, 9);
        context.fillStyle = PALETTE.boss;
        context.fillRect(e.x - 50, e.y - e.radius - 22, 100 * Math.max(0, e.hp / e.maxHp), 9);
      } else if (e.kind === KIND_BRUTE) {
        context.fillStyle = color;
        context.beginPath();
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2;
          const px = e.x + Math.cos(a) * e.radius;
          const py = e.y + Math.sin(a) * e.radius;
          if (i === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.closePath();
        context.fill();
        circle(e.x, e.y, e.radius * 0.45, '#3d0a0a', 0);
        // Health pips.
        context.fillStyle = '#ffffff';
        for (let i = 0; i < e.hp; i += 1) context.fillRect(e.x - 12 + i * 5, e.y - e.radius - 12, 3, 6);
      } else if (e.kind === KIND_SPITTER) {
        circle(e.x, e.y, e.radius, color, 16);
        circle(e.x, e.y, e.radius * 0.5, '#2a0a18', 0);
        context.fillStyle = '#ffffff';
        circle(e.x - 5, e.y - 3, 2.5, '#ffffff', 0);
        circle(e.x + 5, e.y - 3, 2.5, '#ffffff', 0);
      } else {
        // Mote: a wobbling violet wisp with a bright eye.
        const wob = Math.sin(time * 5 + e.wobble) * 2;
        circle(e.x, e.y + wob, e.radius, color, 14);
        circle(e.x, e.y + wob, e.radius * 0.4, '#f3e8ff', 0);
      }
    }
    // Enemy orbs.
    for (const o of state.orbs) {
      if (!o.active) continue;
      circle(o.x, o.y, 7, PALETTE.orb, 12);
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    if (p.invulnerable > 0 && Math.floor(p.invulnerable * 10) % 2 === 0) return; // blink while hurt
    // Dash trail.
    if (p.dashTime > 0) {
      circle(p.x, p.y, PLAYER.radius + 10, 'rgba(255, 209, 102, 0.25)', 0);
    }
    // Nova ring while charged.
    if (p.nova >= PLAYER.novaMax) {
      context.strokeStyle = 'rgba(255, 209, 102, 0.7)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(p.x, p.y, PLAYER.radius + 10 + Math.sin(time * 6) * 3, 0, Math.PI * 2);
      context.stroke();
    }
    circle(p.x, p.y, PLAYER.radius, PALETTE.player, 22);
    circle(p.x, p.y, PLAYER.radius * 0.6, PALETTE.playerCore, 0);
    // The lantern's flame points at the mouse.
    const fx = p.x + Math.cos(p.angle) * (PLAYER.radius + 10);
    const fy = p.y + Math.sin(p.angle) * (PLAYER.radius + 10);
    circle(fx, fy, 6, '#fff3c4', 16);
    context.strokeStyle = '#0b1026';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(p.x, p.y, PLAYER.radius * 0.6, 0, Math.PI * 2);
    context.stroke();
  }

  function drawBolts(state) {
    for (const b of state.bolts) {
      if (!b.active) continue;
      circle(b.x, b.y, PLAYER.boltRadius, PALETTE.bolt, 12);
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      circle(p.x, p.y, p.size, p.color, 0);
    }
    context.globalAlpha = 1;
    for (const f of state.floaters) {
      if (!f.active) continue;
      context.globalAlpha = Math.min(1, f.life);
      text(f.text, f.x, f.y, 18, f.color, 'center', 'bold');
    }
    context.globalAlpha = 1;
  }

  function drawHud(state, best) {
    context.textBaseline = 'top';
    text(`SCORE ${state.score}`, 24, 18, 26, PALETTE.text, 'left', 'bold');
    text(`BEST ${Math.max(best, state.score)}`, 24, 48, 16, PALETTE.muted, 'left');
    text(`WAVE ${Math.max(1, state.wave)} / 10`, FIELD.width / 2, 18, 26, PALETTE.text, 'center', 'bold');
    if (state.combo > 1) text(`COMBO x${state.combo}`, FIELD.width / 2, 48, 16, PALETTE.gold, 'center', 'bold');
    // Hearts.
    let hx = FIELD.width - 24;
    for (let i = 0; i < PLAYER.maxHearts; i += 1) {
      const filled = i < state.player.hearts;
      text('♥', hx, 16, 26, filled ? PALETTE.heart : '#2a3040', 'right', 'bold');
      hx -= 30;
    }
    // Nova charge bar.
    const bw = 180;
    const bx = FIELD.width - 24 - bw;
    const by = 58;
    context.fillStyle = '#1a2350';
    context.fillRect(bx, by, bw, 10);
    context.fillStyle = state.player.nova >= PLAYER.novaMax ? PALETTE.gold : '#e0a458';
    context.fillRect(bx, by, bw * (state.player.nova / PLAYER.novaMax), 10);
    text('NOVA [Q]', bx - 10, by + 11, 13, PALETTE.muted, 'right');
    // Dash cooldown.
    const dashReady = state.player.dashCooldown <= 0;
    text(dashReady ? 'DASH [Shift] ready' : 'DASH recharging…', bx + bw, by + 20, 13, dashReady ? PALETTE.gold : PALETTE.muted, 'right');
    // Power-up badges.
    const badges = [];
    if (state.player.spread) badges.push('SPREAD');
    if (state.player.rapid) badges.push('RAPID');
    if (state.player.pierce) badges.push('PIERCE');
    if (badges.length) text(badges.join('  •  '), 24, 74, 14, PALETTE.gold, 'left', 'bold');
    // Wave banner.
    if (state.bannerTimer > 0 && state.banner) {
      context.globalAlpha = Math.min(1, state.bannerTimer);
      text(state.banner, FIELD.width / 2, 150, 44, PALETTE.gold, 'center', 'bold');
      context.globalAlpha = 1;
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(7, 10, 24, 0.82)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, accent || PALETTE.text, 'center', 'bold');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + PANEL.top + i * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 22, PALETTE.gold, 'center', 'bold');
  }

  /** Paint one frame: arena, entities, HUD, then a panel for the screen. */
  function draw(state, screen, best, stats) {
    time += 1 / 60;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawArena(state);
    drawEmbers(state);
    drawPowerups(state);
    drawEnemies(state);
    drawBolts(state);
    drawPlayer(state);
    drawParticles(state);
    if (state.flash > 0) {
      context.fillStyle = `rgba(255, 107, 129, ${state.flash * 0.5})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'EMBERFALL',
        ['The Last Lantern', '', 'WASD / Arrows — move      Mouse — aim      Click — shoot', 'Shift — dash      Q — Nova burst      P — pause      M — mute', `Survive 10 waves. Slay the Dusk Warden.`, '', `Best ${best}`],
        'Press Space or click to start',
        PALETTE.gold,
      );
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The shadows wait for no one — except now.', ''], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel(
        'THE LIGHT GOES OUT',
        [`Score ${state.score}      Best ${Math.max(best, state.score)}`, `Wave ${state.wave}      Kills ${state.kills}      Accuracy ${stats.accuracy}%`, ''],
        'Press Space or click to play again',
        PALETTE.heart,
      );
    } else if (screen === SCREEN_WIN) {
      drawPanel(
        'DAWN BREAKS',
        [`You kept the lantern lit through all 10 waves.`, `Score ${state.score}      Best ${Math.max(best, state.score)}`, `Kills ${state.kills}      Time ${stats.time}      Accuracy ${stats.accuracy}%`, ''],
        'Press Space or click to play again',
        PALETTE.gold,
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
