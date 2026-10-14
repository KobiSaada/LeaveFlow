import type {
  IsoDate,
  Page,
  TeamCalendarEntry,
  VacationRequestDto,
  VacationRequestEventDto,
  VacationRequestStatus,
} from '@leaveflow/contracts';

export interface VacationRequestListFilter {
  userId?: string;
  status?: VacationRequestStatus;
  page: number;
  pageSize: number;
}

/** Read side: denormalised DTOs (user and decider names joined), straight from SQL. */
export interface VacationRequestReadRepository {
  getById(id: string): Promise<VacationRequestDto | null>;
  list(filter: VacationRequestListFilter): Promise<Page<VacationRequestDto>>;
  /** Active requests of all users intersecting [from, to] — no reason, no comments. */
  teamCalendar(from: IsoDate, to: IsoDate): Promise<TeamCalendarEntry[]>;
  events(requestId: string): Promise<VacationRequestEventDto[]>;
}
