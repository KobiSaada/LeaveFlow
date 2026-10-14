import type { IsoDate } from './dates';
import type { UserRole, VacationRequestStatus } from './enums';

/** ISO-8601 UTC timestamp, e.g. `2026-10-14T09:30:00.000Z`. */
export type IsoTimestamp = string;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface UserRef {
  id: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: PublicUser;
}

export interface VacationRequestDto {
  id: string;
  userId: string;
  userName: string;
  startDate: IsoDate;
  endDate: IsoDate;
  reason: string | null;
  status: VacationRequestStatus;
  comments: string | null;
  decidedBy: UserRef | null;
  decidedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** Team-planning projection: deliberately carries no reason or comments. */
export interface TeamCalendarEntry {
  id: string;
  userId: string;
  userName: string;
  startDate: IsoDate;
  endDate: IsoDate;
  status: Extract<VacationRequestStatus, 'PENDING' | 'APPROVED'>;
}

export interface VacationRequestEventDto {
  id: string;
  eventType: 'VacationRequestCreated' | 'VacationRequestApproved' | 'VacationRequestRejected';
  actor: UserRef;
  occurredAt: IsoTimestamp;
}

export interface PageInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface Page<T> {
  items: T[];
  pageInfo: PageInfo;
}

export interface ItemList<T> {
  items: T[];
}
