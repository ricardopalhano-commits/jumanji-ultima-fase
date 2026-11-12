/**
 * Camada de acesso ao banco de dados do Jumanji: A Última Fase.
 *
 * - Em produção (Render) usa PostgreSQL via DATABASE_URL.
 * - Em desenvolvimento, sem DATABASE_URL, usa SQLite nativo do Node,
 *   gravando em ./data/jumanji.db.
 *
 * As consultas usam parâmetros nomeados (:nome) e são traduzidas para o
 * driver em uso, evitando SQL injection e mantendo o código portável.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_MISSIONS, DEMO_PLAYERS } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const connectionString = process.env.DATABASE_URL || '';
export const driver = connectionString ? 'postgres' : 'sqlite';

const NAMED_PARAM = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

let pool = null;
let sqlite = null;
let ready = null;

if (driver === 'postgres') {
  const pg = (await import('pg')).default;

  pg.types.setTypeParser(1082, (value) => value);
  pg.types.setTypeParser(1700, (value) => Number(value));
  pg.types.setTypeParser(20, (value) => Number(value));

  pool = new pg.Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000
  });
  pool.on('error', (error) => {
    console.error('[db] erro inesperado no pool do Postgres:', error.message);
  });
} else {
  let DatabaseSync;
  try {
    ({ DatabaseSync } = await import('node:sqlite'));
  } catch {
    throw new Error(
      'O modo SQLite local precisa do módulo nativo "node:sqlite" (Node.js 24+). ' +
        'Atualize o Node ou defina DATABASE_URL para usar PostgreSQL.'
    );
  }
  const dataDir = process.env.DATA_DIR || path.join(rootDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  sqlite = new DatabaseSync(path.join(dataDir, 'jumanji.db'));
  sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  sqlite.exec('PRAGMA busy_timeout = 5000;');
}

/** Booleanos viram 1/0 no SQLite e true/false no PostgreSQL. */
export function toDbBool(value) {
  if (driver === 'postgres') return Boolean(value);
  return value ? 1 : 0;
}

/**
 * Executa uma consulta e devolve as linhas encontradas.
 * @param {string} sql
 * @param {Record<string, unknown>} [params]
 */
export async function query(sql, params = {}) {
  if (driver === 'postgres') {
    const values = [];
    const text = sql.replace(NAMED_PARAM, (_match, name) => {
      values.push(params[name] ?? null);
      return `$${values.length}`;
    });
    // Sem parâmetros, usa o protocolo simples (aceita múltiplos comandos).
    const result = values.length > 0 ? await pool.query(text, values) : await pool.query(text);
    return result.rows ?? [];
  }

  const names = [...new Set([...sql.matchAll(NAMED_PARAM)].map((match) => match[1]))];
  const bound = {};
  for (const name of names) {
    const value = params[name];
    bound[`:${name}`] = value === undefined ? null : value;
  }

  const statement = sqlite.prepare(sql);
  return statement.all(bound);
}

export function toPlayer(row) {
  return {
    id: Number(row.id),
    name: row.name,
    avatar: row.avatar,
    lives: Number(row.lives),
    gems: Number(row.gems),
    progress: Number(row.progress),
    createdAt: row.created_at ?? null
  };
}

export function toMission(row) {
  return {
    id: Number(row.id),
    orderIndex: Number(row.order_index),
    title: row.title,
    scene: row.scene,
    enemy: row.enemy,
    challenge: row.challenge,
    difficulty: Number(row.difficulty),
    reward: Number(row.reward),
    intro: row.intro,
    successText: row.success_text,
    failureText: row.failure_text,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at ?? null
  };
}

export function toAttempt(row) {
  return {
    id: Number(row.id),
    playerId: Number(row.player_id),
    playerName: row.player_name ?? null,
    playerAvatar: row.player_avatar ?? null,
    missionId: row.mission_id === null ? null : Number(row.mission_id),
    missionTitle: row.mission_title,
    result: row.result,
    roll: Number(row.roll),
    chance: Number(row.chance),
    gems: Number(row.gems),
    createdAt: row.created_at ?? null
  };
}

const SCHEMA_POSTGRES = `
  CREATE TABLE IF NOT EXISTS missions (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_index   INTEGER NOT NULL DEFAULT 1,
    title         VARCHAR(80) NOT NULL,
    scene         VARCHAR(20) NOT NULL,
    enemy         VARCHAR(60) NOT NULL,
    challenge     VARCHAR(20) NOT NULL,
    difficulty    INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
    reward        INTEGER NOT NULL DEFAULT 0 CHECK (reward BETWEEN 0 AND 1000),
    intro         TEXT NOT NULL,
    success_text  TEXT NOT NULL,
    failure_text  TEXT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_missions_order ON missions (order_index);

  CREATE TABLE IF NOT EXISTS players (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(40) NOT NULL,
    avatar      VARCHAR(24) NOT NULL,
    lives       INTEGER NOT NULL DEFAULT 3 CHECK (lives BETWEEN 0 AND 3),
    gems        INTEGER NOT NULL DEFAULT 0 CHECK (gems >= 0),
    progress    INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_players_ranking ON players (gems DESC, progress DESC);

  CREATE TABLE IF NOT EXISTS attempts (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_id      INTEGER NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    mission_id     INTEGER REFERENCES missions (id) ON DELETE SET NULL,
    mission_title  VARCHAR(80) NOT NULL,
    result         VARCHAR(10) NOT NULL CHECK (result IN ('vitoria', 'derrota')),
    roll           INTEGER NOT NULL,
    chance         INTEGER NOT NULL,
    gems           INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_attempts_player ON attempts (player_id);
  CREATE INDEX IF NOT EXISTS idx_attempts_created ON attempts (created_at DESC);
`;

const SCHEMA_SQLITE = `
  CREATE TABLE IF NOT EXISTS missions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_index   INTEGER NOT NULL DEFAULT 1,
    title         TEXT NOT NULL,
    scene         TEXT NOT NULL,
    enemy         TEXT NOT NULL,
    challenge     TEXT NOT NULL,
    difficulty    INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
    reward        INTEGER NOT NULL DEFAULT 0 CHECK (reward BETWEEN 0 AND 1000),
    intro         TEXT NOT NULL,
    success_text  TEXT NOT NULL,
    failure_text  TEXT NOT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_missions_order ON missions (order_index);

  CREATE TABLE IF NOT EXISTS players (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    avatar      TEXT NOT NULL,
    lives       INTEGER NOT NULL DEFAULT 3 CHECK (lives BETWEEN 0 AND 3),
    gems        INTEGER NOT NULL DEFAULT 0 CHECK (gems >= 0),
    progress    INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_players_ranking ON players (gems DESC, progress DESC);

  CREATE TABLE IF NOT EXISTS attempts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id      INTEGER NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    mission_id     INTEGER REFERENCES missions (id) ON DELETE SET NULL,
    mission_title  TEXT NOT NULL,
    result         TEXT NOT NULL CHECK (result IN ('vitoria', 'derrota')),
    roll           INTEGER NOT NULL,
    chance         INTEGER NOT NULL,
    gems           INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_attempts_player ON attempts (player_id);
  CREATE INDEX IF NOT EXISTS idx_attempts_created ON attempts (created_at DESC);
`;

/** Cria o schema e popula o conteúdo inicial quando o banco está vazio. */
export function initDatabase() {
  if (ready) return ready;

  ready = (async () => {
    if (driver === 'postgres') {
      await query(SCHEMA_POSTGRES);
    } else {
      sqlite.exec(SCHEMA_SQLITE);
    }

    if (process.env.SEED === 'false') return;

    const [{ total: missionsTotal }] = await query('SELECT COUNT(*) AS total FROM missions');
    if (Number(missionsTotal) === 0) {
      for (const mission of DEMO_MISSIONS) {
        await query(
          `INSERT INTO missions
             (order_index, title, scene, enemy, challenge, difficulty, reward,
              intro, success_text, failure_text, is_active)
           VALUES
             (:orderIndex, :title, :scene, :enemy, :challenge, :difficulty, :reward,
              :intro, :successText, :failureText, :isActive)`,
          { ...mission, isActive: toDbBool(mission.isActive) }
        );
      }
      console.log(`[db] ${DEMO_MISSIONS.length} fases da história criadas`);
    }

    const [{ total: playersTotal }] = await query('SELECT COUNT(*) AS total FROM players');
    if (Number(playersTotal) === 0) {
      for (const player of DEMO_PLAYERS) {
        await query(
          `INSERT INTO players (name, avatar, lives, gems, progress)
           VALUES (:name, :avatar, :lives, :gems, :progress)`,
          player
        );
      }
      console.log(`[db] ${DEMO_PLAYERS.length} aventureiros de exemplo criados`);
    }
  })();

  return ready;
}

export async function closeDatabase() {
  if (pool) await pool.end();
  if (sqlite) sqlite.close();
}
