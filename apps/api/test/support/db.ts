import { randomUUID } from 'node:crypto';
import type { UserRole } from '@leaveflow/contracts';
import type { DataSource } from 'typeorm';
import { getDataSource } from '../../src/shared/database/data-source';

export function testDataSource(): Promise<DataSource> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set');
  return getDataSource(url);
}

/** Inserts a user with a unique email straight into the table; returns its id. */
export async function insertUserRow(
  ds: DataSource,
  overrides: { role?: UserRole; email?: string; name?: string; passwordHash?: string } = {},
): Promise<string> {
  const id = randomUUID();
  await ds.query(
    `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
    [
      id,
      overrides.name ?? `Test User ${id.slice(0, 8)}`,
      overrides.email ?? `user-${id}@test.leaveflow.dev`,
      overrides.passwordHash ?? 'not-a-real-hash',
      overrides.role ?? 'REQUESTER',
    ],
  );
  return id;
}
