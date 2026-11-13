# 🎮 Jumanji: O Tabuleiro Selvagem

**Jogo de plataforma 2D** em pixel-art, inspirado nos clássicos de 16 bits (estilo *Super Mario World*), com o mundo de **Jumanji**: deserto, selva e o templo de Jurgen. Feito em **HTML + CSS + JavaScript puro** (Canvas + Web Audio), **sem dependências externas** no jogo — sprites e sons são 100% procedurais.

> Projeto acadêmico desenvolvido com apoio do **OpenCode (IA)** como ferramenta de desenvolvimento.

<p>
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-vanilla-f7df1e?logo=javascript&logoColor=black" />
  <img alt="Canvas" src="https://img.shields.io/badge/Canvas-2D-000000" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white" />
  <img alt="Express" src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-instalável-5A0FC8?logo=pwa&logoColor=white" />
  <img alt="Render" src="https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white" />
</p>

---

## 🔗 Links do projeto

| O que | Link |
| --- | --- |
| 🎮 Jogar agora (Render) | [jumanji-ultima-fase.onrender.com](https://jumanji-ultima-fase.onrender.com) |
| 💻 Repositório público (GitHub) | [github.com/ricardopalhano-commits/jumanji-ultima-fase](https://github.com/ricardopalhano-commits/jumanji-ultima-fase) |

> **Nota:** no plano gratuito do Render o serviço "hiberna" após alguns minutos sem acesso; a primeira visita pode levar de 30 a 60 segundos para acordar.

---

## 📌 Sobre o jogo

O site **é o jogo**. Abra a página e você cai direto no menu principal:

- **▶ JOGAR** — começa uma nova partida na Fase 1.
- **▦ FASES** — seleciona uma fase já desbloqueada.
- **? COMO JOGAR** — controles e objetivos.

A campanha tem **3 fases**, cada uma com tema, paleta e trilha próprios:

| # | Fase | Clima | Perigos |
| --- | --- | --- | --- |
| 1 | **Deserto das Dunas** | Sol escaldante | Escorpiões, capangas e urubus |
| 2 | **Selva dos Mandris** | Cipós e sombras | Mandris, vespas e cobras que cospem |
| 3 | **Templo de Jurgen** | Lava e ouro | Raptores, armadilhas e o **chefão Jurgen** |

Derrote **Jurgen, o Brutal** (3 pontos de vida) no Templo para abrir o **portal dourado** e vencer.

---

## 🕹️ Como jogar

| Ação | Teclado | Toque |
| --- | --- | --- |
| Mover | `←` `→` ou `A` `D` | botões ◄ ► |
| Pular | `Espaço`, `↑`, `W`, `Z` ou `X` | botão ⬆ |
| Correr | `Shift` | botão » |
| Pausar | `Esc` ou `P` | botão ⏸ no HUD |

**Mecânicas de plataforma:**

- **Pulo variável** com *coyote time* e *jump buffer* — segure para pular mais alto.
- **Esmagar inimigos** caindo em cima da cabeça.
- **Gemas**: a cada **50** você ganha uma vida extra (até 5).
- **Coração** recupera uma vida; **máscara** dá **invencibilidade** por 8 segundos.
- **Checkpoints** salvam seu avanço dentro da fase.
- **Recorde** salvo no navegador (`localStorage`), com botões de **som** e **tela cheia**.

---

## ✨ Funcionalidades

### Jogo
- 3 fases com **construção procedural** de terreno, plataformas, espinhos, checkpoints e portal.
- **7 tipos de inimigos**: escorpião, capanga, urubu, mandril, vespa, cobra (projétil) e raptor, além do **chefe Jurgen**.
- Física de plataforma caprichada: aceleração, atrito, *dash*, gravidade e colisão por tiles.
- Efeitos: partículas, tremores de tela, *floaters* de pontos, ambiente (areia/folhas/brasas) e HUD animado.
- **Áudio procedural** (Web Audio) para pulo, moedas, dano, chefe e telas.

### Interface
- **Menu principal** com logo em pixel-art, **seleção de fases** com progresso desbloqueável e tela de **como jogar**.
- Telas de **pausa**, **fim de jogo**, **fase concluída** e **vitória**.
- Visual **retrô 16 bits**: fonte pixel, botões com bisel, scanlines de CRT e layout responsivo.
- **Controles de toque** automáticos em celulares/tablets (`pointer: coarse`).

### PWA
- Instalável, com **cache offline** do jogo e atualização automática do Service Worker.

---

## 🧰 Tecnologias

| Camada | O que foi usado |
| --- | --- |
| Jogo | JavaScript (Canvas 2D + Web Audio), sem bibliotecas |
| Interface | HTML semântico e CSS puro (pixel-art, temas e responsividade) |
| Servidor | Node.js 24 + Express (estáticos, `healthz` e API legada) |
| Banco (legado) | PostgreSQL (produção) ou SQLite (`node:sqlite`, desenvolvimento) |
| PWA | `manifest.json` + Service Worker |
| Deploy | Render (`render.yaml`) |

---

## 🏗️ Arquitetura

- **`public/`** é servido por `express.static` — a raiz (`/`) entrega o **jogo** (`index.html` + `game.css` + `game.js`).
- O motor do jogo é um **IIFE clássico** (`game.js`), sem dependências e sem variáveis globais.
- O **servidor Express** continua ativo: serve os arquivos do jogo, expõe `/healthz` (usado pelo *health check* do Render) e mantém a **API REST legada** do antigo modo narrativo.
- A antiga interface narrativa (dado, CRUD, ranking) foi **retirada do site** e arquivada em **`legacy/`**, sem ser servida.

---

## 📁 Estrutura do projeto

```
.
├── package.json                # scripts, dependências e metadados
├── render.yaml                 # Blueprint do Render (web + PostgreSQL)
├── .env.example                # exemplo de variáveis de ambiente
├── public/                     # tudo o que vai para o navegador
│   ├── index.html              # PÁGINA DO JOGO: menu, HUD, telas e canvas
│   ├── game.css                # interface pixel-art (retrô 16 bits)
│   ├── game.js                 # motor do jogo: física, inimigos, chefe, fases, áudio
│   ├── manifest.json           # manifesto PWA
│   ├── sw.js                   # Service Worker (cache/offline)
│   ├── offline.html            # página de fallback offline
│   ├── robots.txt
│   ├── jogo/index.html         # redireciona /jogo/ → / (link antigo)
│   └── icons/                  # ícones PNG/SVG (gerados por script)
├── legacy/                     # app narrativo aposentado (NÃO é servido)
│   ├── index.html              # antiga página com CRUD, dado e ranking
│   ├── css/styles.css          # antigo design system
│   ├── js/                     # app.js, api.js, format.js, pwa.js, game.js
│   └── jogo-style.css          # estilo da primeira versão do jogo
├── server/
│   ├── index.js                # Express, estáticos, health check, erros
│   ├── db.js                   # conexão, schema, seed e queries
│   ├── game.js                 # regras da API legada (avatares, cenas, desafios)
│   ├── seed.js                 # dados de exemplo da API legada
│   ├── validate.js             # validação/normalização da API legada
│   └── routes/api.js           # rotas REST legadas
├── scripts/
│   ├── generate-icons.js       # gera os ícones do PWA sem dependências
│   └── smoke-test.js           # testes de fumaça (API + servidor + PWA)
└── .github/workflows/ci.yml    # integração contínua
```

---

## 🚀 Como rodar localmente

### Pré-requisitos
- **Node.js 24 ou superior** (recomendado).
- Nenhum banco instalado é necessário: sem `DATABASE_URL`, a API legada usa SQLite em `./data/jumanji.db`. **O jogo em si não precisa de banco.**

### Passos

```bash
# 1. clone o repositório
git clone https://github.com/ricardopalhano-commits/jumanji-ultima-fase.git
cd jumanji-ultima-fase

# 2. instale as dependências
npm install

# 3. inicie o servidor
npm start
```

Abra **http://localhost:3000** e o jogo começa na tela de menu.

```bash
npm run dev    # reinicia automaticamente ao salvar (node --watch)
npm test       # testes de fumaça (servidor + PWA + API legada)
npm run icons  # regenera os ícones do PWA
```

> **Sem servidor?** O jogo é estático: também funciona abrindo `public/index.html` (alguns recursos de PWA só ativam via HTTP/HTTPS).

<details>
<summary><strong>Windows: erro “execução de scripts foi desabilitada” ao usar npm</strong></summary>

Use `npm.cmd` em vez de `npm`, por exemplo `npm.cmd install`, ou habilite scripts no PowerShell:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
</details>

---

## 📱 PWA (Progressive Web App)

| Recurso | Arquivo / implementação |
| --- | --- |
| Manifesto | `public/manifest.json` (`standalone`, ícones, atalho *Jogar agora*) |
| Ícones | 192×192, 512×512, maskable e Apple Touch (gerados em `scripts/generate-icons.js`) |
| Service Worker | `public/sw.js` |
| App shell offline | Pré-cache do jogo (HTML, CSS, JS, ícones e `offline.html`) |
| Instalação | Adicione à tela inicial / instale pelo navegador |

**Como instalar**
- **Android/Chrome:** menu ⋮ → **Instalar app**.
- **iPhone/iPad (Safari):** **Compartilhar** → **Adicionar à Tela de Início**.
- **Desktop (Chrome/Edge):** ícone de instalação na barra de endereços.

> O site precisa estar em **HTTPS** (o Render já fornece) para o Service Worker e a instalação funcionarem. `localhost` também é considerado contexto seguro.

---

## ☁️ Publicar no Render

O deploy já está configurado pelo `render.yaml` (serviço web `jumanji-ultima-fase`, runtime Node, plano free, região `oregon`).

### Blueprint (recomendado)

1. Publique o código no GitHub.
2. No painel do Render: **New +** → **Blueprint** → selecione o repositório → **Connect**.
3. Confirme o serviço `jumanji-ultima-fase` e clique em **Apply**.
4. Aguarde o build (`npm ci`) e o deploy. A URL será `https://jumanji-ultima-fase.onrender.com`.
5. Confirme `https://SUA-URL/healthz` → `{"status":"ok", ...}` e abra a raiz para jogar.

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | apenas para a API legada | string de conexão PostgreSQL |
| `PORT` | não | porta HTTP (o Render injeta automaticamente) |
| `NODE_ENV` | recomendado | `production` habilita cache de assets |
| `NODE_VERSION` | recomendado | `24` |

> O jogo **não** usa banco de dados. A `DATABASE_URL` só é necessária se você quiser usar a API legada do CRUD.

---

## 🐙 Repositório no GitHub

O código está publicado em um repositório público:

**https://github.com/ricardopalhano-commits/jumanji-ultima-fase**

```bash
git add .
git commit -m "descreva a alteração"
git push
```

---

## 🧪 Testes

```bash
npm test        # ou: node scripts/smoke-test.js
```

O script `scripts/smoke-test.js` sobe o servidor em uma porta aleatória e valida `healthz`, a **página inicial do jogo**, `manifest.json`, o Service Worker e os ícones do PWA, além de exercitar a API REST legada (CRUD, jogadas, ranking, persistência e exclusões).

O workflow `.github/workflows/ci.yml` executa os mesmos testes a cada push na `main`.

---

## 📦 App narrativo (legado)

A primeira versão do projeto era uma **aventura narrativa** com CRUD de aventureiros, fases e rolagem de dado. Ela foi **retirada do site** quando o jogo de plataforma virou a interface principal, mas o código continua guardado em **`legacy/`** (front-end) e em **`server/`** (API). A rota `/api/*` permanece disponível para quem quiser consultar os dados.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte [LICENSE](LICENSE).
