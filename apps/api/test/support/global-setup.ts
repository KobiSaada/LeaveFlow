import { config as loadDotenv } from 'dotenv';
import { createDataSource } from '../../src/shared/database/data-source';

/** Rebuilds the test database from migrations once per integration run. */
export default async function globalSetup(): Promise<void> {
  loadDotenv({ quiet: true });
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set (see apps/api/.env.example)');
  const dataSource = await createDataSource(url).initialize();
  try {
    await dataSource.query('DROP SCHEMA public CASCADE');
    await dataSource.query('CREATE SCHEMA public');
    await dataSource.runMigrations({ transaction: 'each' });
  } finally {
    await dataSource.destroy();
  }
}
