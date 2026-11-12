/**
 * Teste de fumaça da API: sobe o servidor em uma porta livre, com banco SQLite
 * temporário e sem dados de exemplo, e valida CRUD, jornada, jogadas, validação,
 * estatísticas e persistência.
 *
 * Uso: npm test
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 3900 + Math.floor(Math.random() * 90);
const base = `http://127.0.0.1:${port}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jumanji-test-'));
const env = {
  ...process.env,
  PORT: String(port),
  DATA_DIR: dataDir,
  DATABASE_URL: '',
  SEED: 'false',
  NODE_ENV: 'test'
};

let server = null;
let logs = '';
let failures = 0;

function startServer() {
  server = spawn(process.execPath, [path.join(root, 'server', 'index.js')], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', (chunk) => {
    logs += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    logs += chunk.toString();
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!server || server.exitCode !== null) return resolve();
    const timer = setTimeout(() => {
      server.kill('SIGKILL');
      resolve();
    }, 5000);
    server.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    server.kill('SIGTERM');
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${base}/healthz`);
      if (response.ok) return;
    } catch {
      /* servidor ainda subindo */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Servidor não respondeu em ${base}.\n${logs}`);
}

function check(name, condition, details = '') {
  if (condition) {
    console.log(`  ✔ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✘ ${name} ${details}`);
  }
}

async function jsonRequest(pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

const json = (method, payload) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const missionPayload = {
  title: 'A Fenda do Deserto',
  scene: 'deserto',
  enemy: 'Escorpiões de areia',
  challenge: 'forca',
  difficulty: 2,
  reward: 20,
  orderIndex: 1,
  isActive: true,
  intro: 'Uma fenda se abre na duna e o chão começa a engolir o acampamento.',
  successText: 'Você segura a corda e puxa todos para fora antes do sol nascer.',
  failureText: 'A areia cede e você escorrega, perdendo uma vida na queda.'
};

const playerPayload = { name: 'Aventureiro Teste', avatar: 'ruby' };

let missionId = null;
let playerId = null;

console.log(`\nJumanji: A Última Fase • teste de fumaça (porta ${port})\n`);

try {
  startServer();
  await waitForServer();

  const health = await jsonRequest('/healthz');
  check(
    'healthz responde e usa SQLite no modo local',
    health.status === 200 && health.body.database === 'sqlite'
  );

  const home = await fetch(base);
  const homeHtml = await home.text();
  check(
    'página inicial entrega o app shell do Jumanji',
    home.status === 200 && homeHtml.includes('Jumanji')
  );
  check('manifest.json do PWA acessível', (await fetch(`${base}/manifest.json`)).ok);
  check('service worker acessível', (await fetch(`${base}/sw.js`)).ok);
  check(
    'ícone do PWA acessível',
    (await fetch(`${base}/icons/icon-512.png`)).ok
  );

  const meta = await jsonRequest('/api/meta');
  check(
    'GET /api/meta entrega avatares, cenários e desafios',
    meta.status === 200 &&
      meta.body.avatars.length === 5 &&
      meta.body.scenes.length === 4 &&
      meta.body.challenges.length === 3 &&
      meta.body.maxLives === 3
  );

  const invalidPlayer = await jsonRequest('/api/players', json('POST', { name: 'x', avatar: 'inexistente' }));
  check(
    'validação rejeita aventureiro inválido (422)',
    invalidPlayer.status === 422 && Boolean(invalidPlayer.body?.fields?.name)
  );

  const createdMission = await jsonRequest('/api/missions', json('POST', missionPayload));
  check(
    'POST /api/missions cria a primeira fase',
    createdMission.status === 201 && createdMission.body?.id > 0 && createdMission.body?.isActive === true
  );
  missionId = createdMission.body?.id;

  const invalidMission = await jsonRequest(
    '/api/missions',
    json('POST', { ...missionPayload, difficulty: 42, scene: 'lua', intro: 'curto' })
  );
  check(
    'validação rejeita fase inválida (422)',
    invalidMission.status === 422 &&
      Boolean(invalidMission.body?.fields?.difficulty) &&
      Boolean(invalidMission.body?.fields?.scene) &&
      Boolean(invalidMission.body?.fields?.intro)
  );

  const createdPlayer = await jsonRequest('/api/players', json('POST', playerPayload));
  check(
    'POST /api/players cria aventureiro com 3 vidas e status pronto',
    createdPlayer.status === 201 &&
      createdPlayer.body?.lives === 3 &&
      createdPlayer.body?.status === 'pronto' &&
      createdPlayer.body?.progress === 0
  );
  playerId = createdPlayer.body?.id;

  const listed = await jsonRequest('/api/players');
  check(
    'GET /api/players lista o aventureiro criado',
    listed.status === 200 && listed.body.items.some((player) => player.id === playerId)
  );

  const updatedPlayer = await jsonRequest(
    `/api/players/${playerId}`,
    json('PUT', { name: 'Aventureira Editada', avatar: 'ming' })
  );
  check(
    'PUT /api/players edita nome e avatar',
    updatedPlayer.status === 200 &&
      updatedPlayer.body?.name === 'Aventureira Editada' &&
      updatedPlayer.body?.avatar === 'ming'
  );

  const journey = await jsonRequest(`/api/players/${playerId}/journey`);
  check(
    'GET /journey libera a fase atual com as três abordagens',
    journey.status === 200 &&
      journey.body?.current?.title === missionPayload.title &&
      journey.body?.completed === 0 &&
      ['forca', 'agilidade', 'conhecimento'].every(
        (key) => typeof journey.body?.current?.chances?.[key] === 'number'
      )
  );

  const badApproach = await jsonRequest(
    `/api/players/${playerId}/play`,
    json('POST', { approach: 'magia' })
  );
  check(
    'jogada com abordagem inválida é recusada (422)',
    badApproach.status === 422 && Boolean(badApproach.body?.fields?.approach)
  );

  const play = await jsonRequest(
    `/api/players/${playerId}/play`,
    json('POST', { approach: 'forca', missionId })
  );
  const outcome = play.body?.outcome;
  check(
    'POST /play rola o dado e devolve o desfecho',
    play.status === 200 &&
      typeof outcome?.success === 'boolean' &&
      outcome.roll >= 1 &&
      outcome.roll <= 100 &&
      outcome.chance >= 15 &&
      outcome.chance <= 92 &&
      outcome.recommended === true
  );
  check(
    'jogada atualiza vidas, gemas, progresso e diário de bordo',
    play.status === 200 &&
      play.body.journey.attempts.length === 1 &&
      (outcome.success
        ? play.body.journey.player.gems === missionPayload.reward &&
          play.body.journey.player.progress === 1 &&
          play.body.journey.player.lives === 3
        : play.body.journey.player.gems === 0 &&
          play.body.journey.player.progress === 0 &&
          play.body.journey.player.lives === 2)
  );
  check(
    'vitória é registrada como lenda ao concluir todas as fases',
    outcome.success
      ? play.body.journey.victory === true &&
        play.body.journey.player.status === 'lenda' &&
        Boolean(play.body.journey.epilogue)
      : play.body.journey.victory === false
  );

  const stats = await jsonRequest('/api/stats');
  check(
    'GET /api/stats contabiliza tentativas e ranking',
    stats.status === 200 &&
      stats.body.totals.attempts === 1 &&
      stats.body.ranking[0]?.id === playerId
  );

  const reset = await jsonRequest(`/api/players/${playerId}/reset`, { method: 'POST' });
  check(
    'POST /reset restaura vidas e zera gemas/progresso/diário',
    reset.status === 200 &&
      reset.body?.player?.lives === 3 &&
      reset.body?.player?.gems === 0 &&
      reset.body?.player?.progress === 0 &&
      reset.body?.attempts?.length === 0
  );

  await stopServer();
  startServer();
  await waitForServer();

  const persistedPlayer = await jsonRequest(`/api/players/${playerId}`);
  const persistedMission = await jsonRequest('/api/missions');
  check(
    'dados persistem após reiniciar o servidor',
    persistedPlayer.status === 200 &&
      persistedPlayer.body?.name === 'Aventureira Editada' &&
      persistedMission.body?.items?.some((mission) => mission.id === missionId)
  );

  const deletedMission = await jsonRequest(`/api/missions/${missionId}`, { method: 'DELETE' });
  check(
    'DELETE /api/missions remove a fase',
    deletedMission.status === 200 && deletedMission.body?.deleted === true
  );

  const deletedPlayer = await jsonRequest(`/api/players/${playerId}`, { method: 'DELETE' });
  check(
    'DELETE /api/players remove o aventureiro',
    deletedPlayer.status === 200 && deletedPlayer.body?.deleted === true
  );

  const missingPlayer = await jsonRequest(`/api/players/${playerId}`);
  const missingMission = await jsonRequest(`/api/missions/${missionId}`, json('PUT', missionPayload));
  check(
    'exclusões confirmadas (404)',
    missingPlayer.status === 404 && missingMission.status === 404
  );
} catch (error) {
  failures += 1;
  console.error('\nErro inesperado durante os testes:');
  console.error(error);
  if (logs) console.error(`\n--- log do servidor ---\n${logs}`);
} finally {
  await stopServer();
  fs.rmSync(dataDir, { recursive: true, force: true });
}

console.log(
  failures === 0
    ? '\nTodos os testes passaram ✅\n'
    : `\n${failures} verificação(ões) falharam ❌\n`
);
process.exit(failures === 0 ? 0 : 1);
