import type {
  IsoDate,
  Page,
  TeamCalendarEntry,
  VacationRequestDto,
  VacationRequestEventDto,
} from '@leaveflow/contracts';
import type { Principal } from '../../../shared/security/principal';
import { VacationRequestNotFoundError } from '../domain/vacation-request.errors';
import type {
  VacationRequestListFilter,
  VacationRequestReadRepository,
} from '../repositories/vacation-request-read.repository';

/**
 * Read side of vacation requests. Reads change nothing, so they are plain service methods —
 * commands, the bus and the unit of work are reserved for state changes.
 */
export class VacationRequestsService {
  constructor(private readonly requests: VacationRequestReadRepository) {}

  async getById(viewer: Principal, id: string): Promise<VacationRequestDto> {
    const request = await this.requests.getById(id);
    this.assertVisibleTo(viewer, request);
    return request;
  }

  /** The caller's own requests. The scope comes from the token only — never from client input. */
  listMine(
    viewer: Principal,
    filter: Omit<VacationRequestListFilter, 'userId'>,
  ): Promise<Page<VacationRequestDto>> {
    return this.requests.list({ ...filter, userId: viewer.userId });
  }

  listAll(filter: VacationRequestListFilter): Promise<Page<VacationRequestDto>> {
    return this.requests.list(filter);
  }

  teamCalendar(from: IsoDate, to: IsoDate): Promise<TeamCalendarEntry[]> {
    return this.requests.teamCalendar(from, to);
  }

  async events(viewer: Principal, id: string): Promise<VacationRequestEventDto[]> {
    this.assertVisibleTo(viewer, await this.requests.getById(id));
    return this.requests.events(id);
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
