/**
 * Regras do jogo: avatares, cenários, desafios e cálculo de sucesso.
 * Compartilhado pela API (o cliente recebe tudo via /api/meta).
 */

export const AVATARS = [
  {
    key: 'smolder',
    name: 'Smolder Bravestone',
    role: 'Arqueólogo e fortão',
    icon: 'sword',
    color: '#e0672f',
    tagline: '“Eu sou o herói. Obviamente.”',
    attributes: { forca: 5, agilidade: 2, conhecimento: 2 }
  },
  {
    key: 'ruby',
    name: 'Ruby Roundhouse',
    role: 'Dançarina e lutadora',
    icon: 'wind',
    color: '#e0457b',
    tagline: '“Ninguém manda na Ruby.”',
    attributes: { forca: 2, agilidade: 5, conhecimento: 2 }
  },
  {
    key: 'mouse',
    name: 'Mouse Finbar',
    role: 'Zoólogo e mochileiro',
    icon: 'book',
    color: '#4aa3df',
    tagline: '“Eu leio os manuais. Todos.”',
    attributes: { forca: 2, agilidade: 2, conhecimento: 5 }
  },
  {
    key: 'shelly',
    name: 'Shelly Oberon',
    role: 'Cartógrafa e estrategista',
    icon: 'compass',
    color: '#9b7be0',
    tagline: '“O mapa não mente. As pessoas, sim.”',
    attributes: { forca: 2, agilidade: 3, conhecimento: 4 }
  },
  {
    key: 'ming',
    name: 'Ming Fleetfoot',
    role: 'Ladra e especialista em fugas',
    icon: 'mask',
    color: '#d9a441',
    tagline: '“Se tem fechadura, tem saída.”',
    attributes: { forca: 3, agilidade: 4, conhecimento: 2 }
  }
];

export const CHALLENGES = [
  {
    key: 'forca',
    name: 'Força',
    icon: 'sword',
    short: 'Força',
    description: 'Resolver no braço, na coragem e no impacto.'
  },
  {
    key: 'agilidade',
    name: 'Agilidade',
    icon: 'wind',
    short: 'Agilidade',
    description: 'Correr, desviar e escapar por um fio.'
  },
  {
    key: 'conhecimento',
    name: 'Conhecimento',
    icon: 'book',
    short: 'Conhecimento',
    description: 'Observar, planejar e usar o que o jogo ensina.'
  }
];

export const SCENES = [
  { key: 'deserto', name: 'Deserto', icon: 'sun', color: '#e0a84f' },
  { key: 'bazar', name: 'Bazar', icon: 'coins', color: '#d98c3f' },
  { key: 'selva', name: 'Selva', icon: 'leaf', color: '#3f9e6b' },
  { key: 'fortaleza', name: 'Fortaleza', icon: 'skull', color: '#c0503f' }
];

export const MAX_LIVES = 3;

const avatarIndex = new Map(AVATARS.map((avatar) => [avatar.key, avatar]));
const challengeIndex = new Map(CHALLENGES.map((challenge) => [challenge.key, challenge]));
const sceneIndex = new Map(SCENES.map((scene) => [scene.key, scene]));

export const avatarKeys = [...avatarIndex.keys()];
export const challengeKeys = [...challengeIndex.keys()];
export const sceneKeys = [...sceneIndex.keys()];

export function getAvatar(key) {
  return avatarIndex.get(key) || AVATARS[0];
}

export function getChallenge(key) {
  return challengeIndex.get(key) || null;
}

export function getScene(key) {
  return sceneIndex.get(key) || SCENES[0];
}

/**
 * Chance de sucesso (em %). O atributo do avatar pesa a favor, a dificuldade
 * da fase pesa contra e escolher a abordagem recomendada dá um bônus.
 */
export function computeChance(avatarKey, challenge, difficulty, recommended = false) {
  const avatar = getAvatar(avatarKey);
  const attribute = Number(avatar.attributes?.[challenge] ?? 2);
  const base = 45 + attribute * 7 - Number(difficulty) * 3 + (recommended ? 5 : 0);
  return Math.max(15, Math.min(92, Math.round(base)));
}

export function chancesFor(avatarKey, mission) {
  const chances = {};
  for (const challenge of CHALLENGES) {
    chances[challenge.key] = computeChance(
      avatarKey,
      challenge.key,
      mission.difficulty,
      mission.challenge === challenge.key
    );
  }
  return chances;
}

/** Sorteia um número de 1 a 100 (dado percentual). */
export function rollD100() {
  return Math.floor(Math.random() * 100) + 1;
}

export function statusOf(player, totalMissions) {
  if (Number(player.lives) <= 0) return 'eliminado';
  if (totalMissions > 0 && Number(player.progress) >= totalMissions) return 'lenda';
  return Number(player.progress) > 0 ? 'em_jogo' : 'pronto';
}

export const STATUS_LABELS = {
  pronto: 'Pronto para jogar',
  em_jogo: 'Em aventura',
  lenda: 'Lenda da selva',
  eliminado: 'Sem vidas'
};
