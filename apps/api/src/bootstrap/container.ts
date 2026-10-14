import type { DataSource } from 'typeorm';
import { JwtTokenService } from '../modules/auth/infrastructure/jwt-token-service';
import { CommandBus, type Middleware, QueryBus } from '../shared/application/bus';
import type { Clock } from '../shared/application/clock';
import { EventBus } from '../shared/application/event-bus';
import type { UnitOfWork } from '../shared/application/unit-of-work';
import { ApplicationError } from '../shared/domain/errors';
import { SystemClock } from '../shared/infrastructure/clock';
import { getDataSource } from '../shared/infrastructure/database/data-source';
import { TypeOrmUnitOfWork } from '../shared/infrastructure/database/typeorm-unit-of-work';
import { logger } from '../shared/infrastructure/logger';
import { type AppConfig, loadConfig } from './config';
import { registerModules } from './modules';

/**
 * Composition root. Dependencies are wired by hand: no DI container, because esbuild-based
 * tooling (tsx, cef-build) emits no decorator metadata for reflection-based injection.
 */
export interface Container {
  config: AppConfig;
  dataSource: DataSource;
  clock: Clock;
  tokens: JwtTokenService;
  commandBus: CommandBus;
  queryBus: QueryBus;
  eventBus: EventBus;
  unitOfWork: UnitOfWork;
}

export interface ContainerOverrides {
  clock?: Clock;
}

/** Logs every command/query with its outcome and duration. */
const loggingMiddleware: Middleware = async (message, kind, next) => {
  const startedAt = performance.now();
  try {
    const result = await next();
    logger().info(
      {
        [kind]: message.type,
        outcome: 'success',
        durationMs: Math.round(performance.now() - startedAt),
      },
      `${kind} handled`,
    );
    return result;
  } catch (error) {
    const expected = error instanceof ApplicationError;
    logger()[expected ? 'info' : 'error'](
      {
        [kind]: message.type,
        outcome: 'failure',
        errorCode: expected ? error.code : 'INTERNAL_ERROR',
        durationMs: Math.round(performance.now() - startedAt),
      },
      `${kind} failed`,
    );
    throw error;
  }
};

async function buildContainer(overrides: ContainerOverrides): Promise<Container> {
  const config = loadConfig();
  const dataSource = await getDataSource(config.databaseUrl);
  const eventBus = new EventBus((error, event, subscriber) => {
    logger().error(
      { err: error, eventType: event.eventType, eventId: event.eventId, subscriber },
      'event subscriber failed',
    );
  });
  const container: Container = {
    config,
    dataSource,
    clock: overrides.clock ?? new SystemClock(config.businessTimeZone),
    tokens: new JwtTokenService(config.jwt),
    commandBus: new CommandBus([loggingMiddleware]),
    queryBus: new QueryBus([loggingMiddleware]),
    eventBus,
    unitOfWork: new TypeOrmUnitOfWork(dataSource, eventBus),
  };
  registerModules(container);
  return container;
}

let containerPromise: Promise<Container> | undefined;
let overrides: ContainerOverrides = {};

/** Built once per process (per warm Lambda container), on the first request. */
export function getContainer(): Promise<Container> {
  containerPromise ??= buildContainer(overrides).catch((error: unknown) => {
    containerPromise = undefined;
    throw error;
  });
  return containerPromise;
}

/** Test hook: replace collaborators (e.g. a fixed clock); the next request rebuilds the container. */
export function configureContainer(next: ContainerOverrides): void {
  overrides = next;
  containerPromise = undefined;
}
