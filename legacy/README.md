# 🗂️ App narrativo (legado)

Esta pasta guarda a **primeira versão** do projeto: uma aventura narrativa com CRUD de aventureiros e fases, rolagem de dado e ranking.

Ela foi **aposentada** quando o jogo de plataforma (*Jumanji: O Tabuleiro Selvagem*) passou a ser a interface principal do site. Os arquivos ficam aqui apenas como referência histórica e **não são servidos** pelo servidor (o Express só publica a pasta `public/`).

| Arquivo | O que era |
| --- | --- |
| `index.html` | Página única com telas de CRUD, jornada, missão e ranking |
| `css/styles.css` | Design system (temas selva e pergaminho) |
| `js/app.js` | Estado, renderização e eventos da interface |
| `js/api.js` | Cliente da API REST |
| `js/format.js` | Utilitários de formatação |
| `js/pwa.js` | Registro do Service Worker e instalação |
| `js/game.js` | Primeiro modo plataforma embutido (substituído pelo `public/game.js`) |
| `jogo-style.css` | Estilo da primeira versão do jogo standalone |

> A API REST (`/api/*`) e o banco continuam no diretório `server/`, documentados no README principal.
