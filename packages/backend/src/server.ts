import { env } from './config/env';
import { runMigrations } from './db/migrate';
import app from './app';

async function start(): Promise<void> {
  await runMigrations();

  app.listen(env.port, () => {
    console.log(`[server] Listening on port ${env.port} (${env.nodeEnv})`);
  });
}

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
