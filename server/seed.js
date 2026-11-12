/**
 * Conteúdo inicial do jogo: capítulos inspirados na jornada de
 * "Jumanji: Próxima Fase" e três aventureiros de exemplo.
 */

export const DEMO_MISSIONS = [
  {
    orderIndex: 1,
    title: 'O Despertar no Deserto',
    scene: 'deserto',
    enemy: 'O sol implacável',
    challenge: 'conhecimento',
    difficulty: 2,
    reward: 10,
    isActive: true,
    intro:
      'Você acorda no meio das dunas, sem água e sem mapa. No horizonte, um obelisco coberto de símbolos aponta para algum lugar — mas o sol castiga e o dia está acabando. Encontrar a rota certa é a primeira prova.',
    successText:
      'Lendo as inscrições do obelisco, você descobre que as sombras marcam o caminho. Em minutos, encontra um oásis escondido: água doce, sombra e a primeira pista — “sigam as penas que caem do céu”.',
    failureText:
      'A rota escolhida leva direto para uma tempestade de areia. Você se abriga atrás de uma duna, perde uma vida e volta ao obelisco. O deserto não perdoa pressa.'
  },
  {
    orderIndex: 2,
    title: 'Fuga das Avestruzes',
    scene: 'deserto',
    enemy: 'Avestruzes gigantes',
    challenge: 'agilidade',
    difficulty: 5,
    reward: 20,
    isActive: true,
    intro:
      'O chão treme. Uma manada de avestruzes gigantes irrompe das dunas — e não são aves comuns: caçam em bando, não param e não têm medo de nada. A única saída é o campo de rochas do outro lado do vale.',
    successText:
      'Você corre em zigue-zague, mergulha entre as rochas e sente o bico passar raspando no seu ombro. Do outro lado, encontra uma pena dourada presa na pedra: a chave para o próximo portal.',
    failureText:
      'Uma avestruz acerta você em cheio. A tela pisca em vermelho e um coração se apaga. Seus amigos conseguem arrastá-lo para um buraco entre as rochas, sem ar e sem graça.'
  },
  {
    orderIndex: 3,
    title: 'O Bazar dos Capangas',
    scene: 'bazar',
    enemy: 'Capangas de Jurgen',
    challenge: 'forca',
    difficulty: 4,
    reward: 15,
    isActive: true,
    intro:
      'No bazar esquecido, capangas de Jurgen revistam cada viajante em busca do mapa da selva. Disfarçar não vai funcionar: eles conhecem todos os rostos e já fecharam as saídas. Só resta abrir caminho.',
    successText:
      'Você derruba dois capangas com um único movimento e o terceiro foge. Atrás do balcão, encontra metade do mapa rasgado, com a marca do acampamento de Jurgen queimada no papel.',
    failureText:
      'Os capangas são mais rápidos do que parecem. Você leva uma coronhada, perde uma vida e acorda amarrado — mas consegue se soltar e desaparecer na multidão antes que percebam.'
  },
  {
    orderIndex: 4,
    title: 'A Ponte dos Mandris',
    scene: 'selva',
    enemy: 'Mandrilos guardiões',
    challenge: 'agilidade',
    difficulty: 6,
    reward: 25,
    isActive: true,
    intro:
      'A única passagem para as montanhas é uma ponte de cordas sobre o abismo. Guardiões mandris, com presas enormes, saltam entre as árvores e observam cada passo. Um movimento errado e você cai.',
    successText:
      'Você espera o bando se distrair com um fruto, atravessa de galho em galho e chega ao outro lado. Atrás de você, a ponte desaba no abismo: não há mais volta.',
    failureText:
      'Um mandril arranca a corda da sua mão. Você fica pendurado no vazio, perde uma vida e é puxado de volta pelos amigos. O bando grita do outro lado, como se risse.'
  },
  {
    orderIndex: 5,
    title: 'O Acampamento de Jurgen',
    scene: 'fortaleza',
    enemy: 'Sentinelas armados',
    challenge: 'conhecimento',
    difficulty: 7,
    reward: 30,
    isActive: true,
    intro:
      'O acampamento de Jurgen ferve. Sentinelas patrulham em ronda, tochas iluminam o pátio e o Coração da Selva brilha no topo da torre. Entrar sem ser visto exige decorar o ritmo da guarda.',
    successText:
      'Você conta os passos de cada sentinela, apaga uma tocha na hora certa e cruza o pátio colado às sombras. A porta da torre está aberta — e ninguém percebeu.',
    failureText:
      'Uma sentinela vê sua sombra na parede. O alarme toca, flechas cortam o ar e vocês fogem pelos telhados. Você escapa, mas perde uma vida e o elemento surpresa.'
  },
  {
    orderIndex: 6,
    title: 'Jurgen, o Brutal',
    scene: 'fortaleza',
    enemy: 'Jurgen',
    challenge: 'forca',
    difficulty: 9,
    reward: 50,
    isActive: true,
    intro:
      'No topo da torre, Jurgen espera com o Coração da Selva na mão. Ele não é um chefe comum: é o motivo pelo qual ninguém saiu vivo deste jogo. A última prova começa agora.',
    successText:
      'Você desvia do golpe, gira e acerta o ponto fraco no ombro de Jurgen. Ele cai, o Coração da Selva se apaga e um portal dourado se abre no ar. Vocês venceram o jogo.',
    failureText:
      'O golpe de Jurgen atravessa sua guarda e a tela escurece. Mais uma vida se apaga. Mas o portal ainda está lá — e enquanto houver uma vida, há esperança.'
  }
];

export const DEMO_PLAYERS = [
  { name: 'Nina', avatar: 'mouse', lives: 1, gems: 75, progress: 4 },
  { name: 'Lara', avatar: 'ruby', lives: 2, gems: 35, progress: 2 },
  { name: 'Téo', avatar: 'smolder', lives: 3, gems: 15, progress: 1 }
];

export const VICTORY_TEXT =
  'O portal se abre sobre o deserto e o tabuleiro desaparece. Vocês voltaram para casa com a história mais improvável de todas — e com a certeza de que Jumanji nunca é só um jogo.';
