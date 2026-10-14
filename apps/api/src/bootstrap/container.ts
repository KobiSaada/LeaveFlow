import type { DataSource } from 'typeorm';
import type { AuthService } from '../modules/auth/application/auth.service';
import { JwtTokenService } from '../modules/auth/infrastructure/jwt-token-service';
import type { UsersService } from '../modules/users/application/users.service';
import type { VacationRequestQueries } from '../modules/vacation-requests/application/vacation-request-queries';
import { CommandBus, type Middleware } from '../shared/cqrs/command-bus';
import type { Clock } from '../shared/time/clock';
import { EventBus } from '../shared/cqrs/event-bus';
import type { UnitOfWork } from '../shared/cqrs/unit-of-work';
import { ApplicationError } from '../shared/errors/application-errors';
import { SystemClock } from '../shared/time/clock';
import { getDataSource } from '../shared/database/data-source';
import { TypeOrmUnitOfWork } from '../shared/database/typeorm-unit-of-work';
import { logger } from '../shared/logging/logger';
import { type AppConfig, loadConfig } from './config';
import { createModules } from './modules';

/** Infrastructure shared by every module. */
export interface CoreContainer {
  config: AppConfig;
  dataSource: DataSource;
  clock: Clock;
  tokens: JwtTokenService;
  /** Writes: every state change is a command. */
  commandBus: CommandBus;
  eventBus: EventBus;
  unitOfWork: UnitOfWork;
}

/** Reads: plain services, one per module. */
export interface AppServices {
  auth: AuthService;
  users: UsersService;
  vacationRequests: VacationRequestQueries;
}

/**
 * Composition root. Dependencies are wired by hand: no DI framework, because esbuild-based
 * tooling (tsx, cef-build) emits no decorator metadata for reflection-based injection.
 */
export interface Container extends CoreContainer {
  services: AppServices;
}

export interface ContainerOverrides {
  clock?: Clock;
}

/** Logs every command with its outcome and duration. */
const loggingMiddleware: Middleware = async (command, next) => {
  const startedAt = performance.now();
  const durationMs = () => Math.round(performance.now() - startedAt);
  try {
    const result = await next();
    logger().info(
      { command: command.type, outcome: 'success', durationMs: durationMs() },
      'command handled',
    );
    return result;
  } catch (error) {
    const expected = error instanceof ApplicationError;
    logger()[expected ? 'info' : 'error'](
      {
        command: command.type,
        outcome: 'failure',
        errorCode: expected ? error.code : 'INTERNAL_ERROR',
        durationMs: durationMs(),
      },
      'command failed',
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
  const core: CoreContainer = {
    config,
    dataSource,
    clock: overrides.clock ?? new SystemClock(config.businessTimeZone),
    tokens: new JwtTokenService(config.jwt),
    commandBus: new CommandBus([loggingMiddleware]),
    eventBus,
    unitOfWork: new TypeOrmUnitOfWork(dataSource, eventBus),
  };
  return { ...core, services: createModules(core) };
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
