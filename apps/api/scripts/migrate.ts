/**
 * Applies (`up`) or reverts the latest (`down`) migration against DATABASE_URL.
 * Usage: tsx scripts/migrate.ts up|down   (TEST=1 targets TEST_DATABASE_URL)
 */
import 'dotenv/config';
import { createDataSource } from '../src/shared/database/data-source';

async function main(): Promise<void> {
  const direction = process.argv[2] ?? 'up';
  const url = process.env.TEST === '1' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  if (!url)
    throw new Error('DATABASE_URL is not set (copy apps/api/.env.example to apps/api/.env)');

  const dataSource = await createDataSource(url).initialize();
  try {
    if (direction === 'up') {
      const applied = await dataSource.runMigrations({ transaction: 'each' });
      console.log(
        applied.length
          ? `[migrate] Applied: ${applied.map((m) => m.name).join(', ')}`
          : '[migrate] Schema is up to date.',
      );
    } else if (direction === 'down') {
      await dataSource.undoLastMigration({ transaction: 'each' });
      console.log('[migrate] Reverted the latest migration.');
    } else {
      throw new Error(`Unknown direction "${direction}" (expected up|down)`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('[migrate] Failed:', error);
  process.exit(1);
});
