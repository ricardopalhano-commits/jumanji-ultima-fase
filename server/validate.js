/**
 * Validação e normalização dos dados de aventureiros e fases.
 * A mesma validação roda no cliente (feedback imediato) e aqui (segurança).
 */
import { avatarKeys, challengeKeys, sceneKeys } from './game.js';

const MAX_NAME = 40;
const MAX_TITLE = 80;
const MAX_ENEMY = 60;
const MAX_TEXT = 900;

function clean(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function cleanText(value) {
  return String(value ?? '').trim();
}

export function validatePlayer(body = {}) {
  const errors = {};

  const name = clean(body.name);
  if (name.length < 2) {
    errors.name = 'Informe um nome com pelo menos 2 caracteres.';
  } else if (name.length > MAX_NAME) {
    errors.name = `O nome deve ter até ${MAX_NAME} caracteres.`;
  }

  const avatar = clean(body.avatar);
  if (!avatarKeys.includes(avatar)) {
    errors.avatar = 'Escolha um dos avatares disponíveis.';
  }

  if (Object.keys(errors).length > 0) return { errors };
  return { value: { name, avatar } };
}

export function validateMission(body = {}) {
  const errors = {};

  const title = clean(body.title);
  if (title.length < 2) {
    errors.title = 'Dê um título para a fase (mínimo 2 caracteres).';
  } else if (title.length > MAX_TITLE) {
    errors.title = `O título deve ter até ${MAX_TITLE} caracteres.`;
  }

  const scene = clean(body.scene);
  if (!sceneKeys.includes(scene)) {
    errors.scene = 'Escolha um cenário válido.';
  }

  const enemy = clean(body.enemy);
  if (enemy.length < 2) {
    errors.enemy = 'Informe o inimigo ou obstáculo da fase.';
  } else if (enemy.length > MAX_ENEMY) {
    errors.enemy = `O inimigo deve ter até ${MAX_ENEMY} caracteres.`;
  }

  const challenge = clean(body.challenge);
  if (!challengeKeys.includes(challenge)) {
    errors.challenge = 'Escolha o desafio recomendado.';
  }

  const difficulty = Number.parseInt(body.difficulty, 10);
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 10) {
    errors.difficulty = 'A dificuldade deve ser um número de 1 a 10.';
  }

  const reward = Number.parseInt(body.reward, 10);
  if (!Number.isInteger(reward) || reward < 0 || reward > 1000) {
    errors.reward = 'A recompensa deve estar entre 0 e 1000 gemas.';
  }

  let orderIndex = null;
  const rawOrder = body.orderIndex;
  if (rawOrder !== undefined && rawOrder !== null && String(rawOrder).trim() !== '') {
    const parsed = Number.parseInt(rawOrder, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) {
      errors.orderIndex = 'A posição deve ser um número de 1 a 99.';
    } else {
      orderIndex = parsed;
    }
  }

  const intro = cleanText(body.intro);
  if (intro.length < 10) {
    errors.intro = 'Escreva a introdução da fase (mínimo 10 caracteres).';
  } else if (intro.length > MAX_TEXT) {
    errors.intro = `A introdução deve ter até ${MAX_TEXT} caracteres.`;
  }

  const successText = cleanText(body.successText);
  if (successText.length < 10) {
    errors.successText = 'Escreva o desfecho de vitória (mínimo 10 caracteres).';
  } else if (successText.length > MAX_TEXT) {
    errors.successText = `O texto de vitória deve ter até ${MAX_TEXT} caracteres.`;
  }

  const failureText = cleanText(body.failureText);
  if (failureText.length < 10) {
    errors.failureText = 'Escreva o desfecho de derrota (mínimo 10 caracteres).';
  } else if (failureText.length > MAX_TEXT) {
    errors.failureText = `O texto de derrota deve ter até ${MAX_TEXT} caracteres.`;
  }

  const isActive = !(
    body.isActive === false ||
    body.isActive === 'false' ||
    body.isActive === 0 ||
    body.isActive === '0'
  );

  if (Object.keys(errors).length > 0) return { errors };

  return {
    value: {
      title,
      scene,
      enemy,
      challenge,
      difficulty,
      reward,
      orderIndex,
      isActive,
      intro,
      successText,
      failureText
    }
  };
}
