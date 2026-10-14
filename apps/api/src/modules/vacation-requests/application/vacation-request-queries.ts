import type {
  IsoDate,
  Page,
  TeamCalendarEntry,
  VacationRequestDto,
  VacationRequestEventDto,
  VacationRequestStatus,
} from '@leaveflow/contracts';
import type { Principal } from '../../../shared/application/principal';
import { VacationRequestNotFoundError } from '../domain/vacation-request.errors';
import type { VacationRequestReadModel } from './ports/vacation-request-read-model';

export interface PageRequest {
  page: number;
  pageSize: number;
}

/**
 * Read side of vacation requests. Reads change nothing, so they are plain service methods —
 * commands, the bus and the unit of work are reserved for state changes.
 */
export class VacationRequestQueries {
  constructor(private readonly readModel: VacationRequestReadModel) {}

  async getById(viewer: Principal, id: string): Promise<VacationRequestDto> {
    const request = await this.readModel.getById(id);
    this.assertVisibleTo(viewer, request);
    return request;
  }

  /** The caller's own requests. The scope comes from the token only — never from client input. */
  listMine(
    viewer: Principal,
    { page, pageSize }: PageRequest,
    status?: VacationRequestStatus,
  ): Promise<Page<VacationRequestDto>> {
    return this.readModel.list({ userId: viewer.userId, status, page, pageSize });
  }

  listAll(
    { page, pageSize }: PageRequest,
    filter: { status?: VacationRequestStatus; userId?: string },
  ): Promise<Page<VacationRequestDto>> {
    return this.readModel.list({ ...filter, page, pageSize });
  }

  teamCalendar(from: IsoDate, to: IsoDate): Promise<TeamCalendarEntry[]> {
    return this.readModel.teamCalendar(from, to);
  }

  async events(viewer: Principal, id: string): Promise<VacationRequestEventDto[]> {
    this.assertVisibleTo(viewer, await this.readModel.getById(id));
    return this.readModel.events(id);
  }

  /**
   * A requester may only see their own requests. Someone else's request answers 404, not 403,
   * so the response does not confirm that the id exists.
   */
  private assertVisibleTo(
    viewer: Principal,
    request: VacationRequestDto | null,
  ): asserts request is VacationRequestDto {
    if (!request || (viewer.role === 'REQUESTER' && request.userId !== viewer.userId)) {
      throw new VacationRequestNotFoundError();
    }
  }
}
