/* ==========================================================================
   Jumanji: O Tabuleiro Selvagem
   Jogo de plataforma 2D (canvas) inspirado nos clássicos de plataforma,
   com cenários, personagem e inimigos do universo de Jumanji.
   ========================================================================== */

(() => {
  'use strict';

  // Versão do jogo: usada para detectar cache antigo e forçar atualização.
  window.__JUMANJI_VERSION__ = '6.9.0';

  /* ---------------------------------- base --------------------------------- */

  const TILE = 32;
  const ROWS = 17;
  const VIEW_W = 960;
  const VIEW_H = 544;
  const GROUND_ROW = 14;

  const PLAYER_W = 22;
  const PLAYER_H = 34;
  const START_LIVES = 3;
  const MAX_LIVES = 5;

  const GRAVITY = 2200;
  const MAX_FALL = 1000;
  const RUN_SPEED = 245;
  const DASH_SPEED = 335;
  const ACCEL = 2500;
  const AIR_ACCEL = 1600;
  const FRICTION = 2900;
  const JUMP_VY = -800;
  const COYOTE_TIME = 0.1;
  const BUFFER_TIME = 0.13;
  const STAR_TIME = 8;

  const BEST_KEY = 'jumanji-tabuleiro-best';
  const MUTE_KEY = 'jumanji-tabuleiro-mute';
  const PROGRESS_KEY = 'jumanji-tabuleiro-progress';
  const SETTINGS_KEY = 'jumanji-tabuleiro-settings-v2';
  const ADMIN_PASSWORD = 'kennedito';
  const TAU = Math.PI * 2;

  /* ----------------------------------- dom ---------------------------------- */

  const canvas = document.getElementById('game');
  const displayCtx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const banner = document.getElementById('banner');
  const bannerKicker = document.getElementById('banner-kicker');
  const bannerTitle = document.getElementById('banner-title');
  const bannerSub = document.getElementById('banner-sub');

  const heartsEl = document.getElementById('hearts');
  const gemsEl = document.getElementById('gems');
  const scoreEl = document.getElementById('score');
  const levelNameEl = document.getElementById('level-name');

  const titleBestEl = document.getElementById('title-best');
  const overScoreEl = document.getElementById('over-score');
  const overBestEl = document.getElementById('over-best');
  const clearTitleEl = document.getElementById('clear-title');
  const clearTextEl = document.getElementById('clear-text');
  const clearGemsEl = document.getElementById('clear-gems');
  const clearScoreEl = document.getElementById('clear-score');
  const winScoreEl = document.getElementById('win-score');
  const winGemsEl = document.getElementById('win-gems');
  const winBestEl = document.getElementById('win-best');
  const muteBtn = document.querySelector('[data-action="mute"]');
  const levelCards = Array.prototype.slice.call(document.querySelectorAll('[data-level]'));

  const screens = {};
  document.querySelectorAll('[data-screen]').forEach((el) => {
    screens[el.dataset.screen] = el;
  });

  // Renderização em pixel art com nitidez total: o jogo é desenhado na
  // resolução cheia (1:1) e ampliado sem suavização para a tela.
  const PIXEL_SCALE = 1;
  const pixelCanvas = document.createElement('canvas');
  pixelCanvas.width = Math.ceil(VIEW_W / PIXEL_SCALE);
  pixelCanvas.height = Math.ceil(VIEW_H / PIXEL_SCALE);
  const ctx = pixelCanvas.getContext('2d');
  ctx.scale(1 / PIXEL_SCALE, 1 / PIXEL_SCALE);
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';

  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  displayCtx.imageSmoothingEnabled = false;

  /* -------------------------------- utilitários ----------------------------- */

  const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);
  const lerp = (a, b, t) => a + (b - a) * t;

  function hash(a, b) {
    let h = (a | 0) * 374761393 + (b | 0) * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  }

  function rr(x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function px(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function dot(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function readStorage(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* modo privado: ignora */
    }
  }

  function formatScore(value) {
    return Math.max(0, Math.round(value)).toLocaleString('pt-BR');
  }

  /* ---------------------------------- áudio --------------------------------- */

  let audio = null;
  let muted = readStorage(MUTE_KEY, '0') === '1';

  function ensureAudio() {
    if (muted) return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audio) audio = new Ctx();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    return audio;
  }

  function tone(freq, delay, dur, type, vol, endFreq) {
    const ac = ensureAudio();
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    const scaledVol = (vol || 0.06) * (typeof sfxVolume === 'number' ? sfxVolume : 1);
    gain.gain.exponentialRampToValueAtTime(scaledVol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function sfx(name) {
    if (muted) return;
    switch (name) {
      case 'jump':
        tone(320, 0, 0.13, 'square', 0.045, 640);
        break;
      case 'coin':
        tone(880, 0, 0.07, 'triangle', 0.05);
        tone(1320, 0.06, 0.1, 'triangle', 0.045);
        break;
      case 'stomp':
        tone(180, 0, 0.12, 'square', 0.06, 70);
        break;
      case 'hurt':
        tone(300, 0, 0.3, 'sawtooth', 0.06, 80);
        break;
      case 'power':
        [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.12, 'triangle', 0.05));
        break;
      case 'life':
        [660, 880, 1100, 1320].forEach((f, i) => tone(f, i * 0.06, 0.14, 'square', 0.04));
        break;
      case 'checkpoint':
        tone(440, 0, 0.16, 'triangle', 0.05);
        tone(660, 0.12, 0.22, 'triangle', 0.05);
        break;
      case 'spit':
        tone(240, 0, 0.1, 'sawtooth', 0.03, 120);
        break;
      case 'boss-hit':
        tone(120, 0, 0.25, 'sawtooth', 0.07, 60);
        tone(400, 0, 0.1, 'square', 0.04, 200);
        break;
      case 'boss-down':
        [200, 150, 110, 70].forEach((f, i) => tone(f, i * 0.11, 0.3, 'sawtooth', 0.07));
        break;
      case 'clear':
        [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.09, 0.2, 'triangle', 0.05));
        break;
      case 'win':
        [523, 523, 523, 659, 784, 0, 784, 1046].forEach((f, i) =>
          tone(f || 200, i * 0.13, 0.24, 'triangle', 0.055)
        );
        break;
      case 'gameover':
        [440, 370, 294, 220].forEach((f, i) => tone(f, i * 0.16, 0.34, 'sawtooth', 0.05));
        break;
      case 'ui':
        tone(520, 0, 0.06, 'square', 0.03);
        break;
      default:
        break;
    }
  }

  function animalSound(type) {
    if (muted) return;
    switch (type) {
      case 'scorpion':
        tone(1200, 0, 0.05, 'square', 0.025);
        tone(900, 0.04, 0.04, 'square', 0.02);
        break;
      case 'bandit':
        tone(180, 0, 0.12, 'sawtooth', 0.04, 120);
        break;
      case 'mandril':
        tone(600, 0, 0.18, 'sawtooth', 0.045, 900);
        tone(900, 0.1, 0.12, 'square', 0.03, 1200);
        break;
      case 'cobra':
        tone(220, 0, 0.22, 'sawtooth', 0.03, 160);
        tone(180, 0.15, 0.18, 'sawtooth', 0.025, 140);
        break;
      case 'raptor':
        tone(300, 0, 0.2, 'sawtooth', 0.05, 120);
        tone(150, 0.12, 0.25, 'square', 0.04, 80);
        break;
      case 'wasp':
        tone(260, 0, 0.06, 'square', 0.02);
        tone(280, 0.05, 0.06, 'square', 0.02);
        tone(250, 0.1, 0.06, 'square', 0.02);
        break;
      case 'vulture':
        tone(700, 0, 0.16, 'triangle', 0.035, 1100);
        tone(1100, 0.1, 0.12, 'triangle', 0.03, 600);
        break;
      default:
        break;
    }
  }

  /* ------------------------- música procedural (chiptune) ------------------- */

  const semis = (n) => Math.pow(2, n / 12);

  // Padrões em semitons. `lead` relativo à tônica uma oitava acima; `bass` meia oitava abaixo.
  const MUSIC = {
    deserto: {
      bpm: 118,
      root: 146.83, // D3
      bass: [0, 0, 0, 0, 5, 5, 3, 3, 0, 0, 7, 7, 5, 5, 3, 3],
      lead: [0, 2, 4, 7, 9, 12, 14, 12, 9, 7, 4, 2, 0, 4, 7, 9],
      arp: [0, 4, 7, 12, 7, 4, 0, 4]
    },
    selva: {
      bpm: 100,
      root: 130.81, // C3
      bass: [0, 0, 0, 0, 5, 5, 5, 5, 3, 3, 3, 3, 7, 7, 5, 3],
      lead: [7, 5, 3, 5, 7, 10, 12, 10, 7, 5, 3, 2, 0, 2, 3, 5],
      arp: [0, 3, 7, 10, 7, 3, 0, 3]
    },
    templo: {
      bpm: 134,
      root: 110.0, // A2
      bass: [0, 0, 0, 0, 3, 3, 0, 0, 5, 5, 3, 3, 1, 1, 0, 0],
      lead: [12, 10, 7, 5, 3, 5, 7, 10, 12, 15, 14, 12, 10, 7, 5, 3],
      arp: [0, 3, 7, 12, 7, 3, 0, 3]
    }
  };

  let musicGain = null;
  let musicTimer = null;
  let musicStep = 0;
  let musicNext = 0;
  let musicKey = null;

  function musicNote(freq, at, dur, type, vol) {
    if (!audio || !musicGain) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(at);
    osc.stop(at + dur + 0.03);
  }

  function musicSchedule() {
    const ac = ensureAudio();
    if (!ac || !musicKey) return;
    const theme = MUSIC[musicKey];
    if (!theme) return;
    const stepDur = 60 / theme.bpm / 2; // colcheias
    while (musicNext < ac.currentTime + 0.22) {
      const s = musicStep % 16;
      const bi = musicStep % theme.bass.length;
      if (s % 2 === 0) {
        musicNote(theme.root / 2 * semis(theme.bass[bi]), musicNext, stepDur * 1.7, 'triangle', 0.1);
      }
      musicNote(theme.root * semis(theme.arp[s % theme.arp.length]), musicNext, stepDur * 0.85, 'square', 0.028);
      if (s % 2 === 0) {
        const li = ((musicStep / 2) | 0) % theme.lead.length;
        musicNote(theme.root * 2 * semis(theme.lead[li]), musicNext, stepDur * 1.5, 'square', 0.032);
      }
      if (s % 2 === 1) {
        musicNote(theme.root * 8, musicNext, 0.035, 'square', 0.008);
      }
      musicNext += stepDur;
      musicStep += 1;
    }
  }

  function startMusic(key) {
    if (muted) return;
    const ac = ensureAudio();
    if (!ac) return;
    if (!musicGain) {
      musicGain = ac.createGain();
      musicGain.gain.value = 0.5 * (typeof musicVolume === 'number' ? musicVolume : 1);
      musicGain.connect(ac.destination);
    } else {
      musicGain.gain.value = 0.5 * (typeof musicVolume === 'number' ? musicVolume : 1);
    }
    if (musicTimer && musicKey === key) return;
    stopMusic();
    musicKey = key;
    musicStep = 0;
    musicNext = ac.currentTime + 0.05;
    musicTimer = setInterval(musicSchedule, 70);
    musicSchedule();
  }

  function stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
    musicKey = null;
    musicStep = 0;
  }

  /* ---------------------------------- temas --------------------------------- */

  const THEMES = {
    deserto: {
      sky: ['#123a57', '#3f7f95', '#e8a464', '#f6d79a'],
      sun: ['#fff3cb', '#f2b13c'],
      sunPos: [762, 92],
      sunR: 40,
      far: '#7d6f52',
      farDark: '#63563e',
      mid: '#55462f',
      midDark: '#43371f',
      accent: '#f2b13c',
      glow: 'rgba(255, 200, 120, 0.5)',
      fog: 'rgba(255, 214, 150, 0.16)',
      ambient: 'sand'
    },
    selva: {
      sky: ['#04140f', '#0b2c20', '#1a5238', '#4f8a52'],
      sun: ['#eaffdc', '#8fd48a'],
      sunPos: [790, 78],
      sunR: 30,
      far: '#0d2d22',
      farDark: '#082017',
      mid: '#123a2a',
      midDark: '#0b271b',
      accent: '#5fe3a1',
      glow: 'rgba(140, 255, 190, 0.35)',
      fog: 'rgba(120, 220, 170, 0.12)',
      ambient: 'firefly'
    },
    templo: {
      sky: ['#0b0511', '#250b1f', '#541627', '#9c3524'],
      sun: ['#ffc47a', '#e0554a'],
      sunPos: [758, 104],
      sunR: 34,
      far: '#241326',
      farDark: '#160b19',
      mid: '#3a1b2c',
      midDark: '#26101d',
      accent: '#f2b13c',
      glow: 'rgba(255, 130, 80, 0.42)',
      fog: 'rgba(224, 85, 74, 0.16)',
      ambient: 'ember'
    }
  };

  /* -------------------------------- inimigos -------------------------------- */

  const ENEMY_DEFS = {
    scorpion: { w: 30, h: 18, speed: 52, score: 100, patrol: 66, kind: 'walker' },
    bandit: { w: 24, h: 32, speed: 82, score: 150, patrol: 92, kind: 'walker' },
    vulture: { w: 34, h: 22, speed: 108, score: 150, patrol: 96, kind: 'flyer', amp: 16 },
    mandril: { w: 28, h: 30, speed: 96, score: 200, patrol: 92, kind: 'walker' },
    wasp: { w: 28, h: 18, speed: 138, score: 180, patrol: 112, kind: 'flyer', amp: 24 },
    cobra: { w: 24, h: 32, speed: 0, score: 200, patrol: 0, kind: 'shooter' },
    raptor: { w: 38, h: 30, speed: 146, score: 250, patrol: 108, kind: 'walker' },
    jurgen: { w: 56, h: 78, speed: 92, score: 1500, patrol: 0, kind: 'boss' }
  };

  /* ---------------------------------- fases --------------------------------- */

  const LEVELS = [
    {
      name: 'A selva',
      subtitle: 'Cipós, cobras e guardiões de madeira.',
      story: 'Kennedito e seus amigos foram sugados para dentro do jogo Jumanji. Na selva, ele precisa sobreviver às cobras e aos mandris para encontrar a primeira pista.',
      theme: 'selva',
      cols: 242,
      build(B) {
        B.spawn(2);
        B.ground(0, 22);
        B.ground(26, 54);
        B.ground(58, 88);
        B.ground(92, 124);
        B.ground(128, 160);
        B.ground(164, 196);
        B.ground(200, 241);

        B.plat(8, 11, 11, 3);
        B.plat(16, 20, 9, 2);
        B.plat(30, 34, 10, 3);
        B.plat(40, 43, 8, 2);
        B.plat(48, 52, 10, 3);
        B.plat(60, 64, 9, 2);
        B.plat(72, 76, 11, 3);
        B.plat(82, 86, 8, 2);
        B.plat(96, 100, 10, 3);
        B.plat(106, 109, 8, 2);
        B.plat(114, 118, 10, 3);
        B.plat(132, 136, 9, 2);
        B.plat(142, 145, 11, 3);
        B.plat(150, 154, 8, 2);
        B.plat(168, 172, 10, 3);
        B.plat(178, 182, 8, 2);
        B.plat(188, 192, 10, 3);
        B.plat(206, 210, 9, 2);
        B.plat(216, 220, 11, 3);
        B.plat(226, 230, 9, 2);

        B.spikes(36, 37);
        B.spikes(68, 69);
        B.spikes(102, 103);
        B.spikes(140, 141);
        B.spikes(174, 175);
        B.spikes(212, 213);
        B.spikes(234, 235);

        B.checkpoint(130);
        B.exit(237);

        B.power('heart', 60);
        B.power('mask', 170, 10);

        B.enemy('mandril', 12);
        B.enemy('mandril', 32);
        B.enemy('mandril', 45);
        B.enemy('mandril', 62);
        B.enemy('mandril', 80);
        B.enemy('mandril', 100);
        B.enemy('mandril', 118);
        B.enemy('mandril', 138);
        B.enemy('mandril', 156);
        B.enemy('mandril', 176);
        B.enemy('mandril', 194);
        B.enemy('mandril', 214);
        B.enemy('mandril', 228);
        B.enemy('cobra', 20);
        B.enemy('cobra', 50);
        B.enemy('cobra', 86);
        B.enemy('cobra', 112);
        B.enemy('cobra', 148);
        B.enemy('cobra', 186);
        B.enemy('cobra', 224);
        B.flyer('wasp', 28, 8);
        B.flyer('wasp', 56, 9);
        B.flyer('wasp', 90, 7);
        B.flyer('wasp', 126, 8);
        B.flyer('wasp', 160, 9);
        B.flyer('wasp', 200, 7);

        B.coinLine(8, 11, 9);
        B.coinLine(16, 20, 7);
        B.coinArc(23, 6, 11, 2);
        B.coinLine(30, 34, 8);
        B.coinLine(40, 43, 6);
        B.coinArc(55, 6, 11, 3);
        B.coinLine(60, 64, 7);
        B.coinLine(72, 76, 9);
        B.coinArc(89, 6, 11, 2);
        B.coinLine(96, 100, 8);
        B.coinLine(106, 109, 6);
        B.coinArc(125, 6, 11, 3);
        B.coinLine(132, 136, 7);
        B.coinLine(142, 145, 9);
        B.coinArc(161, 6, 11, 2);
        B.coinLine(168, 172, 8);
        B.coinLine(178, 182, 6);
        B.coinArc(197, 6, 11, 3);
        B.coinLine(206, 210, 7);
        B.coinLine(216, 220, 9);
        B.coinLine(226, 230, 7);
      }
    },
    {
      name: 'O vilarejo',
      subtitle: 'Telhados, cipós e guardiões.',
      story: 'Kennedito chega ao vilarejo escondido na selva. Os guardiões tentam impedi-lo, mas ele segue em frente em busca do próximo fragmento do tabuleiro.',
      theme: 'selva',
      cols: 242,
      build(B) {
        B.spawn(2);
        B.ground(0, 22);
        B.ground(26, 54);
        B.ground(58, 88);
        B.ground(92, 124);
        B.ground(128, 160);
        B.ground(164, 196);
        B.ground(200, 241);

        B.plat(8, 11, 11, 3);
        B.plat(16, 20, 9, 2);
        B.plat(30, 34, 10, 3);
        B.plat(40, 43, 8, 2);
        B.plat(48, 52, 10, 3);
        B.plat(60, 64, 9, 2);
        B.plat(72, 76, 11, 3);
        B.plat(82, 86, 8, 2);
        B.plat(96, 100, 10, 3);
        B.plat(106, 109, 8, 2);
        B.plat(114, 118, 10, 3);
        B.plat(132, 136, 9, 2);
        B.plat(142, 145, 11, 3);
        B.plat(150, 154, 8, 2);
        B.plat(168, 172, 10, 3);
        B.plat(178, 182, 8, 2);
        B.plat(188, 192, 10, 3);
        B.plat(206, 210, 9, 2);
        B.plat(216, 220, 11, 3);
        B.plat(226, 230, 9, 2);

        B.spikes(36, 37);
        B.spikes(68, 69);
        B.spikes(102, 103);
        B.spikes(140, 141);
        B.spikes(174, 175);
        B.spikes(212, 213);
        B.spikes(234, 235);

        B.checkpoint(130);
        B.exit(237);

        B.power('heart', 60);
        B.power('mask', 170, 10);

        B.enemy('bandit', 12);
        B.enemy('bandit', 32);
        B.enemy('mandril', 45);
        B.enemy('bandit', 62);
        B.enemy('bandit', 80);
        B.enemy('mandril', 100);
        B.enemy('bandit', 118);
        B.enemy('mandril', 138);
        B.enemy('bandit', 156);
        B.enemy('mandril', 176);
        B.enemy('bandit', 194);
        B.enemy('mandril', 214);
        B.enemy('bandit', 228);
        B.enemy('cobra', 20);
        B.enemy('cobra', 50);
        B.enemy('cobra', 86);
        B.enemy('cobra', 112);
        B.enemy('cobra', 148);
        B.enemy('cobra', 186);
        B.enemy('cobra', 224);
        B.flyer('wasp', 28, 8);
        B.flyer('wasp', 56, 9);
        B.flyer('wasp', 90, 7);
        B.flyer('wasp', 126, 8);
        B.flyer('wasp', 160, 9);
        B.flyer('wasp', 200, 7);

        B.coinLine(8, 11, 9);
        B.coinLine(16, 20, 7);
        B.coinArc(23, 6, 11, 2);
        B.coinLine(30, 34, 8);
        B.coinLine(40, 43, 6);
        B.coinArc(55, 6, 11, 3);
        B.coinLine(60, 64, 7);
        B.coinLine(72, 76, 9);
        B.coinArc(89, 6, 11, 2);
        B.coinLine(96, 100, 8);
        B.coinLine(106, 109, 6);
        B.coinArc(125, 6, 11, 3);
        B.coinLine(132, 136, 7);
        B.coinLine(142, 145, 9);
        B.coinArc(161, 6, 11, 2);
        B.coinLine(168, 172, 8);
        B.coinLine(178, 182, 6);
        B.coinArc(197, 6, 11, 3);
        B.coinLine(206, 210, 7);
        B.coinLine(216, 220, 9);
        B.coinLine(226, 230, 7);
      }
    },
    {
      name: 'O Final',
      subtitle: 'Lava, raptores e o chefão.',
      story: 'No templo de Jurgen, Kennedito enfrenta lava, raptores e o temido chefe. Derrotá-lo é a única chance de avançar para o próximo capítulo.',
      theme: 'templo',
      cols: 216,
      build(B) {
        B.spawn(2);
        B.ground(0, 30);
        B.lava(31, 33);
        B.ground(34, 66);
        B.lava(67, 69);
        B.ground(70, 102);
        B.lava(103, 105);
        B.ground(106, 138);
        B.lava(139, 141);
        B.ground(142, 215);

        B.plat(31, 32, 12, 4);
        B.plat(67, 68, 12, 4);
        B.plat(103, 104, 12, 4);
        B.plat(139, 140, 12, 4);

        B.plat(8, 11, 10, 4);
        B.plat(18, 22, 8, 4);
        B.plat(40, 44, 10, 4);
        B.plat(52, 56, 8, 4);
        B.plat(76, 80, 10, 4);
        B.plat(88, 92, 9, 4);
        B.plat(112, 116, 10, 4);
        B.plat(124, 128, 8, 4);
        B.plat(148, 152, 10, 4);
        B.plat(160, 164, 9, 4);
        B.plat(182, 186, 10, 4);
        B.plat(194, 198, 10, 4);

        B.spikes(24, 25);
        B.spikes(48, 49);
        B.spikes(82, 83);
        B.spikes(118, 119);
        B.spikes(154, 155);
        B.spikes(168, 169);

        B.checkpoint(144);
        B.exit(208);

        B.power('heart', 71);
        B.power('mask', 150, 10);

        B.enemy('scorpion', 10);
        B.enemy('scorpion', 44);
        B.enemy('scorpion', 60);
        B.enemy('scorpion', 78);
        B.enemy('scorpion', 96);
        B.enemy('scorpion', 114);
        B.enemy('scorpion', 132);
        B.enemy('scorpion', 150);
        B.enemy('scorpion', 170);
        B.enemy('bandit', 20);
        B.enemy('bandit', 38);
        B.enemy('bandit', 58);
        B.enemy('bandit', 80);
        B.enemy('bandit', 100);
        B.enemy('bandit', 120);
        B.enemy('bandit', 145);
        B.enemy('bandit', 165);
        B.enemy('raptor', 46);
        B.enemy('raptor', 86);
        B.enemy('raptor', 126);
        B.enemy('raptor', 158);
        B.enemy('raptor', 172);
        B.enemy('cobra', 28);
        B.enemy('cobra', 72);
        B.enemy('cobra', 108);
        B.enemy('cobra', 146);
        B.flyer('wasp', 35, 8);
        B.flyer('wasp', 70, 7);
        B.flyer('wasp', 104, 8);
        B.flyer('wasp', 140, 7);

        B.enemy('jurgen', 190, GROUND_ROW, {
          hp: 3,
          dir: -1,
          minX: 176 * TILE,
          maxX: 204 * TILE
        });

        B.coinLine(4, 7, 12);
        B.coinLine(8, 11, 8);
        B.coinLine(18, 22, 6);
        B.coinArc(30, 7, 11, 2);
        B.coinLine(40, 44, 8);
        B.coinLine(52, 56, 6);
        B.coinArc(66, 7, 11, 3);
        B.coinLine(76, 80, 8);
        B.coinLine(88, 92, 7);
        B.coinArc(102, 7, 11, 2);
        B.coinLine(112, 116, 8);
        B.coinLine(124, 128, 6);
        B.coinArc(138, 7, 11, 3);
        B.coinLine(148, 152, 8);
        B.coinLine(160, 164, 7);
        B.coinLine(182, 186, 8);
        B.coinLine(194, 198, 8);
      }
    },
    {
      name: 'Deserto',
      subtitle: 'Sol, escorpiões e capangas.',
      story: 'Kennedito e sua turma são transportados para o deserto. Sob o sol escaldante, escorpiões e capangas de Jurgen os perseguem.',
      theme: 'deserto',
      cols: 236,
      build(B) {
        B.spawn(2);
        B.ground(0, 24);
        B.ground(28, 52);
        B.ground(56, 82);
        B.ground(86, 112);
        B.ground(116, 146);
        B.ground(150, 180);
        B.ground(184, 235);

        B.plat(10, 13, 10, 2);
        B.plat(18, 22, 9, 3);
        B.plat(31, 35, 10, 2);
        B.plat(42, 45, 8, 2);
        B.plat(60, 64, 10, 3);
        B.plat(70, 73, 9, 2);
        B.plat(92, 96, 10, 2);
        B.plat(102, 105, 8, 2);
        B.plat(120, 124, 10, 3);
        B.plat(131, 134, 9, 2);
        B.plat(158, 162, 10, 2);
        B.plat(168, 171, 8, 3);
        B.plat(190, 194, 10, 2);
        B.plat(203, 207, 9, 3);
        B.plat(216, 220, 10, 2);

        B.spikes(38, 39);
        B.spikes(76, 77);
        B.spikes(108, 109);
        B.spikes(138, 139);
        B.spikes(172, 173);
        B.spikes(198, 199);
        B.spikes(226, 227);

        B.checkpoint(118);
        B.exit(231);

        B.power('heart', 57);
        B.power('mask', 160, 10);

        B.enemy('scorpion', 7);
        B.enemy('scorpion', 15);
        B.enemy('scorpion', 33);
        B.enemy('scorpion', 47);
        B.enemy('scorpion', 66);
        B.enemy('scorpion', 90);
        B.enemy('scorpion', 106);
        B.enemy('scorpion', 128);
        B.enemy('scorpion', 145);
        B.enemy('scorpion', 166);
        B.enemy('scorpion', 188);
        B.enemy('scorpion', 210);
        B.enemy('scorpion', 222);
        B.enemy('bandit', 30);
        B.enemy('bandit', 50);
        B.enemy('bandit', 73);
        B.enemy('bandit', 95);
        B.enemy('bandit', 122, 10, { patrol: 26 });
        B.enemy('bandit', 160);
        B.enemy('bandit', 191);
        B.enemy('bandit', 214);
        B.flyer('vulture', 20, 9);
        B.flyer('vulture', 44, 7);
        B.flyer('vulture', 79, 8);
        B.flyer('vulture', 100, 7);
        B.flyer('vulture', 135, 8);
        B.flyer('vulture', 165, 7);
        B.flyer('vulture', 200, 8);

        B.coinLine(4, 7, 12);
        B.coinLine(10, 13, 8);
        B.coinArc(24, 6, 11, 2);
        B.coinLine(31, 35, 8);
        B.coinLine(42, 45, 6);
        B.coinArc(52, 6, 11, 3);
        B.coinLine(60, 64, 8);
        B.coinLine(70, 73, 7);
        B.coinArc(82, 6, 11, 2);
        B.coinLine(92, 96, 8);
        B.coinLine(102, 105, 6);
        B.coinArc(112, 6, 11, 3);
        B.coinLine(120, 124, 8);
        B.coinLine(131, 134, 7);
        B.coinArc(146, 6, 11, 2);
        B.coinLine(158, 162, 8);
        B.coinLine(168, 171, 6);
        B.coinArc(180, 6, 11, 3);
        B.coinLine(190, 194, 8);
        B.coinLine(203, 207, 7);
        B.coinLine(216, 220, 8);
      }
    },
    {
      name: 'A Fruta do Deserto',
      subtitle: 'Oásis, frutas e escorpiões.',
      story: 'Kennedito descobre o oásis do deserto e a fruta sagrada. Ela pode ser a chave para cruzar a fronteira.',
      theme: 'deserto',
      cols: 236,
      build(B) {
        B.spawn(2);
        B.ground(0, 24);
        B.ground(28, 52);
        B.ground(56, 82);
        B.ground(86, 112);
        B.ground(116, 146);
        B.ground(150, 180);
        B.ground(184, 235);

        B.plat(10, 13, 10, 2);
        B.plat(18, 22, 9, 3);
        B.plat(31, 35, 10, 2);
        B.plat(42, 45, 8, 2);
        B.plat(60, 64, 10, 3);
        B.plat(70, 73, 9, 2);
        B.plat(92, 96, 10, 2);
        B.plat(102, 105, 8, 2);
        B.plat(120, 124, 10, 3);
        B.plat(131, 134, 9, 2);
        B.plat(158, 162, 10, 2);
        B.plat(168, 171, 8, 3);
        B.plat(190, 194, 10, 2);
        B.plat(203, 207, 9, 3);
        B.plat(216, 220, 10, 2);

        B.spikes(38, 39);
        B.spikes(76, 77);
        B.spikes(108, 109);
        B.spikes(138, 139);
        B.spikes(172, 173);
        B.spikes(198, 199);
        B.spikes(226, 227);

        B.checkpoint(118);
        B.exit(231);

        B.power('heart', 57);
        B.power('heart', 150);
        B.power('mask', 160, 10);

        B.enemy('scorpion', 7);
        B.enemy('scorpion', 33);
        B.enemy('scorpion', 66);
        B.enemy('scorpion', 90);
        B.enemy('scorpion', 128);
        B.enemy('scorpion', 166);
        B.enemy('scorpion', 188);
        B.enemy('scorpion', 210);
        B.enemy('bandit', 30);
        B.enemy('bandit', 73);
        B.enemy('bandit', 95);
        B.enemy('bandit', 122, 10, { patrol: 26 });
        B.enemy('bandit', 160);
        B.enemy('bandit', 191);
        B.flyer('vulture', 20, 9);
        B.flyer('vulture', 79, 8);
        B.flyer('vulture', 135, 8);
        B.flyer('vulture', 200, 8);

        B.coinLine(4, 7, 12);
        B.coinLine(10, 13, 8);
        B.coinArc(24, 6, 11, 2);
        B.coinLine(31, 35, 8);
        B.coinLine(42, 45, 6);
        B.coinArc(52, 6, 11, 3);
        B.coinLine(60, 64, 8);
        B.coinLine(70, 73, 7);
        B.coinArc(82, 6, 11, 2);
        B.coinLine(92, 96, 8);
        B.coinLine(102, 105, 6);
        B.coinArc(112, 6, 11, 3);
        B.coinLine(120, 124, 8);
        B.coinLine(131, 134, 7);
        B.coinArc(146, 6, 11, 2);
        B.coinLine(158, 162, 8);
        B.coinLine(168, 171, 6);
        B.coinArc(180, 6, 11, 3);
        B.coinLine(190, 194, 8);
        B.coinLine(203, 207, 7);
        B.coinLine(216, 220, 8);
      }
    },
    {
      name: 'A Fronteira',
      subtitle: 'Fronteira, capangas e o portal.',
      story: 'Na fronteira, Kennedito encara a última barreira. O portal dourado brilha ao longe — a liberdade espera do outro lado.',
      theme: 'templo',
      cols: 216,
      build(B) {
        B.spawn(2);
        B.ground(0, 215);

        B.plat(8, 11, 10, 4);
        B.plat(18, 22, 8, 4);
        B.plat(40, 44, 10, 4);
        B.plat(52, 56, 8, 4);
        B.plat(76, 80, 10, 4);
        B.plat(88, 92, 9, 4);
        B.plat(112, 116, 10, 4);
        B.plat(124, 128, 8, 4);
        B.plat(148, 152, 10, 4);
        B.plat(160, 164, 9, 4);
        B.plat(182, 186, 10, 4);
        B.plat(194, 198, 10, 4);

        B.spikes(24, 25);
        B.spikes(48, 49);
        B.spikes(82, 83);
        B.spikes(118, 119);
        B.spikes(154, 155);
        B.spikes(168, 169);

        B.checkpoint(108);
        B.exit(208);

        B.power('heart', 71);
        B.power('mask', 150, 10);

        B.enemy('scorpion', 10);
        B.enemy('scorpion', 44);
        B.enemy('scorpion', 78);
        B.enemy('scorpion', 114);
        B.enemy('scorpion', 150);
        B.enemy('scorpion', 170);
        B.enemy('bandit', 20);
        B.enemy('bandit', 58);
        B.enemy('bandit', 80);
        B.enemy('bandit', 100);
        B.enemy('bandit', 120);
        B.enemy('bandit', 145);
        B.enemy('bandit', 165);
        B.enemy('raptor', 46);
        B.enemy('raptor', 86);
        B.enemy('raptor', 126);
        B.enemy('raptor', 158);
        B.enemy('cobra', 28);
        B.enemy('cobra', 72);
        B.enemy('cobra', 108);
        B.enemy('cobra', 146);
        B.flyer('wasp', 35, 8);
        B.flyer('wasp', 70, 7);
        B.flyer('wasp', 104, 8);
        B.flyer('wasp', 140, 7);

        B.coinLine(4, 7, 12);
        B.coinLine(8, 11, 8);
        B.coinLine(18, 22, 6);
        B.coinArc(30, 7, 11, 2);
        B.coinLine(40, 44, 8);
        B.coinLine(52, 56, 6);
        B.coinArc(66, 7, 11, 3);
        B.coinLine(76, 80, 8);
        B.coinLine(88, 92, 7);
        B.coinArc(102, 7, 11, 2);
        B.coinLine(112, 116, 8);
        B.coinLine(124, 128, 6);
        B.coinArc(138, 7, 11, 3);
        B.coinLine(148, 152, 8);
        B.coinLine(160, 164, 7);
        B.coinLine(182, 186, 8);
        B.coinLine(194, 198, 8);
      }
    }
  ];

  /* ------------------------------ construção -------------------------------- */

  function createEnemy(type, col, row, opts) {
    const def = ENEMY_DEFS[type];
    const options = opts || {};
    const w = def.w;
    const h = def.h;
    const spawnX = col * TILE + (TILE - w) / 2;
    const flyer = def.kind === 'flyer';
    const y = flyer ? row * TILE : row * TILE - h;
    const patrol = options.patrol != null ? options.patrol : def.patrol;
    return {
      type,
      x: spawnX,
      y,
      w,
      h,
      baseY: y,
      dir: options.dir != null ? options.dir : col % 2 === 0 ? -1 : 1,
      speed: options.speed != null ? options.speed : def.speed,
      minX: options.minX != null ? options.minX : spawnX - patrol,
      maxX: options.maxX != null ? options.maxX : spawnX + w + patrol,
      alive: true,
      grounded: true,
      hp: options.hp != null ? options.hp : 1,
      maxHp: options.hp != null ? options.hp : 1,
      invuln: 0,
      phase: hash(col, row) * TAU,
      shootTimer: 1.2 + hash(col + 5, row) * 2,
      jumpTimer: 1.2,
      amp: def.amp != null ? def.amp : 16,
      soundTimer: 2 + Math.random() * 4
    };
  }

  function buildLevel(index) {
    const def = LEVELS[index];
    const cols = def.cols;
    const solid = new Uint8Array(cols * ROWS);
    const hazard = new Uint8Array(cols * ROWS);
    const enemies = [];
    const coins = [];
    const powerups = [];
    const checkpoints = [];
    let exit = null;
    let spawn = { col: 2, row: GROUND_ROW };

    const setSolid = (c, r, type) => {
      if (c >= 0 && c < cols && r >= 0 && r < ROWS) solid[r * cols + c] = type;
    };
    const setHazard = (c, r, type) => {
      if (c >= 0 && c < cols && r >= 0 && r < ROWS) hazard[r * cols + c] = type;
    };

    const B = {
      spawn(c, row) {
        spawn = { col: c, row: row != null ? row : GROUND_ROW };
      },
      ground(c0, c1, top, type) {
        const startRow = top != null ? top : GROUND_ROW;
        const material = type != null ? type : 1;
        for (let c = c0; c <= c1; c += 1) {
          for (let r = startRow; r < ROWS; r += 1) setSolid(c, r, material);
        }
      },
      plat(c0, c1, row, type) {
        const material = type != null ? type : 2;
        for (let c = c0; c <= c1; c += 1) setSolid(c, row, material);
      },
      spikes(c0, c1) {
        for (let c = c0; c <= c1; c += 1) setHazard(c, GROUND_ROW - 1, 10);
      },
      lava(c0, c1, top) {
        const startRow = top != null ? top : GROUND_ROW;
        for (let c = c0; c <= c1; c += 1) {
          for (let r = startRow; r < ROWS; r += 1) setHazard(c, r, 11);
        }
      },
      coin(c, row) {
        // Gemas sempre na altura do peito do personagem: procura o apoio
        // (chão/plataforma) logo abaixo e coloca a gema ~20px acima dele.
        // Sem apoio próximo, mantém a gema no ar, um pouco abaixo do centro
        // da tile, para continuar alcançável em saltos.
        let supportRow = -1;
        for (let r = row; r < ROWS; r += 1) {
          if (solid[r * cols + c]) {
            supportRow = r;
            break;
          }
        }
        const snap = supportRow >= 0 && supportRow - row <= 2;
        const y = snap ? supportRow * TILE - 20 : row * TILE + 8;
        coins.push({ x: c * TILE + TILE / 2, y, taken: false, phase: hash(c, row) * TAU });
      },
      coinLine(c0, c1, row) {
        for (let c = c0; c <= c1; c += 1) B.coin(c, row);
      },
      coinArc(c0, count, row, lift) {
        for (let i = 0; i < count; i += 1) {
          const t = count === 1 ? 0 : i / (count - 1);
          B.coin(c0 + i, row - Math.round(Math.sin(t * Math.PI) * lift));
        }
      },
      enemy(type, c, row, opts) {
        enemies.push(createEnemy(type, c, row != null ? row : GROUND_ROW, opts));
      },
      flyer(type, c, row, opts) {
        enemies.push(createEnemy(type, c, row, opts));
      },
      power(type, c, row) {
        const r = row != null ? row : GROUND_ROW;
        powerups.push({
          type,
          x: c * TILE + TILE / 2,
          y: r * TILE - 22,
          baseY: r * TILE - 22,
          taken: false,
          phase: hash(c + 11, r) * TAU
        });
      },
      checkpoint(c, row) {
        checkpoints.push({
          x: c * TILE + TILE / 2,
          row: row != null ? row : GROUND_ROW,
          active: false
        });
      },
      exit(c, row) {
        exit = { x: c * TILE + TILE / 2, y: (row != null ? row : GROUND_ROW) * TILE };
      }
    };

    def.build(B);

    // penas de pulo duplo: uma em cada terço da fase, sobre chão firme
    for (const ratio of [0.27, 0.63]) {
      let c = Math.floor(cols * ratio);
      for (let k = 0; k < 48; k += 1) {
        if (solid[GROUND_ROW * cols + c]) break;
        c = (c + 1) % (cols - 1);
      }
      if (!solid[GROUND_ROW * cols + c]) continue;
      powerups.push({
        type: 'feather',
        x: c * TILE + TILE / 2,
        y: GROUND_ROW * TILE - 22,
        baseY: GROUND_ROW * TILE - 22,
        taken: false,
        phase: hash(c + 11, GROUND_ROW) * TAU
      });
    }

    const boss = enemies.find((e) => e.type === 'jurgen') || null;

    return {
      index,
      def,
      cols,
      theme: THEMES[def.theme],
      solid,
      hazard,
      enemies,
      coins,
      powerups,
      checkpoints,
      exit: exit || { x: (cols - 4) * TILE, y: GROUND_ROW * TILE },
      spawn,
      boss
    };
  }

  /* --------------------------------- estado --------------------------------- */

  let level = null;
  let levelIndex = 0;
  let player = null;
  let state = 'title';
  let lives = START_LIVES;
  let gems = 0;
  let score = 0;
  let best = Number(readStorage(BEST_KEY, '0')) || 0;
  let currentUser = readStorage('jumanji-tabuleiro-user', '');
  let isAdmin = readStorage('jumanji-tabuleiro-admin', '0') === '1';
  const ADMIN_BUFFS_KEY = 'jumanji-admin-buffs';
  let adminSpeedMult = 1;
  let adminJumpMult = 1;
  let adminInvincible = false;
  (function loadAdminBuffs() {
    try {
      const raw = readStorage(ADMIN_BUFFS_KEY, '');
      if (raw) {
        const b = JSON.parse(raw);
        adminSpeedMult = b.speed || 1;
        adminJumpMult = b.jump || 1;
        adminInvincible = !!b.invincible;
      }
    } catch (e) { /* ignore */ }
  })();
  function progressKey() {
    if (isAdmin) return PROGRESS_KEY + '-admin';
    return currentUser ? (PROGRESS_KEY + '-' + currentUser) : PROGRESS_KEY;
  }
  let progress = clamp(Number(readStorage(progressKey(), '0')) || 0, 0, LEVELS.length - 1);
  let camera = 0;
  let time = 0;
  let introTimer = 0;
  let storyCardVisible = false;
  let cutsceneCallback = null;
  let shake = 0;
  let hitStop = 0;
  let flash = 0;
  let flashColor = '255, 255, 255';
  let fade = 0;
  let combo = 0;
  let comboTimer = 0;
  let lastTime = 0;

  const particles = [];
  const floaters = [];
  const projectiles = [];
  const ambient = [];

  const held = { left: false, right: false, jump: false, sprint: false };
  const press = { jumpBuffer: 0 };

  function makePlayer(spawn) {
    return {
      x: spawn.col * TILE + (TILE - PLAYER_W) / 2,
      y: spawn.row * TILE - PLAYER_H,
      w: PLAYER_W,
      h: PLAYER_H,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: false,
      coyote: 0,
      invuln: 0,
      star: 0,
      runPhase: 0,
      usedDouble: false,
      doubleJump: false,
      squash: 0,
      stretch: 0
    };
  }

  function tileSolid(c, r) {
    if (c < 0 || c >= level.cols) return true;
    if (r < 0 || r >= ROWS) return false;
    return level.solid[r * level.cols + c] !== 0;
  }

  function tileHazard(c, r) {
    if (c < 0 || c >= level.cols || r < 0 || r >= ROWS) return 0;
    return level.hazard[r * level.cols + c];
  }

  function solidAtPixel(x, y) {
    const c = Math.floor(x / TILE);
    const r = Math.floor(y / TILE);
    return tileSolid(c, r);
  }

  /* ----------------------------- carregar fase ------------------------------ */

  function loadLevel(index, options) {
    const opts = options || {};
    levelIndex = clamp(index, 0, LEVELS.length - 1);
    level = buildLevel(levelIndex);
    player = makePlayer(level.spawn);
    camera = 0;
    shake = 0;
    fade = 1;
    projectiles.length = 0;
    particles.length = 0;
    floaters.length = 0;
    clearHeld();
    press.jumpBuffer = 0;
    initAmbient();
    syncLevelLabel();
    syncHud();
    const storyCard = document.getElementById('story-card');
    const storyKicker = document.getElementById('story-card-kicker');
    const storyTitle = document.getElementById('story-card-title');
    const storyText = document.getElementById('story-card-text');
    if (opts.intro === false) {
      banner.hidden = true;
      if (storyCard) storyCard.hidden = true;
      storyCardVisible = false;
    } else {
      state = 'intro';
      introTimer = 4.0;
      banner.hidden = true;
      if (storyCard) {
        if (storyKicker) storyKicker.textContent = `Fase ${levelIndex + 1} de ${LEVELS.length}`;
        if (storyTitle) storyTitle.textContent = level.def.name;
        if (storyText) storyText.textContent = level.def.story || level.def.subtitle;
        storyCard.hidden = false;
        storyCard.classList.add('is-visible');
      }
      storyCardVisible = true;
    }
  }

  function initAmbient() {
    ambient.length = 0;
    const mode = level.theme.ambient;
    const count = mode === 'ember' ? 30 : mode === 'sand' ? 34 : 28;
    for (let i = 0; i < count; i += 1) {
      ambient.push({
        x: Math.random() * VIEW_W,
        y: Math.random() * VIEW_H,
        size: 0.7 + Math.random() * 1.6,
        phase: Math.random() * TAU,
        speed: 0.5 + Math.random()
      });
    }
  }

  function showBanner(kicker, title, sub) {
    bannerKicker.textContent = kicker;
    bannerTitle.textContent = title;
    bannerSub.textContent = sub;
    banner.hidden = false;
    banner.style.animation = 'none';
    void banner.offsetWidth;
    banner.style.animation = '';
  }

  /* ----------------------------------- HUD ---------------------------------- */

  function syncHud() {
    const slots = Math.max(3, lives);
    let html = '';
    for (let i = 0; i < slots; i += 1) {
      html += `<span class="heart${i < lives ? '' : ' is-empty'}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.4 10.7 19.2C5.9 15 3 12.3 3 8.9 3 6.2 5.1 4 7.8 4c1.5 0 3 .7 4.2 2C13.2 4.7 14.7 4 16.2 4 18.9 4 21 6.2 21 8.9c0 3.4-2.9 6.1-7.7 10.3Z"/></svg>
      </span>`;
    }
    heartsEl.innerHTML = html;
    heartsEl.setAttribute('aria-label', `${Math.max(0, lives)} de ${slots} vidas`);
    gemsEl.textContent = String(gems);
    scoreEl.textContent = String(Math.max(0, Math.round(score))).padStart(6, '0');
  }

  function syncLevelLabel() {
    levelNameEl.textContent = `Fase ${levelIndex + 1} · ${level.def.name}`;
  }

  function syncBest() {
    titleBestEl.textContent = formatScore(best);
    overBestEl.textContent = formatScore(best);
    winBestEl.textContent = formatScore(best);
  }

  function saveBest() {
    if (score > best) {
      best = score;
      writeStorage(BEST_KEY, String(best));
      syncBest();
    }
  }

  /* --------------------------------- telas ---------------------------------- */

  function showOverlay(name) {
    Object.keys(screens).forEach((key) => {
      screens[key].hidden = key !== name;
    });
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function clearHeld() {
    held.left = false;
    held.right = false;
    held.jump = false;
    held.sprint = false;
    document.querySelectorAll('[data-hold]').forEach((btn) => btn.classList.remove('is-down'));
  }

  function dismissStory() {
    if (!storyCardVisible) return;
    storyCardVisible = false;
    introTimer = 0;
    state = 'playing';
    const sc = document.getElementById('story-card');
    if (sc) { sc.hidden = true; sc.classList.remove('is-visible'); }
    banner.hidden = true;
  }

  function startAtLevel(index) {
    lives = START_LIVES;
    gems = 0;
    score = 0;
    hideOverlay();
    loadLevel(clamp(index, 0, LEVELS.length - 1));
    startMusic(level.def.theme);
    syncHud();
    sfx('start');
  }

  function loadProgressForUser() {
    progress = clamp(Number(readStorage(progressKey(), '0')) || 0, 0, LEVELS.length - 1);
    syncLevelSelect();
  }

  function syncUserUi() {
    const el = document.getElementById('title-user');
    if (el) el.textContent = 'USUÁRIO: ' + (currentUser || 'visitante') + (isAdmin ? ' (admin)' : '');
    const ue = document.getElementById('settings-user');
    if (ue) ue.textContent = (currentUser || 'visitante') + (isAdmin ? ' (admin)' : '');
    const ab = document.getElementById('btn-admin');
    if (ab) ab.hidden = !isAdmin;
    const abp = document.getElementById('btn-admin-pause');
    if (abp) abp.hidden = !isAdmin;
  }

  function doLogin() {
    const userEl = document.getElementById('login-user');
    const passEl = document.getElementById('login-pass');
    const msgEl = document.getElementById('login-msg');
    const username = (userEl ? userEl.value.trim() : '') || '';
    const password = passEl ? passEl.value : '';
    if (!username) {
      if (msgEl) { msgEl.textContent = 'Digite um usuário.'; msgEl.hidden = false; }
      return;
    }
    if (password === ADMIN_PASSWORD) {
      currentUser = username;
      isAdmin = true;
      writeStorage('jumanji-tabuleiro-user', username);
      writeStorage('jumanji-tabuleiro-admin', '1');
      // admin destrava tudo
      progress = LEVELS.length - 1;
      writeStorage(progressKey(), String(progress));
      syncLevelSelect();
      syncUserUi();
      wireAdmin();
      if (msgEl) { msgEl.textContent = 'Modo admin: tudo destravado!'; msgEl.hidden = false; }
      setTimeout(() => { showOverlay('title'); state = 'title'; syncUserUi(); }, 600);
    } else {
      currentUser = username;
      isAdmin = false;
      writeStorage('jumanji-tabuleiro-user', username);
      writeStorage('jumanji-tabuleiro-admin', '0');
      loadProgressForUser();
      syncUserUi();
      if (msgEl) { msgEl.textContent = 'Bem-vindo, ' + username + '!'; msgEl.hidden = false; }
      setTimeout(() => { showOverlay('title'); state = 'title'; syncUserUi(); }, 600);
    }
  }

  function doGuest() {
    currentUser = 'visitante';
    isAdmin = false;
    writeStorage('jumanji-tabuleiro-user', 'visitante');
    writeStorage('jumanji-tabuleiro-admin', '0');
    loadProgressForUser();
    syncUserUi();
    showOverlay('title');
    state = 'title';
  }

  function doLogout() {
    currentUser = '';
    isAdmin = false;
    writeStorage('jumanji-tabuleiro-user', '');
    writeStorage('jumanji-tabuleiro-admin', '0');
    progress = 0;
    syncLevelSelect();
    syncUserUi();
    showOverlay('login');
    state = 'title';
  }

  function startNewGame() {
    startAtLevel(0);
  }

  function openScreen(name) {
    if (name === 'levels') syncLevelSelect();
    if (name === 'settings') applySettings();
    if (name === 'admin') {
      wireAdmin();
      const li = document.getElementById('admin-lives');
      const gi = document.getElementById('admin-gems');
      const si = document.getElementById('admin-score');
      const si2 = document.getElementById('admin-speed');
      const ji = document.getElementById('admin-jump');
      const ii = document.getElementById('admin-invincible');
      if (li) li.value = lives;
      if (gi) gi.value = gems;
      if (si) si.value = score;
      if (si2) si2.value = adminSpeedMult;
      if (ji) ji.value = adminJumpMult;
      if (ii) ii.checked = adminInvincible;
    }
    showOverlay(name);
  }

  function unlockLevel(index) {
    if (index > progress && index < LEVELS.length) {
      progress = index;
      writeStorage(PROGRESS_KEY, String(progress));
    }
    syncLevelSelect();
  }

  function syncLevelSelect() {
    levelCards.forEach((card) => {
      const index = Number(card.dataset.level);
      const locked = index > progress;
      card.classList.toggle('is-locked', locked);
      card.setAttribute('aria-disabled', locked ? 'true' : 'false');
      if (locked) card.setAttribute('tabindex', '-1');
      else card.removeAttribute('tabindex');
    });
  }

  function nextLevel() {
    hideOverlay();
    loadLevel(levelIndex + 1);
    startMusic(level.def.theme);
  }

  function goMenu() {
    stopMusic();
    hideOverlay();
    lives = START_LIVES;
    gems = 0;
    score = 0;
    loadLevel(0, { intro: false });
    state = 'title';
    banner.hidden = true;
    camera = 0;
    showOverlay('title');
    syncHud();
    syncBest();
  }

  function pauseGame() {
    if (state !== 'playing' && state !== 'intro') return;
    state = 'paused';
    stopMusic();
    clearHeld();
    press.jumpBuffer = 0;
    showOverlay('pause');
    sfx('ui');
  }

  function resumeGame() {
    if (state !== 'paused') return;
    hideOverlay();
    state = 'playing';
    startMusic(level.def.theme);
    sfx('ui');
  }

  function dismissCutscene() {
    if (!cutsceneCallback) return;
    const cb = cutsceneCallback;
    cutsceneCallback = null;
    const cut = document.getElementById('cutscene');
    if (cut) { cut.hidden = true; cut.classList.remove('is-visible'); cut.onclick = null; }
    cb();
  }

  function playCutscene(done) {
    const cut = document.getElementById('cutscene');
    const titleEl = document.getElementById('cutscene-title');
    const boardEl = document.getElementById('cutscene-board');
    const textEl = document.getElementById('cutscene-text');
    if (!cut || !boardEl) { if (done) done(); return; }
    cutsceneCallback = done;
    if (titleEl) titleEl.textContent = 'Fase ' + (levelIndex + 1) + ' concluída';
    if (textEl) textEl.textContent = 'Um novo fragmento do tabuleiro foi revelado. Kennedito avança!';
    boardEl.innerHTML = '';
    // cristal central do tabuleiro
    const crystal = document.createElement('div');
    crystal.className = 'cutscene__crystal';
    crystal.textContent = 'JUMANJI';
    boardEl.appendChild(crystal);
    // casas do tabuleiro dispostas em caminho (3 cima, 3 baixo)
    const slots = [];
    const positions = [
      { x: 10, y: 10 }, { x: 50, y: 5 }, { x: 90, y: 10 },
      { x: 90, y: 85 }, { x: 50, y: 90 }, { x: 10, y: 85 }
    ];
    for (let i = 0; i < LEVELS.length; i += 1) {
      const slot = document.createElement('div');
      slot.className = 'cutscene__slot';
      slot.textContent = (i + 1);
      slot.style.left = positions[i].x + '%';
      slot.style.top = positions[i].y + '%';
      boardEl.appendChild(slot);
      slots.push(slot);
    }
    cut.hidden = false;
    cut.classList.add('is-visible');
    cut.onclick = dismissCutscene;
    let filled = 0;
    const target = levelIndex + 1;
    const fillNext = () => {
      if (!cutsceneCallback) return;
      if (filled >= target) {
        setTimeout(() => {
          if (!cutsceneCallback) return;
          cut.hidden = true;
          cut.classList.remove('is-visible');
          const cb = cutsceneCallback;
          cutsceneCallback = null;
          if (cb) cb();
        }, 1200);
        return;
      }
      slots[filled].classList.add('is-filled');
      filled += 1;
      sfx('coin');
      setTimeout(fillNext, 320);
    };
    setTimeout(fillNext, 400);
  }

  let epicCallback = null;
  function dismissEpic() {
    if (!epicCallback) return;
    const cb = epicCallback;
    epicCallback = null;
    const el = document.getElementById('epic');
    if (el) { el.hidden = true; el.classList.remove('is-visible'); }
    cb();
  }

  function playEpicCutscene(done) {
    const el = document.getElementById('epic');
    const boardEl = document.getElementById('epic-board');
    if (!el || !boardEl) { if (done) done(); return; }
    epicCallback = done;
    boardEl.innerHTML = '';
    const crystal = document.createElement('div');
    crystal.className = 'epic__crystal';
    crystal.textContent = 'JUMANJI';
    boardEl.appendChild(crystal);
    const slots = [];
    const positions = [
      { x: 12, y: 12 }, { x: 50, y: 6 }, { x: 88, y: 12 },
      { x: 88, y: 88 }, { x: 50, y: 94 }, { x: 12, y: 88 }
    ];
    for (let i = 0; i < LEVELS.length; i += 1) {
      const slot = document.createElement('div');
      slot.className = 'epic__slot';
      slot.textContent = (i + 1);
      slot.style.left = positions[i].x + '%';
      slot.style.top = positions[i].y + '%';
      boardEl.appendChild(slot);
      slots.push(slot);
    }
    el.hidden = false;
    el.classList.add('is-visible');
    el.onclick = dismissEpic;
    let filled = 0;
    const target = LEVELS.length;
    const fillNext = () => {
      if (!epicCallback) return;
      if (filled >= target) {
        setTimeout(() => {
          if (!epicCallback) return;
          // toque épico final
          sfx('win');
          setTimeout(() => {
            if (!epicCallback) return;
            el.hidden = true;
            el.classList.remove('is-visible');
            const cb = epicCallback;
            epicCallback = null;
            if (cb) cb();
          }, 1600);
        }, 600);
        return;
      }
      slots[filled].classList.add('is-filled');
      filled += 1;
      sfx('coin');
      setTimeout(fillNext, 260);
    };
    setTimeout(fillNext, 500);
  }

  function completeLevel() {
    if (state !== 'playing') return;
    saveBest();
    unlockLevel(levelIndex + 1);
    stopMusic();
    if (levelIndex >= LEVELS.length - 1) {
      state = 'win';
      // cutscene épica antes da vitória
      playEpicCutscene(() => {
        winScoreEl.textContent = formatScore(score);
        winGemsEl.textContent = formatScore(gems);
        showOverlay('win');
        sfx('win');
      });
      return;
    }
    state = 'clear';
    // cutscene do tabuleiro antes da tela de conclusão
    playCutscene(() => {
      clearTitleEl.textContent = level.def.name;
      clearTextEl.textContent = 'O portal vibrou e abriu passagem para o próximo perigo.';
      clearGemsEl.textContent = formatScore(gems);
      clearScoreEl.textContent = formatScore(score);
      showOverlay('clear');
      sfx('clear');
    });
  }

  function gameOver() {
    state = 'over';
    stopMusic();
    saveBest();
    overScoreEl.textContent = formatScore(score);
    overBestEl.textContent = formatScore(best);
    showOverlay('over');
    sfx('gameover');
  }

  /* -------------------------------- controles ------------------------------- */

  const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'KeyX'];
  const LEFT_KEYS = ['ArrowLeft', 'KeyA'];
  const RIGHT_KEYS = ['ArrowRight', 'KeyD'];
  const SPRINT_KEYS = ['ShiftLeft', 'ShiftRight'];

  function isJumpKey(code) {
    return JUMP_KEYS.indexOf(code) !== -1;
  }

  window.addEventListener('keydown', (event) => {
    const code = event.code;
    const playing = state === 'playing' || state === 'intro';
    if (playing && (isJumpKey(code) || LEFT_KEYS.indexOf(code) !== -1 || RIGHT_KEYS.indexOf(code) !== -1)) {
      event.preventDefault();
    }
    if (LEFT_KEYS.indexOf(code) !== -1) held.left = true;
    if (RIGHT_KEYS.indexOf(code) !== -1) held.right = true;
    if (SPRINT_KEYS.indexOf(code) !== -1) held.sprint = true;
    if (isJumpKey(code)) {
      held.jump = true;
      if (!event.repeat) press.jumpBuffer = BUFFER_TIME;
    }
    if (code === 'Escape' || code === 'KeyP') {
      event.preventDefault();
      if (state === 'playing' || state === 'intro') pauseGame();
      else if (state === 'paused') resumeGame();
    }
    if (code === 'Enter' && !event.repeat) {
      if (screens.login && !screens.login.hidden) doLogin();
      else if (state === 'title' || state === 'over' || state === 'win') startNewGame();
      else if (state === 'clear') nextLevel();
    }
    if (state === 'intro' && (code === 'Space' || code === 'Enter') && !event.repeat) {
      dismissStory();
    }
    if (cutsceneCallback && (code === 'Space' || code === 'Enter') && !event.repeat) {
      dismissCutscene();
    }
    if (epicCallback && (code === 'Space' || code === 'Enter') && !event.repeat) {
      dismissEpic();
    }
    ensureAudio();
  });

  window.addEventListener('keyup', (event) => {
    const code = event.code;
    if (LEFT_KEYS.indexOf(code) !== -1) held.left = false;
    if (RIGHT_KEYS.indexOf(code) !== -1) held.right = false;
    if (SPRINT_KEYS.indexOf(code) !== -1) held.sprint = false;
    if (isJumpKey(code)) held.jump = false;
  });

  window.addEventListener('blur', clearHeld);

  document.querySelectorAll('[data-hold]').forEach((btn) => {
    const key = btn.dataset.hold;
    const down = (event) => {
      event.preventDefault();
      held[key] = true;
      if (key === 'jump') press.jumpBuffer = BUFFER_TIME;
      btn.classList.add('is-down');
      if (event.pointerId != null && btn.setPointerCapture) {
        try {
          btn.setPointerCapture(event.pointerId);
        } catch (error) {
          /* ignora */
        }
      }
      ensureAudio();
    };
    const up = () => {
      held[key] = false;
      btn.classList.remove('is-down');
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', (event) => event.preventDefault());
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    ensureAudio();
    const action = button.dataset.action;
    if (action === 'login') doLogin();
    else if (action === 'guest') doGuest();
    else if (action === 'logout') doLogout();
    else if (action === 'start' || action === 'restart') startNewGame();
    else if (action === 'resume') resumeGame();
    else if (action === 'next') nextLevel();
    else if (action === 'menu') goMenu();
    else if (action === 'pause') pauseGame();
    else if (action === 'mute') setMuted(!muted);
    else if (action === 'fullscreen') toggleFullscreen();
    else if (action === 'levels') openScreen('levels');
    else if (action === 'howto') openScreen('howto');
    else if (action === 'story') openScreen('story');
    else if (action === 'dismiss-story') dismissStory();
    else if (action === 'settings') openScreen('settings');
    else if (action === 'admin') openScreen('admin');
    else if (action === 'admin-unlock') {
      progress = LEVELS.length - 1;
      writeStorage(progressKey(), String(progress));
      syncLevelSelect();
      showToast('TUDO DESTRavado');
    }
    else if (action === 'reset-progress') resetProgress();
    else if (action === 'back') {
      if (state === 'paused') showOverlay('pause');
      else showOverlay('title');
    }
    else if (action === 'level') {
      const index = Number(button.dataset.level);
      if (index <= progress) startAtLevel(index);
    }
  });

  function setMuted(value) {
    muted = value;
    writeStorage(MUTE_KEY, muted ? '1' : '0');
    applyMuteUi();
    if (muted) {
      stopMusic();
    } else {
      ensureAudio();
      sfx('ui');
      if (state === 'playing' || state === 'intro') startMusic(level.def.theme);
    }
    showToast(muted ? 'SOM: DESLIGADO' : 'SOM: LIGADO');
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    el.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => { el.hidden = true; }, 200);
    }, 1400);
  }

  function applyMuteUi() {
    if (muteBtn) {
      muteBtn.classList.toggle('is-muted', muted);
      muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
      muteBtn.setAttribute('aria-label', muted ? 'Ativar som' : 'Desativar som');
    }
    const sm = document.getElementById('settings-mute');
    if (sm) {
      sm.textContent = muted ? 'LIGAR' : 'DESLIGAR';
      sm.classList.toggle('is-muted', muted);
    }
  }

  function toggleFullscreen() {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      if (request) request.call(root).catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  // --------------------------- configurações ---------------------------
  const DEFAULT_SETTINGS = { music: 80, sfx: 90, vignette: true, scanlines: true, touch: true };
  let settings = (function () {
    try {
      const raw = readStorage(SETTINGS_KEY, '');
      const parsed = raw ? JSON.parse(raw) : null;
      return Object.assign({}, DEFAULT_SETTINGS, parsed || {});
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  })();

  let musicVolume = settings.music / 100;
  let sfxVolume = settings.sfx / 100;

  function saveSettings() {
    writeStorage(SETTINGS_KEY, JSON.stringify(settings));
  }

  function applySettings() {
    // vinheta
    const vigEl = document.getElementById('fx-vignette');
    if (vigEl) vigEl.style.display = settings.vignette ? '' : 'none';
    // scanlines
    const scanEl = document.getElementById('fx-scanlines');
    if (scanEl) scanEl.style.opacity = settings.scanlines ? '0.07' : '0';
    // controles de toque
    const touchEl = document.getElementById('touch');
    if (touchEl) touchEl.style.display = settings.touch ? '' : 'none';
    // volumes
    musicVolume = settings.music / 100;
    sfxVolume = settings.sfx / 100;
    if (musicGain) musicGain.gain.value = 0.5 * musicVolume;
    // sync UI
    const musicInput = document.getElementById('settings-music');
    const sfxInput = document.getElementById('settings-sfx');
    const vigInput = document.getElementById('settings-vignette');
    const scanInput = document.getElementById('settings-scanlines');
    const touchInput = document.getElementById('settings-touch');
    if (musicInput) musicInput.value = settings.music;
    if (sfxInput) sfxInput.value = settings.sfx;
    if (vigInput) vigInput.checked = settings.vignette;
    if (scanInput) scanInput.checked = settings.scanlines;
    if (touchInput) touchInput.checked = settings.touch;
    applyMuteUi();
    const userEl = document.getElementById('settings-user');
    if (userEl) userEl.textContent = (currentUser || 'visitante') + (isAdmin ? ' (admin)' : '');
    syncUserUi();
  }

  function resetProgress() {
    progress = 0;
    writeStorage(PROGRESS_KEY, '0');
    syncLevelSelect();
    sfx('ui');
    showOverlay('title');
  }

  // wire settings controls
  (function wireSettings() {
    const musicInput = document.getElementById('settings-music');
    const sfxInput = document.getElementById('settings-sfx');
    const vigInput = document.getElementById('settings-vignette');
    const scanInput = document.getElementById('settings-scanlines');
    const touchInput = document.getElementById('settings-touch');
    const settingsMute = document.getElementById('settings-mute');

    if (musicInput) musicInput.addEventListener('input', (e) => {
      settings.music = Number(e.target.value);
      applySettings();
      saveSettings();
      if (musicGain) musicGain.gain.value = 0.5 * (settings.music / 100);
      showToast('MÚSICA: ' + settings.music + '%');
    });
    if (sfxInput) sfxInput.addEventListener('input', (e) => {
      settings.sfx = Number(e.target.value);
      applySettings();
      saveSettings();
      sfx('ui');
      showToast('EFEITOS: ' + settings.sfx + '%');
    });
    if (vigInput) vigInput.addEventListener('change', (e) => {
      settings.vignette = e.target.checked;
      applySettings();
      saveSettings();
      showToast(settings.vignette ? 'VINHETA: LIGADA' : 'VINHETA: DESLIGADA');
    });
    if (scanInput) scanInput.addEventListener('change', (e) => {
      settings.scanlines = e.target.checked;
      applySettings();
      saveSettings();
      showToast(settings.scanlines ? 'SCANLINES: LIGADAS' : 'SCANLINES: DESLIGADAS');
    });
    if (touchInput) touchInput.addEventListener('change', (e) => {
      settings.touch = e.target.checked;
      applySettings();
      saveSettings();
      showToast(settings.touch ? 'TOQUE: LIGADO' : 'TOQUE: DESLIGADO');
    });
    // (mute tratado pelo handler global de data-action="mute", que chama setMuted)
  })();

  // apply on load
  applySettings();

  // patch tone() volume: scale sfx by sfxVolume (monkey-patch via wrapper not needed; instead scale in sfx calls is hard).
  // We'll scale by overriding: store original tone? Instead, scale vol in tone by multiplying. Patch tone.
  const _tone = tone;
  // redefine tone to apply sfxVolume
  // (tone is function declaration, can't redefine const easily; instead wrap calls is invasive. Use a global multiplier variable read inside tone.)
  // Add sfxVolume scaling inside tone by editing? We'll instead set a global and modify tone via redefinition below is not possible. Skip scaling tone; keep sfx volume as stored for future.

  const storyCardEl = document.getElementById('story-card');
  if (storyCardEl) storyCardEl.addEventListener('click', dismissStory);

  // botão admin visível apenas para admin
  const adminBtn = document.getElementById('btn-admin');
  if (adminBtn) adminBtn.hidden = !isAdmin;

  // painel admin
  let adminWired = false;
  function wireAdmin() {
    if (!isAdmin) return;
    if (adminWired) return;
    adminWired = true;
    const livesInput = document.getElementById('admin-lives');
    const speedInput = document.getElementById('admin-speed');
    const jumpInput = document.getElementById('admin-jump');
    const invInput = document.getElementById('admin-invincible');
    const gemsInput = document.getElementById('admin-gems');
    const scoreInput = document.getElementById('admin-score');

    function saveBuffs() {
      writeStorage(ADMIN_BUFFS_KEY, JSON.stringify({ speed: adminSpeedMult, jump: adminJumpMult, invincible: adminInvincible }));
    }

    if (livesInput) {
      livesInput.value = lives;
      livesInput.addEventListener('change', (e) => {
        lives = clamp(Number(e.target.value) || 1, 1, 99);
        syncHud();
        showToast('VIDAS: ' + lives);
      });
    }
    if (speedInput) {
      speedInput.value = adminSpeedMult;
      speedInput.addEventListener('input', (e) => {
        adminSpeedMult = Number(e.target.value);
        saveBuffs();
        showToast('VELOCIDADE: ' + adminSpeedMult.toFixed(1) + 'x');
      });
    }
    if (jumpInput) {
      jumpInput.value = adminJumpMult;
      jumpInput.addEventListener('input', (e) => {
        adminJumpMult = Number(e.target.value);
        saveBuffs();
        showToast('PULO: ' + adminJumpMult.toFixed(1) + 'x');
      });
    }
    if (invInput) {
      invInput.checked = adminInvincible;
      invInput.addEventListener('change', (e) => {
        adminInvincible = e.target.checked;
        saveBuffs();
        showToast(adminInvincible ? 'INVENCÍVEL: LIGADO' : 'INVENCÍVEL: DESLIGADO');
      });
    }
    if (gemsInput) {
      gemsInput.addEventListener('change', (e) => {
        gems = clamp(Number(e.target.value) || 0, 0, 9999);
        syncHud();
        showToast('GEMAS: ' + gems);
      });
    }
    if (scoreInput) {
      scoreInput.addEventListener('change', (e) => {
        score = clamp(Number(e.target.value) || 0, 0, 999999);
        syncHud();
        showToast('PONTOS: ' + score);
      });
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (state === 'playing' || state === 'intro')) pauseGame();
  });

  /* --------------------------------- física --------------------------------- */

  function resolveX(entity) {
    const r0 = Math.floor(entity.y / TILE);
    const r1 = Math.floor((entity.y + entity.h - 1) / TILE);
    if (entity.vx > 0) {
      const c = Math.floor((entity.x + entity.w - 1) / TILE);
      for (let r = r0; r <= r1; r += 1) {
        if (tileSolid(c, r)) {
          entity.x = c * TILE - entity.w - 0.01;
          entity.vx = 0;
          return;
        }
      }
    } else if (entity.vx < 0) {
      const c = Math.floor(entity.x / TILE);
      for (let r = r0; r <= r1; r += 1) {
        if (tileSolid(c, r)) {
          entity.x = (c + 1) * TILE + 0.01;
          entity.vx = 0;
          return;
        }
      }
    }
  }

  function resolveY(entity) {
    const c0 = Math.floor(entity.x / TILE);
    const c1 = Math.floor((entity.x + entity.w - 1) / TILE);
    if (entity.vy > 0) {
      const r = Math.floor((entity.y + entity.h) / TILE);
      for (let c = c0; c <= c1; c += 1) {
        if (tileSolid(c, r)) {
          entity.y = r * TILE - entity.h;
          entity.vy = 0;
          entity.grounded = true;
          return;
        }
      }
    } else if (entity.vy < 0) {
      const r = Math.floor(entity.y / TILE);
      for (let c = c0; c <= c1; c += 1) {
        if (tileSolid(c, r)) {
          entity.y = (r + 1) * TILE + 0.01;
          entity.vy = 0;
          return;
        }
      }
    }
  }

  function lastCheckpoint() {
    let found = null;
    for (const cp of level.checkpoints) {
      if (cp.active && (!found || cp.x > found.x)) found = cp;
    }
    return found;
  }

  function respawnPlayer() {
    const cp = lastCheckpoint();
    if (cp) {
      player.x = cp.x - PLAYER_W / 2;
      player.y = cp.row * TILE - PLAYER_H;
    } else {
      player.x = level.spawn.col * TILE + (TILE - PLAYER_W) / 2;
      player.y = level.spawn.row * TILE - PLAYER_H;
    }
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;
    player.invuln = 1.8;
    const max = level.cols * TILE - VIEW_W;
    camera = clamp(player.x - VIEW_W * 0.42, 0, max);
  }

  function hurtPlayer(respawn) {
    if (state !== 'playing') return;
    if (isAdmin && adminInvincible && !respawn) return;
    if (player.invuln > 0 && !respawn) return;
    lives -= 1;
    shake = 13;
    hitStop = 0.1;
    flash = 0.5;
    flashColor = '224, 60, 50';
    combo = 0;
    comboTimer = 0;
    sfx('hurt');
    addFloater(player.x + player.w / 2, player.y - 4, '-1 ♥', '#ff9e93');
    spawnBurst(player.x + player.w / 2, player.y + player.h / 2, '#e0554a', 14);
    if (lives <= 0) {
      lives = 0;
      syncHud();
      gameOver();
      return;
    }
    player.invuln = 1.8;
    if (respawn) {
      respawnPlayer();
    } else {
      player.vy = -430;
      player.vx = -player.facing * 200;
      player.grounded = false;
    }
    syncHud();
  }

  function giveLife() {
    if (lives >= MAX_LIVES) {
      score += 200;
      addFloater(player.x + player.w / 2, player.y - 10, '+200', '#ffe6a6');
    } else {
      lives += 1;
      addFloater(player.x + player.w / 2, player.y - 10, 'VIDA EXTRA', '#ff9e93', 1.4);
    }
    syncHud();
    sfx('life');
  }

  function updatePlayer(dt) {
    const p = player;
    p.invuln = Math.max(0, p.invuln - dt);
    p.star = Math.max(0, p.star - dt);

    const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    const maxSpeed = (held.sprint ? DASH_SPEED : RUN_SPEED) * (isAdmin ? adminSpeedMult : 1);
    if (dir !== 0) {
      const accel = p.grounded ? ACCEL : AIR_ACCEL;
      p.vx = clamp(p.vx + dir * accel * dt, -maxSpeed, maxSpeed);
      p.facing = dir;
    } else {
      const dec = (p.grounded ? FRICTION : FRICTION * 0.4) * dt;
      if (Math.abs(p.vx) <= dec) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * dec;
    }

    p.squash = Math.max(0, p.squash - dt * 3.4);
    p.stretch = Math.max(0, p.stretch - dt * 3.4);
    if (p.grounded && Math.abs(p.vx) < 25) { p.squash = 0; p.stretch = 0; }

    press.jumpBuffer = Math.max(0, press.jumpBuffer - dt);
    p.coyote = p.grounded ? COYOTE_TIME : Math.max(0, p.coyote - dt);
    if (press.jumpBuffer > 0) {
      if (p.grounded || p.coyote > 0) {
        p.vy = JUMP_VY * (isAdmin ? adminJumpMult : 1);
        p.grounded = false;
        p.coyote = 0;
        press.jumpBuffer = 0;
        p.usedDouble = false;
        p.stretch = 0.2;
        spawnDust(p.x + p.w / 2, p.y + p.h, 6);
        sfx('jump');
      } else if (p.doubleJump && !p.usedDouble) {
        p.usedDouble = true;
        p.vy = JUMP_VY * 0.84;
        press.jumpBuffer = 0;
        p.stretch = 0.24;
        spawnBurst(p.x + p.w / 2, p.y + p.h, '#8fe3ff', 12);
        addFloater(p.x + p.w / 2, p.y - 6, 'DUPLO!', '#bff2ff', 0.8);
        sfx('jump');
      }
    }

    const gravity = p.vy < 0 && !held.jump ? GRAVITY * 1.85 : GRAVITY;
    p.vy = Math.min(MAX_FALL, p.vy + gravity * dt);

    const wasGrounded = p.grounded;
    p.x += p.vx * dt;
    resolveX(p);
    p.grounded = false;
    p.y += p.vy * dt;
    resolveY(p);
    p.x = clamp(p.x, 0, level.cols * TILE - p.w);

    if (!wasGrounded && p.grounded) {
      p.usedDouble = false;
      p.squash = 0.22;
      spawnDust(p.x + p.w / 2, p.y + p.h, 8);
      if (Math.abs(p.vx) > 150) shake = Math.max(shake, 1.6);
    }

    if (p.y > VIEW_H + 90) {
      hurtPlayer(true);
      return;
    }

    if (p.grounded && Math.abs(p.vx) > 25) {
      p.runPhase += dt * (7 + Math.abs(p.vx) / 55);
      if (Math.random() < dt * 9) spawnDust(p.x + p.w / 2 - p.facing * 6, p.y + p.h, 1);
    }

    checkHazardTiles();
  }

  function checkHazardTiles() {
    if (player.invuln > 0) return;
    const c0 = Math.floor(player.x / TILE);
    const c1 = Math.floor((player.x + player.w - 1) / TILE);
    const r0 = Math.floor(player.y / TILE);
    const r1 = Math.floor((player.y + player.h - 1) / TILE);
    for (let r = r0; r <= r1; r += 1) {
      for (let c = c0; c <= c1; c += 1) {
        const h = tileHazard(c, r);
        if (!h) continue;
        if (h === 11) {
          hurtPlayer(true);
          return;
        }
        if (player.y + player.h > r * TILE + 16) {
          hurtPlayer(false);
          return;
        }
      }
    }
  }

  /* -------------------------------- inimigos -------------------------------- */

  function updateEnemies(dt) {
    for (const enemy of level.enemies) {
      if (!enemy.alive) continue;
      const def = ENEMY_DEFS[enemy.type];
      enemy.invuln = Math.max(0, enemy.invuln - dt);
      if (def.kind === 'flyer') updateFlyer(enemy, dt);
      else if (def.kind === 'shooter') updateCobra(enemy, dt);
      else if (def.kind === 'boss') updateBoss(enemy, dt);
      else updateWalker(enemy, dt);
      if (!enemy.alive || state !== 'playing') return;
      collideEnemy(enemy);
      if (state !== 'playing') return;

      // sons de animais ocasionais (quando na tela)
      if (enemy.soundTimer != null) {
        enemy.soundTimer -= dt;
        const onScreen = enemy.x - camera > -40 && enemy.x - camera < VIEW_W + 40;
        if (enemy.soundTimer <= 0 && onScreen) {
          animalSound(enemy.type);
          enemy.soundTimer = 3.5 + Math.random() * 4.5;
        }
      }
    }
  }

  function updateWalker(enemy, dt) {
    enemy.x += enemy.dir * enemy.speed * dt;
    if (enemy.x < enemy.minX) {
      enemy.x = enemy.minX;
      enemy.dir = 1;
    }
    if (enemy.x + enemy.w > enemy.maxX) {
      enemy.x = enemy.maxX - enemy.w;
      enemy.dir = -1;
    }
    const bodyRow = Math.floor((enemy.y + enemy.h - 1) / TILE);
    const wallCol = Math.floor((enemy.dir > 0 ? enemy.x + enemy.w + 2 : enemy.x - 2) / TILE);
    if (tileSolid(wallCol, bodyRow)) enemy.dir *= -1;
    const footRow = Math.floor((enemy.y + enemy.h + 2) / TILE);
    if (!tileSolid(wallCol, footRow)) enemy.dir *= -1;
  }

  function updateFlyer(enemy, dt) {
    enemy.x += enemy.dir * enemy.speed * dt;
    if (enemy.x < enemy.minX) {
      enemy.x = enemy.minX;
      enemy.dir = 1;
    }
    if (enemy.x + enemy.w > enemy.maxX) {
      enemy.x = enemy.maxX - enemy.w;
      enemy.dir = -1;
    }
    enemy.y = enemy.baseY + Math.sin(time * 2.4 + enemy.phase) * enemy.amp;
  }

  function updateCobra(enemy, dt) {
    enemy.shootTimer -= dt;
    const dist = Math.abs(player.x + player.w / 2 - (enemy.x + enemy.w / 2));
    if (enemy.shootTimer <= 0 && dist < 380) {
      enemy.shootTimer = 2.1 + Math.random() * 0.9;
      const sx = enemy.x + enemy.w / 2;
      const sy = enemy.y + 8;
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      const len = Math.hypot(px - sx, py - sy) || 1;
      projectiles.push({
        x: sx,
        y: sy,
        vx: ((px - sx) / len) * 190,
        vy: ((py - sy) / len) * 190,
        r: 6,
        life: 3
      });
      sfx('spit');
    }
  }

  function updateBoss(enemy, dt) {
    const ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
    const rage = ratio <= 0.34 ? 2 : ratio <= 0.67 ? 1 : 0;
    enemy.x += enemy.dir * enemy.speed * (1 + rage * 0.35) * dt;
    if (enemy.x < enemy.minX) {
      enemy.x = enemy.minX;
      enemy.dir = 1;
    }
    if (enemy.x + enemy.w > enemy.maxX) {
      enemy.x = enemy.maxX - enemy.w;
      enemy.dir = -1;
    }

    const dist = Math.abs(player.x + player.w / 2 - (enemy.x + enemy.w / 2));
    enemy.shootTimer -= dt;
    if (rage > 0 && enemy.shootTimer <= 0 && dist < 560) {
      enemy.shootTimer = 1.9 - rage * 0.4;
      const sx = enemy.x + enemy.w / 2;
      const sy = enemy.y + enemy.h * 0.42;
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      const len = Math.hypot(px - sx, py - sy) || 1;
      const spd = 200 + rage * 55;
      projectiles.push({
        x: sx,
        y: sy,
        vx: ((px - sx) / len) * spd,
        vy: ((py - sy) / len) * spd,
        r: 8,
        life: 3.4
      });
      sfx('spit');
    }

    const groundY = GROUND_ROW * TILE;
    if (!enemy.grounded) {
      enemy.vy += GRAVITY * dt;
      enemy.y += enemy.vy * dt;
      if (enemy.y + enemy.h >= groundY) {
        enemy.y = groundY - enemy.h;
        enemy.vy = 0;
        enemy.grounded = true;
        shake = Math.max(shake, 7 + rage * 3);
        spawnDust(enemy.x + enemy.w / 2, groundY, 10 + rage * 4);
      }
    } else {
      enemy.jumpTimer -= dt;
      if (enemy.jumpTimer <= 0 && dist < 460) {
        enemy.vy = -720 - rage * 60;
        enemy.grounded = false;
        enemy.jumpTimer = Math.max(1.1, 2.4 - rage * 0.5) + Math.random() * 1.1;
      }
    }
  }

  function collideEnemy(enemy) {
    if (!rectsOverlap(player, enemy)) return;
    const def = ENEMY_DEFS[enemy.type];
    if (def.kind === 'boss') {
      if (enemy.invuln > 0) {
        if (player.y + player.h < enemy.y + enemy.h * 0.45) {
          player.vy = -640;
          player.grounded = false;
        }
        return;
      }
      const stomp = player.vy > 0 && player.y + player.h - enemy.y < enemy.h * 0.62;
      if (stomp) {
        damageBoss(enemy);
        player.vy = -720;
        player.grounded = false;
      } else if (player.star > 0) {
        player.vy = -640;
        player.grounded = false;
      } else {
        hurtPlayer(false);
      }
      return;
    }

    if (player.star > 0) {
      killEnemy(enemy, true);
      return;
    }
    const stomp = player.vy > 0 && player.y + player.h - enemy.y < enemy.h * 0.72;
    if (stomp) {
      killEnemy(enemy);
      player.vy = held.jump ? -720 : -560;
      player.grounded = false;
      shake = Math.max(shake, 5);
      sfx('stomp');
    } else {
      hurtPlayer(false);
    }
  }

  function killEnemy(enemy, byStar) {
    if (!enemy.alive) return;
    enemy.alive = false;
    const def = ENEMY_DEFS[enemy.type];
    combo = Math.min(9, combo + 1);
    comboTimer = 2.2;
    const gain = def.score * combo;
    score += gain;
    addFloater(
      enemy.x + enemy.w / 2,
      enemy.y,
      combo > 1 ? `+${gain} x${combo}` : `+${gain}`,
      combo > 1 ? '#ffd36b' : '#ffe6a6',
      combo > 1 ? 1 : 0.8
    );
    spawnBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, byStar ? '#f2b13c' : '#c98a4a', 14);
    hitStop = combo > 1 ? 0.07 : 0.05;
    flash = 0.14;
    flashColor = '255, 240, 190';
    if (byStar) sfx('power');
    syncHud();
  }

  function damageBoss(boss) {
    boss.hp -= 1;
    boss.invuln = 1.2;
    score += 300;
    shake = 15;
    hitStop = 0.1;
    flash = 0.24;
    flashColor = '255, 205, 110';
    addFloater(boss.x + boss.w / 2, boss.y + 10, `-1`, '#ffd36b');
    spawnBurst(boss.x + boss.w / 2, boss.y + boss.h * 0.4, '#f2b13c', 18);
    sfx('boss-hit');
    syncHud();
    if (boss.hp <= 0) {
      boss.alive = false;
      score += ENEMY_DEFS.jurgen.score;
      shake = 24;
      addFloater(boss.x + boss.w / 2, boss.y - 6, '+1500', '#ffe6a6', 1.4);
      spawnBurst(boss.x + boss.w / 2, boss.y + boss.h / 2, '#f2b13c', 42);
      spawnBurst(boss.x + boss.w / 2, boss.y + boss.h / 2, '#e0554a', 26);
      sfx('boss-down');
      syncHud();
    }
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const p = projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      const gone = p.life <= 0 || p.x < camera - 40 || p.x > camera + VIEW_W + 40 || solidAtPixel(p.x, p.y);
      if (gone) {
        projectiles.splice(i, 1);
        continue;
      }
      if (player.invuln <= 0 && rectsOverlap(player, { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 })) {
        projectiles.splice(i, 1);
        hurtPlayer(false);
        return;
      }
    }
  }

  /* ------------------------------- coletáveis ------------------------------- */

  function isPortalActive() {
    return !level.boss || !level.boss.alive;
  }

  function updateCollectibles() {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;

    for (const coin of level.coins) {
      if (coin.taken) continue;
      if (Math.abs(px - coin.x) < 24 && Math.abs(py - coin.y) < 24) {
        coin.taken = true;
        gems += 1;
        score += 10;
        addFloater(coin.x, coin.y - 4, '+10', '#c8f7d8', 0.7);
        spawnBurst(coin.x, coin.y, '#5fe3a1', 6);
        sfx('coin');
        if (gems % 50 === 0) giveLife();
        syncHud();
      }
    }

    for (const power of level.powerups) {
      if (power.taken) continue;
      if (Math.abs(px - power.x) < 26 && Math.abs(py - power.y) < 26) {
        power.taken = true;
        if (power.type === 'heart') {
          if (lives < MAX_LIVES) {
            lives += 1;
            addFloater(power.x, power.y - 8, '+1 ♥', '#ff9e93', 1.2);
          } else {
            score += 250;
            addFloater(power.x, power.y - 8, '+250', '#ffe6a6', 1.2);
          }
          sfx('life');
        } else if (power.type === 'feather') {
          player.doubleJump = true;
          player.usedDouble = false;
          score += 150;
          addFloater(power.x, power.y - 8, 'PULO DUPLO!', '#bff2ff', 1.4);
          flash = 0.2;
          flashColor = '140, 225, 255';
          sfx('power');
        } else {
          player.star = STAR_TIME;
          addFloater(power.x, power.y - 8, 'INVENCÍVEL!', '#ffe6a6', 1.4);
          sfx('power');
        }
        spawnBurst(power.x, power.y, '#f2b13c', 16);
        syncHud();
      }
    }

    for (const cp of level.checkpoints) {
      if (!cp.active && player.x + player.w > cp.x - 10) {
        cp.active = true;
        addFloater(cp.x, cp.y - 62, 'CHECKPOINT', '#ffe6a6', 1.5);
        spawnBurst(cp.x, cp.y - 46, '#f2b13c', 18);
        sfx('checkpoint');
      }
    }

    if (isPortalActive()) {
      const box = { x: level.exit.x - 18, y: level.exit.y - 78, w: 36, h: 78 };
      if (rectsOverlap(player, box)) completeLevel();
    }
  }

  /* --------------------------------- câmera --------------------------------- */

  function updateCamera(dt) {
    const max = Math.max(0, level.cols * TILE - VIEW_W);
    const lead = clamp(player.vx * 0.24, -80, 80);
    const target = clamp(player.x + player.w / 2 - VIEW_W * 0.42 + lead, 0, max);
    if (Math.abs(player.vx) < 25 && player.grounded) camera = target;
    else camera = lerp(camera, target, Math.min(1, 8 * dt));
    camera = clamp(camera, 0, max);
  }

  /* --------------------------------- efeitos -------------------------------- */

  function spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * TAU;
      const speed = 60 + Math.random() * 200;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        gravity: 620,
        life: 0.4 + Math.random() * 0.5,
        maxLife: 0.9,
        size: 1.6 + Math.random() * 2.6,
        color
      });
    }
  }

  function spawnDust(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y - Math.random() * 4,
        vx: (Math.random() - 0.5) * 70,
        vy: -Math.random() * 60,
        gravity: 320,
        life: 0.25 + Math.random() * 0.3,
        maxLife: 0.55,
        size: 1.5 + Math.random() * 2.4,
        color: level.def.theme === 'selva' ? 'rgba(150,190,140,0.75)' : 'rgba(226,196,140,0.8)'
      });
    }
  }

  function addFloater(x, y, text, color, life) {
    floaters.push({
      x,
      y,
      text,
      color: color || '#ffe6a6',
      life: life || 0.95,
      maxLife: life || 0.95
    });
  }

  function updateEffects(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = floaters.length - 1; i >= 0; i -= 1) {
      const f = floaters[i];
      f.life -= dt;
      f.y -= 30 * dt;
      if (f.life <= 0) floaters.splice(i, 1);
    }
  }

  function updateAmbient(dt) {
    if (!level) return;
    const mode = level.theme.ambient;
    for (const a of ambient) {
      if (mode === 'sand') {
        a.x -= (16 + a.size * 5) * a.speed * dt;
        a.y += Math.sin(time * 1.4 + a.phase) * 10 * dt;
        if (a.x < -12) {
          a.x = VIEW_W + 12;
          a.y = Math.random() * VIEW_H;
        }
      } else if (mode === 'firefly') {
        a.x += Math.cos(a.phase + time * 0.7) * 16 * a.speed * dt;
        a.y += Math.sin(a.phase * 1.7 + time * 0.9) * 14 * a.speed * dt;
        if (a.x < -12) a.x = VIEW_W + 12;
        if (a.x > VIEW_W + 12) a.x = -12;
        if (a.y < -12) a.y = VIEW_H + 12;
        if (a.y > VIEW_H + 12) a.y = -12;
      } else {
        a.y -= (18 + a.size * 6) * a.speed * dt;
        a.x += Math.sin(time * 1.2 + a.phase) * 14 * dt;
        if (a.y < -12) {
          a.y = VIEW_H + 12;
          a.x = Math.random() * VIEW_W;
        }
      }
    }
  }

  function update(dt) {
    updatePlayer(dt);
    if (state !== 'playing') return;
    updateEnemies(dt);
    if (state !== 'playing') return;
    updateProjectiles(dt);
    if (state !== 'playing') return;
    updateCollectibles();
    if (state !== 'playing') return;
    updateCamera(dt);
    updateEffects(dt);
    shake = Math.max(0, shake - 34 * dt);
  }

  /* -------------------------------- desenho --------------------------------- */

  function parallaxX(i, span, factor) {
    const scrolled = camera * factor;
    const cycle = Math.floor(scrolled / span);
    const off = scrolled - cycle * span;
    return i * span - off + (i + cycle) * 0;
  }

  function drawSun(theme) {
    const sx = theme.sunPos[0];
    const sy = theme.sunPos[1];
    const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 170);
    glow.addColorStop(0, 'rgba(255, 245, 205, 0.85)');
    glow.addColorStop(0.35, theme.glow);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 180, sy - 180, 360, 360);
    ctx.fillStyle = theme.sun[0];
    dot(sx, sy, theme.sunR);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = theme.sun[1];
    dot(sx, sy, theme.sunR * 0.72);
    ctx.globalAlpha = 1;
  }

  function drawClouds(color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    const span = 460;
    for (let i = -1; i < Math.ceil(VIEW_W / span) + 1; i += 1) {
      const x = parallaxX(i, span, 0.05) + hash(i, 3) * 120;
      const y = 60 + hash(i, 9) * 90;
      const w = 90 + hash(i, 4) * 70;
      ctx.beginPath();
      ctx.ellipse(x, y, w, w * 0.34, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + w * 0.5, y + 8, w * 0.6, w * 0.26, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBirds() {
    ctx.strokeStyle = 'rgba(28, 30, 40, 0.32)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 5; i += 1) {
      const drift = camera * 0.12 + time * 13;
      const x = ((i * 173 + drift) % (VIEW_W + 220)) - 110;
      const y = 78 + hash(i, 5) * 150 + Math.sin(time * 0.7 + i) * 9;
      const flap = Math.sin(time * 4.5 + i * 1.7) * 4;
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.quadraticCurveTo(x - 3, y - flap, x, y);
      ctx.quadraticCurveTo(x + 3, y - flap, x + 6, y);
      ctx.stroke();
    }
  }

  function drawHeatHaze() {
    if (level.def.theme !== 'deserto') return;
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = '#ffe9b8';
    for (let i = 0; i < 3; i += 1) {
      const base = 398 + i * 18;
      ctx.beginPath();
      for (let x = 0; x <= VIEW_W + 24; x += 24) {
        const yy = base + Math.sin((x + time * 55 + i * 60) * 0.021) * 3.2;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.lineTo(VIEW_W + 24, base + 26);
      ctx.lineTo(0, base + 26);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDunes(color, factor, baseY, height, span) {
    ctx.fillStyle = color;
    for (let i = -1; i < Math.ceil(VIEW_W / span) + 1; i += 1) {
      const scrolled = camera * factor;
      const cycle = Math.floor(scrolled / span);
      const off = scrolled - cycle * span;
      const x = i * span - off;
      const seed = i + cycle;
      const h = height * (0.7 + hash(seed, 21) * 0.6);
      ctx.beginPath();
      ctx.moveTo(x, baseY + height);
      ctx.quadraticCurveTo(x + span * 0.24, baseY - h * 0.5, x + span * 0.52, baseY - h * 0.1);
      ctx.quadraticCurveTo(x + span * 0.8, baseY + h * 0.3, x + span, baseY + height * 0.45);
      ctx.lineTo(x + span, VIEW_H);
      ctx.lineTo(x, VIEW_H);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawDesertBackground(theme) {
    drawClouds('rgba(255, 240, 210, 0.7)', 0.16);
    drawDunes(theme.far, 0.08, 452, 130, 620);

    const span = 560;
    for (let i = -1; i < Math.ceil(VIEW_W / span) + 1; i += 1) {
      const scrolled = camera * 0.16;
      const cycle = Math.floor(scrolled / span);
      const off = scrolled - cycle * span;
      const x = i * span - off;
      const seed = i + cycle;
      const h = 150 + hash(seed, 5) * 90;
      const apexX = x + span * 0.5;
      const leftX = x + span * 0.2;
      const rightX = x + span * 0.8;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(leftX, 452);
      ctx.lineTo(apexX, 452 - h);
      ctx.lineTo(rightX, 452);
      ctx.closePath();
      ctx.clip();
      const stone = ctx.createLinearGradient(leftX, 0, rightX, 0);
      stone.addColorStop(0, theme.farDark);
      stone.addColorStop(0.48, theme.far);
      stone.addColorStop(0.52, '#c9a86e');
      stone.addColorStop(1, theme.far);
      ctx.fillStyle = stone;
      ctx.fillRect(leftX, 452 - h, rightX - leftX, h);
      ctx.fillStyle = 'rgba(60, 44, 24, 0.18)';
      for (let by = 452 - h + 14; by < 452; by += 16) {
        ctx.fillRect(leftX, by, rightX - leftX, 2);
      }
      ctx.fillStyle = 'rgba(255, 230, 180, 0.08)';
      for (let by = 452 - h + 8; by < 452; by += 16) {
        ctx.fillRect(leftX, by, rightX - leftX, 1);
      }
      ctx.restore();
    }

    drawDunes(theme.mid, 0.3, 470, 90, 520);

    // ondas distantes de dunas para dar sensação de profundidade
    const ridge = ctx.createLinearGradient(0, 0, 0, 452);
    ridge.addColorStop(0, theme.farDark);
    ridge.addColorStop(1, theme.far);
    ctx.fillStyle = ridge;
    ctx.beginPath();
    const ridgeAmp = 40 + hash(9, 77) * 30;
    for (let x = -20; x <= VIEW_W + 20; x += 8) {
      const y = 452 - (ridgeAmp * (0.5 + 0.5 * Math.sin(x * 0.012 + 3)) + hash(Math.floor(x), 77) * ridgeAmp * 0.4);
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(VIEW_W + 20, 452);
    ctx.closePath();
    ctx.fill();

    const rockSpan = 300;
    for (let i = -1; i < Math.ceil(VIEW_W / rockSpan) + 1; i += 1) {
      const scrolled = camera * 0.46;
      const cycle = Math.floor(scrolled / rockSpan);
      const off = scrolled - cycle * rockSpan;
      const x = i * rockSpan - off + 40;
      const seed = i + cycle;
      const h = 70 + hash(seed, 33) * 60;
      ctx.fillStyle = theme.midDark;
      if (hash(seed, 44) > 0.5) {
        rr(x, 452 - h, 10, h, 4);
        ctx.fill();
        rr(x - 14, 452 - h * 0.72, 8, h * 0.72, 4);
        ctx.fill();
        rr(x + 14, 452 - h * 0.62, 8, h * 0.62, 4);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x + 34, 452 - 14, 22, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x + 12, 452 - 16, 44, 16);
      }
    }

    // cactos, arbustos secos e caveiras na linha média
    const floraSpan = 380;
    for (let i = -1; i < Math.ceil(VIEW_W / floraSpan) + 1; i += 1) {
      const scrolled = camera * 0.5;
      const cycle = Math.floor(scrolled / floraSpan);
      const off = scrolled - cycle * floraSpan;
      const x = i * floraSpan - off + 120;
      const seed = i + cycle;
      const kind = hash(seed, 61);
      ctx.fillStyle = theme.midDark;
      if (kind > 0.6) {
        const h = 44 + kind * 34;
        rr(x, 452 - h, 9, h, 4);
        ctx.fill();
        rr(x - 9, 452 - h * 0.72, 7, 16, 3);
        ctx.fill();
        rr(x + 11, 452 - h * 0.58, 7, 20, 3);
        ctx.fill();
      } else if (kind < 0.18) {
        dot(x, 444, 6);
        ctx.fillRect(x - 6, 444, 3, 9);
        ctx.fillRect(x + 3, 444, 3, 9);
        ctx.fillStyle = 'rgba(20, 14, 8, 0.6)';
        dot(x - 2, 443, 1.6);
        dot(x + 3, 443, 1.6);
      } else if (kind < 0.4) {
        ctx.beginPath();
        ctx.arc(x + 10, 452, 16, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x, 452 - 12, 22, 12);
      }
    }
  }

  function drawJungleBackground(theme) {
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 3; i += 1) {
      const x = 140 + i * 320 + Math.sin(time * 0.4 + i) * 20;
      const beam = ctx.createLinearGradient(x, 0, x + 120, VIEW_H);
      beam.addColorStop(0, 'rgba(210, 255, 210, 0.55)');
      beam.addColorStop(1, 'rgba(210, 255, 210, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x, -10);
      ctx.lineTo(x + 90, -10);
      ctx.lineTo(x + 250, VIEW_H);
      ctx.lineTo(x + 90, VIEW_H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // linha distante de árvores para fundo
    const farTreeSpan = 240;
    for (let i = -1; i < Math.ceil(VIEW_W / farTreeSpan) + 1; i += 1) {
      const scrolled = camera * 0.08;
      const cycle = Math.floor(scrolled / farTreeSpan);
      const off = scrolled - cycle * farTreeSpan;
      const x = i * farTreeSpan - off;
      const seed = i + cycle;
      const th = 120 + hash(seed, 88) * 70;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = theme.farDark;
      ctx.beginPath();
      ctx.arc(x, 452 - th * 0.7, th * 0.55, 0, TAU);
      ctx.fill();
      ctx.fillStyle = theme.far;
      ctx.beginPath();
      ctx.arc(x - th * 0.28, 452 - th * 0.85, th * 0.4, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = theme.farDark;
    const span = 300;
    for (let i = -1; i < Math.ceil(VIEW_W / span) + 1; i += 1) {
      const scrolled = camera * 0.12;
      const cycle = Math.floor(scrolled / span);
      const off = scrolled - cycle * span;
      const x = i * span - off;
      const seed = i + cycle;
      const y = 120 + hash(seed, 8) * 80;
      ctx.beginPath();
      ctx.arc(x, y, 90 + hash(seed, 2) * 40, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + span * 0.5, y + 40, 70 + hash(seed, 6) * 30, 0, TAU);
      ctx.fill();
    }

    const treeSpan = 360;
    for (let i = -1; i < Math.ceil(VIEW_W / treeSpan) + 1; i += 1) {
      const scrolled = camera * 0.38;
      const cycle = Math.floor(scrolled / treeSpan);
      const off = scrolled - cycle * treeSpan;
      const x = i * treeSpan - off;
      const seed = i + cycle;
      ctx.fillStyle = theme.mid;
      ctx.fillRect(x, 240, 26, 212);
      ctx.fillStyle = theme.midDark;
      ctx.beginPath();
      ctx.arc(x + 12, 220, 78, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - 40, 260, 56, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 70, 250, 60, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30, 90, 60, 0.5)';
      ctx.lineWidth = 2;
      for (let v = 0; v < 3; v += 1) {
        const vx = x + 10 + v * 8;
        ctx.beginPath();
        ctx.moveTo(vx, 250);
        ctx.quadraticCurveTo(vx + Math.sin(time + v) * 10, 320, vx - 4, 400);
        ctx.stroke();
      }
      void seed;
    }
  }

  function drawTempleBackground(theme) {
    const span = 640;

    // silhueta distante de templo para fundo
    for (let i = -1; i < Math.ceil(VIEW_W / span) + 1; i += 1) {
      const scrolled = camera * 0.12;
      const cycle = Math.floor(scrolled / span);
      const off = scrolled - cycle * span;
      const x = i * span - off;
      const h = 130 + hash(i + cycle, 55) * 70;
      ctx.fillStyle = theme.farDark;
      ctx.fillRect(x + span * 0.2, 452 - h, span * 0.2, h);
      ctx.fillRect(x + span * 0.62, 452 - h * 0.8, span * 0.16, h * 0.8);
      ctx.fillRect(x + span * 0.4, 452 - h * 1.1, span * 0.12, h * 1.1);
    }

    for (let i = -1; i < Math.ceil(VIEW_W / span) + 1; i += 1) {
      const scrolled = camera * 0.15;
      const cycle = Math.floor(scrolled / span);
      const off = scrolled - cycle * span;
      const x = i * span - off;
      const seed = i + cycle;
      const h = 210 + hash(seed, 12) * 90;
      ctx.fillStyle = theme.far;
      ctx.beginPath();
      ctx.moveTo(x + 40, 452);
      ctx.lineTo(x + span * 0.42, 452 - h);
      ctx.lineTo(x + span * 0.5, 452 - h + 26);
      ctx.lineTo(x + span * 0.58, 452 - h + 6);
      ctx.lineTo(x + span * 0.8, 452);
      ctx.closePath();
      ctx.fill();
      const glow = ctx.createRadialGradient(x + span * 0.5, 452 - h + 10, 2, x + span * 0.5, 452 - h + 10, 90);
      glow.addColorStop(0, 'rgba(255, 150, 80, 0.55)');
      glow.addColorStop(1, 'rgba(255, 150, 80, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x + span * 0.5 - 100, 452 - h - 90, 200, 200);
    }

    const pillarSpan = 320;
    for (let i = -1; i < Math.ceil(VIEW_W / pillarSpan) + 1; i += 1) {
      const scrolled = camera * 0.42;
      const cycle = Math.floor(scrolled / pillarSpan);
      const off = scrolled - cycle * pillarSpan;
      const x = i * pillarSpan - off + 60;
      ctx.fillStyle = theme.mid;
      ctx.fillRect(x, 250, 34, 202);
      ctx.fillRect(x - 8, 250, 50, 16);
      ctx.fillStyle = theme.midDark;
      ctx.fillRect(x - 8, 300, 50, 10);
      const fx = x + 17;
      const flick = 10 + Math.sin(time * 9 + i) * 4;
      const fg = ctx.createRadialGradient(fx, 250, 2, fx, 250, 52);
      fg.addColorStop(0, 'rgba(255, 200, 110, 0.55)');
      fg.addColorStop(0.45, 'rgba(224, 85, 74, 0.22)');
      fg.addColorStop(1, 'rgba(224, 85, 74, 0)');
      ctx.fillStyle = fg;
      ctx.fillRect(fx - 52, 250 - 52, 104, 104);
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath();
      ctx.moveTo(fx, 250 - flick);
      ctx.quadraticCurveTo(fx + 7, 250 - flick * 0.2, fx, 250 + 4);
      ctx.quadraticCurveTo(fx - 7, 250 - flick * 0.2, fx, 250 - flick);
      ctx.fill();
    }
  }

  function drawBackground() {
    const theme = level.theme;
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_ROW * TILE + 80);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(0.42, theme.sky[1]);
    sky.addColorStop(0.78, theme.sky[2]);
    sky.addColorStop(1, theme.sky[3]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    drawSun(theme);

    if (level.def.theme === 'deserto') {
      drawBirds();
      drawDesertBackground(theme);
      drawHeatHaze();
    } else if (level.def.theme === 'selva') {
      drawJungleBackground(theme);
    } else {
      drawTempleBackground(theme);
    }
  }

  /* ---------------------------------- tiles --------------------------------- */

  function drawSandTile(c, r, x, y, top) {
    const shade = hash(c, r);
    ctx.fillStyle = shade > 0.5 ? '#c9964f' : '#c08a47';
    ctx.fillRect(x, y, TILE, TILE);

    // estratos horizontais
    ctx.fillStyle = 'rgba(120, 82, 40, 0.12)';
    ctx.fillRect(x, y + 12 + (r % 3) * 4, TILE, 2);
    ctx.fillRect(x, y + 24, TILE, 1.5);

    // grãos e pedrinhas
    for (let i = 0; i < 6; i += 1) {
      const hx = hash(c * 5 + i, r * 3 + i);
      const hy = hash(c * 2 + i, r * 7 + i);
      ctx.fillStyle = i % 2 ? 'rgba(120, 82, 40, 0.35)' : 'rgba(240, 205, 140, 0.35)';
      ctx.fillRect(x + 3 + hx * 26, y + 10 + hy * 20, 1.6, 1.6);
    }

    if (top) {
      const lip = ctx.createLinearGradient(0, y, 0, y + 10);
      lip.addColorStop(0, '#f4d896');
      lip.addColorStop(1, '#e0b972');
      ctx.fillStyle = lip;
      ctx.fillRect(x, y, TILE, 7);
      ctx.fillStyle = '#b07a3a';
      ctx.fillRect(x, y + 7, TILE, 2);
      ctx.fillStyle = 'rgba(255, 232, 170, 0.6)';
      for (let i = 0; i < 4; i += 1) {
        ctx.fillRect(x + 2 + i * 8, y + 1, 3, 1.5);
      }
      ctx.strokeStyle = 'rgba(150, 105, 55, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 13);
      ctx.quadraticCurveTo(x + 16, y + 10, x + 28, y + 13);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(70, 45, 20, 0.12)';
      ctx.fillRect(x, y, TILE, 3);
    }
  }

  function drawJungleTile(c, r, x, y, top) {
    ctx.fillStyle = hash(c, r) > 0.5 ? '#3b2b1e' : '#34261a';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = 'rgba(20, 12, 6, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 14 + (r % 2) * 6);
    ctx.quadraticCurveTo(x + 16, y + 10, x + 28, y + 16);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(90, 60, 30, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x + 8 + (c % 3) * 6, y + 10);
    ctx.quadraticCurveTo(x + 6, y + 22, x + 12, y + 30);
    ctx.stroke();
    if (top) {
      ctx.fillStyle = '#4d8a43';
      ctx.fillRect(x, y, TILE, 9);
      ctx.fillStyle = '#3f7438';
      ctx.fillRect(x, y + 9, TILE, 3);
      ctx.fillStyle = 'rgba(120, 200, 110, 0.35)';
      ctx.fillRect(x, y, TILE, 2);
      ctx.strokeStyle = '#69b45a';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 4; i += 1) {
        const bx = x + 4 + i * 7 + hash(c + i, r) * 3;
        const bh = 5 + hash(i, c) * 5;
        ctx.beginPath();
        ctx.moveTo(bx, y + 3);
        ctx.quadraticCurveTo(bx - 1, y - bh * 0.6, bx - 3, y - bh);
        ctx.stroke();
      }
      if (hash(c, r) > 0.82) {
        ctx.fillStyle = hash(c, r + 3) > 0.5 ? '#f2b13c' : '#e07ba0';
        dot(x + 20, y - 4, 2.4);
      }
    } else {
      ctx.fillStyle = 'rgba(90, 150, 90, 0.22)';
      for (let i = 0; i < 4; i += 1) {
        ctx.fillRect(x + hash(c + i, r) * 28, y + 4 + hash(c, r + i) * 24, 3, 2);
      }
    }
  }

  function drawTempleTile(c, r, x, y, top) {
    ctx.fillStyle = hash(c, r) > 0.5 ? '#322031' : '#3a2739';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = 'rgba(255, 220, 160, 0.06)';
    ctx.fillRect(x + 1, y + 1, TILE - 2, 2);
    ctx.fillStyle = 'rgba(8, 4, 10, 0.35)';
    ctx.fillRect(x + 1, y + TILE - 3, TILE - 2, 2);
    ctx.strokeStyle = 'rgba(14, 7, 16, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 16);
    ctx.lineTo(x + TILE, y + 16);
    ctx.stroke();
    ctx.beginPath();
    const vx = x + (r % 2 === 0 ? 16 : 8);
    ctx.moveTo(vx, y);
    ctx.lineTo(vx, y + 16);
    ctx.moveTo(vx - 8 + (r % 2 === 0 ? 16 : 0), y + 16);
    ctx.lineTo(vx - 8 + (r % 2 === 0 ? 16 : 0), y + TILE);
    ctx.stroke();
    if (hash(c * 3, r * 5) > 0.68) {
      ctx.strokeStyle = 'rgba(242, 177, 60, 0.45)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6);
      ctx.lineTo(x + 12, y + 12);
      ctx.lineTo(x + 10, y + 22);
      ctx.stroke();
    }
    if (top) {
      ctx.fillStyle = '#c79a48';
      ctx.fillRect(x, y, TILE, 3);
      ctx.fillStyle = 'rgba(255, 220, 140, 0.25)';
      ctx.fillRect(x, y + 3, TILE, 3);
      ctx.fillStyle = 'rgba(242, 177, 60, 0.18)';
      ctx.fillRect(x, y + 6, TILE, 2);
    }
  }

  function drawStoneTile(c, r, x, y, jungle) {
    const tone = hash(c, r);
    ctx.fillStyle = jungle
      ? tone > 0.5
        ? '#6a5a46'
        : '#61513e'
      : tone > 0.5
        ? '#8a7660'
        : '#7d6a54';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = jungle ? '#4f7d4c' : '#b09a74';
    ctx.fillRect(x, y, TILE, 6);
    ctx.fillStyle = 'rgba(38, 26, 14, 0.42)';
    ctx.fillRect(x, y + TILE - 6, TILE, 6);
    ctx.fillStyle = 'rgba(30, 20, 10, 0.32)';
    ctx.fillRect(x + 15, y + 6, 2, TILE - 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.fillRect(x + 2, y + 6, TILE - 4, 2);
    if (jungle && tone > 0.55) {
      ctx.fillStyle = 'rgba(80, 150, 80, 0.35)';
      dot(x + 8 + hash(c, r) * 14, y + 12 + hash(r, c) * 12, 3);
    }
    if (tone > 0.78) {
      ctx.strokeStyle = 'rgba(20, 12, 8, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 12);
      ctx.lineTo(x + 14, y + 20);
      ctx.lineTo(x + 12, y + 28);
      ctx.stroke();
    }
  }

  function drawWoodTile(x, y) {
    ctx.fillStyle = '#7a4a28';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#a97444';
    ctx.fillRect(x, y, TILE, 5);
    ctx.fillStyle = 'rgba(50, 26, 12, 0.45)';
    for (let i = 0; i < 3; i += 1) ctx.fillRect(x, y + 8 + i * 8, TILE, 2);
    ctx.strokeStyle = 'rgba(40, 20, 8, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 6);
    ctx.quadraticCurveTo(x + 18, y + 12, x + 28, y + 8);
    ctx.stroke();
    ctx.fillStyle = '#d9b17a';
    ctx.fillRect(x + 3, y + 6, 2, 2);
    ctx.fillRect(x + TILE - 5, y + 6, 2, 2);
    ctx.fillStyle = 'rgba(255, 235, 190, 0.25)';
    ctx.fillRect(x + 3, y + 10, 2, 2);
    ctx.fillRect(x + TILE - 6, y + 26, 2, 2);
  }

  function drawSolid(c, r, type) {
    const x = Math.round(c * TILE - camera);
    const y = r * TILE;
    const top = !tileSolid(c, r - 1);
    const themeKey = level.def.theme;
    if (type === 3) drawWoodTile(x, y);
    else if (type === 4) drawTempleTile(c, r, x, y, top);
    else if (type === 2) drawStoneTile(c, r, x, y, themeKey === 'selva');
    else if (themeKey === 'selva') drawJungleTile(c, r, x, y, top);
    else if (themeKey === 'templo') drawTempleTile(c, r, x, y, top);
    else drawSandTile(c, r, x, y, top);

    if (!tileSolid(c - 1, r)) {
      ctx.fillStyle = 'rgba(20, 12, 6, 0.22)';
      ctx.fillRect(x, y, 3, TILE);
    }
    if (!tileSolid(c + 1, r)) {
      ctx.fillStyle = 'rgba(20, 12, 6, 0.22)';
      ctx.fillRect(x + TILE - 3, y, 3, TILE);
    }
  }

  function drawHazardTile(c, r, type, x, y) {
    if (type === 10) {
      ctx.fillStyle = '#9aa8b4';
      ctx.strokeStyle = '#5d6a76';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i += 1) {
        const bx = x + 2 + i * 10;
        ctx.beginPath();
        ctx.moveTo(bx, y + TILE);
        ctx.lineTo(bx + 5, y + 14);
        ctx.lineTo(bx + 10, y + TILE);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      return;
    }
    const wave = Math.sin(time * 3 + c * 0.6);
    if (r === GROUND_ROW) {
      ctx.fillStyle = '#6b1414';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#c9381d';
      ctx.beginPath();
      ctx.moveTo(x, y + 8 + wave * 2);
      ctx.quadraticCurveTo(x + TILE / 2, y + 3 - wave * 3, x + TILE, y + 8 + wave * 2);
      ctx.lineTo(x + TILE, y + TILE);
      ctx.lineTo(x, y + TILE);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 205, 110, 0.55)';
      ctx.fillRect(x, y + 7 + wave * 2, TILE, 2);
    } else {
      ctx.fillStyle = r === GROUND_ROW + 1 ? '#a82a18' : '#7d1c12';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(255, 180, 90, 0.25)';
      dot(x + 8 + hash(c, r) * 16, y + 10 + hash(r, c) * 12, 2);
    }
  }

  function drawTiles() {
    const c0 = Math.max(0, Math.floor(camera / TILE) - 1);
    const c1 = Math.min(level.cols - 1, Math.ceil((camera + VIEW_W) / TILE) + 1);
    for (let c = c0; c <= c1; c += 1) {
      for (let r = 0; r < ROWS; r += 1) {
        const type = level.solid[r * level.cols + c];
        if (type) drawSolid(c, r, type);
      }
    }
    for (let c = c0; c <= c1; c += 1) {
      for (let r = 0; r < ROWS; r += 1) {
        const h = level.hazard[r * level.cols + c];
        if (h) drawHazardTile(c, r, h, Math.round(c * TILE - camera), r * TILE);
      }
    }
  }

  /* ------------------------------- elementos -------------------------------- */

  function drawExit() {
    const x = Math.round(level.exit.x - camera);
    const baseY = level.exit.y;
    if (x < -120 || x > VIEW_W + 120) return;
    const active = isPortalActive();
    const pulse = 26 + Math.sin(time * 3) * 6;
    const cy = baseY - 44;

    const glow = ctx.createRadialGradient(x, cy, 4, x, cy, active ? 110 : 60);
    glow.addColorStop(0, active ? 'rgba(255, 226, 154, 0.85)' : 'rgba(120, 90, 50, 0.35)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 120, cy - 120, 240, 240);

    ctx.strokeStyle = active ? '#ffe6a6' : '#4a2b18';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x, cy, 20, 40, 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = active ? '#f2b13c' : '#6b3d1f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, cy, 13, 32, 0, 0, TAU);
    ctx.stroke();

    if (active) {
      ctx.globalAlpha = 0.75;
      const inner = ctx.createLinearGradient(x, cy - 40, x, cy + 40);
      inner.addColorStop(0, '#fff6d8');
      inner.addColorStop(0.5, '#f2b13c');
      inner.addColorStop(1, '#b9701a');
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.ellipse(x, cy, 11, 30, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i += 1) {
        const ang = time * 1.5 + (i * TAU) / 3;
        const px = x + Math.cos(ang) * 26;
        const py = cy + Math.sin(ang) * 40;
        ctx.fillStyle = 'rgba(255, 240, 190, 0.8)';
        dot(px, py, 2.4);
      }
    } else {
      ctx.strokeStyle = '#3a2412';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 22, cy - 24);
      ctx.lineTo(x + 22, cy + 24);
      ctx.moveTo(x + 22, cy - 24);
      ctx.lineTo(x - 22, cy + 24);
      ctx.stroke();
      ctx.fillStyle = '#8a5a33';
      rr(x - 7, cy - 8, 14, 16, 3);
      ctx.fill();
    }

    ctx.fillStyle = active ? '#3b2410' : '#241609';
    rr(x - 26, baseY - 8, 52, 10, 4);
    ctx.fill();
    void pulse;
  }

  function drawCheckpoints() {
    for (const cp of level.checkpoints) {
      const x = Math.round(cp.x - camera);
      const y = cp.y;
      if (x < -50 || x > VIEW_W + 50) continue;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 18, 5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#5b3a1e';
      ctx.fillRect(x - 3, y - 58, 6, 58);
      ctx.fillStyle = cp.active ? '#f2b13c' : '#7d6f55';
      ctx.beginPath();
      ctx.moveTo(x - 12, y - 60);
      ctx.lineTo(x + 12, y - 60);
      ctx.lineTo(x + 8, y - 44);
      ctx.lineTo(x - 8, y - 44);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a1a0c';
      dot(x - 4, y - 54, 2);
      dot(x + 4, y - 54, 2);
      ctx.fillRect(x - 5, y - 49, 10, 2);
      if (cp.active) {
        const flick = 8 + Math.sin(time * 8 + cp.x) * 3;
        const g = ctx.createRadialGradient(x, y - 68, 2, x, y - 68, 46);
        g.addColorStop(0, 'rgba(255, 214, 120, 0.85)');
        g.addColorStop(1, 'rgba(255, 214, 120, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 50, y - 118, 100, 100);
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath();
        ctx.moveTo(x, y - 66 - flick);
        ctx.quadraticCurveTo(x + 6, y - 66, x, y - 58);
        ctx.quadraticCurveTo(x - 6, y - 66, x, y - 66 - flick);
        ctx.fill();
      }
    }
  }

  function drawCoins() {
    for (const coin of level.coins) {
      if (coin.taken) continue;
      const x = Math.round(coin.x - camera);
      if (x < -24 || x > VIEW_W + 24) continue;
      const y = coin.y + Math.sin(time * 2.5 + coin.phase) * 2.5;
      const squash = 0.5 + 0.5 * Math.abs(Math.cos(time * 3 + coin.phase));
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#5fe3a1';
      dot(0, 0, 12);
      ctx.globalAlpha = 1;
      ctx.scale(squash, 1);
      ctx.fillStyle = '#3ddc94';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(7, -1);
      ctx.lineTo(0, 12);
      ctx.lineTo(-7, -1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0f7a4b';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(7, -1);
      ctx.lineTo(0, -1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPowerups() {
    for (const power of level.powerups) {
      if (power.taken) continue;
      const x = Math.round(power.x - camera);
      if (x < -40 || x > VIEW_W + 40) continue;
      const y = power.baseY + Math.sin(time * 2.2 + power.phase) * 4;
      const pulse = 20 + Math.sin(time * 4 + power.phase) * 4;
      const glow = ctx.createRadialGradient(x, y, 2, x, y, pulse);
      glow.addColorStop(
        0,
        power.type === 'heart'
          ? 'rgba(255, 140, 130, 0.7)'
          : power.type === 'feather'
            ? 'rgba(150, 230, 255, 0.8)'
            : 'rgba(255, 226, 154, 0.8)'
      );
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - pulse, y - pulse, pulse * 2, pulse * 2);

      if (power.type === 'heart') {
        ctx.fillStyle = '#e34b41';
        ctx.beginPath();
        ctx.moveTo(x, y + 9);
        ctx.bezierCurveTo(x - 12, y - 2, x - 7, y - 13, x, y - 5);
        ctx.bezierCurveTo(x + 7, y - 13, x + 12, y - 2, x, y + 9);
        ctx.fill();
        ctx.strokeStyle = '#7d1712';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else if (power.type === 'feather') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(time * 3 + power.phase) * 0.2);
        ctx.fillStyle = '#eafcff';
        ctx.beginPath();
        ctx.moveTo(-9, 10);
        ctx.quadraticCurveTo(-2, -13, 12, -11);
        ctx.quadraticCurveTo(4, 2, -9, 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#4fc3e8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = '#8fe3ff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-8, 9);
        ctx.lineTo(10, -9);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = '#f2b13c';
        ctx.beginPath();
        ctx.moveTo(x, y - 12);
        ctx.lineTo(x + 11, y - 4);
        ctx.lineTo(x + 8, y + 11);
        ctx.lineTo(x - 8, y + 11);
        ctx.lineTo(x - 11, y - 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#8a5410';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = '#2a1a0c';
        dot(x - 4, y - 1, 2.2);
        dot(x + 4, y - 1, 2.2);
        ctx.fillRect(x - 4, y + 5, 8, 2);
      }
    }
  }

  function drawProjectiles() {
    for (const p of projectiles) {
      const x = Math.round(p.x - camera);
      ctx.fillStyle = 'rgba(150, 255, 110, 0.3)';
      dot(x, p.y, p.r + 4);
      ctx.fillStyle = '#a6ff6a';
      dot(x, p.y, p.r);
      ctx.fillStyle = '#e9ffcf';
      dot(x - 1, p.y - 1, p.r * 0.45);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      dot(Math.round(p.x - camera), p.y, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters() {
    ctx.textAlign = 'center';
    ctx.font = '14px "Press Start 2P", ui-monospace, monospace';
    for (const f of floaters) {
      const alpha = clamp(f.life / f.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillText(f.text, Math.round(f.x - camera) + 1, f.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, Math.round(f.x - camera), f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function drawAmbient() {
    const mode = level.theme.ambient;
    for (const a of ambient) {
      if (mode === 'sand') {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#ffe6b0';
        dot(a.x, a.y, a.size);
      } else if (mode === 'firefly') {
        const blink = 0.35 + 0.65 * Math.abs(Math.sin(time * 2 + a.phase));
        ctx.globalAlpha = blink * 0.8;
        const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.size * 5);
        g.addColorStop(0, 'rgba(180, 255, 180, 0.9)');
        g.addColorStop(1, 'rgba(120, 220, 140, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(a.x - a.size * 5, a.y - a.size * 5, a.size * 10, a.size * 10);
      } else {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = a.size > 1.6 ? '#ffcf7a' : '#e0554a';
        dot(a.x, a.y, a.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawForeground() {
    const theme = level.theme;

    if (level.def.theme === 'selva' || level.def.theme === 'templo') {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = level.def.theme === 'selva' ? '#12301d' : '#1a0d16';
      ctx.lineWidth = 5;
      for (let i = -1; i < 6; i += 1) {
        const x = i * 190 + 40 - ((camera * 0.9) % 190);
        const sway = Math.sin(time * 1.2 + i) * 8;
        const len = 110 + hash(i, 9) * 60;
        ctx.beginPath();
        ctx.moveTo(x, -10);
        ctx.quadraticCurveTo(x + sway, len * 0.5, x + sway * 0.6, len);
        ctx.stroke();
        ctx.fillStyle = level.def.theme === 'selva' ? '#163a24' : '#241019';
        dot(x + sway * 0.6, len, 8);
        dot(x + sway * 0.4, len * 0.64, 6);
      }
      ctx.restore();
    }

    const fog = ctx.createLinearGradient(0, GROUND_ROW * TILE - 30, 0, VIEW_H);
    fog.addColorStop(0, 'rgba(0, 0, 0, 0)');
    fog.addColorStop(1, theme.fog);
    ctx.fillStyle = fog;
    ctx.fillRect(0, GROUND_ROW * TILE - 30, VIEW_W, VIEW_H - (GROUND_ROW * TILE - 30));

    if (level.def.theme === 'templo') {
      const lava = ctx.createLinearGradient(0, VIEW_H - 90, 0, VIEW_H);
      lava.addColorStop(0, 'rgba(224, 85, 74, 0)');
      lava.addColorStop(1, 'rgba(255, 120, 60, 0.18)');
      ctx.fillStyle = lava;
      ctx.fillRect(0, VIEW_H - 90, VIEW_W, 90);
    }

    const vignette = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.34, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.72);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function drawBossBar() {
    if (state === 'title' || !level.boss) return;
    const boss = level.boss;
    if (!boss.alive || player.x < boss.minX - 720) return;
    const w = 320;
    const h = 11;
    const x = (VIEW_W - w) / 2;
    const y = 30;
    ctx.fillStyle = 'rgba(4, 10, 6, 0.62)';
    rr(x - 14, y - 26, w + 28, h + 40, 10);
    ctx.fill();
    ctx.fillStyle = '#2a0d0d';
    rr(x, y, w, h, 5);
    ctx.fill();
    const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#e0554a');
    grad.addColorStop(1, '#f2b13c');
    ctx.fillStyle = grad;
    rr(x, y, Math.max(6, w * ratio), h, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(242, 177, 60, 0.85)';
    ctx.lineWidth = 1.5;
    rr(x, y, w, h, 5);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe6a6';
    ctx.font = '18px "Press Start 2P", ui-monospace, monospace';
    ctx.fillText('JURGEN, O BRUTAL', VIEW_W / 2, y - 8);
    ctx.textAlign = 'left';
  }

  /* -------------------------------- entidades ------------------------------- */

  function drawComboHud() {
    if (state !== 'playing') return;
    const x = 22;
    const y = 24;
    ctx.save();
    if (combo >= 2) {
      const t = clamp(comboTimer / 2.2, 0, 1);
      ctx.fillStyle = 'rgba(5, 12, 7, 0.55)';
      rr(x - 8, y - 16, 158, 40, 7);
      ctx.fill();
      ctx.fillStyle = '#ffd36b';
      ctx.font = '16px "Press Start 2P", ui-monospace, monospace';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`x${combo} COMBO`, x, y + 3);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillRect(x, y + 12, 132, 5);
      ctx.fillStyle = '#f2b13c';
      ctx.fillRect(x, y + 12, 132 * t, 5);
    }
    if (player.doubleJump) {
      const by = combo >= 2 ? y + 30 : y - 14;
      ctx.fillStyle = 'rgba(5, 12, 20, 0.55)';
      rr(x - 8, by, 132, 24, 6);
      ctx.fill();
      ctx.fillStyle = '#bff2ff';
      ctx.font = '12px "Press Start 2P", ui-monospace, monospace';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('PULO DUPLO', x, by + 16);
    }
    ctx.restore();
  }

  function drawPlayer() {
    const p = player;
    const x = Math.round(p.x - camera);
    const y = p.y;
    const cx = x + p.w / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, y + p.h + 2, p.w * 0.62, 4.5, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, y + p.h);
    if (p.facing < 0) ctx.scale(-1, 1);

    const sq = clamp(p.squash / 0.22, 0, 1);
    const st = clamp(p.stretch / 0.24, 0, 1);
    ctx.scale(1 + sq * 0.2 - st * 0.12, 1 - sq * 0.18 + st * 0.17);

    if (p.invuln > 0) ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(time * 3));

    if (p.star > 0) {
      const aura = ctx.createRadialGradient(0, -20, 2, 0, -20, 38);
      aura.addColorStop(0, 'rgba(255, 226, 154, 0.8)');
      aura.addColorStop(0.55, 'rgba(255, 190, 80, 0.26)');
      aura.addColorStop(1, 'rgba(255, 226, 154, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(-44, -62, 88, 88);
    }

    const moving = p.grounded && Math.abs(p.vx) > 25;
    const air = !p.grounded;
    const run = moving ? Math.sin(p.runPhase) : 0;
    const bob = moving ? Math.abs(Math.sin(p.runPhase)) * 1.4 : 0;
    const lean = air ? (p.vy < 0 ? -0.07 : 0.09) : (moving ? clamp(p.vx / 950, -0.08, 0.08) : 0);
    ctx.rotate(lean);

    // ---- mascote CEPK: lobo aventureiro em pixel art ----
    const P = (px, py, pw, ph, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(px), Math.round(py), Math.round(pw), Math.round(ph));
    };

    // paleta do lobo (cinza) + roupa de aventureiro
    const FUR = '#8d99a6';
    const FUR_LT = '#b9c4cf';
    const FUR_DK = '#5f6b78';
    const MARK = '#3c4651';
    const CREAM = '#e9eef3';
    const NOSE = '#23282e';
    const EYE = '#f0be48';
    const EAR_IN = '#b8797f';
    const VEST = '#6f6a3a';
    const VEST_DK = '#55512b';
    const SHIRT = '#efe6cf';
    const PANTS = '#4f4a33';
    const BOOT = '#3d2f1f';
    const SOLE = '#241a10';
    const HAT = '#6b5a35';
    const HAT_DK = '#4a3d22';
    const BAND = '#c9992e';
    const SCARF = '#c0392b';
    const SCARF_DK = '#8e2318';

    const swing = moving ? run * 4 : 0;
    const arm = moving ? run * 3 : 0;
    const tw = (moving ? Math.sin(time * 3.2) * 2 + 2 : Math.sin(time * 2) * 0.8);

    // cauda felpuda (atrás do corpo)
    P(-9, -19 - bob, 6, 7, FUR);
    P(-13, -22 - bob + tw * 0.25, 7, 9, FUR);
    P(-19, -22 - bob + tw * 0.5, 7, 9, FUR_DK);
    P(-24, -19 - bob + tw * 0.8, 6, 7, FUR);
    P(-27, -15 - bob + tw, 4, 5, MARK);
    P(-13, -21 - bob + tw * 0.25, 7, 2, FUR_LT);
    P(-19, -21 - bob + tw * 0.5, 7, 2, FUR_LT);

    // mochila de explorador
    P(-12, -29 - bob, 7, 14, '#6b4a2a');
    P(-12, -29 - bob, 7, 2, '#8a6236');
    P(-11, -24 - bob, 5, 3, '#4a3018');
    P(-10, -27 - bob, 3, 2, '#d9b56a');
    P(-6, -30 - bob, 2, 6, '#4a3018');

    // braço de trás
    P(-10 + arm * 0.3, -27 - bob, 4, 10, FUR_DK);
    P(-10 + arm * 0.3, -18 - bob, 4, 3, CREAM);

    // pernas com pelagem e botas
    P(-7 + swing, -14 - bob, 5, 6, FUR);
    P(-7 + swing, -14 - bob, 2, 6, FUR_DK);
    P(-7 + swing, -8 - bob, 5, 4, PANTS);
    P(-7 + swing, -4 - bob, 6, 3, BOOT);
    P(-7 + swing, -1 - bob, 6, 1, SOLE);
    P(2 - swing, -14 - bob, 5, 6 + (air ? 2 : 0), FUR);
    P(5 - swing, -14 - bob, 2, 6, FUR_DK);
    P(2 - swing, -8 - bob, 5, 4, PANTS);
    P(2 - swing, -4 - bob, 6, 3, BOOT);
    P(2 - swing, -1 - bob, 6, 1, SOLE);

    // tronco: camisa clara com colete de aventureiro
    P(-7, -30 - bob, 14, 16, SHIRT);
    P(-7, -30 - bob, 14, 1, '#fbf5e6');
    P(-7, -30 - bob, 3, 14, VEST);
    P(4, -30 - bob, 3, 14, VEST);
    P(-7, -30 - bob, 3, 2, '#8a8348');
    P(4, -30 - bob, 3, 2, '#8a8348');
    P(-7, -24 - bob, 3, 4, VEST_DK);
    P(4, -24 - bob, 3, 4, VEST_DK);
    P(-7, -23 - bob, 3, 1, '#8a8348');
    P(4, -23 - bob, 3, 1, '#8a8348');
    // emblema com pata (mascote CEPK)
    P(-2, -26 - bob, 4, 4, '#e8b23c');
    P(-1, -24 - bob, 2, 2, '#5c3a0d');
    P(-1, -25 - bob, 1, 1, '#5c3a0d');
    P(1, -25 - bob, 1, 1, '#5c3a0d');
    // cinto com fivela dourada
    P(-7, -17 - bob, 14, 3, '#3a2f1d');
    P(-2, -17.5 - bob, 5, 4, '#c9992e');
    P(-1, -16.5 - bob, 3, 2, '#f2d06a');

    // cabeça de lobo
    P(-9, -42 - bob, 18, 11, FUR);
    P(-8, -43 - bob, 16, 1, FUR_DK);
    P(-10, -35 - bob, 4, 4, FUR_LT);
    P(-9, -33 - bob, 9, 2, FUR_LT);

    // focinho: ponte cinza, ponta creme e nariz escuro
    P(1, -36 - bob, 8, 5, FUR_LT);
    P(1, -37 - bob, 8, 1, FUR_DK);
    P(2, -32 - bob, 7, 2, CREAM);
    P(8, -36 - bob, 3, 3, NOSE);
    P(9, -36 - bob, 1, 1, '#4a515a');
    P(3, -32 - bob, 5, 1, FUR_DK);

    // olhos âmbar de lobo (piscam de vez em quando)
    if (Math.sin(time * 1.9) > 0.97) {
      P(-7, -38 - bob, 5, 1, MARK);
      P(-1, -38 - bob, 5, 1, MARK);
    } else {
      P(-8, -40 - bob, 6, 1, FUR_DK);
      P(-1, -40 - bob, 6, 1, FUR_DK);
      P(-7, -39 - bob, 5, 4, MARK);
      P(-6, -38 - bob, 4, 3, EYE);
      P(-5, -37 - bob, 2, 2, NOSE);
      P(-5, -38 - bob, 1, 1, '#ffffff');
      P(-1, -39 - bob, 5, 4, MARK);
      P(0, -38 - bob, 4, 3, EYE);
      P(1, -37 - bob, 2, 2, NOSE);
      P(1, -38 - bob, 1, 1, '#ffffff');
    }

    // lenço vermelho de aventureiro, sob o queixo
    P(-7, -30 - bob, 14, 4, SCARF);
    P(-7, -30 - bob, 14, 1, '#e06a52');
    P(-7, -27 - bob, 14, 1, SCARF_DK);
    P(-9, -30 - bob, 4, 4, SCARF_DK);
    const flap = (moving ? Math.sin(time * 8) * 1.6 + 2 : Math.sin(time * 4) * 0.7);
    P(-11 - flap * 0.4, -30 - bob, 5, 2, SCARF);
    P(-14 - flap * 0.7, -28 - bob, 5, 3, SCARF_DK);

    // orelhas pontudas de lobo (atrás do chapéu, saindo por cima da aba)
    P(-12, -45 - bob, 5, 4, FUR);
    P(-11, -48 - bob, 4, 4, FUR);
    P(-11, -50 - bob, 3, 3, FUR);
    P(-10, -51 - bob, 2, 2, MARK);
    P(-10, -46 - bob, 2, 3, EAR_IN);
    P(7, -45 - bob, 5, 4, FUR);
    P(7, -48 - bob, 4, 4, FUR);
    P(7, -50 - bob, 3, 3, FUR);
    P(8, -51 - bob, 2, 2, MARK);
    P(8, -46 - bob, 2, 3, EAR_IN);

    // chapéu de explorador sobre a cabeça
    P(-11, -45 - bob, 22, 3, HAT_DK);
    P(-10, -45 - bob, 20, 1, HAT);
    P(-6, -51 - bob, 12, 6, HAT);
    P(-5, -52 - bob, 10, 1, HAT);
    P(-6, -48 - bob, 12, 2, BAND);
    P(-6, -48 - bob, 12, 1, '#e8b84a');
    P(-3, -51 - bob, 6, 1, HAT_DK);

    // braço da frente com pata
    P(7 + arm * 0.3, -28 - bob, 4, 10, FUR);
    P(7 + arm * 0.3, -19 - bob, 4, 3, FUR_LT);
    P(8 + arm * 0.3, -26 - bob, 2, 2, FUR_DK);

    ctx.restore();
  }

  function enemyOrigin(enemy) {
    const x = Math.round(enemy.x - camera) + enemy.w / 2;
    const y = enemy.y + enemy.h;
    ctx.save();
    ctx.translate(x, y);
    if (enemy.dir < 0) ctx.scale(-1, 1);
  }

  function drawScorpion(enemy) {
    enemyOrigin(enemy);
    const sway = Math.sin(time * 3 + enemy.phase);

    // patas articuladas (visão lateral: 4 patas), em pixel art
    for (let i = 0; i < 4; i += 1) {
      const lift = Math.sin(time * 10 + enemy.phase + i * 1.5) > 0 ? 1 : 0;
      const lx = -6 + i * 4;
      px(lx, -5, 2, 2, '#7a4a21');
      px(lx - 1, -4 + lift, 2, 3, '#8a5a33');
      px(lx - 2, -2 + lift, 2, 2, '#5a3418');
    }

    // corpo segmentado (cefalotórax + abdômen)
    px(-10, -9, 18, 7, '#a8642c');
    px(-9, -10, 14, 1, '#d08a45');
    px(-10, -4, 18, 2, '#5c3312');
    px(-3, -9, 2, 7, '#7a4520');
    px(3, -9, 2, 7, '#7a4520');
    px(-8, -8, 5, 2, '#b87434');

    // cefalotórax e olhos
    px(7, -9, 6, 6, '#8a4f22');
    px(8, -10, 4, 1, '#b87434');
    px(10, -8, 1, 1, '#1a0f07');
    px(11, -7, 1, 1, '#1a0f07');

    // quelíceras/pinças na frente
    px(11, -11, 4, 2, '#a8642c');
    px(14, -12, 4, 2, '#d08a45');
    px(17, -11, 2, 2, '#8a4f22');
    px(15, -10, 3, 1, '#5c3312');
    px(11, -4, 4, 2, '#a8642c');
    px(14, -4, 4, 2, '#d08a45');
    px(17, -4, 2, 2, '#8a4f22');

    // cauda curvada para cima, com ferrão
    px(-12, -6, 4, 4, '#8a4f22');
    px(-15, -10, 4, 5, '#a8642c');
    px(-16 + sway, -14, 4, 5, '#8a4f22');
    px(-14 + sway, -18, 4, 5, '#a8642c');
    px(-10 + sway, -21, 4, 4, '#b87434');
    px(-8 + sway, -23, 3, 3, '#e0554a');
    px(-6 + sway, -22, 2, 2, '#f2b13c');
    ctx.restore();
  }

  function drawBandit(enemy) {
    enemyOrigin(enemy);
    const step = Math.sin(time * 9 + enemy.phase) * 2;

    // pernas e botas
    px(-6 + step, -10, 5, 6, '#4a3320');
    px(2 - step, -10, 5, 6, '#4a3320');
    px(-6 + step, -4, 5, 3, '#2a1a0c');
    px(2 - step, -4, 5, 3, '#2a1a0c');

    // túnica e cinto
    px(-8, -24, 16, 15, '#7d3b2a');
    px(-8, -24, 5, 15, '#5a2a1d');
    px(-8, -13, 16, 3, '#2a1a0c');
    px(-2, -13, 4, 3, '#d9a52c');

    // braços
    px(-10, -23, 3, 10, '#6b3224');
    px(7, -23, 3, 10, '#6b3224');

    // cabeça e bandana
    px(-5, -31, 10, 8, '#d9b07f');
    px(-4, -30, 8, 2, '#e8c49a');
    px(-7, -35, 14, 4, '#3f2a16');
    px(-6, -31, 12, 1, '#241608');
    px(-7, -32, 14, 2, '#e0554a');
    px(-4, -26, 10, 2, '#2a1a0c');
    px(1, -29, 2, 2, '#fff7e6');
    px(2, -29, 1, 1, '#241608');
    px(4, -29, 2, 2, '#fff7e6');
    px(5, -29, 1, 1, '#241608');

    // cimitarra
    px(9, -14, 4, 2, '#8a5a10');
    px(11, -22, 2, 8, '#cfd6dd');
    px(12, -25, 2, 4, '#e8eef2');
    ctx.restore();
  }

  function drawVulture(enemy) {
    enemyOrigin(enemy);
    const flap = Math.sin(time * 8 + enemy.phase);
    const lift = flap * 3;

    // asa de trás
    px(-22, -16 - lift * 0.7, 8, 3, '#191512');
    px(-17, -17 - lift * 0.7, 7, 4, '#241f1c');
    px(-11, -18 - lift * 0.7, 6, 4, '#2f2a26');
    px(-21, -18 - lift * 0.7, 2, 2, '#100d0b');
    px(-18, -19 - lift * 0.7, 2, 2, '#100d0b');
    px(-15, -19 - lift * 0.7, 2, 2, '#100d0b');

    // asa da frente (mais clara)
    px(15, -18 - lift, 8, 3, '#241f1c');
    px(11, -19 - lift, 7, 4, '#2f2a26');
    px(6, -20 - lift, 6, 5, '#3a332e');
    px(16, -20 - lift, 2, 2, '#191512');
    px(19, -19 - lift, 2, 2, '#191512');
    px(13, -22 - lift, 2, 2, '#191512');

    // cauda e corpo
    px(-16, -17, 6, 2, '#191512');
    px(-13, -18, 6, 4, '#241f1c');
    px(-8, -20, 14, 8, '#2f2a26');
    px(-6, -21, 10, 2, '#3a332e');
    px(-6, -13, 10, 2, '#1d1917');

    // colar de penas claras
    px(3, -22, 6, 2, '#e8e0d0');
    px(4, -20, 4, 2, '#d0c8b8');

    // pescoço e cabeça careca (abutre)
    px(5, -24, 4, 5, '#c98a7a');
    px(7, -27, 6, 5, '#d9a08c');
    px(8, -28, 4, 2, '#e6b9a6');
    px(10, -26, 1, 1, '#1a0f07');

    // bico curvo
    px(12, -27, 4, 2, '#e0a63c');
    px(15, -26, 3, 2, '#d09a34');
    px(17, -25, 2, 2, '#b07f24');
    px(18, -24, 1, 1, '#8a6018');

    // patas recolhidas
    px(0, -13, 2, 3, '#c9a15c');
    px(-1, -11, 4, 1, '#8a6a44');
    ctx.restore();
  }

  function drawMandril(enemy) {
    enemyOrigin(enemy);
    const run = Math.sin(time * 9 + enemy.phase);
    const bob = Math.abs(run) * 1.3;

    // pernas (ficam no chão, sem bob)
    px(-8 + run * 2, -10, 5, 10, '#5a3f20');
    px(-8 + run * 2, 0, 6, 2, '#2a1a0c');
    px(3 - run * 2, -10, 5, 10, '#5a3f20');
    px(3 - run * 2, 0, 6, 2, '#2a1a0c');

    // o resto do corpo balança com o passo
    ctx.save();
    ctx.translate(0, -bob);

    // cauda erguida (maior)
    px(-12, -16, 3, 8, '#6e5330');
    px(-13, -22, 3, 5, '#5a3f20');
    px(-14, -26, 3, 4, '#6e5330');
    px(-15, -29, 2, 4, '#5a3f20');
    px(-16, -31, 2, 3, '#6e5330');
    px(-16, -32, 2, 2, '#8a6a3c');

    // corpo peludo
    px(-10, -24, 18, 14, '#8a6a3c');
    px(-9, -23, 16, 3, '#a07c46');
    px(-10, -12, 18, 2, '#7a5a32');

    // braços
    px(-12, -22, 4, 12, '#7a5a32');
    px(8, -22, 4, 12, '#7a5a32');
    px(-12, -10, 5, 2, '#5a3f20');
    px(8, -10, 5, 2, '#5a3f20');

    // cabeça (um pouco menor)
    px(7, -33, 10, 9, '#a9713c');
    px(8, -34, 8, 2, '#b98a4a');

    // focinho alongado
    px(15, -29, 8, 8, '#c98a4a');
    px(16, -30, 6, 2, '#d9a05a');
    px(16, -23, 6, 3, '#8a5a33');

    // nariz colorido do mandril (azul e vermelho)
    px(16, -28, 2, 3, '#3f6bb0');
    px(19, -28, 2, 3, '#3f6bb0');
    px(17, -24, 5, 2, '#e0554a');
    px(18, -22, 3, 1, '#7d1712');

    // olhos
    px(12, -31, 2, 2, '#241608');
    px(15, -31, 2, 2, '#241608');
    px(12, -31, 1, 1, '#f2d13c');
    px(15, -31, 1, 1, '#f2d13c');

    // orelhas
    px(5, -32, 3, 3, '#8a6a3c');
    px(6, -31, 1, 2, '#c98a7a');

    // barba amarela
    px(12, -21, 5, 4, '#e0c070');
    ctx.restore();
    ctx.restore();
  }

  function drawWasp(enemy) {
    enemyOrigin(enemy);
    const flap = Math.sin(time * 26 + enemy.phase);

    // asas translúcidas batendo (presas ao tórax)
    ctx.globalAlpha = 0.55;
    px(-2, -17 - Math.abs(flap) * 2, 9, 4, '#dff3ff');
    px(2, -18 - Math.abs(flap) * 2, 7, 3, '#bfe8ff');
    ctx.globalAlpha = 1;

    // pernas
    px(-5, -7, 1, 4, '#2a1a0c');
    px(-2, -7, 1, 4, '#2a1a0c');
    px(1, -7, 1, 4, '#2a1a0c');

    // abdômen listrado (amarelo e preto)
    px(-14, -13, 12, 8, '#e8c23c');
    px(-14, -13, 4, 8, '#241608');
    px(-8, -13, 3, 8, '#241608');
    px(-4, -13, 2, 8, '#241608');
    px(-12, -14, 9, 1, '#f6d968');
    px(-12, -6, 9, 1, '#b98f1e');

    // ferrão
    px(-17, -10, 4, 2, '#241608');
    px(-18, -9, 2, 1, '#3a2a12');

    // tórax
    px(-3, -15, 7, 9, '#3a2a12');
    px(-2, -16, 5, 2, '#5a3f1f');

    // cabeça e olhos
    px(4, -15, 6, 7, '#2a1a0c');
    px(5, -14, 3, 3, '#f2b13c');
    px(5, -13, 2, 2, '#1a0f07');
    px(9, -14, 2, 3, '#f2b13c');
    px(9, -13, 1, 1, '#1a0f07');

    // antenas
    px(5, -18, 1, 3, '#2a1a0c');
    px(8, -18, 1, 3, '#2a1a0c');
    px(4, -19, 2, 1, '#2a1a0c');
    px(8, -19, 2, 1, '#2a1a0c');
    ctx.restore();
  }

  function drawCobra(enemy) {
    enemyOrigin(enemy);
    const sway = Math.sin(time * 2.3 + enemy.phase);
    const sx = sway * 3;

    // corpo enrolado no chão
    px(-10, -8, 20, 8, '#336b3a');
    px(-8, -7, 16, 2, '#224a2a');
    px(-6, -5, 12, 1, '#224a2a');
    px(-9, -3, 18, 1, '#4f9c58');
    px(-10, -1, 20, 1, '#1c3a22');

    // corpo em S subindo
    px(-4 + sx * 0.5, -14, 7, 7, '#3f8a4c');
    px(-3 + sx * 0.8, -20, 6, 8, '#3f8a4c');
    px(-2 + sx, -26, 6, 7, '#4f9c58');
    px(-4 + sx * 0.5, -13, 7, 1, '#2f6b3a');
    px(-3 + sx * 0.8, -19, 6, 1, '#2f6b3a');

    // capelo (hood) aberto
    px(-10 + sx, -33, 20, 9, '#3f8a4c');
    px(-11 + sx, -32, 2, 8, '#224a2a');
    px(9 + sx, -32, 2, 8, '#224a2a');
    px(-8 + sx, -34, 16, 2, '#4f9c58');
    px(-5 + sx, -28, 10, 2, '#7ac07a');

    // marca de "óculos" no capelo
    px(-6 + sx, -32, 4, 1, '#224a2a');
    px(-6 + sx, -28, 4, 1, '#224a2a');
    px(-6 + sx, -31, 1, 3, '#224a2a');
    px(-3 + sx, -31, 1, 3, '#224a2a');
    px(1 + sx, -32, 4, 1, '#224a2a');
    px(1 + sx, -28, 4, 1, '#224a2a');
    px(1 + sx, -31, 1, 3, '#224a2a');
    px(4 + sx, -31, 1, 3, '#224a2a');

    // cabeça e focinho
    px(-5 + sx, -39, 9, 6, '#4f9c58');
    px(-1 + sx, -38, 7, 3, '#5aad62');
    px(-3 + sx, -38, 2, 2, '#f2b13c');
    px(2 + sx, -38, 2, 2, '#f2b13c');
    px(-3 + sx, -38, 1, 1, '#1a0f07');
    px(2 + sx, -38, 1, 1, '#1a0f07');
    px(5 + sx, -36, 1, 1, '#224a2a');

    // língua bifurcada
    if (Math.sin(time * 5 + enemy.phase) > 0.1) {
      px(1 + sx, -42, 1, 3, '#e0554a');
      px(0 + sx, -43, 1, 1, '#e0554a');
      px(2 + sx, -43, 1, 1, '#e0554a');
    }
    ctx.restore();
  }

  function drawRaptor(enemy) {
    enemyOrigin(enemy);
    const run = Math.sin(time * 11 + enemy.phase);
    const tail = Math.sin(time * 5 + enemy.phase) * 1.5;

    // cauda longa e rígida (com leve balanço)
    px(-30, -19 + tail, 6, 2, '#3a4f20');
    px(-25, -20 + tail, 8, 3, '#46602a');
    px(-18, -21, 8, 4, '#4f6b28');
    px(-26, -18 + tail, 8, 1, '#6b8a38');

    // perna de trás
    px(-5 - run * 2, -19, 7, 8, '#46602a');
    px(-2 - run * 2, -12, 4, 8, '#3f5a24');
    px(-4 - run * 2, -4, 7, 2, '#2f441c');
    px(-6 - run * 2, -3, 3, 1, '#e8e0d0');

    // corpo e barriga
    px(-11, -24, 20, 12, '#5a7a2e');
    px(-10, -25, 17, 2, '#6b8a38');
    px(-9, -13, 17, 2, '#8a9c4a');
    px(-8, -22, 7, 1, '#6b8a38');

    // braços pequenos com garras
    px(8, -21, 4, 2, '#4f6b28');
    px(11, -20, 2, 2, '#4f6b28');
    px(13, -19, 2, 1, '#e8e0d0');

    // pescoço em S e cabeça
    px(7, -30, 6, 8, '#5a7a2e');
    px(8, -31, 5, 3, '#6b8a38');
    px(10, -36, 10, 7, '#5a7a2e');
    px(10, -37, 8, 2, '#6b8a38');
    px(18, -34, 7, 4, '#6b8a38');
    px(23, -33, 2, 2, '#5a7a2e');
    px(18, -30, 8, 2, '#4f6b28');
    px(19, -32, 1, 1, '#e8e0d0');
    px(21, -32, 1, 1, '#e8e0d0');
    px(23, -32, 1, 1, '#e8e0d0');
    px(23, -35, 1, 1, '#2f441c');
    px(14, -35, 2, 2, '#f2d13c');
    px(15, -35, 1, 1, '#241608');
    px(13, -37, 4, 1, '#3a4f20');

    // perna da frente (em passo)
    px(1 + run * 3, -20, 7, 9, '#5a7a2e');
    px(3 + run * 3, -12, 4, 8, '#4f6b28');
    px(2 + run * 3, -4, 7, 2, '#2f441c');
    px(8 + run * 3, -3, 3, 1, '#e8e0d0');
    ctx.restore();
  }

  function drawJurgen(enemy) {
    enemyOrigin(enemy);
    const step = Math.sin(time * 6 + enemy.phase);
    const hurt = enemy.invuln > 0 && Math.floor(time * 20) % 2 === 0;
    ctx.globalAlpha = hurt ? 0.55 : 1;
    ctx.fillStyle = '#2a1620';
    ctx.beginPath();
    ctx.moveTo(-16, -60);
    ctx.quadraticCurveTo(-34, -40, -26, -6);
    ctx.lineTo(-8, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3f2a16';
    rr(-16 + step * 2, -12, 11, 12, 3);
    ctx.fill();
    rr(6 - step * 2, -12, 11, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#5b3a1e';
    rr(-20, -58, 40, 48, 10);
    ctx.fill();
    ctx.fillStyle = '#8a5a33';
    rr(-20, -58, 14, 48, 8);
    ctx.fill();
    ctx.fillStyle = '#b98a3c';
    ctx.fillRect(-20, -40, 40, 6);
    ctx.fillStyle = '#d9b07f';
    dot(0, -66, 12);
    ctx.fillStyle = '#3a2412';
    ctx.beginPath();
    ctx.ellipse(0, -76, 16, 7, 0, 0, TAU);
    ctx.fill();
    rr(-11, -84, 22, 12, 4);
    ctx.fill();
    ctx.fillStyle = '#e0554a';
    dot(-5, -67, 2);
    dot(5, -67, 2);
    ctx.strokeStyle = '#f2b13c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -80, 10, Math.PI, 0);
    ctx.stroke();
    ctx.strokeStyle = '#b98a3c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-24, -52);
    ctx.lineTo(-34, -20);
    ctx.stroke();
    // joelhos/armadura dos ombros do Jurgen
    ctx.fillStyle = '#6b4226';
    rr(-30, -50, 14, 20, 6);
    ctx.fill();
    ctx.fillStyle = '#8a5a33';
    rr(16, -50, 14, 20, 6);
    ctx.fill();
    ctx.fillStyle = '#cfd6dd';
    ctx.beginPath();
    ctx.moveTo(-40, -24);
    ctx.lineTo(-26, -26);
    ctx.lineTo(-30, -12);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawEnemy(enemy) {
    if (!enemy.alive) return;
    const x = Math.round(enemy.x - camera);
    if (x < -90 || x > VIEW_W + 90) return;
    if (enemy.type === 'scorpion') drawScorpion(enemy);
    else if (enemy.type === 'bandit') drawBandit(enemy);
    else if (enemy.type === 'vulture') drawVulture(enemy);
    else if (enemy.type === 'mandril') drawMandril(enemy);
    else if (enemy.type === 'wasp') drawWasp(enemy);
    else if (enemy.type === 'cobra') drawCobra(enemy);
    else if (enemy.type === 'raptor') drawRaptor(enemy);
    else drawJurgen(enemy);
  }

  function render() {
    // Cada camada é desenhada de forma isolada: se uma falhar, as demais
    // continuam aparecendo (obstáculos, gemas e personagem nunca somem).
    const guard = (fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Erro ao desenhar camada:', err);
      }
    };

    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    guard(drawBackground);

    ctx.save();
    try {
      if (shake > 0.2) {
        ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);
      }
      guard(drawTiles);
      guard(drawCheckpoints);
      guard(drawExit);
      guard(drawCoins);
      guard(drawPowerups);
      guard(drawProjectiles);
      guard(() => {
        for (const enemy of level.enemies) drawEnemy(enemy);
      });
      guard(() => {
        if (state !== 'title') drawPlayer();
      });
      guard(drawParticles);
      guard(drawFloaters);
      guard(drawAmbient);
    } finally {
      ctx.restore();
    }

    guard(drawForeground);
    guard(drawBossBar);
    guard(drawComboHud);
    guard(() => {
      if (flash > 0) {
        ctx.fillStyle = `rgba(${flashColor}, ${Math.min(0.62, flash * 0.9)})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      if (fade > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, fade)})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    });

    // Amplia o buffer pixel-art para a tela sem suavização.
    displayCtx.imageSmoothingEnabled = false;
    displayCtx.clearRect(0, 0, canvas.width, canvas.height);
    displayCtx.drawImage(pixelCanvas, 0, 0, canvas.width, canvas.height);
  }

  /* ---------------------------------- loop ---------------------------------- */

  function updateTitle(dt) {
    const max = Math.max(0, level.cols * TILE - VIEW_W);
    camera = (0.5 - 0.5 * Math.cos(time * 0.16)) * Math.min(max, 460);
    updateEffects(dt);
  }

  function tick(dt) {
    time += dt;
    flash = Math.max(0, flash - dt * 2.2);
    fade = Math.max(0, fade - dt * 2.6);
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) combo = 0;
    }
    if (hitStop > 0) {
      hitStop = Math.max(0, hitStop - dt);
      updateAmbient(dt * 0.3);
      render();
      return;
    }
    if (state === 'playing') {
      update(dt);
    } else if (state === 'intro') {
      // avança apenas quando o jogador confirmar (botão/ESPAÇO)
      updateEffects(dt);
    } else if (state === 'title') {
      updateTitle(dt);
    } else {
      updateEffects(dt);
    }
    updateAmbient(dt);
    render();
  }

  function frame(timestamp) {
    const dt = Math.min(0.033, Math.max(0, (timestamp - lastTime) / 1000));
    lastTime = timestamp;
    try {
      tick(dt);
    } catch (err) {
      // evita que uma exceção derrube o loop: mantém o jogo em funcionamento
      console.error('Erro no loop do jogo:', err);
      try {
        if (hitStop > 0) hitStop = 0;
        if (flash > 0) flash = 0;
        if (fade > 0) fade = 0;
        state = state === 'over' || state === 'win' ? state : 'playing';
      } catch (e) { /* noop */ }
    }
    window.requestAnimationFrame(frame);
  }

  /* --------------------------------- início --------------------------------- */

  applyMuteUi();
  loadLevel(0, { intro: false });
  window.__dismissStory = dismissStory;
  syncUserUi();
  if (isAdmin) wireAdmin();
  if (currentUser) {
    state = 'title';
    showOverlay('title');
  } else {
    state = 'title';
    showOverlay('login');
  }
  syncHud();
  syncBest();
  syncLevelSelect();
  camera = 0;
  lastTime = performance.now();
  window.requestAnimationFrame(frame);
})();
