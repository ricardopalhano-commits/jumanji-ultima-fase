/**
 * Mundo Jumanji — "A Última Fase" (modo de plataforma).
 *
 * Fase lado a lado inspirada no clássico de Mario: o aventureiro corre, pula,
 * esmaga inimigos com quedas e desvia de obstáculos rumo ao portal dourado —
 * tudo com a temática de Jumanji (dunas, mandris, raptor, T-Rex de Jurgen).
 */

const TILE = 32;
const ROWS = 18;
const COLS = 64;
const WORLD_W = COLS * TILE;
const VIEW_W = 48 * TILE;
const VIEW_H = ROWS * TILE;
const GROUND_Y = 15 * TILE;
const PLAYER_W = 14;
const PLAYER_H = 22;
const MAX_LIVES = 3;
const GRAVITY = 1400;
const JUMP_VELOCITY = -760;
const RUN_SPEED = 240;
const ACCEL = 2600;
const FRICTION = 1800;
const JUMP_HORIZONTAL = 300;
const CHECKPOINT_X = 64;

const SOLID_TILES = new Set(['#', 'S', 'P']);
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'KeyB']);
const MOVE_KEYS = new Set(['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD']);

function buildLevel() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  const set = (col, row, char) => {
    grid[row][col] = char;
  };
  const fillRange = (from, to, char, row) => {
    for (let c = from; c <= to; c += 1) set(c, row, char);
  };

  // Terreno com buracos e rajadas de areia (obstáculos).
  fillRange(0, 4, '#', 15);
  fillRange(5, 6, 'S', 15);
  fillRange(9, 16, '#', 15);
  fillRange(21, 26, '#', 15);
  fillRange(29, 34, '#', 15);
  fillRange(35, 47, '#', 15);

  // Plataformas flutuantes.
  fillRange(10, 13, '#', 12);
  fillRange(17, 20, '#', 10);

  // Portal dourado ao final da trilha.
  set(45, 15, 'P');

  return grid;
}

function createEnemies() {
  return [
    {
      id: 'mandri-1',
      type: 'mandri',
      minX: 9 * TILE,
      maxX: 16 * TILE,
      x: 9 * TILE,
      y: GROUND_Y - 22,
      w: 14,
      h: 22,
      vx: 100,
      dir: 1,
      grounded: true,
      alive: true,
      hp: 1
    },
    {
      id: 'mandri-2',
      type: 'mandri',
      minX: 17 * TILE,
      maxX: 20 * TILE,
      x: 20 * TILE,
      y: 10 * TILE - 22,
      w: 14,
      h: 22,
      vx: 70,
      dir: -1,
      grounded: true,
      alive: true,
      hp: 1
    },
    {
      id: 'raptor-1',
      type: 'raptor',
      minX: 29 * TILE,
      maxX: 34 * TILE,
      x: 34 * TILE,
      y: GROUND_Y - 22,
      w: 16,
      h: 22,
      vx: 160,
      dir: -1,
      grounded: true,
      alive: true,
      hp: 1
    },
    {
      id: 'jurgen',
      type: 'jurgen',
      minX: 38 * TILE,
      maxX: 40 * TILE,
      x: 38 * TILE,
      y: GROUND_Y - 34,
      w: 18,
      h: 34,
      vx: 80,
      dir: 1,
      grounded: true,
      alive: true,
      hp: 3,
      defeated: false
    }
  ];
}

function createCoins() {
  const coins = [
    { tx: 2, ty: 4, x: 2 * TILE + 16, y: 4 * TILE - 16, collected: false },
    { tx: 3, ty: 5, x: 3 * TILE + 16, y: 5 * TILE - 16, collected: false },
    { tx: 12, ty: 3, x: 12 * TILE + 16, y: 3 * TILE - 16, collected: false },
    { tx: 16, ty: 6, x: 16 * TILE + 16, y: 6 * TILE - 16, collected: false },
    { tx: 22, ty: 3, x: 22 * TILE + 16, y: 3 * TILE - 16, collected: false },
    { tx: 26, ty: 5, x: 26 * TILE + 16, y: 5 * TILE - 16, collected: false },
    { tx: 33, ty: 2, x: 33 * TILE + 16, y: 2 * TILE - 16, collected: false }
  ];
  return coins;
}

export function startGame(canvas, options = {}) {
  const mount = options.mount || canvas.parentElement;
  const onExit = typeof options.onExit === 'function' ? options.onExit : null;
  const playerName = options.playerName || 'Aventureiro';

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const overlay = mount.querySelector('#game-overlay');
  const panels = {
    start: mount.querySelector('#game-panel-start'),
    over: mount.querySelector('#game-panel-over'),
    won: mount.querySelector('#game-panel-won')
  };
  const heartsEl = mount.querySelector('#game-hearts');
  const gemsEl = mount.querySelector('#game-gems');
  const gemsValue = mount.querySelector('#game-gems-value');
  const scoreEl = mount.querySelector('#game-score');
  const levelEl = mount.querySelector('#game-level');

  const grid = buildLevel();
  const enemies = createEnemies();
  const coins = createCoins();
  const boss = enemies[enemies.length - 1];

  const player = {
    x: CHECKPOINT_X,
    y: GROUND_Y - PLAYER_H,
    vx: 0,
    vy: 0,
    w: PLAYER_W,
    h: PLAYER_H,
    facing: 1,
    grounded: true
  };

  const particles = [];
  const input = { left: false, right: false, jumpQueued: false, jumpHeld: false };
  let state = 'ready';
  let lives = MAX_LIVES;
  let gems = 0;
  let score = 0;
  let stompCount = 0;
  let cameraX = 0;
  let rafId = null;
  let lastTime = 0;
  let destroyed = false;

  /* ---------------------------------- estado --------------------------------- */

  function resetRun() {
    player.x = CHECKPOINT_X;
    player.y = GROUND_Y - PLAYER_H;
    player.vx = 0;
    player.vy = 0;
    player.facing = 1;
    player.grounded = true;

    for (const enemy of enemies) {
      enemy.alive = true;
      enemy.grounded = true;
      enemy.hp = enemy.type === 'jurgen' ? 3 : 1;
      enemy.defeated = false;
      enemy.vy = 0;
      enemy.vx = enemy.type === 'jurgen' ? 80 : 100;
      enemy.dir = enemy.type === 'mandri-2' || enemy.type === 'raptor-1' ? -1 : 1;
      if (enemy.type === 'mandri-2') enemy.x = enemy.maxX;
      if (enemy.type === 'raptor-1') enemy.x = enemy.maxX;
      if (enemy.type === 'jurgen') enemy.x = enemy.minX;
      if (enemy.type === 'mandri-1') enemy.x = enemy.minX;
    }

    for (const coin of coins) coin.collected = false;
    gems = 0;
    score = 0;
    stompCount = 0;
    particles.length = 0;
  }

  function respawn() {
    resetRun();
    player.x = CHECKPOINT_X;
    player.y = GROUND_Y - PLAYER_H;
  }

  function syncHud() {
    if (heartsEl) {
      heartsEl.innerHTML = Array.from({ length: MAX_LIVES }, (_, i) => `
        <span class="heart${i < lives ? '' : ' is-empty'}" aria-hidden="true">
          <svg class="icon"><use href="#i-heart"></use></svg>
        </span>
      `).join('');
      heartsEl.setAttribute('aria-label', `${Math.max(lives, 0)} de ${MAX_LIVES} vidas`);
    }
    if (gemsValue) gemsValue.textContent = String(gems);
    if (scoreEl) scoreEl.textContent = String(score);
    if (levelEl) levelEl.textContent = 'Fase 1 · Deserto';
  }

  function hurtPlayer() {
    lives -= 1;
    syncHud();
    if (lives <= 0) {
      state = 'gameover';
      showPanel('over');
      toast('Fim do tabuleiro', `${playerName} esgotou as três vidas na busca pelo portal.`);
      return;
    }
    respawn();
  }

  function winGame() {
    state = 'won';
    showPanel('won');
    toast('O portal se abriu!', `${playerName} derrotou Jurgen e conquistou o portal dourado.`);
  }

  function startRun() {
    resetRun();
    lives = MAX_LIVES;
    state = 'playing';
    hideOverlays();
    syncHud();
  }

  function exitGame({ navigate = true } = {}) {
    destroyed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    overlay.removeEventListener('click', onOverlayClick);
    controls.removeEventListener('pointerdown', onControlDown);
    controls.removeEventListener('pointerup', onControlRelease);
    controls.removeEventListener('pointercancel', onControlRelease);
    controls.removeEventListener('pointerleave', onControlRelease);
    controls.remove();
    if (navigate && onExit) onExit();
  }

  function hideOverlays() {
    if (panels.start) panels.start.hidden = true;
    if (panels.over) panels.over.hidden = true;
    if (panels.won) panels.won.hidden = true;
  }

  function showPanel(id) {
    hideOverlays();
    if (panels[id]) panels[id].hidden = false;
  }

  function toast(title, message) {
    const node = document.createElement('div');
    node.className = 'toast toast--info';
    node.innerHTML = `<span class="toast__icon"><svg class="icon" aria-hidden="true"><use href="#i-compass"></use></svg></span>
      <div class="toast__body"><span class="toast__title"></span><p></p></div>`;
    node.querySelector('.toast__title').textContent = title;
    node.querySelector('p').textContent = message;
    const close = document.createElement('button');
    close.className = 'toast__close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Fechar aviso');
    close.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-close"></use></svg>';
    close.addEventListener('click', () => node.remove());
    node.append(close);
    mount.appendChild(node);
    while (mount.querySelectorAll('.toast').length > 3) {
      mount.querySelector('.toast').remove();
    }
    setTimeout(() => node.remove(), 5200);
  }

  /* --------------------------------- física ---------------------------------- */

  function solidAt(x, y, w, h) {
    const x0 = Math.floor(x / TILE);
    const x1 = Math.floor((x + w - 0.01) / TILE);
    const y0 = Math.floor(y / TILE);
    const y1 = Math.floor((y + h - 0.01) / TILE);
    for (let r = y0; r <= y1; r += 1) {
      const row = grid[r];
      if (!row) continue;
      for (let c = x0; c <= x1; c += 1) {
        const char = row[c];
        if (char && SOLID_TILES.has(char)) {
          return { tx: c * TILE, ty: r * TILE, ch: char };
        }
      }
    }
    return null;
  }

  function resolveCollisions(entity, dt) {
    entity.x += entity.vx * dt;
    for (let guard = 0; guard < 8; guard += 1) {
      const tile = solidAt(entity.x, entity.y, entity.w, entity.h);
      if (!tile) break;
      if (entity.vx > 0) entity.x = tile.tx - entity.w;
      else if (entity.vx < 0) entity.x = tile.tx + TILE;
      entity.vx = 0;
    }

    entity.y += entity.vy * dt;
    let landed = false;
    for (let guard = 0; guard < 8; guard += 1) {
      const tile = solidAt(entity.x, entity.y, entity.w, entity.h);
      if (!tile) break;
      if (entity.vy > 0) {
        entity.y = tile.ty - entity.h;
        entity.vy = 0;
        landed = true;
        break;
      }
      if (entity.vy < 0) {
        entity.y = tile.ty + TILE;
        entity.vy = 0;
        break;
      }
    }
    return landed;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function handleStomp(enemy) {
    if (enemy.type === 'jurgen') {
      enemy.hp -= 1;
      enemy.vy = -560;
      enemy.grounded = false;
      stompCount += 1;
      spawnParticle(enemy.x + enemy.w / 2, enemy.y + enemy.h, '#8a5a33');
      if (enemy.hp <= 0) enemy.defeated = true;
      return;
    }
    enemy.alive = false;
    enemy.vy = -480;
    enemy.vx = 0;
    stompCount += 1;
    spawnParticle(enemy.x + enemy.w / 2, enemy.y + enemy.h, '#8a5a33');
  }

  function updateEnemy(enemy, dt) {
    if (!enemy.alive || enemy.defeated) return;
    if (!enemy.grounded) {
      enemy.vy += GRAVITY * dt;
      enemy.y += enemy.vy * dt;
      if (enemy.y + enemy.h <= GROUND_Y + 0.5) {
        enemy.y = GROUND_Y - enemy.h;
        enemy.vy = 0;
        enemy.grounded = true;
      }
      return;
    }
    enemy.x += enemy.dir * enemy.vx * dt;
    if (enemy.x <= enemy.minX) {
      enemy.x = enemy.minX;
      enemy.dir = 1;
    }
    if (enemy.x + enemy.w >= enemy.maxX) {
      enemy.x = enemy.maxX - enemy.w;
      enemy.dir = -1;
    }
  }

  function update(dt) {
    if (state !== 'playing') {
      updateParticles(dt);
      return;
    }

    // Física do aventureiro.
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) {
      player.vx += dir * ACCEL * dt;
      player.facing = dir;
    } else {
      player.vx += (0 - player.vx) * Math.min(1, FRICTION * dt);
    }
    player.vx = Math.max(-RUN_SPEED, Math.min(RUN_SPEED, player.vx));

    if (input.jumpQueued) {
      input.jumpQueued = false;
      if (player.grounded) {
        player.vy = JUMP_VELOCITY;
        player.grounded = false;
        player.vx = player.facing * JUMP_HORIZONTAL;
      }
    }

    player.vy += GRAVITY * dt;
    const landed = resolveCollisions(player, dt);
    if (player.y + player.h >= GROUND_Y && player.vy >= 0) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      player.grounded = true;
    } else {
      player.grounded = false;
    }

    if (player.y > GROUND_Y + 60) {
      hurtPlayer();
      return;
    }

    cameraX = Math.max(0, Math.min(WORLD_W - VIEW_W, player.x + player.w / 2 - VIEW_W * 0.45));

    // Inimigos.
    for (const enemy of enemies) updateEnemy(enemy, dt);

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.defeated) continue;
      if (!rectsOverlap(player, enemy)) continue;
      const stomp = player.vy > 0 && player.y + player.h - enemy.y < enemy.h * 0.7;
      if (stomp) handleStomp(enemy);
      else {
        hurtPlayer();
        return;
      }
    }

    // Moedas de gema.
    for (const coin of coins) {
      if (coin.collected) continue;
      if (Math.abs(player.x + player.w / 2 - coin.x) < 26 && Math.abs(player.y + player.h / 2 - coin.y) < 26) {
        coin.collected = true;
        gems += 1;
        score += 10;
        syncHud();
        spawnParticle(coin.x, coin.y, '#f2b13c');
      }
    }

    // Vitória: portal liberado depois que Jurgen é derrotado.
    if (boss.defeated) {
      const portalX = 45 * TILE;
      const portalY = 15 * TILE;
      if (player.x + player.w > portalX && player.x < portalX + TILE && player.y + player.h > portalY && player.y < portalY + TILE) {
        winGame();
      }
    }
  }

  /* --------------------------------- particles ------------------------------- */

  function spawnParticle(x, y, color) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 160,
      vy: -Math.random() * 180 - 30,
      life: 0.45,
      maxLife: 0.45,
      color,
      size: 3 + Math.random() * 3
    });
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 520 * dt;
    }
  }

  /* ---------------------------------- render --------------------------------- */

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSky(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, '#06120d');
    sky.addColorStop(0.55, '#0c2a1c');
    sky.addColorStop(1, '#123c28');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.save();
    ctx.shadowColor = 'rgba(242, 177, 60, 0.55)';
    ctx.shadowBlur = 46;
    ctx.fillStyle = '#f2b13c';
    ctx.beginPath();
    ctx.arc(VIEW_W - 150, 84, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#f8d9a0';
    ctx.beginPath();
    ctx.arc(VIEW_W - 150, 84, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 40);
    ctx.quadraticCurveTo(VIEW_W * 0.25, GROUND_Y - 130, VIEW_W * 0.5, GROUND_Y - 90);
    ctx.quadraticCurveTo(VIEW_W * 0.75, GROUND_Y - 40, VIEW_W, GROUND_Y - 60);
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.lineTo(0, VIEW_H);
    ctx.closePath();
    ctx.fillStyle = '#08160f';
    ctx.fill();
  }

  function drawTiles(ctx) {
    const c0 = Math.max(0, Math.floor(cameraX / TILE) - 1);
    const c1 = Math.min(COLS - 1, Math.ceil((cameraX + VIEW_W) / TILE) + 1);
    for (let r = 0; r < ROWS; r += 1) {
      const row = grid[r];
      if (!row) continue;
      for (let c = c0; c <= c1; c += 1) {
        const char = row[c];
        if (!char || char === '.') continue;
        const x = c * TILE - cameraX;
        const y = r * TILE;
        if (char === '#') {
          ctx.fillStyle = '#d9b587';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(120, 84, 45, 0.55)';
          ctx.fillRect(x, y + TILE - 4, TILE, 4);
        } else if (char === 'S') {
          ctx.fillStyle = '#9aa5b1';
          ctx.strokeStyle = '#6b7683';
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i += 1) {
            const bx = x + 3 + i * 8;
            ctx.beginPath();
            ctx.moveTo(bx + 4, y + 6);
            ctx.lineTo(bx, y + TILE - 5);
            ctx.lineTo(bx + 8, y + TILE - 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        } else if (char === 'P') {
          const defeated = boss.defeated;
          const pulse = 18 + Math.sin(performance.now() / 200) * 5;
          if (defeated) {
            const glow = ctx.createRadialGradient(x + TILE / 2, y + TILE / 2, 4, x + TILE / 2, y + TILE / 2, pulse);
            glow.addColorStop(0, 'rgba(242, 177, 60, 0.5)');
            glow.addColorStop(1, 'rgba(242, 177, 60, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, pulse, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = defeated ? '#f8d9a0' : '#4a2f18';
          ctx.strokeStyle = defeated ? '#f2b13c' : '#8a5a33';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
  }

  function drawCoins(ctx, t) {
    for (const coin of coins) {
      if (coin.collected) continue;
      const x = coin.x - cameraX;
      const y = coin.y;
      const r = 6 + Math.sin(t / 160) * 2;
      ctx.fillStyle = 'rgba(242, 177, 60, 0.35)';
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2b13c';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c07a1f';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawMandri(ctx, enemy) {
    const x = enemy.x - cameraX;
    const y = enemy.y;
    ctx.strokeStyle = '#6b4226';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + enemy.w - 2, y + enemy.h * 0.55);
    ctx.quadraticCurveTo(x - 10, y + enemy.h * 0.35, x - 14, y + 8);
    ctx.stroke();
    ctx.fillStyle = '#8a5a33';
    roundRectPath(ctx, x + 2, y + 6, enemy.w - 4, enemy.h - 8, 5);
    ctx.fill();
    ctx.strokeStyle = '#5d3a1c';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + enemy.w / 2, y + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 2.5, y + 2.5, 2.4, 0, Math.PI * 2);
    ctx.arc(x + enemy.w - 2.5, y + 2.5, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f130a';
    ctx.beginPath();
    ctx.arc(x + enemy.w / 2 - 2, y + 3, 1, 0, Math.PI * 2);
    ctx.arc(x + enemy.w / 2 + 2, y + 3, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRaptor(ctx, enemy) {
    const x = enemy.x - cameraX;
    const y = enemy.y;
    ctx.fillStyle = '#3f7d3a';
    roundRectPath(ctx, x + 2, y + 6, enemy.w - 4, enemy.h - 8, 6);
    ctx.fill();
    ctx.strokeStyle = '#2c5730';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#3f7d3a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + enemy.w - 2, y + enemy.h * 0.55);
    ctx.quadraticCurveTo(x + enemy.w + 8, y + enemy.h * 0.5, x + enemy.w + 14, y + 8);
    ctx.stroke();
    ctx.fillStyle = '#2c5730';
    roundRectPath(ctx, x + enemy.w - 10, y + 4, 9, 7, 2);
    ctx.fill();
    ctx.fillStyle = '#1f130a';
    ctx.beginPath();
    ctx.arc(x + enemy.w - 5, y + 6, 1.4, 0, Math.PI * 2);
    ctx.arc(x + enemy.w - 1, y + 6, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawJurgen(ctx, enemy) {
    const x = enemy.x - cameraX;
    const y = enemy.y;
    ctx.fillStyle = '#5b3a1e';
    roundRectPath(ctx, x + 2, y + 10, enemy.w - 4, enemy.h - 12, 6);
    ctx.fill();
    ctx.strokeStyle = '#3d2712';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + enemy.w / 2, y + 6, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#6b4226';
    ctx.fill();
    ctx.strokeStyle = '#f2b13c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + enemy.w / 2, y + 3, 7, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#3d2712';
    roundRectPath(ctx, x + 4, y - 2, 4, 7, 2);
    ctx.fill();
    roundRectPath(ctx, x + enemy.w - 8, y - 2, 4, 7, 2);
    ctx.fill();
  }

  function drawEnemy(ctx, enemy) {
    if (!enemy.alive) return;
    if (enemy.type === 'jurgen') drawJurgen(ctx, enemy);
    else if (enemy.type === 'raptor') drawRaptor(ctx, enemy);
    else drawMandri(ctx, enemy);
  }

  function drawPlayer(ctx) {
    const x = player.x - cameraX;
    const y = player.y;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x + player.w / 2, y + player.h + 2, player.w * 0.6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2fbf7f';
    roundRectPath(ctx, x + 2, y + 7, player.w - 4, player.h - 9, 4);
    ctx.fill();
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(x + player.w / 2, y + 3.5, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a4a21';
    ctx.fillRect(x + 0.5, y + 0.5, player.w - 1, 5);
    ctx.fillStyle = '#fff7e6';
    ctx.beginPath();
    ctx.arc(x + player.w / 2 - 2, y + 2, 1.6, 0, Math.PI * 2);
    ctx.arc(x + player.w / 2 + 2, y + 2, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14532d';
    ctx.fillRect(x + 3, y + player.h - 6, 4, 7);
    ctx.fillRect(x + player.w - 7, y + player.h - 6, 4, 7);
  }

  function drawParticles(ctx) {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - cameraX, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function render(ctx, t) {
    drawSky(ctx);
    drawTiles(ctx);
    drawCoins(ctx, t);
    for (const enemy of enemies) drawEnemy(ctx, enemy);
    drawPlayer(ctx);
    drawParticles(ctx);
  }

  /* ----------------------------------- loop ---------------------------------- */

  function loop(time) {
    if (destroyed) return;
    const dt = Math.min(Math.max((time - lastTime) / 1000, 0), 0.05);
    lastTime = time;
    update(dt);
    render(ctx, time);
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function onOverlayClick(event) {
    const actionNode = event.target.closest('[data-game-action]');
    if (!actionNode) return;
    const action = actionNode.dataset.gameAction;
    if (action === 'start' || action === 'restart') startRun();
    else if (action === 'exit') exitGame();
  }

  function onKeyDown(event) {
    if (MOVE_KEYS.has(event.code) || JUMP_KEYS.has(event.code)) event.preventDefault();
    if (event.repeat) return;
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = true;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = true;
    if (JUMP_KEYS.has(event.code)) {
      input.jumpQueued = true;
      input.jumpHeld = true;
    }
  }

  function onKeyUp(event) {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = false;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = false;
    if (JUMP_KEYS.has(event.code)) {
      input.jumpHeld = false;
      if (player.vy < 0) player.vy = player.vy * 0.5;
    }
  }

  function onControlDown(event) {
    const actionNode = event.target.closest('[data-game-action]');
    if (!actionNode) return;
    event.preventDefault();
    const action = actionNode.dataset.gameAction;
    if (action === 'left') input.left = true;
    else if (action === 'right') input.right = true;
    else if (action === 'jump') {
      input.jumpQueued = true;
      input.jumpHeld = true;
    }
  }

  function onControlRelease(event) {
    const actionNode = event.target.closest('[data-game-action]');
    if (!actionNode) return;
    const action = actionNode.dataset.gameAction;
    if (action === 'left') input.left = false;
    else if (action === 'right') input.right = false;
    else if (action === 'jump') input.jumpHeld = false;
  }

  // Controles touch (mobile).
  const controls = document.createElement('div');
  controls.className = 'game-controls';
  controls.setAttribute('aria-label', 'Controles do jogo');
  controls.innerHTML = `
    <div class="game-controls__row">
      <button class="game-control" data-game-action="left" type="button" aria-label="Mover para a esquerda">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /><path d="M9 6l6 6-6 6" /></svg>
      </button>
      <button class="game-control" data-game-action="right" type="button" aria-label="Mover para a direita">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /><path d="M15 18l-6-6 6-6" /></svg>
      </button>
    </div>
    <button class="game-control game-control--jump" data-game-action="jump" type="button" aria-label="Pular">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5" /><path d="M5 12h14" /></svg>
    </button>`;
  mount.appendChild(controls);

  overlay.addEventListener('click', onOverlayClick);
  controls.addEventListener('pointerdown', onControlDown);
  controls.addEventListener('pointerup', onControlRelease);
  controls.addEventListener('pointercancel', onControlRelease);
  controls.addEventListener('pointerleave', onControlRelease);

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  /* ---------------------------------- início --------------------------------- */

  resetRun();
  lives = MAX_LIVES;
  state = 'ready';
  showPanel('start');
  syncHud();
  startLoop();

  return {
    destroy: () => exitGame({ navigate: false })
  };
}
