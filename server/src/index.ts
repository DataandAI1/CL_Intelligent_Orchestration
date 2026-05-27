import { createApp } from './app';
import { pool } from './db';

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = createApp();

const server = app.listen(PORT, HOST, () => {
  console.log(`[cl-api] listening on http://${HOST}:${PORT}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`[cl-api] received ${signal}, draining...`);
  server.close((err) => {
    if (err) {
      console.error('[cl-api] error closing server', err);
      process.exit(1);
    }
    pool.end().then(() => {
      console.log('[cl-api] pg pool closed, bye.');
      process.exit(0);
    });
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
