import path from 'path';
import { env } from '../config/env';

/**
 * Runs all pending UP migrations via db-migrate.
 *
 * db-migrate tracks applied migrations in a `migrations` table it creates
 * automatically. Running this on every startup is idempotent — already-applied
 * migrations are skipped.
 *
 * To roll back: `yarn workspace backend migrate:down`
 * To create a new migration: `yarn workspace backend migrate:create -- <name>`
 */
export const runMigrations = async (): Promise<void> => {
  // Trigger env validation before db-migrate reads DATABASE_URL from process.env
  void env.databaseUrl;

  // db-migrate ships CommonJS; require avoids ESM interop issues in this CJS build
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const DBMigrate = require('db-migrate') as any;

  // __dirname resolves to packages/backend/src/db (dev) or packages/backend/dist/db (prod)
  // Both resolve to packages/backend/ with ../../
  const backendRoot = path.join(__dirname, '../..');

  const dbmigrate = DBMigrate.getInstance(true, {
    config: path.join(backendRoot, 'database.json'),
    cwd: backendRoot,
    throwUncatched: true,
  }) as { up: () => Promise<void>; silence: (silent: boolean) => void };

  // Suppress db-migrate's verbose output outside development
  dbmigrate.silence(env.nodeEnv !== 'development');

  await dbmigrate.up();
  console.log('[db] Migrations applied successfully');
};

// Allow running directly: `yarn workspace backend migrate:up`
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[db] Migration failed:', err);
      process.exit(1);
    });
}
