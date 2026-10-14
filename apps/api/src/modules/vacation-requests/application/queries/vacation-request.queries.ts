import type {
  IsoDate,
  Page,
  TeamCalendarEntry,
  VacationRequestDto,
  VacationRequestEventDto,
  VacationRequestStatus,
} from '@leaveflow/contracts';
import { type MessageHandler, Query } from '../../../../shared/application/bus';
import type { Principal } from '../../../../shared/application/principal';
import { VacationRequestNotFoundError } from '../../domain/vacation-request.errors';
import type { VacationRequestReadModel } from './vacation-request-read-model';

/**
 * A requester may only see their own requests. Someone else's request answers 404, not 403,
 * so the response does not confirm that the id exists.
 */
function assertVisibleTo(viewer: Principal, request: { userId: string } | null): asserts request {
  if (!request || (viewer.role === 'REQUESTER' && request.userId !== viewer.userId)) {
    throw new VacationRequestNotFoundError();
  }
}

export class GetVacationRequestQuery extends Query<VacationRequestDto> {
  static readonly type = 'GetVacationRequestQuery';
  readonly type = GetVacationRequestQuery.type;
  constructor(
    readonly viewer: Principal,
    readonly id: string,
  ) {
    super();
  }
}

export class ListMyVacationRequestsQuery extends Query<Page<VacationRequestDto>> {
  static readonly type = 'ListMyVacationRequestsQuery';
  readonly type = ListMyVacationRequestsQuery.type;
  constructor(
    readonly viewer: Principal,
    readonly page: number,
    readonly pageSize: number,
    readonly status?: VacationRequestStatus,
  ) {
    super();
  }
}

export class ListVacationRequestsQuery extends Query<Page<VacationRequestDto>> {
  static readonly type = 'ListVacationRequestsQuery';
  readonly type = ListVacationRequestsQuery.type;
  constructor(
    readonly page: number,
    readonly pageSize: number,
    readonly status?: VacationRequestStatus,
    readonly userId?: string,
  ) {
    super();
  }
}

export class GetTeamCalendarQuery extends Query<TeamCalendarEntry[]> {
  static readonly type = 'GetTeamCalendarQuery';
  readonly type = GetTeamCalendarQuery.type;
  constructor(
    readonly from: IsoDate,
    readonly to: IsoDate,
  ) {
    super();
  }
}

export class GetVacationRequestEventsQuery extends Query<VacationRequestEventDto[]> {
  static readonly type = 'GetVacationRequestEventsQuery';
  readonly type = GetVacationRequestEventsQuery.type;
  constructor(
    readonly viewer: Principal,
    readonly id: string,
  ) {
    super();
  }
}

export class GetVacationRequestHandler implements MessageHandler<GetVacationRequestQuery> {
  constructor(private readonly readModel: VacationRequestReadModel) {}

  async handle({ viewer, id }: GetVacationRequestQuery): Promise<VacationRequestDto> {
    const request = await this.readModel.getById(id);
    assertVisibleTo(viewer, request);
    return request;
  }
}

export class ListMyVacationRequestsHandler implements MessageHandler<ListMyVacationRequestsQuery> {
  constructor(private readonly readModel: VacationRequestReadModel) {}

  handle({
    viewer,
    page,
    pageSize,
    status,
  }: ListMyVacationRequestsQuery): Promise<Page<VacationRequestDto>> {
    // Scope comes from the token only — never from client input.
    return this.readModel.list({ userId: viewer.userId, status, page, pageSize });
  }
}

export class ListVacationRequestsHandler implements MessageHandler<ListVacationRequestsQuery> {
  constructor(private readonly readModel: VacationRequestReadModel) {}

  handle({
    page,
    pageSize,
    status,
    userId,
  }: ListVacationRequestsQuery): Promise<Page<VacationRequestDto>> {
    return this.readModel.list({ userId, status, page, pageSize });
  }
}

export class GetTeamCalendarHandler implements MessageHandler<GetTeamCalendarQuery> {
  constructor(private readonly readModel: VacationRequestReadModel) {}

  handle({ from, to }: GetTeamCalendarQuery): Promise<TeamCalendarEntry[]> {
    return this.readModel.teamCalendar(from, to);
  }
}

export class GetVacationRequestEventsHandler implements MessageHandler<GetVacationRequestEventsQuery> {
  constructor(private readonly readModel: VacationRequestReadModel) {}

  async handle({ viewer, id }: GetVacationRequestEventsQuery): Promise<VacationRequestEventDto[]> {
    assertVisibleTo(viewer, await this.readModel.getById(id));
    return this.readModel.events(id);
  }
}
