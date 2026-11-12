/**
 * API REST do Jumanji: A Última Fase.
 *
 * Aventureiros (CRUD)  → /api/players
 * Fases da história    → /api/missions
 * Jogo                 → /api/players/:id/journey  e  /api/players/:id/play
 * Ranking e painel     → /api/stats
 */
import { Router } from 'express';
import {
  driver,
  query,
  toAttempt,
  toDbBool,
  toMission,
  toPlayer
} from '../db.js';
import {
  AVATARS,
  CHALLENGES,
  MAX_LIVES,
  SCENES,
  chancesFor,
  computeChance,
  getChallenge,
  rollD100,
  statusOf
} from '../game.js';
import { VICTORY_TEXT } from '../seed.js';
import { validateMission, validatePlayer } from '../validate.js';

const router = Router();

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const notFound = (res, message = 'Registro não encontrado.') =>
  res.status(404).json({ error: message });

async function loadPlayers() {
  const rows = await query(
    'SELECT * FROM players ORDER BY gems DESC, progress DESC, name ASC'
  );
  return rows.map(toPlayer);
}

async function loadPlayer(id) {
  const rows = await query('SELECT * FROM players WHERE id = :id', { id });
  return rows.length > 0 ? toPlayer(rows[0]) : null;
}

async function loadMissions() {
  const rows = await query(
    'SELECT * FROM missions ORDER BY order_index ASC, id ASC'
  );
  return rows.map(toMission);
}

async function activeMissions() {
  return (await loadMissions()).filter((mission) => mission.isActive);
}

async function playerAttempts(id, limit = 8) {
  const rows = await query(
    `SELECT a.*, p.name AS player_name, p.avatar AS player_avatar
     FROM attempts a
     LEFT JOIN players p ON p.id = a.player_id
     WHERE a.player_id = :id
     ORDER BY a.id DESC
     LIMIT :limit`,
    { id, limit }
  );
  return rows.map(toAttempt);
}

function decoratePlayer(player, missionCount) {
  const progress = Math.min(player.progress, missionCount);
  const status = statusOf({ ...player, progress }, missionCount);
  return {
    ...player,
    progress,
    status,
    totalMissions: missionCount,
    percent: missionCount > 0 ? Math.round((progress / missionCount) * 100) : 0,
    remainingLives: player.lives
  };
}

function chapterOf(mission, index, progress, avatar) {
  const status =
    index < progress ? 'concluida' : index === progress ? 'atual' : 'bloqueada';
  return {
    ...mission,
    chapter: index + 1,
    status,
    chances: status === 'atual' ? chancesFor(avatar, mission) : null
  };
}

async function buildJourney(player, missions) {
  const active = missions.filter((mission) => mission.isActive);
  const progress = Math.min(player.progress, active.length);
  const decorated = decoratePlayer({ ...player, progress }, active.length);
  const chapters = active.map((mission, index) =>
    chapterOf(mission, index, progress, player.avatar)
  );
  return {
    player: decorated,
    chapters,
    current: chapters.find((chapter) => chapter.status === 'atual') || null,
    totalMissions: active.length,
    completed: progress,
    victory: decorated.status === 'lenda',
    epilogue: decorated.status === 'lenda' ? VICTORY_TEXT : null
  };
}

/* ---------------------------------- meta ---------------------------------- */

router.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const [missions, players] = await Promise.all([loadMissions(), loadPlayers()]);
    res.json({
      avatars: AVATARS,
      scenes: SCENES,
      challenges: CHALLENGES,
      maxLives: MAX_LIVES,
      counts: {
        missions: missions.filter((mission) => mission.isActive).length,
        totalMissions: missions.length,
        players: players.length
      }
    });
  })
);

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const [{ total: players }] = await query('SELECT COUNT(*) AS total FROM players');
    const [{ total: missions }] = await query('SELECT COUNT(*) AS total FROM missions');
    res.json({
      ok: true,
      driver,
      players: Number(players),
      missions: Number(missions)
    });
  })
);

/* ------------------------------- aventureiros ------------------------------ */

router.get(
  '/players',
  asyncHandler(async (req, res) => {
    const [players, missions] = await Promise.all([loadPlayers(), loadMissions()]);
    const activeCount = missions.filter((mission) => mission.isActive).length;
    const search = String(req.query.q ?? '').trim().toLowerCase();

    const items = players
      .filter((player) => !search || player.name.toLowerCase().includes(search))
      .map((player) => decoratePlayer(player, activeCount))
      .sort(
        (a, b) =>
          b.gems - a.gems ||
          b.progress - a.progress ||
          a.name.localeCompare(b.name, 'pt-BR')
      );

    res.json({ items, total: items.length });
  })
);

router.post(
  '/players',
  asyncHandler(async (req, res) => {
    const { value, errors } = validatePlayer(req.body);
    if (errors) {
      return res.status(422).json({ error: 'Verifique os campos destacados.', fields: errors });
    }

    const rows = await query(
      `INSERT INTO players (name, avatar, lives, gems, progress)
       VALUES (:name, :avatar, :lives, 0, 0)
       RETURNING *`,
      { ...value, lives: MAX_LIVES }
    );

    const missions = await loadMissions();
    const activeCount = missions.filter((mission) => mission.isActive).length;
    res.status(201).json(decoratePlayer(toPlayer(rows[0]), activeCount));
  })
);

router.get(
  '/players/:id/journey',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return notFound(res, 'Aventureiro não encontrado.');

    const [player, missions] = await Promise.all([loadPlayer(id), loadMissions()]);
    if (!player) return notFound(res, 'Aventureiro não encontrado.');

    const journey = await buildJourney(player, missions);
    journey.attempts = await playerAttempts(id);
    res.json(journey);
  })
);

router.get(
  '/players/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return notFound(res, 'Aventureiro não encontrado.');

    const [player, missions] = await Promise.all([loadPlayer(id), loadMissions()]);
    if (!player) return notFound(res, 'Aventureiro não encontrado.');

    const activeCount = missions.filter((mission) => mission.isActive).length;
    res.json(decoratePlayer(player, activeCount));
  })
);

router.put(
  '/players/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return notFound(res, 'Aventureiro não encontrado.');

    const existing = await loadPlayer(id);
    if (!existing) return notFound(res, 'Aventureiro não encontrado.');

    const { value, errors } = validatePlayer(req.body);
    if (errors) {
      return res.status(422).json({ error: 'Verifique os campos destacados.', fields: errors });
    }

    const rows = await query(
      `UPDATE players
       SET name = :name, avatar = :avatar, updated_at = CURRENT_TIMESTAMP
       WHERE id = :id
       RETURNING *`,
      { ...value, id }
    );

    const missions = await loadMissions();
    const activeCount = missions.filter((mission) => mission.isActive).length;
    res.json(decoratePlayer(toPlayer(rows[0]), activeCount));
  })
);

router.delete(
  '/players/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return notFound(res, 'Aventureiro não encontrado.');

    const rows = await query('DELETE FROM players WHERE id = :id RETURNING id', { id });
    if (rows.length === 0) return notFound(res, 'Aventureiro não encontrado.');
    res.json({ deleted: true, id });
  })
);

router.post(
  '/players/:id/reset',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return notFound(res, 'Aventureiro não encontrado.');

    const player = await loadPlayer(id);
    if (!player) return notFound(res, 'Aventureiro não encontrado.');

    await query(
      `UPDATE players
       SET lives = :lives, gems = 0, progress = 0, updated_at = CURRENT_TIMESTAMP
       WHERE id = :id`,
      { id, lives: MAX_LIVES }
    );
    await query('DELETE FROM attempts WHERE player_id = :id', { id });

    const missions = await loadMissions();
    const journey = await buildJourney(await loadPlayer(id), missions);
    journey.attempts = [];
    res.json(journey);
  })
);

/* ---------------------------------- jogo ---------------------------------- */

router.post(
  '/players/:id/play',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return notFound(res, 'Aventureiro não encontrado.');

    const player = await loadPlayer(id);
    if (!player) return notFound(res, 'Aventureiro não encontrado.');

    const approach = String(req.body?.approach ?? '').trim().toLowerCase();
    const challenge = getChallenge(approach);
    if (!challenge) {
      return res.status(422).json({
        error: 'Escolha uma abordagem válida.',
        fields: { approach: 'Use força, agilidade ou conhecimento.' }
      });
    }

    const missions = await loadMissions();
    const active = missions.filter((mission) => mission.isActive);
    const progress = Math.min(player.progress, active.length);

    if (player.lives <= 0) {
      return res.status(409).json({
        error: 'Você está sem vidas. Reinicie a jornada para jogar novamente.'
      });
    }
    if (progress >= active.length) {
      return res.status(409).json({ error: 'Você já concluiu todas as fases disponíveis.' });
    }

    const mission = active[progress];
    if (req.body?.missionId && Number(req.body.missionId) !== mission.id) {
      return res.status(409).json({ error: 'Esta fase ainda não está liberada.' });
    }

    const recommended = mission.challenge === approach;
    const chance = computeChance(player.avatar, approach, mission.difficulty, recommended);
    const roll = rollD100();
    const success = roll <= chance;

    const nextLives = success ? player.lives : Math.max(0, player.lives - 1);
    const nextGems = player.gems + (success ? mission.reward : 0);
    const nextProgress = success ? progress + 1 : progress;

    await query(
      `UPDATE players
       SET lives = :lives, gems = :gems, progress = :progress, updated_at = CURRENT_TIMESTAMP
       WHERE id = :id`,
      { id, lives: nextLives, gems: nextGems, progress: nextProgress }
    );

    await query(
      `INSERT INTO attempts
         (player_id, mission_id, mission_title, result, roll, chance, gems)
       VALUES
         (:playerId, :missionId, :missionTitle, :result, :roll, :chance, :gems)`,
      {
        playerId: id,
        missionId: mission.id,
        missionTitle: mission.title,
        result: success ? 'vitoria' : 'derrota',
        roll,
        chance,
        gems: success ? mission.reward : 0
      }
    );

    const updated = await loadPlayer(id);
    const journey = await buildJourney(updated, missions);
    journey.attempts = await playerAttempts(id);

    res.json({
      outcome: {
        success,
        roll,
        chance,
        approach,
        approachName: challenge.name,
        recommended,
        gemsEarned: success ? mission.reward : 0,
        livesLost: success ? 0 : 1,
        narrative: success ? mission.successText : mission.failureText,
        mission,
        eliminated: nextLives === 0,
        victory: journey.victory
      },
      journey
    });
  })
);

/* ---------------------------------- fases --------------------------------- */

router.get(
  '/missions',
  asyncHandler(async (_req, res) => {
    const missions = await loadMissions();
    res.json({ items: missions, total: missions.length, active: missions.filter((m) => m.isActive).length });
  })
);

router.post(
  '/missions',
  asyncHandler(async (req, res) => {
    const { value, errors } = validateMission(req.body);
    if (errors) {
      return res.status(422).json({ error: 'Verifique os campos destacados.', fields: errors });
    }

    let orderIndex = value.orderIndex;
    if (!orderIndex) {
      const [{ max }] = await query('SELECT COALESCE(MAX(order_index), 0) AS max FROM missions');
      orderIndex = Number(max) + 1;
    }

    const rows = await query(
      `INSERT INTO missions
         (order_index, title, scene, enemy, challenge, difficulty, reward,
          intro, success_text, failure_text, is_active)
       VALUES
         (:orderIndex, :title, :scene, :enemy, :challenge, :difficulty, :reward,
          :intro, :successText, :failureText, :isActive)
       RETURNING *`,
      {
        ...value,
        orderIndex,
        isActive: toDbBool(value.isActive)
      }
    );

    res.status(201).json(toMission(rows[0]));
  })
);

router.put(
  '/missions/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return notFound(res, 'Fase não encontrada.');

    const existing = await query('SELECT id FROM missions WHERE id = :id', { id });
    if (existing.length === 0) return notFound(res, 'Fase não encontrada.');

    const { value, errors } = validateMission(req.body);
    if (errors) {
      return res.status(422).json({ error: 'Verifique os campos destacados.', fields: errors });
    }

    const orderIndex = value.orderIndex ?? existing[0].order_index ?? 1;

    const rows = await query(
      `UPDATE missions
       SET order_index = :orderIndex, title = :title, scene = :scene, enemy = :enemy,
           challenge = :challenge, difficulty = :difficulty, reward = :reward,
           intro = :intro, success_text = :successText, failure_text = :failureText,
           is_active = :isActive, updated_at = CURRENT_TIMESTAMP
       WHERE id = :id
       RETURNING *`,
      { ...value, id, orderIndex, isActive: toDbBool(value.isActive) }
    );

    res.json(toMission(rows[0]));
  })
);

router.delete(
  '/missions/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return notFound(res, 'Fase não encontrada.');

    const rows = await query('DELETE FROM missions WHERE id = :id RETURNING id', { id });
    if (rows.length === 0) return notFound(res, 'Fase não encontrada.');

    // Ajusta o progresso dos aventureiros caso a jornada tenha ficado menor.
    const missions = await loadMissions();
    const activeCount = missions.filter((mission) => mission.isActive).length;
    await query('UPDATE players SET progress = :count WHERE progress > :count', {
      count: activeCount
    });

    res.json({ deleted: true, id });
  })
);

/* --------------------------------- ranking -------------------------------- */

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [players, missions, recentRows, winsRows, attemptsRows] = await Promise.all([
      loadPlayers(),
      loadMissions(),
      query(
        `SELECT a.*, p.name AS player_name, p.avatar AS player_avatar
         FROM attempts a
         LEFT JOIN players p ON p.id = a.player_id
         ORDER BY a.id DESC
         LIMIT 6`
      ),
      query("SELECT COUNT(*) AS total FROM attempts WHERE result = 'vitoria'"),
      query('SELECT COUNT(*) AS total FROM attempts')
    ]);

    const active = missions.filter((mission) => mission.isActive);
    const ranking = players
      .map((player) => decoratePlayer(player, active.length))
      .sort(
        (a, b) =>
          b.gems - a.gems ||
          b.progress - a.progress ||
          a.name.localeCompare(b.name, 'pt-BR')
      );

    res.json({
      totals: {
        players: players.length,
        missions: active.length,
        totalMissions: missions.length,
        gems: players.reduce((sum, player) => sum + player.gems, 0),
        attempts: Number(attemptsRows[0].total),
        wins: Number(winsRows[0].total),
        legends: ranking.filter((player) => player.status === 'lenda').length,
        eliminated: ranking.filter((player) => player.status === 'eliminado').length
      },
      ranking,
      leader: ranking[0] || null,
      recent: recentRows.map(toAttempt)
    });
  })
);

/* ---------------------------------- docs ---------------------------------- */

router.get('/', (_req, res) => {
  res.json({
    name: 'Jumanji: A Última Fase — API',
    version: '1.0.0',
    database: driver,
    endpoints: [
      'GET /api/health',
      'GET /api/meta',
      'GET /api/stats',
      'GET /api/players',
      'POST /api/players',
      'GET /api/players/:id',
      'PUT /api/players/:id',
      'DELETE /api/players/:id',
      'GET /api/players/:id/journey',
      'POST /api/players/:id/play',
      'POST /api/players/:id/reset',
      'GET /api/missions',
      'POST /api/missions',
      'PUT /api/missions/:id',
      'DELETE /api/missions/:id'
    ]
  });
});

router.use((_req, res) => {
  res.status(404).json({ error: 'Rota da API não encontrada.' });
});

export default router;
