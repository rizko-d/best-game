// All sound is synthesised with WebAudio — no audio files, no network.
// A small helper builds short blips, sweeps and noise bursts; a quiet drone
// plus a slow two-note pulse runs under play as the game's music.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let muted = false;
  let musicOn = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
      gain.gain.setValueAtTime(vol || 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch {
      // Audio is decoration: a failure here must never break the game.
    }
  }

  function noise(dur, vol, low) {
    if (!ensure() || muted) return;
    try {
      const now = ctx.currentTime;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = low || 1200;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(now);
    } catch {
      // Ignore audio failures.
    }
  }

  function startMusic() {
    if (!ensure() || musicOn) return;
    musicOn = true;
    // A low drone that never stops, plus a slow pulse every 1.2 s.
    try {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 55;
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(master);
      osc.start();
    } catch {
      // Ignore.
    }
    let step = 0;
    const notes = [220, 0, 261.6, 0, 196, 0, 293.7, 0];
    musicTimer = window.setInterval(() => {
      if (muted) return;
      const n = notes[step % notes.length];
      step += 1;
      if (n) tone(n, 0.5, 'sine', 0.05);
    }, 600);
  }

  function stopMusic() {
    musicOn = false;
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    startMusic,
    stopMusic,
    shoot() {
      tone(720, 0.08, 'square', 0.08, 340);
    },
    hit() {
      noise(0.12, 0.2, 900);
      tone(140, 0.15, 'sawtooth', 0.14, 60);
    },
    kill() {
      tone(520, 0.12, 'triangle', 0.16, 180);
      noise(0.1, 0.12, 2000);
    },
    pickup() {
      tone(880, 0.09, 'sine', 0.14, 1320);
    },
    powerup() {
      tone(523, 0.1, 'sine', 0.16);
      window.setTimeout(() => tone(659, 0.1, 'sine', 0.16), 90);
      window.setTimeout(() => tone(784, 0.16, 'sine', 0.18), 180);
    },
    nova() {
      noise(0.5, 0.35, 700);
      tone(220, 0.5, 'sawtooth', 0.2, 40);
    },
    dash() {
      noise(0.14, 0.14, 3000);
    },
    wave() {
      tone(392, 0.18, 'triangle', 0.18);
      window.setTimeout(() => tone(523, 0.22, 'triangle', 0.18), 160);
    },
    hurt() {
      tone(180, 0.3, 'sawtooth', 0.22, 50);
      noise(0.2, 0.22, 600);
    },
    boss() {
      tone(98, 0.6, 'sawtooth', 0.2, 49);
      noise(0.4, 0.2, 500);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => tone(f, 0.3, 'sine', 0.18), i * 140));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => window.setTimeout(() => tone(f, 0.35, 'triangle', 0.16), i * 170));
    },
  };
}
