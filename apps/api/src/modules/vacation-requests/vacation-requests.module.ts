import type { CoreContainer } from '../../bootstrap/container';
import type { UserRepository } from '../users/repositories/user.repository';
import { ApproveVacationRequestCommand } from './commands/approve-vacation-request.command';
import { ApproveVacationRequestHandler } from './commands/approve-vacation-request.handler';
import { CreateVacationRequestCommand } from './commands/create-vacation-request.command';
import { CreateVacationRequestHandler } from './commands/create-vacation-request.handler';
import { VacationRequestDecider } from './commands/vacation-request-decider';
import { RejectVacationRequestCommand } from './commands/reject-vacation-request.command';
import { RejectVacationRequestHandler } from './commands/reject-vacation-request.handler';
import { VacationRequestsService } from './services/vacation-requests.service';
import { TypeOrmVacationRequestReadRepository } from './repositories/typeorm-vacation-request-read.repository';
import { TypeOrmVacationRequestRepository } from './repositories/typeorm-vacation-request.repository';

/** Registers the write side (command handlers) and returns the read side (VacationRequestsService). */
export function createVacationRequestsModule(
  core: CoreContainer,
  users: UserRepository,
): VacationRequestsService {
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

  return new VacationRequestsService(new TypeOrmVacationRequestReadRepository(dataSource));
}
