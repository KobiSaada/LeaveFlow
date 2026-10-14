import 'reflect-metadata';
import { types as pgTypes } from 'pg';
import { DataSource } from 'typeorm';
import { InitialSchema1760432400000 } from '../../migrations/1760432400000-InitialSchema';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { VacationRequestEntity } from '../../modules/vacation-requests/infrastructure/vacation-request.entity';
import { DomainEventEntity } from './domain-event.entity';

// Return DATE columns exactly as stored ('YYYY-MM-DD'). The pg default builds a JS Date at local
// midnight, which shifts the calendar day whenever a raw query result is serialised as UTC.
const PG_DATE_OID = 1082;
pgTypes.setTypeParser(PG_DATE_OID, (value: string) => value);

/** Entities and migrations are registered as classes (not globs) so bundled builds include them. */
export function createDataSource(databaseUrl: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [UserEntity, VacationRequestEntity, DomainEventEntity],
    migrations: [InitialSchema1760432400000],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
    logging: false,
    // Small pool: one Lambda container serves one request at a time.
    extra: { max: 10 },
  });
}

let instance: { url: string; ready: Promise<DataSource> } | undefined;

/**
 * Lazily initialised, process-wide DataSource. On Lambda the promise survives across warm
 * invocations, so the connection pool is created once per container rather than per request.
 */
export function getDataSource(databaseUrl: string): Promise<DataSource> {
  if (instance?.url !== databaseUrl) {
    const ready = createDataSource(databaseUrl)
      .initialize()
      .catch((error: unknown) => {
        instance = undefined; // allow a retry on the next request
        throw error;
      });
    instance = { url: databaseUrl, ready };
  }
  return instance.ready;
}

export async function closeDataSource(): Promise<void> {
  if (!instance) return;
  const ready = instance.ready;
  instance = undefined;
  const dataSource = await ready.catch(() => undefined);
  if (dataSource?.isInitialized) await dataSource.destroy();
}
