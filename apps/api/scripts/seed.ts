/**
 * Idempotent demo seed. Safe to run any number of times:
 * - users are inserted with ON CONFLICT (email) DO NOTHING;
 * - demo vacation requests are created only when no seeded user has any request yet.
 *
 * Requests are created through the CommandBus — the same path as the API — so seed data passes
 * every business rule and produces real domain events. Dates are relative to "today".
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { addDays, type UserRole } from '@leaveflow/contracts';
import bcrypt from 'bcryptjs';
import { In } from 'typeorm';
import { getContainer } from '../src/bootstrap/container';
import type { Principal } from '../src/shared/security/principal';
import { closeDataSource } from '../src/shared/database/data-source';
import { setRootLogger } from '../src/shared/logging/logger';
import { UserEntity } from '../src/modules/users/entities/user.entity';
import { VacationRequestEntity } from '../src/modules/vacation-requests/infrastructure/vacation-request.entity';
import { ApproveVacationRequestCommand } from '../src/modules/vacation-requests/application/commands/approve-vacation-request.command';
import { CreateVacationRequestCommand } from '../src/modules/vacation-requests/application/commands/create-vacation-request.command';
import { RejectVacationRequestCommand } from '../src/modules/vacation-requests/application/commands/reject-vacation-request.command';
import pino from 'pino';

export const DEMO_PASSWORD = 'LeaveFlow!2026';

const DEMO_USERS: ReadonlyArray<{ key: string; name: string; email: string; role: UserRole }> = [
  { key: 'alice', name: 'Alice Cohen', email: 'alice@leaveflow.dev', role: 'REQUESTER' },
  { key: 'bob', name: 'Bob Levi', email: 'bob@leaveflow.dev', role: 'REQUESTER' },
  { key: 'dana', name: 'Dana Mizrahi', email: 'dana@leaveflow.dev', role: 'VALIDATOR' },
  { key: 'yossi', name: 'Yossi Ben-David', email: 'yossi@leaveflow.dev', role: 'VALIDATOR' },
];

async function main(): Promise<void> {
  setRootLogger(pino({ level: 'warn' })); // keep seed output readable
  const container = await getContainer();
  const { dataSource, commandBus, clock } = container;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const inserted = await dataSource
    .createQueryBuilder()
    .insert()
    .into(UserEntity)
    .values(
      DEMO_USERS.map(({ name, email, role }) => ({
        id: randomUUID(),
        name,
        email,
        role,
        passwordHash,
      })),
    )
    .orIgnore() // ON CONFLICT DO NOTHING — keeps existing users (and their ids) intact
    .returning(['id'])
    .execute();
  // `identifiers` echoes client-generated ids even for skipped rows; RETURNING lists real inserts.
  const insertedCount = (inserted.raw as unknown[]).length;
  console.log(
    `[seed] Users: ${insertedCount} inserted, ${DEMO_USERS.length - insertedCount} already present.`,
  );

  const rows = await dataSource
    .getRepository(UserEntity)
    .findBy({ email: In(DEMO_USERS.map((u) => u.email)) });
  const principal = (key: string): Principal => {
    const demo = DEMO_USERS.find((u) => u.key === key)!;
    const row = rows.find((r) => r.email === demo.email)!;
    return { userId: row.id, role: row.role, name: row.name };
  };

  const existing = await dataSource
    .getRepository(VacationRequestEntity)
    .countBy({ userId: In(rows.map((r) => r.id)) });
  if (existing > 0) {
    console.log(`[seed] Vacation requests: ${existing} already present — skipping demo requests.`);
    return;
  }

  const today = clock.today();
  const create = (who: string, from: number, to: number, reason: string | null) =>
    commandBus.dispatch(
      new CreateVacationRequestCommand(
        principal(who),
        addDays(today, from),
        addDays(today, to),
        reason,
        null,
      ),
    );

  const bobSummer = await create('bob', 14, 18, 'Family wedding abroad');
  await commandBus.dispatch(
    new ApproveVacationRequestCommand(principal('dana'), bobSummer.id, null),
  );

  await create('alice', 21, 25, 'Hiking trip');

  const bobRejected = await create('bob', 35, 37, 'Long weekend');
  await commandBus.dispatch(
    new RejectVacationRequestCommand(
      principal('yossi'),
      bobRejected.id,
      'Overlaps the quarterly release freeze — could you move it a week later?',
    ),
  );

  const aliceApproved = await create('alice', 45, 49, 'Conference + a few days off');
  await commandBus.dispatch(
    new ApproveVacationRequestCommand(principal('dana'), aliceApproved.id, 'Enjoy!'),
  );

  await create('bob', 60, 62, null);
  console.log(
    '[seed] Vacation requests: 5 created via commands (2 approved, 1 rejected, 2 pending).',
  );
}

main()
  .catch((error: unknown) => {
    console.error('[seed] Failed:', error);
    process.exitCode = 1;
  })
  .finally(() => closeDataSource());
