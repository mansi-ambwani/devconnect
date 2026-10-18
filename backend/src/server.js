import { config } from './config.js';
import { createApp } from './app.js';
import { migrate, waitForDb, pool } from './db/index.js';

async function start() {
  await waitForDb();
  await migrate();
  console.log('Database ready (tables created/verified)');

  const app = createApp();
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`DevConnect API listening on port ${config.port}`);
  });

  const shutdown = () => {
    console.log('Shutting down...');
    server.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
