import { api, ApiError } from './api.js';
import {
  clamp,
  difficultyLabel,
  difficultyTone,
  escapeHtml,
  formatDate,
  formatDateTime,
  formatNumber,
  pluralize,
  sleep,
  statusLabel,
  statusTone
} from './format.js';
import { initPWA } from './pwa.js';
import { startGame } from './game.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const FALLBACK_AVATAR = {
  key: 'smolder',
  name: 'Aventureiro',
  role: 'Explorador',
  icon: 'sword',
  color: '#3ddc97',
  tagline: '',
  attributes: { forca: 2, agilidade: 2, conhecimento: 2 }
};

const VIEWS = ['aventura', 'aventureiros', 'fases', 'ranking', 'jogo'];

const state = {
  view: 'aventura',
  meta: {
    avatars: [],
    scenes: [],
    challenges: [],
    maxLives: 3,
    counts: { players: 0, missions: 0, totalMissions: 0 }
  },
  players: [],
  missions: [],
  stats: null,
  selectedPlayerId: null,
  journey: null,
  journeyLoading: false,
  journeyError: null,
  approach: null,
  editingPlayer: null,
  editingMission: null,
  pickingAvatar: 'smolder',
  pickingChallenge: 'conhecimento',
  confirmAction: null,
  submittingPlayer: false,
  submittingMission: false,
  confirming: false,
  playing: false,
  resultReady: false
};

const els = {
  adventureEmpty: $('#adventure-empty'),
  adventureContent: $('#adventure-content'),
  playerSwitcher: $('#player-switcher'),
  playerHero: $('#player-hero'),
  journeySummary: $('#journey-summary'),
  journeyTimeline: $('#journey-timeline'),
  missionPanel: $('#mission-panel'),
  attemptsSummary: $('#attempts-summary'),
  attemptsList: $('#attempts-list'),

  playerGrid: $('#player-grid'),
  playersEmpty: $('#players-empty'),

  missionList: $('#mission-list'),
  missionsEmpty: $('#missions-empty'),

  rankStats: $('#rank-stats'),
  podium: $('#podium'),
  rankList: $('#rank-list'),
  rankingEmpty: $('#ranking-empty'),

  playerDialog: $('#player-dialog'),
  playerForm: $('#player-form'),
  playerId: $('#player-id'),
  playerName: $('#player-name'),
  playerDialogTitle: $('#player-dialog-title'),
  playerDialogEyebrow: $('#player-dialog-eyebrow'),
  playerSubmit: $('#player-submit'),
  avatarPicker: $('#avatar-picker'),
  playerFormError: $('#player-form-error'),

  missionDialog: $('#mission-dialog'),
  missionForm: $('#mission-form'),
  missionId: $('#mission-id'),
  missionTitle: $('#mission-title'),
  missionScene: $('#mission-scene'),
  missionEnemy: $('#mission-enemy'),
  missionDifficulty: $('#mission-difficulty'),
  difficultyOutput: $('#difficulty-output'),
  missionReward: $('#mission-reward'),
  missionOrder: $('#mission-order'),
  missionActive: $('#mission-active'),
  missionIntro: $('#mission-intro'),
  missionSuccess: $('#mission-success'),
  missionFailure: $('#mission-failure'),
  challengePicker: $('#challenge-picker'),
  missionDialogTitle: $('#mission-dialog-title'),
  missionDialogEyebrow: $('#mission-dialog-eyebrow'),
  missionSubmit: $('#mission-submit'),
  missionFormError: $('#mission-form-error'),

  confirmDialog: $('#confirm-dialog'),
  confirmTitle: $('#confirm-title'),
  confirmText: $('#confirm-text'),
  confirmIcon: $('#confirm-icon'),
  confirmAction: $('#confirm-action'),

  resultDialog: $('#result-dialog'),
  resultScene: $('#result-scene'),
  resultDice: $('#result-dice'),
  resultNumber: $('#result-number'),
  resultChance: $('#result-chance'),
  resultTitle: $('#result-title'),
  resultNarrative: $('#result-narrative'),
  resultRewards: $('#result-rewards'),
  resultContinue: $('#result-continue'),

  toasts: $('#toasts'),
  dbStatus: $('#db-status'),
  dbStatusText: $('#db-status-text'),
  year: $('#year'),
  themeBtn: $('#theme-btn')
};

let gameInstance = null;

function startJungleGame() {
  if (gameInstance) gameInstance.destroy();
  gameInstance = startGame($('#game-canvas'), {
    mount: $('#game-mount'),
    playerName: selectedPlayer()?.name || 'Aventureiro',
    onExit: () => setView('aventura')
  });
}

/* ------------------------------- utilitários ------------------------------- */

function avatarByKey(key) {
  return state.meta.avatars.find((avatar) => avatar.key === key) || FALLBACK_AVATAR;
}

function sceneByKey(key) {
  return (
    state.meta.scenes.find((scene) => scene.key === key) || {
      key: 'deserto',
      name: 'Deserto',
      icon: 'sun'
    }
  );
}

function challengeByKey(key) {
  return (
    state.meta.challenges.find((challenge) => challenge.key === key) || {
      key: 'forca',
      name: 'Força',
      icon: 'sword',
      description: ''
    }
  );
}

function avatarArt(avatar, size = 'md') {
  const data = avatar || FALLBACK_AVATAR;
  return `<span class="avatar-art avatar-art--${size}" style="--avatar:${escapeHtml(
    data.color || '#3ddc97'
  )}" aria-hidden="true"><svg class="avatar-art__icon" viewBox="0 0 24 24"><use href="#i-${escapeHtml(
    data.icon || 'compass'
  )}"></use></svg></span>`;
}

function hearts(lives, max = 3) {
  const safeLives = clamp(Number(lives) || 0, 0, max);
  const items = Array.from({ length: max }, (_, index) =>
    `<span class="heart${index < safeLives ? '' : ' is-empty'}" aria-hidden="true"><svg class="icon"><use href="#i-heart"></use></svg></span>`
  ).join('');
  return `<span class="hearts" role="img" aria-label="${safeLives} de ${max} vidas">${items}</span>`;
}

function gemPill(value) {
  return `<span class="gem-pill"><svg class="icon" aria-hidden="true"><use href="#i-gem"></use></svg>${formatNumber(
    value
  )}</span>`;
}

function statusBadge(status) {
  return `<span class="badge badge--${statusTone(status)}">${statusLabel(status)}</span>`;
}

function sceneTag(sceneKey) {
  const scene = sceneByKey(sceneKey);
  return `<span class="scene-tag scene-tag--${escapeHtml(scene.key)}"><svg class="icon" aria-hidden="true"><use href="#i-${escapeHtml(
    scene.icon
  )}"></use></svg>${escapeHtml(scene.name)}</span>`;
}

function challengeChip(challengeKey) {
  const challenge = challengeByKey(challengeKey);
  return `<span class="chip"><svg class="icon" style="width:12px;height:12px" aria-hidden="true"><use href="#i-${escapeHtml(
    challenge.icon
  )}"></use></svg>${escapeHtml(challenge.name)}</span>`;
}

function difficultyMeter(difficulty) {
  const value = clamp(Number(difficulty) || 1, 1, 10);
  const bars = Array.from(
    { length: 10 },
    (_, index) => `<i class="${index < value ? 'is-on' : ''}"></i>`
  ).join('');
  return `<span class="meter meter--${difficultyTone(value)}" role="img" aria-label="Dificuldade ${value} de 10">${bars}</span>`;
}

function playerRank(id) {
  const index = state.players.findIndex((player) => player.id === id);
  return index === -1 ? null : index + 1;
}

function selectedPlayer() {
  return state.players.find((player) => player.id === state.selectedPlayerId) || null;
}

/* ------------------------------- inicialização ----------------------------- */

async function init() {
  setupTheme();
  bindEvents();
  initPWA();
  updateConnectivity();
  els.year.textContent = String(new Date().getFullYear());

  const initialView = viewFromHash();
  setView(initialView, { updateHash: false, scroll: false });

  await loadCore();
  renderAll();

  if (state.selectedPlayerId) {
    await selectPlayer(state.selectedPlayerId, { scroll: false });
  }

  updateHealth();

  const params = new URLSearchParams(window.location.search);
  const requested = params.get('view');
  if (requested && VIEWS.includes(requested)) setView(requested);
}

async function loadCore() {
  try {
    const [meta, playersResult, missionsResult, stats] = await Promise.all([
      api.meta(),
      api.players.list(),
      api.missions.list(),
      api.stats()
    ]);

    state.meta = meta;
    state.players = playersResult.items;
    state.missions = missionsResult.items;
    state.stats = stats;
    state.journeyError = null;

    const stored = Number(localStorage.getItem('jumanji:player'));
    const stillExists = state.players.some((player) => player.id === state.selectedPlayerId);
    if (!stillExists) {
      const storedPlayer = state.players.find((player) => player.id === stored);
      state.selectedPlayerId = storedPlayer?.id ?? state.players[0]?.id ?? null;
    }
  } catch (error) {
    state.journeyError = error;
    toast('error', 'Não foi possível carregar o jogo', error.message, 7000);
  }
}

async function refreshData({ reloadJourney = false } = {}) {
  await loadCore();
  if (reloadJourney && state.selectedPlayerId) {
    try {
      await loadJourney(state.selectedPlayerId);
    } catch {
      /* mantém a jornada atual se falhar */
    }
  }
  renderAll();
  updateHealth(true);
}

async function loadJourney(id) {
  const journey = await api.players.journey(id);
  if (state.selectedPlayerId !== id) return journey;
  state.journey = journey;
  state.approach = journey.current?.challenge ?? null;
  return journey;
}

async function selectPlayer(id, { scroll = true } = {}) {
  if (!state.players.some((player) => player.id === id)) return;

  state.selectedPlayerId = id;
  state.journey = null;
  state.journeyLoading = true;
  state.journeyError = null;
  state.approach = null;
  localStorage.setItem('jumanji:player', String(id));

  renderAdventure();

  try {
    const journey = await api.players.journey(id);
    if (state.selectedPlayerId !== id) return;
    state.journey = journey;
    state.approach = journey.current?.challenge ?? null;
  } catch (error) {
    if (state.selectedPlayerId !== id) return;
    state.journeyError = error;
    toast('error', 'Não foi possível abrir a jornada', error.message);
  } finally {
    if (state.selectedPlayerId === id) {
      state.journeyLoading = false;
      renderAdventure();
    }
  }

  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------------------------- temas ---------------------------------- */

function setupTheme() {
  const stored = localStorage.getItem('jumanji:theme');
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  applyTheme(stored || (prefersLight ? 'light' : 'dark'));
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('jumanji:theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f5efe0' : '#07110d');
  els.themeBtn?.setAttribute(
    'aria-label',
    theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'
  );
}

/* ----------------------------------- views --------------------------------- */

function viewFromHash() {
  const hash = window.location.hash.replace('#', '');
  return VIEWS.includes(hash) ? hash : 'aventura';
}

function setView(view, { updateHash = true, scroll = true } = {}) {
  const next = VIEWS.includes(view) ? view : 'aventura';
  state.view = next;

  $$('.nav__link').forEach((button) => {
    const active = button.dataset.view === next;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  $$('[data-view-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.viewPanel !== next;
  });

  if (updateHash) {
    history.replaceState(null, '', `#${next}`);
  }
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* -------------------------------- renderização ----------------------------- */

function renderAll() {
  renderAdventure();
  renderPlayers();
  renderMissions();
  renderRanking();
}

function renderAdventure() {
  const hasPlayers = state.players.length > 0;
  els.adventureEmpty.hidden = hasPlayers;
  els.adventureContent.hidden = !hasPlayers;
  if (!hasPlayers) {
    els.playerSwitcher.innerHTML = '';
    els.playerHero.innerHTML = '';
    return;
  }

  renderPlayerSwitcher();
  renderHeroCard();
  renderJourney();
  renderMission();
  renderAttempts();
}

function renderPlayerSwitcher() {
  els.playerSwitcher.innerHTML = state.players
    .map((player) => {
      const avatar = avatarByKey(player.avatar);
      const active = player.id === state.selectedPlayerId;
      return `<button class="player-chip${active ? ' is-active' : ''}" type="button"
                data-action="select-player" data-id="${player.id}"
                aria-pressed="${active}">
        ${avatarArt(avatar, 'xs')}
        <span>${escapeHtml(player.name)}</span>
        <span class="player-chip__gems"><svg class="icon" aria-hidden="true"><use href="#i-gem"></use></svg>${formatNumber(
          player.gems
        )}</span>
      </button>`;
    })
    .join('');
}

function renderHeroCard() {
  const player = selectedPlayer();
  if (!player) {
    els.playerHero.innerHTML = '';
    return;
  }

  const avatar = avatarByKey(player.avatar);
  const journey = state.journey;
  const progress = journey?.completed ?? player.progress ?? 0;
  const total = journey?.totalMissions ?? player.totalMissions ?? 0;
  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;
  const lives = journey?.player?.lives ?? player.lives;
  const gems = journey?.player?.gems ?? player.gems;
  const status = journey?.player?.status ?? player.status;
  const rank = playerRank(player.id);
  const maxLives = state.meta.maxLives || 3;

  els.playerHero.innerHTML = `
    <div class="hero-card__art">${avatarArt(avatar, 'hero')}</div>
    <div class="hero-card__body">
      <div class="hero-card__head">
        <div>
          <p class="eyebrow">Aventureiro em jogo</p>
          <h2 class="hero-card__name">${escapeHtml(player.name)}</h2>
          <p class="hero-card__role">${escapeHtml(avatar.name)} · ${escapeHtml(avatar.role)}</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          ${statusBadge(status)}
          <span class="hero-card__tag">${escapeHtml(avatar.tagline || '')}</span>
        </div>
      </div>

      <div class="hero-card__stats">
        <div class="stat stat--danger">
          <span class="stat__label">Vidas</span>
          <span class="stat__value">${hearts(lives, maxLives)}</span>
        </div>
        <div class="stat stat--gold">
          <span class="stat__label">Gemas</span>
          <span class="stat__value">${gemPill(gems)}</span>
        </div>
        <div class="stat">
          <span class="stat__label">Capítulos</span>
          <span class="stat__value">${progress}/${total}</span>
        </div>
        <div class="stat">
          <span class="stat__label">Ranking</span>
          <span class="stat__value">${rank ? `#${rank} de ${state.players.length}` : '—'}</span>
        </div>
      </div>

      <div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="Progresso da jornada">
          <span class="progress__bar" style="width:${percent}%"></span>
        </div>
      </div>

      <div class="hero-card__actions">
        <button class="btn btn--primary btn--sm" type="button" data-action="focus-mission">
          <svg class="icon" aria-hidden="true"><use href="#i-play"></use></svg>
          Ir para a fase
        </button>
        <button class="btn btn--primary btn--sm" type="button" data-action="play-game">
          <svg class="icon" aria-hidden="true"><use href="#i-gamepad"></use></svg>
          Jogar no mundo
        </button>
        <button class="btn btn--ghost btn--sm" type="button" data-action="edit-player" data-id="${player.id}">
          <svg class="icon" aria-hidden="true"><use href="#i-edit"></use></svg>
          Editar
        </button>
        <button class="btn btn--ghost btn--sm" type="button" data-action="reset-player" data-id="${player.id}">
          <svg class="icon" aria-hidden="true"><use href="#i-refresh"></use></svg>
          Reiniciar
        </button>
      </div>
    </div>`;
}

function renderJourney() {
  const journey = state.journey;

  if (state.journeyLoading) {
    els.journeySummary.textContent = 'Abrindo o mapa da selva…';
    els.journeyTimeline.innerHTML = `<li class="empty-inline">Carregando os capítulos…</li>`;
    return;
  }

  if (!journey) {
    els.journeySummary.textContent = 'Jornada indisponível';
    els.journeyTimeline.innerHTML = `<li class="empty-inline">Selecione um aventureiro para ver a jornada.</li>`;
    return;
  }

  els.journeySummary.textContent = `${journey.completed} de ${journey.totalMissions} ${pluralize(
    journey.totalMissions,
    'capítulo concluído',
    'capítulos concluídos'
  )}`;

  els.journeyTimeline.innerHTML = journey.chapters
    .map((chapter) => {
      const statusWord =
        chapter.status === 'concluida'
          ? 'Concluída'
          : chapter.status === 'atual'
            ? 'Fase atual'
            : 'Bloqueada';
      const marker =
        chapter.status === 'concluida'
          ? '<svg class="icon" style="width:14px;height:14px" aria-hidden="true"><use href="#i-check"></use></svg>'
          : String(chapter.chapter);
      return `<li class="chapter chapter--${chapter.status}">
        <span class="chapter__marker">${marker}</span>
        <div class="chapter__body">
          <span class="chapter__meta">${escapeHtml(sceneByKey(chapter.scene).name)} · ${statusWord}</span>
          <strong class="chapter__title">${escapeHtml(chapter.title)}</strong>
          <span class="chapter__enemy">${escapeHtml(chapter.enemy)}</span>
        </div>
      </li>`;
    })
    .join('');
}

function renderMission() {
  if (state.journeyLoading) {
    els.missionPanel.innerHTML = `<p class="empty-inline">Preparando o tabuleiro…</p>`;
    return;
  }

  if (!state.journey) {
    els.missionPanel.innerHTML = `<p class="empty-inline">Não foi possível carregar esta jornada. Tente novamente pelo seletor de aventureiros.</p>`;
    return;
  }

  const journey = state.journey;
  const player = journey.player;

  if (journey.victory) {
    els.missionPanel.innerHTML = `
      <div class="outcome-card">
        <span class="outcome-card__icon"><svg class="icon" aria-hidden="true"><use href="#i-trophy"></use></svg></span>
        <h2 class="outcome-card__title">Você venceu Jumanji</h2>
        <p class="outcome-card__text">${escapeHtml(
          journey.epilogue || 'O portal dourado se abriu e o tabuleiro desapareceu.'
        )}</p>
        <div class="outcome-card__actions">
          <button class="btn btn--primary" type="button" data-action="reset-player" data-id="${player.id}">
            <svg class="icon" aria-hidden="true"><use href="#i-refresh"></use></svg>
            Jogar novamente
          </button>
          <button class="btn btn--ghost" type="button" data-action="new-player">
            <svg class="icon" aria-hidden="true"><use href="#i-plus"></use></svg>
            Novo aventureiro
          </button>
        </div>
      </div>`;
    return;
  }

  if (player.status === 'eliminado' || player.lives <= 0) {
    els.missionPanel.innerHTML = `
      <div class="outcome-card outcome-card--danger">
        <span class="outcome-card__icon"><svg class="icon" aria-hidden="true"><use href="#i-skull"></use></svg></span>
        <h2 class="outcome-card__title">Suas vidas acabaram</h2>
        <p class="outcome-card__text">
          O tabuleiro cobrou caro. ${escapeHtml(player.name)} sai da selva por enquanto — mas toda lenda
          merece uma segunda chance. Reinicie a jornada para voltar ao deserto com ${state.meta.maxLives || 3} vidas.
        </p>
        <div class="outcome-card__actions">
          <button class="btn btn--primary" type="button" data-action="reset-player" data-id="${player.id}">
            <svg class="icon" aria-hidden="true"><use href="#i-refresh"></use></svg>
            Reiniciar jornada
          </button>
          <button class="btn btn--ghost" type="button" data-action="select-player" data-id="${state.players[0]?.id ?? player.id}">
            <svg class="icon" aria-hidden="true"><use href="#i-user"></use></svg>
            Trocar aventureiro
          </button>
        </div>
      </div>`;
    return;
  }

  const chapter = journey.current;
  if (!chapter) {
    els.missionPanel.innerHTML = `
      <div class="outcome-card">
        <span class="outcome-card__icon"><svg class="icon" aria-hidden="true"><use href="#i-map"></use></svg></span>
        <h2 class="outcome-card__title">O tabuleiro está vazio</h2>
        <p class="outcome-card__text">Nenhuma fase ativa disponível. Cadastre uma fase para continuar a campanha.</p>
        <div class="outcome-card__actions">
          <button class="btn btn--primary" type="button" data-action="go-missions">
            <svg class="icon" aria-hidden="true"><use href="#i-plus"></use></svg>
            Ir para as fases
          </button>
        </div>
      </div>`;
    return;
  }

  const avatar = avatarByKey(player.avatar);
  const chances = chapter.chances || {};
  const approach =
    state.approach && chances[state.approach] !== undefined ? state.approach : chapter.challenge;
  state.approach = approach;

  const approaches = state.meta.challenges
    .map((challenge) => {
      const percent = Number(chances[challenge.key] ?? 0);
      const selected = challenge.key === approach;
      const recommended = challenge.key === chapter.challenge;
      return `<button class="approach-btn${selected ? ' is-selected' : ''}" type="button"
                data-approach="${challenge.key}" role="radio" aria-checked="${selected}">
        <span class="approach-btn__top">
          <svg class="icon" aria-hidden="true"><use href="#i-${escapeHtml(challenge.icon)}"></use></svg>
          <span class="approach-btn__name">${escapeHtml(challenge.name)}</span>
          <span class="approach-btn__chance">${percent}%</span>
        </span>
        <span class="approach-btn__meta">Seu atributo: ${Number(
          avatar.attributes?.[challenge.key] ?? 2
        )}/5</span>
        ${recommended ? '<span class="approach-btn__tag">Recomendada</span>' : ''}
      </button>`;
    })
    .join('');

  const selectedChance = Number(chances[approach] ?? 0);

  els.missionPanel.innerHTML = `
    <div class="mission-head">
      ${sceneTag(chapter.scene)}
      <span class="chip">Capítulo ${chapter.chapter} de ${journey.totalMissions}</span>
      <span class="chip">${escapeHtml(difficultyLabel(chapter.difficulty))}</span>
    </div>
    <h2 class="mission-title">${escapeHtml(chapter.title)}</h2>
    <p class="mission-enemy">Enfrentando: <strong>${escapeHtml(chapter.enemy)}</strong></p>
    <p class="mission-intro">${escapeHtml(chapter.intro)}</p>

    <div class="mission-meta">
      <div class="meta-box">
        <span>
          <span class="meta-box__label">Dificuldade</span>
          <span class="meta-box__value">${difficultyMeter(chapter.difficulty)} ${chapter.difficulty}/10</span>
        </span>
      </div>
      <div class="meta-box meta-box--gold">
        <span>
          <span class="meta-box__label">Recompensa</span>
          <span class="meta-box__value"><svg class="icon" aria-hidden="true"><use href="#i-gem"></use></svg>${formatNumber(
            chapter.reward
          )} gemas</span>
        </span>
      </div>
    </div>

    <div class="approach">
      <p class="approach__title">Escolha sua abordagem</p>
      <div class="approach-grid" role="radiogroup" aria-label="Abordagem da fase">
        ${approaches}
      </div>
      <div class="play-cta">
        <button class="btn btn--primary" type="button" id="play-btn" ${state.playing ? 'disabled' : ''}>
          <span class="spinner" aria-hidden="true" ${state.playing ? '' : 'hidden'}></span>
          <svg class="icon" aria-hidden="true"><use href="#i-dice"></use></svg>
          <span>${state.playing ? 'Rolando o dado…' : 'Rolar o dado'}</span>
        </button>
        <p class="play-cta__hint">
          Chance com <strong>${escapeHtml(challengeByKey(approach).name)}</strong>:
          <strong>${selectedChance}%</strong>. Vitória rende ${formatNumber(chapter.reward)} gemas e abre
          o próximo capítulo; derrota custa 1 vida.
        </p>
      </div>
    </div>`;
}

function renderAttempts() {
  const attempts = state.journey?.attempts ?? [];

  if (!attempts.length) {
    els.attemptsSummary.textContent = 'Ainda não há jogadas registradas para este aventureiro.';
    els.attemptsList.innerHTML = `<li class="empty-inline">Role o dado na fase atual para começar o diário de bordo.</li>`;
    return;
  }

  els.attemptsSummary.textContent = `${attempts.length} ${pluralize(
    attempts.length,
    'jogada recente',
    'jogadas recentes'
  )}`;

  els.attemptsList.innerHTML = attempts
    .map((attempt) => {
      const win = attempt.result === 'vitoria';
      return `<li class="attempt attempt--${win ? 'vitoria' : 'derrota'}">
        <span class="attempt__icon"><svg class="icon" aria-hidden="true"><use href="#i-${
          win ? 'check' : 'alert'
        }"></use></svg></span>
        <div class="attempt__body">
          <span class="attempt__title">${escapeHtml(attempt.missionTitle)}</span>
          <span class="attempt__meta">Dado ${attempt.roll} · chance ${attempt.chance}% · ${formatDateTime(
            attempt.createdAt
          )}</span>
        </div>
        <span class="attempt__result">${win ? `+${attempt.gems} gemas` : '−1 vida'}</span>
      </li>`;
    })
    .join('');
}

function renderPlayers() {
  const hasPlayers = state.players.length > 0;
  els.playersEmpty.hidden = hasPlayers;

  els.playerGrid.innerHTML = state.players
    .map((player) => {
      const avatar = avatarByKey(player.avatar);
      const total = player.totalMissions ?? 0;
      const progress = player.progress ?? 0;
      const percent = total > 0 ? Math.round((progress / total) * 100) : 0;
      const rank = playerRank(player.id);
      const selected = player.id === state.selectedPlayerId;
      return `<article class="player-card${selected ? ' is-selected' : ''}">
        <div class="player-card__top">
          ${avatarArt(avatar, 'lg')}
          <div class="player-card__id">
            <h2 class="player-card__name">${escapeHtml(player.name)}</h2>
            <p class="player-card__role">${escapeHtml(avatar.name)} · ${escapeHtml(avatar.role)}</p>
            <div style="margin-top:6px">${statusBadge(player.status)}</div>
          </div>
        </div>

        <div class="player-card__stats">
          <span class="player-card__stat">${hearts(player.lives, state.meta.maxLives || 3)}</span>
          <span class="player-card__stat">${gemPill(player.gems)}</span>
          <span class="player-card__stat"><svg class="icon" style="width:14px;height:14px" aria-hidden="true"><use href="#i-trophy"></use></svg>#${rank ?? '—'}</span>
        </div>

        <div class="player-card__progress">
          <div class="player-card__progress-label">
            <span>${progress}/${total} capítulos</span>
            <span>${percent}%</span>
          </div>
          <div class="progress"><span class="progress__bar" style="width:${percent}%"></span></div>
        </div>

        <div class="player-card__actions">
          <button class="btn btn--primary btn--sm" type="button" data-action="play-player" data-id="${player.id}">
            <svg class="icon" aria-hidden="true"><use href="#i-play"></use></svg>
            Jogar
          </button>
          <button class="icon-btn icon-btn--sm" type="button" data-action="edit-player" data-id="${player.id}" title="Editar" aria-label="Editar ${escapeHtml(player.name)}">
            <svg class="icon" aria-hidden="true"><use href="#i-edit"></use></svg>
          </button>
          <button class="icon-btn icon-btn--sm icon-btn--gold" type="button" data-action="reset-player" data-id="${player.id}" title="Reiniciar jornada" aria-label="Reiniciar jornada de ${escapeHtml(player.name)}">
            <svg class="icon" aria-hidden="true"><use href="#i-refresh"></use></svg>
          </button>
          <button class="icon-btn icon-btn--sm icon-btn--danger" type="button" data-action="delete-player" data-id="${player.id}" title="Excluir" aria-label="Excluir ${escapeHtml(player.name)}">
            <svg class="icon" aria-hidden="true"><use href="#i-trash"></use></svg>
          </button>
        </div>
      </article>`;
    })
    .join('');
}

function renderMissions() {
  const hasMissions = state.missions.length > 0;
  els.missionsEmpty.hidden = hasMissions;

  els.missionList.innerHTML = state.missions
    .map((mission) => {
      return `<article class="mission-card${mission.isActive ? '' : ' is-inactive'}">
        <div class="mission-card__order" aria-hidden="true">${mission.orderIndex}</div>
        <div class="mission-card__body">
          <div class="mission-card__meta">
            ${sceneTag(mission.scene)}
            ${challengeChip(mission.challenge)}
            <span class="chip">${difficultyMeter(mission.difficulty)} ${mission.difficulty}/10</span>
            <span class="chip chip--gold"><svg class="icon" style="width:12px;height:12px" aria-hidden="true"><use href="#i-gem"></use></svg>+${formatNumber(
              mission.reward
            )}</span>
            ${mission.isActive ? '' : '<span class="chip chip--muted">Inativa</span>'}
          </div>
          <h2 class="mission-card__title">${escapeHtml(mission.title)}</h2>
          <p class="mission-card__enemy">${escapeHtml(mission.enemy)}</p>
          <p class="mission-card__intro">${escapeHtml(mission.intro)}</p>
        </div>
        <div class="mission-card__actions">
          <button class="btn btn--ghost btn--sm${mission.isActive ? ' is-on' : ''}" type="button" data-action="toggle-mission" data-id="${mission.id}">
            ${mission.isActive ? 'Desativar' : 'Ativar'}
          </button>
          <button class="icon-btn icon-btn--sm" type="button" data-action="edit-mission" data-id="${mission.id}" title="Editar fase" aria-label="Editar ${escapeHtml(mission.title)}">
            <svg class="icon" aria-hidden="true"><use href="#i-edit"></use></svg>
          </button>
          <button class="icon-btn icon-btn--sm icon-btn--danger" type="button" data-action="delete-mission" data-id="${mission.id}" title="Excluir fase" aria-label="Excluir ${escapeHtml(mission.title)}">
            <svg class="icon" aria-hidden="true"><use href="#i-trash"></use></svg>
          </button>
        </div>
      </article>`;
    })
    .join('');
}

function renderRanking() {
  const ranking = state.stats?.ranking?.length
    ? state.stats.ranking
    : state.players;

  const totals = state.stats?.totals ?? {
    players: state.players.length,
    missions: state.missions.filter((mission) => mission.isActive).length,
    gems: state.players.reduce((sum, player) => sum + player.gems, 0),
    wins: 0
  };

  els.rankStats.innerHTML = `
    <div class="rank-stat">
      <span class="rank-stat__label">Aventureiros</span>
      <span class="rank-stat__value"><svg class="icon" aria-hidden="true"><use href="#i-user"></use></svg>${formatNumber(
        totals.players
      )}</span>
    </div>
    <div class="rank-stat">
      <span class="rank-stat__label">Fases ativas</span>
      <span class="rank-stat__value"><svg class="icon" aria-hidden="true"><use href="#i-map"></use></svg>${formatNumber(
        totals.missions
      )}</span>
    </div>
    <div class="rank-stat">
      <span class="rank-stat__label">Gemas em jogo</span>
      <span class="rank-stat__value"><svg class="icon" aria-hidden="true"><use href="#i-gem"></use></svg>${formatNumber(
        totals.gems
      )}</span>
    </div>
    <div class="rank-stat">
      <span class="rank-stat__label">Vitórias registradas</span>
      <span class="rank-stat__value"><svg class="icon" aria-hidden="true"><use href="#i-trophy"></use></svg>${formatNumber(
        totals.wins
      )}</span>
    </div>`;

  const top = ranking.slice(0, 3);
  els.podium.hidden = top.length === 0;
  els.podium.innerHTML = top
    .map((player, index) => {
      const position = index + 1;
      const avatar = avatarByKey(player.avatar);
      const percent = player.percent ?? 0;
      return `<article class="podium__item podium__item--${position}">
        <span class="podium__rank">${
          position === 1
            ? '<svg class="icon" style="width:14px;height:14px" aria-hidden="true"><use href="#i-trophy"></use></svg>'
            : ''
        }${position}º lugar</span>
        ${avatarArt(avatar, 'xl')}
        <p class="podium__name">${escapeHtml(player.name)}</p>
        <span class="podium__gems"><svg class="icon" aria-hidden="true"><use href="#i-gem"></use></svg>${formatNumber(
          player.gems
        )}</span>
        <div class="podium__progress">
          <div class="progress"><span class="progress__bar" style="width:${percent}%"></span></div>
        </div>
        <span class="chip">${player.progress}/${player.totalMissions} capítulos</span>
      </article>`;
    })
    .join('');

  els.rankingEmpty.hidden = ranking.length > 0;
  els.rankList.innerHTML = ranking
    .map((player, index) => {
      const avatar = avatarByKey(player.avatar);
      return `<li class="rank-row">
        <span class="rank-row__pos">${index + 1}</span>
        ${avatarArt(avatar, 'sm')}
        <div class="rank-row__player">
          <span>
            <span class="rank-row__name">${escapeHtml(player.name)}</span>
            <span class="rank-row__role">${escapeHtml(avatar.name)}</span>
          </span>
        </div>
        <div class="rank-row__stats">
          <span class="rank-row__stat" title="Gemas"><svg class="icon" aria-hidden="true"><use href="#i-gem"></use></svg>${formatNumber(
            player.gems
          )}</span>
          <span class="rank-row__stat rank-row__stat--chapters" title="Capítulos"><svg class="icon" aria-hidden="true"><use href="#i-map"></use></svg>${player.progress}/${player.totalMissions}</span>
          <span class="rank-row__stat rank-row__stat--lives" title="Vidas">${hearts(
            player.lives,
            state.meta.maxLives || 3
          )}</span>
          ${statusBadge(player.status)}
        </div>
      </li>`;
    })
    .join('');
}

/* -------------------------------- formulários ------------------------------ */

const playerErrorMap = {
  name: { error: '#error-player-name', field: true },
  avatar: { error: '#error-player-avatar', field: true }
};

const missionErrorMap = {
  title: { error: '#error-mission-title', field: true },
  scene: { error: '#error-mission-scene', field: true },
  enemy: { error: '#error-mission-enemy', field: true },
  challenge: { error: '#error-mission-challenge', field: true },
  difficulty: { error: '#error-mission-difficulty', field: true },
  reward: { error: '#error-mission-reward', field: true },
  orderIndex: { error: '#error-mission-order', field: true },
  intro: { error: '#error-mission-intro', field: true },
  successText: { error: '#error-mission-success', field: true },
  failureText: { error: '#error-mission-failure', field: true }
};

function clearFormErrors(map, formError) {
  for (const key of Object.keys(map)) {
    const node = $(map[key].error);
    if (node) node.textContent = '';
  }
  $$('.field.has-error').forEach((field) => field.classList.remove('has-error'));
  if (formError) {
    formError.hidden = true;
    formError.textContent = '';
  }
}

function showFieldErrors(map, fields = {}, formError) {
  let firstField = null;
  for (const [key, message] of Object.entries(fields)) {
    const target = map[key];
    if (!target) continue;
    const node = $(target.error);
    if (!node) continue;
    node.textContent = message;
    const field = node.closest('.field');
    if (field) {
      field.classList.add('has-error');
      firstField = firstField || field;
    }
  }
  if (firstField) {
    firstField.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  if (formError) formError.hidden = true;
}

function renderAvatarPicker() {
  els.avatarPicker.innerHTML = state.meta.avatars
    .map((avatar) => {
      const selected = avatar.key === state.pickingAvatar;
      return `<button class="avatar-option${selected ? ' is-selected' : ''}" type="button"
                data-avatar="${avatar.key}" role="radio" aria-checked="${selected}">
        <span class="avatar-option__check"><svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg></span>
        ${avatarArt(avatar, 'md')}
        <span class="avatar-option__name">${escapeHtml(avatar.name)}</span>
        <span class="avatar-option__role">${escapeHtml(avatar.role)}</span>
        <span class="avatar-option__attrs">
          <span>FOR <b>${avatar.attributes.forca}</b></span>
          <span>AGI <b>${avatar.attributes.agilidade}</b></span>
          <span>CON <b>${avatar.attributes.conhecimento}</b></span>
        </span>
      </button>`;
    })
    .join('');
}

function renderChallengePicker() {
  els.challengePicker.innerHTML = state.meta.challenges
    .map((challenge) => {
      const selected = challenge.key === state.pickingChallenge;
      return `<button class="challenge-option${selected ? ' is-selected' : ''}" type="button"
                data-challenge="${challenge.key}" role="radio" aria-checked="${selected}">
        <svg class="icon" aria-hidden="true"><use href="#i-${escapeHtml(challenge.icon)}"></use></svg>
        <span class="challenge-option__name">${escapeHtml(challenge.name)}</span>
        <span class="challenge-option__desc">${escapeHtml(challenge.description)}</span>
      </button>`;
    })
    .join('');
}

function fillSceneOptions() {
  els.missionScene.innerHTML =
    '<option value="">Selecione…</option>' +
    state.meta.scenes
      .map(
        (scene) =>
          `<option value="${escapeHtml(scene.key)}">${escapeHtml(scene.name)}</option>`
      )
      .join('');
}

function openPlayerDialog(player = null) {
  state.editingPlayer = player?.id ?? null;
  state.pickingAvatar = player?.avatar || state.meta.avatars[0]?.key || 'smolder';

  els.playerForm.reset();
  clearFormErrors(playerErrorMap, els.playerFormError);
  els.playerId.value = player ? String(player.id) : '';
  els.playerName.value = player?.name ?? '';
  els.playerDialogTitle.textContent = player ? 'Editar aventureiro' : 'Novo aventureiro';
  els.playerDialogEyebrow.textContent = player ? 'Atualizar registro' : 'Novo registro';
  els.playerSubmit.querySelector('.btn__label').textContent = player
    ? 'Salvar alterações'
    : 'Criar aventureiro';

  renderAvatarPicker();
  els.playerDialog.showModal();
  setTimeout(() => els.playerName.focus(), 80);
}

function updateCounters() {
  const intro = els.missionIntro.value.length;
  const success = els.missionSuccess.value.length;
  const failure = els.missionFailure.value.length;
  $('#intro-count').textContent = `${intro}/900`;
  $('#success-count').textContent = `${success}/900`;
  $('#failure-count').textContent = `${failure}/900`;
}

function openMissionDialog(mission = null) {
  state.editingMission = mission?.id ?? null;
  state.pickingChallenge = mission?.challenge || 'conhecimento';

  els.missionForm.reset();
  clearFormErrors(missionErrorMap, els.missionFormError);
  fillSceneOptions();

  const nextOrder =
    state.missions.reduce((max, item) => Math.max(max, item.orderIndex), 0) + 1;

  els.missionId.value = mission ? String(mission.id) : '';
  els.missionTitle.value = mission?.title ?? '';
  els.missionScene.value = mission?.scene ?? 'deserto';
  els.missionEnemy.value = mission?.enemy ?? '';
  els.missionDifficulty.value = String(mission?.difficulty ?? 3);
  els.difficultyOutput.textContent = String(mission?.difficulty ?? 3);
  els.missionReward.value = String(mission?.reward ?? 10);
  els.missionOrder.value = mission ? String(mission.orderIndex) : String(nextOrder);
  els.missionActive.checked = mission ? mission.isActive : true;
  els.missionIntro.value = mission?.intro ?? '';
  els.missionSuccess.value = mission?.successText ?? '';
  els.missionFailure.value = mission?.failureText ?? '';
  updateCounters();

  els.missionDialogTitle.textContent = mission ? 'Editar fase' : 'Nova fase da história';
  els.missionDialogEyebrow.textContent = mission ? 'Atualizar capítulo' : 'Novo capítulo';
  els.missionSubmit.querySelector('.btn__label').textContent = mission
    ? 'Salvar alterações'
    : 'Criar fase';

  renderChallengePicker();
  els.missionDialog.showModal();
  setTimeout(() => els.missionTitle.focus(), 80);
}

/* ------------------------------- submit players ---------------------------- */

function validatePlayerPayload(payload) {
  const errors = {};
  const name = payload.name.trim();
  if (name.length < 2) errors.name = 'Informe um nome com pelo menos 2 caracteres.';
  else if (name.length > 40) errors.name = 'O nome deve ter até 40 caracteres.';
  if (!state.meta.avatars.some((avatar) => avatar.key === payload.avatar)) {
    errors.avatar = 'Escolha um dos avatares disponíveis.';
  }
  return errors;
}

function setPlayerSubmitting(value) {
  state.submittingPlayer = value;
  els.playerSubmit.disabled = value;
  const spinner = els.playerSubmit.querySelector('.spinner');
  const icon = els.playerSubmit.querySelector('.btn__icon');
  if (spinner) spinner.hidden = !value;
  if (icon) icon.hidden = value;
  $$('#player-dialog [data-close]').forEach((button) => {
    button.disabled = value;
  });
}

async function handlePlayerSubmit(event) {
  event.preventDefault();
  if (state.submittingPlayer) return;

  clearFormErrors(playerErrorMap, els.playerFormError);

  const payload = {
    name: els.playerName.value.trim(),
    avatar: state.pickingAvatar
  };

  const errors = validatePlayerPayload(payload);
  if (Object.keys(errors).length > 0) {
    showFieldErrors(playerErrorMap, errors, els.playerFormError);
    return;
  }

  const editingId = state.editingPlayer;
  setPlayerSubmitting(true);

  try {
    const saved = editingId
      ? await api.players.update(editingId, payload)
      : await api.players.create(payload);

    els.playerDialog.close();
    await loadCore();

    if (editingId) {
      if (state.selectedPlayerId === editingId) {
        await loadJourney(editingId);
      }
      renderAll();
      toast('success', 'Aventureiro atualizado', `${saved.name} está pronto para o tabuleiro.`);
    } else {
      renderAll();
      await selectPlayer(saved.id);
      toast('success', 'Aventureiro criado', `${saved.name} entrou no jogo com 3 vidas.`);
    }
    updateHealth(true);
  } catch (error) {
    if (error instanceof ApiError && error.fields) {
      showFieldErrors(playerErrorMap, error.fields, els.playerFormError);
      toast('error', 'Verifique os campos destacados', error.message);
    } else {
      toast('error', 'Não foi possível salvar', error.message);
    }
  } finally {
    setPlayerSubmitting(false);
  }
}

/* -------------------------------- submit fases ----------------------------- */

function validateMissionPayload(payload) {
  const errors = {};
  if (payload.title.trim().length < 2) errors.title = 'Dê um título para a fase.';
  else if (payload.title.trim().length > 80) errors.title = 'O título deve ter até 80 caracteres.';

  if (!state.meta.scenes.some((scene) => scene.key === payload.scene)) {
    errors.scene = 'Escolha um cenário válido.';
  }

  if (payload.enemy.trim().length < 2) errors.enemy = 'Informe o inimigo ou obstáculo.';
  else if (payload.enemy.trim().length > 60) errors.enemy = 'O inimigo deve ter até 60 caracteres.';

  if (!state.meta.challenges.some((challenge) => challenge.key === payload.challenge)) {
    errors.challenge = 'Escolha o desafio recomendado.';
  }

  const difficulty = Number(payload.difficulty);
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 10) {
    errors.difficulty = 'A dificuldade deve ser de 1 a 10.';
  }

  const reward = Number(payload.reward);
  if (!Number.isInteger(reward) || reward < 0 || reward > 1000) {
    errors.reward = 'A recompensa deve estar entre 0 e 1000 gemas.';
  }

  if (payload.orderIndex !== undefined) {
    const order = Number(payload.orderIndex);
    if (!Number.isInteger(order) || order < 1 || order > 99) {
      errors.orderIndex = 'A posição deve ser de 1 a 99.';
    }
  }

  if (payload.intro.trim().length < 10) errors.intro = 'Escreva a introdução (mínimo 10 caracteres).';
  if (payload.successText.trim().length < 10)
    errors.successText = 'Escreva o texto de vitória (mínimo 10 caracteres).';
  if (payload.failureText.trim().length < 10)
    errors.failureText = 'Escreva o texto de derrota (mínimo 10 caracteres).';

  return errors;
}

function setMissionSubmitting(value) {
  state.submittingMission = value;
  els.missionSubmit.disabled = value;
  const spinner = els.missionSubmit.querySelector('.spinner');
  const icon = els.missionSubmit.querySelector('.btn__icon');
  if (spinner) spinner.hidden = !value;
  if (icon) icon.hidden = value;
  $$('#mission-dialog [data-close]').forEach((button) => {
    button.disabled = value;
  });
}

async function handleMissionSubmit(event) {
  event.preventDefault();
  if (state.submittingMission) return;

  clearFormErrors(missionErrorMap, els.missionFormError);

  const payload = {
    title: els.missionTitle.value.trim(),
    scene: els.missionScene.value,
    enemy: els.missionEnemy.value.trim(),
    challenge: state.pickingChallenge,
    difficulty: Number(els.missionDifficulty.value),
    reward: Number(els.missionReward.value),
    orderIndex: els.missionOrder.value.trim() === '' ? undefined : Number(els.missionOrder.value),
    isActive: els.missionActive.checked,
    intro: els.missionIntro.value.trim(),
    successText: els.missionSuccess.value.trim(),
    failureText: els.missionFailure.value.trim()
  };

  const errors = validateMissionPayload(payload);
  if (Object.keys(errors).length > 0) {
    showFieldErrors(missionErrorMap, errors, els.missionFormError);
    return;
  }

  const editingId = state.editingMission;
  setMissionSubmitting(true);

  try {
    const saved = editingId
      ? await api.missions.update(editingId, payload)
      : await api.missions.create(payload);

    els.missionDialog.close();
    await loadCore();
    if (state.selectedPlayerId) {
      try {
        await loadJourney(state.selectedPlayerId);
      } catch {
        /* a jornada será recarregada no próximo clique */
      }
    }
    renderAll();
    updateHealth(true);
    toast(
      'success',
      editingId ? 'Fase atualizada' : 'Fase criada',
      `${saved.title} ${editingId ? 'foi atualizada' : 'entrou na campanha'}.`
    );
  } catch (error) {
    if (error instanceof ApiError && error.fields) {
      showFieldErrors(missionErrorMap, error.fields, els.missionFormError);
      toast('error', 'Verifique os campos destacados', error.message);
    } else {
      toast('error', 'Não foi possível salvar a fase', error.message);
    }
  } finally {
    setMissionSubmitting(false);
  }
}

/* --------------------------------- confirmar ------------------------------- */

function openConfirm({ title, text, confirmLabel, tone = 'danger', icon = 'alert', action }) {
  state.confirmAction = action;
  els.confirmTitle.textContent = title;
  els.confirmText.innerHTML = text;
  els.confirmIcon.className = `confirm-icon${tone === 'gold' ? ' is-gold' : ''}`;
  els.confirmIcon.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-${icon}"></use></svg>`;
  els.confirmAction.querySelector('.btn__label').textContent = confirmLabel;
  els.confirmAction.className = `btn ${tone === 'gold' ? 'btn--primary' : 'btn--danger'}`;
  els.confirmAction.disabled = false;
  els.confirmDialog.showModal();
}

function setConfirming(value) {
  state.confirming = value;
  els.confirmAction.disabled = value;
  const spinner = els.confirmAction.querySelector('.spinner');
  if (spinner) spinner.hidden = !value;
  $$('#confirm-dialog [data-close]').forEach((button) => {
    button.disabled = value;
  });
}

async function handleConfirm() {
  if (!state.confirmAction || state.confirming) return;
  setConfirming(true);
  try {
    await state.confirmAction();
    els.confirmDialog.close();
  } catch (error) {
    toast('error', 'Não foi possível concluir', error.message);
  } finally {
    setConfirming(false);
  }
}

/* ---------------------------------- ações ---------------------------------- */

function resetPlayer(player) {
  openConfirm({
    title: `Reiniciar a jornada de ${player.name}?`,
    text: `As vidas voltam para <strong>${state.meta.maxLives || 3}</strong>, as gemas e o progresso zeram e o diário de bordo é apagado. O aventureiro continua cadastrado.`,
    confirmLabel: 'Reiniciar jornada',
    tone: 'gold',
    icon: 'refresh',
    action: async () => {
      const journey = await api.players.reset(player.id);
      if (state.selectedPlayerId === player.id) {
        state.journey = journey;
        state.approach = journey.current?.challenge ?? null;
      }
      await refreshData();
      toast('success', 'Jornada reiniciada', `${player.name} voltou ao deserto.`);
    }
  });
}

function deletePlayer(player) {
  openConfirm({
    title: `Excluir ${player.name}?`,
    text: 'O aventureiro e todo o diário de bordo serão removidos do banco de dados. Esta ação não pode ser desfeita.',
    confirmLabel: 'Excluir aventureiro',
    tone: 'danger',
    icon: 'trash',
    action: async () => {
      await api.players.remove(player.id);
      if (state.selectedPlayerId === player.id) {
        state.selectedPlayerId = null;
        state.journey = null;
      }
      await loadCore();
      renderAll();
      if (state.selectedPlayerId) {
        await selectPlayer(state.selectedPlayerId, { scroll: false });
      }
      updateHealth(true);
      toast('success', 'Aventureiro excluído', `${player.name} saiu do tabuleiro.`);
    }
  });
}

async function toggleMission(mission) {
  const payload = {
    title: mission.title,
    scene: mission.scene,
    enemy: mission.enemy,
    challenge: mission.challenge,
    difficulty: mission.difficulty,
    reward: mission.reward,
    orderIndex: mission.orderIndex,
    isActive: !mission.isActive,
    intro: mission.intro,
    successText: mission.successText,
    failureText: mission.failureText
  };

  try {
    await api.missions.update(mission.id, payload);
    await refreshData({ reloadJourney: true });
    toast(
      'success',
      mission.isActive ? 'Fase desativada' : 'Fase ativada',
      `${mission.title} ${mission.isActive ? 'saiu da campanha' : 'entrou na campanha'}.`
    );
  } catch (error) {
    toast('error', 'Não foi possível alterar a fase', error.message);
  }
}

function deleteMission(mission) {
  openConfirm({
    title: `Excluir a fase "${mission.title}"?`,
    text: 'A fase será removida do banco de dados. O progresso dos aventureiros é ajustado caso a campanha fique menor.',
    confirmLabel: 'Excluir fase',
    tone: 'danger',
    icon: 'trash',
    action: async () => {
      await api.missions.remove(mission.id);
      await refreshData({ reloadJourney: true });
      toast('success', 'Fase excluída', `${mission.title} saiu da campanha.`);
    }
  });
}

/* ----------------------------------- jogar --------------------------------- */

async function handlePlay() {
  if (state.playing) return;

  const journey = state.journey;
  const mission = journey?.current;
  const approach = state.approach;
  if (!journey || !mission || !approach) return;

  state.playing = true;
  renderMission();

  try {
    const result = await api.players.play(state.selectedPlayerId, {
      approach,
      missionId: mission.id
    });

    state.journey = result.journey;
    state.playing = false;
    state.approach = result.journey.current?.challenge ?? null;
    renderAll();

    await showResult(result.outcome, mission);

    await loadCore();
    renderAll();
    updateHealth(true);
  } catch (error) {
    state.playing = false;
    renderMission();
    toast('error', 'A jogada não aconteceu', error.message);
  }
}

async function showResult(outcome, mission) {
  state.resultReady = false;
  els.resultContinue.disabled = true;

  els.resultScene.textContent = `Capítulo ${mission.orderIndex ?? ''} · ${mission.title}`;
  els.resultChance.textContent = `Abordagem: ${outcome.approachName} · chance de ${outcome.chance}%`;
  els.resultTitle.className = 'dialog__title result__title';
  els.resultTitle.textContent = 'Rolando o dado…';
  els.resultNarrative.textContent = 'Segure a respiração. O tabuleiro está decidindo.';
  els.resultRewards.innerHTML = '';
  els.resultNumber.textContent = '--';
  els.resultDice.className = 'dice is-rolling';

  els.resultDialog.showModal();

  for (let index = 0; index < 14; index += 1) {
    els.resultNumber.textContent = String(1 + Math.floor(Math.random() * 100));
    await sleep(42 + index * 4);
  }

  els.resultNumber.textContent = String(outcome.roll);
  els.resultDice.className = `dice ${outcome.success ? 'is-success' : 'is-fail'}`;
  els.resultTitle.textContent = outcome.victory
    ? 'Jumanji vencido!'
    : outcome.success
      ? 'Vitória!'
      : outcome.eliminated
        ? 'Fim da jornada'
        : 'Derrota…';
  els.resultTitle.classList.add(
    outcome.success ? 'result__title--success' : 'result__title--fail'
  );
  els.resultNarrative.textContent = outcome.narrative;

  const rewards = [];
  if (outcome.success) {
    rewards.push(
      `<li class="is-gold"><svg class="icon" aria-hidden="true"><use href="#i-gem"></use></svg>+${outcome.gemsEarned} gemas</li>`
    );
    rewards.push(
      `<li class="is-jade"><svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg>Capítulo concluído</li>`
    );
  } else {
    rewards.push(
      `<li class="is-danger"><svg class="icon" aria-hidden="true"><use href="#i-heart"></use></svg>−1 vida</li>`
    );
  }
  if (outcome.eliminated) {
    rewards.push(
      `<li class="is-danger"><svg class="icon" aria-hidden="true"><use href="#i-skull"></use></svg>Sem vidas: jornada encerrada</li>`
    );
  }
  if (outcome.victory) {
    rewards.push(
      `<li class="is-gold"><svg class="icon" aria-hidden="true"><use href="#i-trophy"></use></svg>Jumanji vencido</li>`
    );
  }
  if (outcome.recommended) {
    rewards.push(
      `<li><svg class="icon" aria-hidden="true"><use href="#i-compass"></use></svg>Abordagem recomendada</li>`
    );
  }

  els.resultRewards.innerHTML = rewards.join('');
  state.resultReady = true;
  els.resultContinue.disabled = false;
  els.resultContinue.focus();
}

/* ---------------------------------- toasts --------------------------------- */

const toastIcons = { success: 'check', error: 'alert', info: 'compass' };

function toast(type, title, message = '', timeout = 4800) {
  const node = document.createElement('div');
  node.className = `toast toast--${type}`;

  const icon = document.createElement('span');
  icon.className = 'toast__icon';
  icon.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-${
    toastIcons[type] || 'check'
  }"></use></svg>`;

  const body = document.createElement('div');
  body.className = 'toast__body';
  const heading = document.createElement('span');
  heading.className = 'toast__title';
  heading.textContent = title;
  body.append(heading);
  if (message) {
    const text = document.createElement('p');
    text.textContent = message;
    body.append(text);
  }

  const close = document.createElement('button');
  close.className = 'toast__close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Fechar aviso');
  close.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-close"></use></svg>';
  close.addEventListener('click', () => dismissToast(node));

  node.append(icon, body, close);
  els.toasts.append(node);

  while (els.toasts.children.length > 3) {
    els.toasts.firstElementChild?.remove();
  }

  if (timeout > 0) setTimeout(() => dismissToast(node), timeout);
}

function dismissToast(node) {
  if (!node.isConnected) return;
  node.classList.add('is-leaving');
  setTimeout(() => node.remove(), 220);
}

/* ---------------------------------- saúde ---------------------------------- */

async function updateHealth(silent = false) {
  if (!navigator.onLine) {
    els.dbStatusText.textContent = 'offline';
    els.dbStatus.className = 'status';
    return;
  }
  try {
    const health = await api.health();
    const database = health.driver === 'postgres' ? 'PostgreSQL' : 'SQLite local';
    els.dbStatusText.textContent = `${database} • ${health.players} aventureiros • online`;
    els.dbStatus.className = 'status status--ok';
  } catch {
    els.dbStatusText.textContent = 'API indisponível';
    els.dbStatus.className = 'status status--error';
    if (!silent) {
      toast('error', 'API indisponível', 'Não foi possível consultar o status do servidor.');
    }
  }
}

function updateConnectivity() {
  const online = navigator.onLine;
  const banner = $('#offline-banner');
  if (banner) banner.hidden = online;
  if (!online && els.dbStatusText) {
    els.dbStatusText.textContent = 'offline';
    els.dbStatus.className = 'status';
  }
}

/* ---------------------------------- eventos -------------------------------- */

function bindEvents() {
  els.themeBtn.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  });

  $$('.nav__link').forEach((button) => {
    button.addEventListener('click', () => {
      setView(button.dataset.view);
      if (button.dataset.view === 'jogo') startJungleGame();
    });
  });

  window.addEventListener('hashchange', () => {
    setView(viewFromHash(), { updateHash: false, scroll: false });
  });

  els.playerForm.addEventListener('submit', handlePlayerSubmit);
  els.missionForm.addEventListener('submit', handleMissionSubmit);

  els.avatarPicker.addEventListener('click', (event) => {
    const option = event.target.closest('[data-avatar]');
    if (!option) return;
    state.pickingAvatar = option.dataset.avatar;
    renderAvatarPicker();
  });

  els.challengePicker.addEventListener('click', (event) => {
    const option = event.target.closest('[data-challenge]');
    if (!option) return;
    state.pickingChallenge = option.dataset.challenge;
    renderChallengePicker();
  });

  els.playerForm.addEventListener('input', (event) => {
    const field = event.target.closest('.field');
    if (!field) return;
    field.classList.remove('has-error');
    const error = field.querySelector('.field__error');
    if (error) error.textContent = '';
  });

  els.missionForm.addEventListener('input', (event) => {
    const field = event.target.closest('.field');
    if (field) {
      field.classList.remove('has-error');
      const error = field.querySelector('.field__error');
      if (error) error.textContent = '';
    }
    updateCounters();
  });

  els.missionDifficulty.addEventListener('input', () => {
    els.difficultyOutput.textContent = els.missionDifficulty.value;
  });

  els.playerDialog.addEventListener('close', () => {
    state.editingPlayer = null;
    clearFormErrors(playerErrorMap, els.playerFormError);
  });

  els.missionDialog.addEventListener('close', () => {
    state.editingMission = null;
    clearFormErrors(missionErrorMap, els.missionFormError);
  });

  els.confirmDialog.addEventListener('close', () => {
    state.confirmAction = null;
    setConfirming(false);
  });

  els.confirmAction.addEventListener('click', handleConfirm);

  $$('[data-close]').forEach((button) => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.close);
      if (dialog?.open) dialog.close();
    });
  });

  for (const dialog of [els.playerDialog, els.missionDialog, els.confirmDialog]) {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  els.resultDialog.addEventListener('cancel', (event) => {
    if (!state.resultReady) event.preventDefault();
  });

  els.resultDialog.addEventListener('close', () => {
    state.resultReady = false;
  });

  els.resultContinue.addEventListener('click', () => {
    if (!state.resultReady) return;
    els.resultDialog.close();
  });

  document.addEventListener('click', (event) => {
    const actionNode = event.target.closest('[data-action]');
    const approachNode = event.target.closest('[data-approach]');
    const playNode = event.target.closest('#play-btn');

    if (approachNode) {
      state.approach = approachNode.dataset.approach;
      renderMission();
      return;
    }

    if (playNode) {
      handlePlay();
      return;
    }

    if (!actionNode) return;
    const action = actionNode.dataset.action;
    const id = actionNode.dataset.id ? Number(actionNode.dataset.id) : null;
    const player = state.players.find((item) => item.id === id);
    const mission = state.missions.find((item) => item.id === id);

    switch (action) {
      case 'new-player':
        openPlayerDialog();
        break;
      case 'edit-player':
        if (player) openPlayerDialog(player);
        break;
      case 'delete-player':
        if (player) deletePlayer(player);
        break;
      case 'reset-player':
        if (player) resetPlayer(player);
        break;
      case 'play-player':
        if (player) {
          setView('aventura');
          selectPlayer(player.id);
        }
        break;
      case 'select-player':
        if (player) selectPlayer(player.id, { scroll: false });
        break;
      case 'focus-mission':
        $('#mission-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      case 'play-game':
        setView('jogo');
        startJungleGame();
        break;
      case 'new-mission':
        openMissionDialog();
        break;
      case 'edit-mission':
        if (mission) openMissionDialog(mission);
        break;
      case 'delete-mission':
        if (mission) deleteMission(mission);
        break;
      case 'toggle-mission':
        if (mission) toggleMission(mission);
        break;
      case 'go-missions':
        setView('fases');
        break;
      default:
        break;
    }
  });

  window.addEventListener('online', () => {
    updateConnectivity();
    toast('success', 'Conexão restabelecida', 'Atualizando os dados do servidor…');
    refreshData({ reloadJourney: true });
  });

  window.addEventListener('offline', () => {
    updateConnectivity();
    toast('info', 'Você está offline', 'Os últimos dados carregados continuam disponíveis.', 6000);
  });

  window.addEventListener('app:toast', (event) => {
    const detail = event.detail || {};
    toast(detail.type || 'info', detail.title || '', detail.message || '', detail.timeout);
  });

  window.addEventListener('app:install-help', () => {
    toast(
      'info',
      'Instalar no celular',
      'No iPhone/iPad: toque em Compartilhar e depois em “Adicionar à Tela de Início”. No Android: menu do navegador → “Instalar app”.',
      9000
    );
  });
}

init();
