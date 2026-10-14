/**
 * Idempotent demo seed. Safe to run any number of times:
 * users are inserted with ON CONFLICT (email) DO NOTHING.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { UserRole } from '@leaveflow/contracts';
import { createDataSource } from '../src/shared/infrastructure/database/data-source';
import { UserEntity } from '../src/modules/users/infrastructure/user.entity';

export const DEMO_PASSWORD = 'LeaveFlow!2026';

const DEMO_USERS: ReadonlyArray<{ name: string; email: string; role: UserRole }> = [
  { name: 'Alice Cohen', email: 'alice@leaveflow.dev', role: 'REQUESTER' },
  { name: 'Bob Levi', email: 'bob@leaveflow.dev', role: 'REQUESTER' },
  { name: 'Dana Mizrahi', email: 'dana@leaveflow.dev', role: 'VALIDATOR' },
  { name: 'Yossi Ben-David', email: 'yossi@leaveflow.dev', role: 'VALIDATOR' },
];

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error('DATABASE_URL is not set (copy apps/api/.env.example to apps/api/.env)');

  const dataSource = await createDataSource(url).initialize();
  try {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const result = await dataSource
      .createQueryBuilder()
      .insert()
      .into(UserEntity)
      .values(DEMO_USERS.map((user) => ({ id: randomUUID(), ...user, passwordHash })))
      .orIgnore() // ON CONFLICT DO NOTHING — keeps existing users (and their ids) intact
      .returning(['id'])
      .execute();
    // `identifiers` echoes client-generated ids even for skipped rows; RETURNING lists real inserts.
    const inserted = (result.raw as unknown[]).length;
    console.log(
      `[seed] Users: ${inserted} inserted, ${DEMO_USERS.length - inserted} already present.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('[seed] Failed:', error);
  process.exit(1);
});
