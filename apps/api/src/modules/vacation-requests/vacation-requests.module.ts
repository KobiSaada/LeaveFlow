import type { CoreContainer } from '../../bootstrap/container';
import type { UserRepository } from '../users/application/user-repository';
import {
  ApproveVacationRequestCommand,
  ApproveVacationRequestHandler,
} from './application/commands/approve-vacation-request.command';
import {
  CreateVacationRequestCommand,
  CreateVacationRequestHandler,
} from './application/commands/create-vacation-request.command';
import { VacationRequestDecider } from './application/commands/decide-vacation-request';
import {
  RejectVacationRequestCommand,
  RejectVacationRequestHandler,
} from './application/commands/reject-vacation-request.command';
import { VacationRequestQueries } from './application/vacation-request-queries';
import { TypeOrmVacationRequestReadModel } from './infrastructure/typeorm-vacation-request-read-model';
import { TypeOrmVacationRequestRepository } from './infrastructure/typeorm-vacation-request-repository';

/** Registers the write side (commands) and returns the read side (queries service). */
export function createVacationRequestsModule(
  core: CoreContainer,
  users: UserRepository,
): VacationRequestQueries {
  const { commandBus, unitOfWork, clock, dataSource } = core;
  const requests = new TypeOrmVacationRequestRepository();
  const decider = new VacationRequestDecider(unitOfWork, requests, users, clock);

  commandBus.register<CreateVacationRequestCommand>(
    CreateVacationRequestCommand.type,
    new CreateVacationRequestHandler(unitOfWork, requests, clock),
  );
  commandBus.register<ApproveVacationRequestCommand>(
    ApproveVacationRequestCommand.type,
    new ApproveVacationRequestHandler(decider),
  );
  commandBus.register<RejectVacationRequestCommand>(
    RejectVacationRequestCommand.type,
    new RejectVacationRequestHandler(decider),
  );

  return new VacationRequestQueries(new TypeOrmVacationRequestReadModel(dataSource));
}
