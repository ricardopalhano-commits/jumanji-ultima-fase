# 🗺️ Jumanji: A Última Fase

Jogo de **aventura narrativa** inspirado em *Jumanji: Próxima Fase*, com **CRUD completo** de aventureiros e fases, banco de dados relacional, API REST e **PWA instalável** — desenvolvido com HTML, CSS e JavaScript puro no front-end, Node.js no back-end e publicado no **Render**.

> Projeto acadêmico desenvolvido com apoio do **OpenCode (IA)** como ferramenta de desenvolvimento.

<p>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white" />
  <img alt="Express" src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-instalável-5A0FC8?logo=pwa&logoColor=white" />
  <img alt="Render" src="https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white" />
  <a href="https://github.com/ricardopalhano-commits/jumanji-ultima-fase/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ricardopalhano-commits/jumanji-ultima-fase/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="Licença" src="https://img.shields.io/badge/licença-MIT-blue" />
</p>

---

## 🔗 Links do projeto

| O que | Link |
| --- | --- |
| 🌐 Jogo funcionando (Render) | `https://SEU-APP.onrender.com` |
| 💻 Repositório público (GitHub) | [github.com/ricardopalhano-commits/jumanji-ultima-fase](https://github.com/ricardopalhano-commits/jumanji-ultima-fase) |

> **Importante:** o link do Render será preenchido depois do deploy. O passo a passo está em
> [Publicar no Render](#-publicar-no-render).

---

## 📌 Sobre o projeto

**Jumanji: A Última Fase** transforma o clássico CRUD em um jogo: o usuário cadastra aventureiros, monta as fases da campanha e joga de verdade, rolando um dado percentual a cada capítulo.

A história segue o clima do filme:

1. **O Despertar no Deserto** — encontrar a rota entre as dunas;
2. **Fuga das Avestruzes** — escapar da manada gigante;
3. **O Bazar dos Capangas** — abrir caminho entre os capangas de Jurgen;
4. **A Ponte dos Mandris** — atravessar a selva sob os olhos dos guardiões;
5. **O Acampamento de Jurgen** — cruzar o pátio sem ser visto;
6. **Jurgen, o Brutal** — a luta final pelo Coração da Selva.

Cada jogada rende **gemas** em caso de vitória, custa **uma vida** em caso de derrota e movimenta o **ranking da selva**. Quem perde as três vidas é eliminado — mas pode reiniciar a jornada.

---

## ✨ Funcionalidades

### CRUD completo (3 entidades)
- **Aventureiros (`players`)**: criar, listar, editar, reiniciar jornada e excluir, com nome, avatar, vidas, gemas e progresso.
- **Fases (`missions`)**: criar, listar, editar, ativar/desativar e excluir capítulos, com cenário, inimigo, abordagem recomendada, dificuldade, recompensa, textos de introdução/vitória/derrota e posição na campanha.
- **Tentativas (`attempts`)**: cada jogada é registrada no banco (fase, resultado, dado, chance e gemas) e aparece no **diário de bordo**.
- Validação no cliente **e** no servidor, mensagens por campo, diálogos de confirmação e *toasts* de feedback.

### Jogo
- 5 avatares inspirados no filme, cada um com **força, agilidade e conhecimento** (0–5).
- Escolha entre **três abordagens** por fase; o atributo do avatar e a dificuldade mudam a chance.
- **Dado de 1 a 100** com animação e diálogo de resultado (vitória, derrota, eliminação ou vitória final).
- Progressão automática: vencer libera o próximo capítulo; perder custa uma vida.
- **Reiniciar jornada** restaura vidas, zera gemas/progresso e apaga o diário.
- **Ranking** por gemas e capítulos, com pódio, estatísticas gerais e status (*Pronto*, *Em aventura*, *Lenda da selva*, *Sem vidas*).

### Mundo Jumanji (modo plataforma)
- **Novo modo de jogo** inspirado em Mario: o aventureiro corre, pula, esmaga inimigos e enfrenta obstáculos.
- **Inimigos para derrotar**: mandris (guardiões de madeira), raptor velociraptor e o **T-Rex de Jurgen** (chefe com 3 fases de golpe — esmague com quedas).
- **Obstáculos**: buracos no terreno, rajadas de areia (pedras) e o próprio deserto.
- **Moedas de gema** espalhadas pela trilha; coletar soma pontos.
- **Vitória**: derrotar o T-Rex de Jurgen e alcançar o **portal dourado**.
- **Controles**: `←`/`→` ou `WASD` para correr, `Espaço`/`W` para pular; controles touch (mobile) incluídos.
- **HUD**: vidas (3 corações), gemas, pontuação e fase; telas de início, fim do tabuleiro e vitória.

### Interface
- Layout **responsivo** (desktop, tablet e celular), com linha do tempo da jornada e painel da fase.
- **No celular**, a navegação vira uma **barra inferior fixa** com ícones e rótulos, o cabeçalho fica compacto, os diálogos ocupam a tela e as áreas seguras de iPhone (`safe-area-inset`) são respeitadas.
- **No desktop**, a navegação permanece no topo e os painéis usam layouts em duas colunas.
- **Tema selva** (escuro) e **tema pergaminho** (claro), com preferência salva em `localStorage`.
- Ilustrações e ícones em **CSS/SVG** (sem imagens externas), tipografia serifada e animações discretas.
- Acessibilidade: `dialog`, `fieldset`, `aria-*`, foco visível, atalho para pular conteúdo e respeito a `prefers-reduced-motion`.
- Estados vazios, carregamento, erros e aviso de conexão.

### PWA
- `manifest.json` completo (nome, ícones 192/512 + maskable, tema, `standalone` e atalhos).
- **Service Worker** com pré-cache do app shell e cache das respostas da API.
- **Instalável** em Android, iPhone/iPad e desktop (botão *Instalar* quando disponível).
- Funciona **offline** para abrir o jogo e consultar os últimos dados sincronizados.
- `offline.html` como fallback e aviso de nova versão.

### Qualidade
- API REST documentada, com validação e códigos HTTP corretos.
- Consultas SQL **parametrizadas** (proteção contra SQL injection).
- Testes de fumaça automatizados (`npm test`) cobrindo CRUD, jornada, jogada, reset e persistência.
- **CI no GitHub Actions** e nenhuma credencial versionada.
- **Auditoria Lighthouse** (Chrome, mobile): **Acessibilidade 100**, **Boas práticas 100** e **SEO 100** nos temas claro e escuro.

---

## 🧰 Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Front-end | HTML5, CSS3 (design system próprio, grid/flex, temas), JavaScript ES Modules (sem framework) |
| Back-end | Node.js 24, Express 4 |
| Banco de dados | **PostgreSQL** em produção · **SQLite** (`node:sqlite`) no desenvolvimento local |
| PWA | `manifest.json`, Service Worker, Cache Storage, instalação e modo offline |
| Deploy | **Render** (Web Service + PostgreSQL) com `render.yaml` (Blueprint) |
| CI | GitHub Actions |
| Ferramenta de IA | OpenCode |

Não há etapa de build: o Express entrega os arquivos estáticos e a API. Isso mantém o projeto simples de entender, executar e avaliar.

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│ Navegador (PWA)                                                 │
│  HTML + CSS + JS (modules) ── Service Worker (cache offline)    │
│         │ fetch JSON                                            │
└─────────┼───────────────────────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Node.js + Express                                               │
│  /api/players   (CRUD + journey + play + reset)                 │
│  /api/missions  (CRUD das fases)                                │
│  /api/stats     (ranking e totais)                              │
│  /api/meta, /api/health                                         │
│  static: /public (HTML, CSS, JS, ícones, manifest, sw.js)       │
└─────────┬───────────────────────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Camada de dados (server/db.js)                                  │
│  DATABASE_URL definida  → PostgreSQL (pg)                       │
│  DATABASE_URL vazia     → SQLite local (node:sqlite)            │
└─────────────────────────────────────────────────────────────────┘
```

A camada `server/db.js` traduz parâmetros nomeados (`:nome`) para o driver em uso, então as mesmas consultas funcionam nos dois bancos. Na primeira execução as tabelas são criadas automaticamente e, se o banco estiver vazio, as 6 fases e 3 aventureiros de exemplo são inseridos (`SEED=false` desativa).

---

## 📁 Estrutura do projeto

```
.
├── package.json                # scripts, dependências e metadados
├── render.yaml                 # Blueprint do Render (web + PostgreSQL)
├── .env.example                # exemplo de variáveis de ambiente
├── public/                     # tudo o que vai para o navegador
│   ├── index.html              # app shell, telas e diálogos
│   ├── manifest.json           # manifesto PWA
│   ├── sw.js                   # Service Worker (cache/offline)
│   ├── offline.html            # página de fallback offline
│   ├── robots.txt
│   ├── css/styles.css          # design system, temas e responsividade
│   ├── js/
│   │   ├── app.js              # estado, renderização e eventos da interface
│   │   ├── api.js              # cliente da API + tratamento de erros
│   │   ├── format.js           # números, datas, rótulos e utilidades
│   │   ├── game.js             # modo plataforma "Mundo Jumanji" (canvas, física, inimigos)
│   │   └── pwa.js              # registro do SW e instalação
│   └── icons/                  # ícones PNG/SVG (gerados por script)
├── server/
│   ├── index.js                # Express, estáticos, health check, erros
│   ├── db.js                   # conexão, schema, seed e queries
│   ├── game.js                 # avatares, cenas, desafios e cálculo de chance
│   ├── seed.js                 # fases da história, aventureiros e epílogo
│   ├── validate.js             # validação/normalização de players e missions
│   └── routes/api.js           # rotas REST, jornada e ranking
├── scripts/
│   ├── generate-icons.js       # gera os ícones do PWA sem dependências
│   └── smoke-test.js           # testes de CRUD, jogo e persistência
└── .github/workflows/ci.yml    # integração contínua
```

---

## 🚀 Como rodar localmente

### Pré-requisitos
- **Node.js 24 ou superior** (recomendado; o modo SQLite local usa `node:sqlite`).
- Nenhum banco instalado é necessário: sem `DATABASE_URL`, o app usa SQLite em `./data/jumanji.db`.

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

Abra **http://localhost:3000**.

```bash
npm run dev    # reinicia automaticamente ao salvar (node --watch)
npm test       # testes de fumaça da API (CRUD + jogo + persistência)
npm run icons  # regenera os ícones do PWA
```

<details>
<summary><strong>Usando PostgreSQL também no ambiente local</strong></summary>

```bash
# PowerShell
$env:DATABASE_URL="postgresql://usuario:senha@localhost:5432/jumanji"
npm start

# bash/zsh
DATABASE_URL="postgresql://usuario:senha@localhost:5432/jumanji" npm start
```
Também é possível usar `node --env-file=.env server/index.js` com um arquivo `.env` baseado em `.env.example`.
</details>

<details>
<summary><strong>Windows: erro “execução de scripts foi desabilitada” ao usar npm</strong></summary>

Use `npm.cmd` em vez de `npm`, por exemplo `npm.cmd install`, ou habilite scripts no PowerShell:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
</details>

---

## 🎲 Regras do jogo

| Elemento | Regra |
| --- | --- |
| Vidas iniciais | **3** |
| Chance de sucesso | `45 + atributo × 7 − dificuldade × 3 + 5 (se abordagem recomendada)`, limitada entre **15% e 92%** |
| Dado | número aleatório de **1 a 100**; sucesso quando `dado ≤ chance` |
| Vitória | soma a recompensa em gemas e avança um capítulo |
| Derrota | perde 1 vida e mantém o capítulo |
| Eliminação | 0 vidas → status *Sem vidas*; é preciso reiniciar a jornada |
| Vitória final | concluir todos os capítulos ativos → status *Lenda da selva* e epílogo |

### Avatares

| Avatar | Perfil | Força | Agilidade | Conhecimento |
| --- | --- | :---: | :---: | :---: |
| Smolder Bravestone | Arqueólogo e fortão | 5 | 2 | 2 |
| Ruby Roundhouse | Dançarina e lutadora | 2 | 5 | 2 |
| Mouse Finbar | Zoólogo e mochileiro | 2 | 2 | 5 |
| Shelly Oberon | Cartógrafa e estrategista | 2 | 3 | 4 |
| Ming Fleetfoot | Ladra e especialista em fugas | 3 | 4 | 2 |

---

## 🗄️ Banco de dados

### Tabela `players`

| Coluna | Tipo (PostgreSQL) | Regras |
| --- | --- | --- |
| `id` | `INTEGER GENERATED ALWAYS AS IDENTITY` | chave primária |
| `name` | `VARCHAR(40)` | obrigatório, 2–40 caracteres |
| `avatar` | `VARCHAR(20)` | chave de um dos 5 avatares |
| `lives` | `INTEGER` | 0–3, padrão 3 |
| `gems` | `INTEGER` | ≥ 0, padrão 0 |
| `progress` | `INTEGER` | capítulos concluídos, ≥ 0 |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | padrão `NOW()` |

### Tabela `missions`

| Coluna | Tipo (PostgreSQL) | Regras |
| --- | --- | --- |
| `id` | `INTEGER GENERATED ALWAYS AS IDENTITY` | chave primária |
| `order_index` | `INTEGER` | posição na campanha |
| `title` | `VARCHAR(80)` | obrigatório |
| `scene` | `VARCHAR(20)` | `deserto`, `bazar`, `selva` ou `fortaleza` |
| `enemy` | `VARCHAR(60)` | inimigo/obstáculo |
| `challenge` | `VARCHAR(20)` | `forca`, `agilidade` ou `conhecimento` |
| `difficulty` | `INTEGER` | 1–10 |
| `reward` | `INTEGER` | 0–1000 gemas |
| `intro` | `TEXT` | introdução da fase |
| `success_text` | `TEXT` | narrativa de vitória |
| `failure_text` | `TEXT` | narrativa de derrota |
| `is_active` | `BOOLEAN` | fase entra ou não na campanha |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | padrão `NOW()` |

### Tabela `attempts`

| Coluna | Tipo (PostgreSQL) | Regras |
| --- | --- | --- |
| `id` | `INTEGER GENERATED ALWAYS AS IDENTITY` | chave primária |
| `player_id` | `INTEGER` | FK → `players` (`ON DELETE CASCADE`) |
| `mission_id` | `INTEGER` | fase jogada |
| `mission_title` | `VARCHAR(80)` | título no momento da jogada |
| `result` | `VARCHAR(10)` | `vitoria` ou `derrota` |
| `roll` / `chance` | `INTEGER` | dado e chance usados |
| `gems` | `INTEGER` | gemas ganhas |
| `created_at` | `TIMESTAMPTZ` | padrão `NOW()` |

### Persistência
- **Produção:** PostgreSQL gerenciado pelo Render — os dados continuam após reinícios e novos deploys.
- **Desenvolvimento:** arquivo `data/jumanji.db` (ignorado pelo Git).
- O schema é criado automaticamente no start (`CREATE TABLE IF NOT EXISTS`).

> ℹ️ O plano **free** do PostgreSQL no Render expira após alguns dias. Para uma demonstração de longo prazo, use um PostgreSQL gratuito externo (ex.: Neon) e configure `DATABASE_URL` manualmente — veja [Deploy no Render](#-publicar-no-render).

---

## 🔌 API REST

Base: `http://localhost:3000/api`

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/health` | status da API, do banco e contadores |
| `GET` | `/meta` | avatares, cenários, desafios e vidas máximas |
| `GET` | `/stats` | totais, ranking e jogadas recentes |
| `GET` | `/players?q=` | lista aventureiros (busca por nome) |
| `POST` | `/players` | cria um aventureiro |
| `GET` | `/players/:id` | detalhe de um aventureiro |
| `PUT` | `/players/:id` | edita nome e avatar |
| `DELETE` | `/players/:id` | exclui o aventureiro e seu diário |
| `GET` | `/players/:id/journey` | jornada, capítulos liberados e chances |
| `POST` | `/players/:id/play` | rola o dado na fase atual |
| `POST` | `/players/:id/reset` | reinicia vidas, gemas, progresso e diário |
| `GET` | `/missions` | lista as fases da campanha |
| `POST` | `/missions` | cria uma fase |
| `PUT` | `/missions/:id` | atualiza uma fase |
| `DELETE` | `/missions/:id` | exclui uma fase |

### Exemplo — criar aventureiro

```bash
curl -X POST http://localhost:3000/api/players \
  -H "Content-Type: application/json" \
  -d '{ "name": "Nina", "avatar": "mouse" }'
```

```json
{
  "id": 4,
  "name": "Nina",
  "avatar": "mouse",
  "lives": 3,
  "gems": 0,
  "progress": 0,
  "status": "pronto",
  "totalMissions": 6,
  "percent": 0
}
```

### Exemplo — jogar a fase atual

```bash
curl -X POST http://localhost:3000/api/players/4/play \
  -H "Content-Type: application/json" \
  -d '{ "approach": "conhecimento" }'
```

```json
{
  "outcome": {
    "success": true,
    "roll": 40,
    "chance": 64,
    "approach": "conhecimento",
    "approachName": "Conhecimento",
    "recommended": true,
    "gemsEarned": 10,
    "livesLost": 0,
    "narrative": "Lendo as inscrições do obelisco, você descobre que as sombras marcam o caminho…",
    "eliminated": false,
    "victory": false
  },
  "journey": {
    "player": { "gems": 10, "lives": 3, "progress": 1, "status": "em_jogo" },
    "current": { "title": "Fuga das Avestruzes", "chances": { "forca": 33, "agilidade": 68, "conhecimento": 33 } },
    "attempts": []
  }
}
```

### Erros

| Código | Quando acontece |
| --- | --- |
| `400` | JSON inválido |
| `404` | aventureiro/fase/rota inexistente |
| `409` | jogada bloqueada (sem vidas, fase não liberada ou campanha concluída) |
| `422` | validação de campos (retorna `fields` com a mensagem de cada campo) |
| `500` | erro inesperado no servidor |

```json
{
  "error": "Verifique os campos destacados.",
  "fields": {
    "difficulty": "A dificuldade deve ser um número entre 1 e 10."
  }
}
```

---

## 📱 PWA (Progressive Web App)

### Recursos implementados

| Recurso | Arquivo / implementação |
| --- | --- |
| Manifesto | `public/manifest.json` (`standalone`, ícones, atalhos) |
| Ícones | 192×192, 512×512, maskable e Apple Touch (gerados em `scripts/generate-icons.js`) |
| Service Worker | `public/sw.js` registrado em `public/js/pwa.js` |
| App shell offline | Pré-cache de HTML, CSS, JS, ícones e `offline.html` |
| Dados offline | Respostas `GET /api/*` em cache (network-first com fallback) |
| Instalação | `beforeinstallprompt` + orientação para iOS |
| Atualização | Aviso de nova versão quando o SW é atualizado |

### Estratégias de cache

| Requisição | Estratégia |
| --- | --- |
| Navegação (HTML) | network-first → cache → `offline.html` |
| `GET /api/*` | network-first → cache da última resposta |
| CSS, JS, ícones | stale-while-revalidate |
| Escritas (`POST`/`PUT`/`DELETE`) | sempre na rede; cache da API é limpo após sucesso |

### Como instalar

- **Android/Chrome:** abra o site → menu ⋮ → **Instalar app** (ou use o botão *Instalar* no cabeçalho).
- **iPhone/iPad (Safari):** botão **Compartilhar** → **Adicionar à Tela de Início**.
- **Desktop (Chrome/Edge):** ícone de instalação na barra de endereços ou botão *Instalar*.

Após instalado, o jogo abre em janela própria e mantém os últimos dados disponíveis mesmo sem internet.

> O site precisa estar em **HTTPS** (o Render já fornece) para o Service Worker e a instalação funcionarem. `localhost` também é considerado contexto seguro.

---

## ☁️ Publicar no Render

### Opção A — Blueprint (recomendado, cria web + banco)

1. Publique o código no GitHub (próxima seção).
2. No painel do Render, clique em **New +** → **Blueprint**.
3. Selecione o repositório `jumanji-ultima-fase` e clique em **Connect**.
4. O Render lê o `render.yaml` e mostra o serviço **jumanji-ultima-fase** e o banco **jumanji-db**. Clique em **Apply**.
5. Aguarde o build (`npm ci`) e o deploy. A URL será algo como
   `https://jumanji-ultima-fase-xxxx.onrender.com`.
6. Acesse a URL e confirme:
   - `https://SUA-URL/healthz` responde `{"status":"ok","database":"postgres"}`;
   - o rodapé mostra **PostgreSQL • online**;
   - o CRUD e as jogadas funcionam e os dados continuam após um redeploy.

### Opção B — Manual (passo a passo pelo painel)

1. **New +** → **PostgreSQL** → plano free → copie a **Internal Database URL**.
2. **New +** → **Web Service** → conecte o repositório.
3. Configure:
   - **Runtime:** Node
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/healthz`
   - **Environment Variables:**
     | Chave | Valor |
     | --- | --- |
     | `DATABASE_URL` | Internal Database URL do Postgres (ou de um Neon) |
     | `NODE_VERSION` | `24` |
     | `NODE_ENV` | `production` |
4. **Create Web Service** e aguarde o deploy.

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | em produção | string de conexão PostgreSQL |
| `PORT` | não | porta HTTP (o Render injeta automaticamente) |
| `NODE_ENV` | recomendado | `production` habilita cache de assets |
| `SEED` | não | `false` desativa os dados de exemplo |
| `DATA_DIR` | não | diretório do SQLite local |

### Banco gratuito de longa duração (opcional)

O PostgreSQL free do Render pode expirar. Para manter os dados por mais tempo:

1. Crie um banco gratuito no [Neon](https://neon.tech) (ou outro provedor PostgreSQL).
2. Copie a connection string (inclua `?sslmode=require`).
3. No Render, edite a variável `DATABASE_URL` do serviço com essa URL e faça **Manual Deploy → Deploy latest commit**.

---

## 🐙 Repositório no GitHub

O código está publicado em um repositório público:

**https://github.com/ricardopalhano-commits/jumanji-ultima-fase**

Para enviar novas alterações:

```bash
git add .
git commit -m "descreva a alteração"
git push
```

Se precisar recriar o repositório do zero:

```bash
gh repo create jumanji-ultima-fase --public --source=. --remote=origin --push
```

---

## ✅ Checklist do trabalho

| Critério | Como foi atendido |
| --- | --- |
| **Funcionamento do sistema** | CRUD de aventureiros, fases e diário de bordo; jogo com dado, vidas, gemas e ranking; validado ponta a ponta |
| **Integração e persistência** | PostgreSQL no Render, SQLite no desenvolvimento, schema automático e teste de persistência após reinício |
| **Interface visual e responsividade** | Design system próprio (tema selva e pergaminho), linha do tempo, painel de missão, pódio e layout mobile |
| **Recursos de PWA** | `manifest.json`, Service Worker com cache, instalação, offline, atalhos e ícones maskable |
| **Organização do código** | Front-end modular (ES Modules), back-end em camadas, regras de jogo isoladas, validação e testes |
| **Publicação no Render** | `render.yaml` + instruções completas (Blueprint e manual) e health check |
| **Repositório público** | Projeto pronto para `git init`/push, com `.gitignore`, licença e README |

---

## 🧪 Testes

```bash
npm test
```

O script `scripts/smoke-test.js`:

1. sobe o servidor em uma porta aleatória com SQLite temporário e sem seed;
2. valida `health`, página inicial, manifest, service worker e ícone do PWA;
3. valida **rejeições 422** de aventureiro e fase;
4. cria fase e aventureiro, lista, edita e consulta a **jornada**;
5. testa **jogada inválida** e uma **jogada real**, conferindo vidas, gemas, progresso e diário;
6. confere **ranking**, **reset** e **estatísticas**;
7. **reinicia o servidor** e confirma a persistência;
8. **exclui** fase e aventureiro e confirma os `404`.

O workflow `.github/workflows/ci.yml` executa os mesmos testes a cada push na `main`.

O layout também foi verificado em larguras de **320, 360, 390, 470, 768, 1024 e 1280 px**, sem rolagem horizontal: no celular vale a barra inferior fixa; a partir de 561 px, a navegação volta ao topo.

---

## 🔐 Segurança e limitações

- Todas as queries usam **parâmetros** (`pg`/`node:sqlite`), evitando SQL injection.
- Validação e normalização acontecem no servidor, não apenas no navegador.
- Nenhum segredo é versionado: a conexão vem de `DATABASE_URL`.
- O projeto é **single-user** (sem login) por ser um trabalho acadêmico de CRUD; a autenticação é a principal evolução sugerida.
- O modo offline prioriza **leitura**: escritas exigem conexão, pois o servidor é a fonte da verdade.

### Próximos passos possíveis
- autenticação e múltiplos jogadores por conta;
- novos capítulos e chefes cadastráveis pelo próprio jogo;
- itens, inventário e efeitos especiais;
- animações e efeitos sonoros;
- exportação do ranking em CSV.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte [LICENSE](LICENSE).

---

<p align="center">
  Desenvolvido com <strong>OpenCode</strong> + IA · HTML, CSS, JavaScript, Node.js, PostgreSQL e PWA.
</p>
