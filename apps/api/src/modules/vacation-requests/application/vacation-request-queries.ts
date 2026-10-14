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
  VacationRequestReadModel,
} from './ports/vacation-request-read-model';

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
    filter: Omit<VacationRequestListFilter, 'userId'>,
  ): Promise<Page<VacationRequestDto>> {
    return this.readModel.list({ ...filter, userId: viewer.userId });
  }

  listAll(filter: VacationRequestListFilter): Promise<Page<VacationRequestDto>> {
    return this.readModel.list(filter);
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
