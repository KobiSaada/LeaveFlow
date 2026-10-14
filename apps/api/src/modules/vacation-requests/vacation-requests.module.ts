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
import {
  GetTeamCalendarHandler,
  GetTeamCalendarQuery,
  GetVacationRequestEventsHandler,
  GetVacationRequestEventsQuery,
  GetVacationRequestHandler,
  GetVacationRequestQuery,
  ListMyVacationRequestsHandler,
  ListMyVacationRequestsQuery,
  ListVacationRequestsHandler,
  ListVacationRequestsQuery,
} from './application/queries/vacation-request.queries';
import { TypeOrmVacationRequestReadModel } from './infrastructure/typeorm-vacation-request-read-model';
import { TypeOrmVacationRequestRepository } from './infrastructure/typeorm-vacation-request-repository';

export function registerVacationRequestsModule(container: Container): void {
  const { commandBus, queryBus, unitOfWork, clock, dataSource } = container;
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

  const readModel = new TypeOrmVacationRequestReadModel(dataSource);
  queryBus.register<GetVacationRequestQuery>(
    GetVacationRequestQuery.type,
    new GetVacationRequestHandler(readModel),
  );
  queryBus.register<ListMyVacationRequestsQuery>(
    ListMyVacationRequestsQuery.type,
    new ListMyVacationRequestsHandler(readModel),
  );
  queryBus.register<ListVacationRequestsQuery>(
    ListVacationRequestsQuery.type,
    new ListVacationRequestsHandler(readModel),
  );
  queryBus.register<GetTeamCalendarQuery>(
    GetTeamCalendarQuery.type,
    new GetTeamCalendarHandler(readModel),
  );
  queryBus.register<GetVacationRequestEventsQuery>(
    GetVacationRequestEventsQuery.type,
    new GetVacationRequestEventsHandler(readModel),
  );
}
