import type { Container } from '../../bootstrap/container';
import { TypeOrmUserRepository } from '../users/infrastructure/typeorm-user-repository';
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
import { TypeOrmVacationRequestRepository } from './infrastructure/typeorm-vacation-request-repository';

export function registerVacationRequestsModule(container: Container): void {
  const { commandBus, unitOfWork, clock, dataSource } = container;
  const requests = new TypeOrmVacationRequestRepository();
  const decider = new VacationRequestDecider(
    unitOfWork,
    requests,
    new TypeOrmUserRepository(dataSource),
    clock,
  );

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
}
