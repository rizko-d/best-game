// EMBERFALL: Last Lantern — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Ten waves, the last one ending in the Dusk Warden boss. */
export const WAVES = 10;

export const PLAYER = {
  radius: 16,
  speed: 300,
  dashSpeed: 720,
  dashTime: 0.16,
  dashCooldown: 1.4,
  fireInterval: 0.16,
  boltSpeed: 640,
  boltRadius: 5,
  boltDamage: 1,
  hearts: 3,
  maxHearts: 5,
  invulnerable: 1.5,
  novaRadius: 220,
  novaCost: 100,
  novaMax: 100,
  novaRegen: 2.2,
};

export const ENEMY = {
  mote: { radius: 13, speed: 105, hp: 1, score: 10, ember: 6, touch: 1 },
  spitter: { radius: 16, speed: 72, hp: 2, score: 25, ember: 10, touch: 1 },
  brute: { radius: 26, speed: 46, hp: 6, score: 50, ember: 18, touch: 1 },
  boss: { radius: 44, speed: 38, hp: 42, score: 500, ember: 60, touch: 2 },
};

export const ORB = { radius: 7, speed: 190 };

export const POWERUPS = {
  spread: { label: 'SPREAD SHOT', color: '#ff9f43' },
  rapid: { label: 'RAPID FIRE', color: '#2ed573' },
  pierce: { label: 'PIERCING BOLTS', color: '#70a1ff' },
  heart: { label: '+1 HEART', color: '#ff6b81' },
  nova: { label: 'NOVA FULL', color: '#eccc68' },
};

export const PALETTE = {
  backdrop: '#070a18',
  arena: '#0b1026',
  arenaEdge: '#1a2350',
  grid: '#141b3d',
  player: '#ffd166',
  playerCore: '#fff3c4',
  bolt: '#ffe066',
  mote: '#c77dff',
  spitter: '#ff6b9d',
  brute: '#ff4d4d',
  boss: '#b5179e',
  orb: '#ff8fa3',
  ember: '#ffb703',
  heart: '#ff6b81',
  text: '#eef1ff',
  muted: '#9aa3c7',
  gold: '#ffd166',
  panel: '#121832',
  panelEdge: '#2c3a6e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberfall.best';
