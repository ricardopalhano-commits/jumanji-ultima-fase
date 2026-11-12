import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDatabase, driver, initDatabase } from './db.js';
import apiRouter from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', database: driver, uptime: Math.round(process.uptime()) });
});

app.use('/api', apiRouter);

app.use(
  express.static(publicDir, {
    etag: true,
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
    setHeaders(res, filePath) {
      const file = path.basename(filePath);
      if (file === 'sw.js' || file === 'manifest.json' || file.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
      if (file === 'sw.js') {
        res.setHeader('Service-Worker-Allowed', '/');
      }
    }
  })
);

// Fallback para o app shell (o front-end é uma SPA).
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corpo da requisição não é um JSON válido.' });
  }
  console.error('[erro]', err);
  res.status(500).json({ error: 'Erro interno no servidor. Tente novamente.' });
});

async function start() {
  try {
    await initDatabase();
    console.log(`[db] conectado (${driver})`);

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Jumanji: A Última Fase disponível em http://localhost:${PORT}`);
    });

    const shutdown = (signal) => {
      console.log(`\n[app] ${signal} recebido, encerrando...`);
      server.close(async () => {
        await closeDatabase();
        process.exit(0);
      });
      setTimeout(() => process.exit(0), 8000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[app] falha ao iniciar:', error);
    process.exit(1);
  }
}

start();
