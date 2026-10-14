import type {
  CreateVacationRequestBody,
  IsoDate,
  ItemList,
  Page,
  TeamCalendarEntry,
  VacationRequestDto,
  VacationRequestEventDto,
  VacationRequestStatus,
} from '@leaveflow/contracts';
import { http } from './http';

export interface PageParams {
  page: number;
  pageSize: number;
}

export const vacationRequestsApi = {
  async create(
    body: CreateVacationRequestBody,
    idempotencyKey: string,
  ): Promise<VacationRequestDto> {
    const res = await http.post<VacationRequestDto>('/vacation-requests', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return res.data;
  },
  async listMine(
    params: PageParams & { status?: VacationRequestStatus },
  ): Promise<Page<VacationRequestDto>> {
    return (await http.get<Page<VacationRequestDto>>('/me/vacation-requests', { params })).data;
  },
  async listAll(
    params: PageParams & { status?: VacationRequestStatus; userId?: string },
  ): Promise<Page<VacationRequestDto>> {
    return (await http.get<Page<VacationRequestDto>>('/vacation-requests', { params })).data;
  },
  async approve(id: string, comment: string | null): Promise<VacationRequestDto> {
    return (await http.post<VacationRequestDto>(`/vacation-requests/${id}/approve`, { comment }))
      .data;
  },
  async reject(id: string, comment: string): Promise<VacationRequestDto> {
    return (await http.post<VacationRequestDto>(`/vacation-requests/${id}/reject`, { comment }))
      .data;
  },
  async events(id: string): Promise<VacationRequestEventDto[]> {
    return (await http.get<ItemList<VacationRequestEventDto>>(`/vacation-requests/${id}/events`))
      .data.items;
  },
  async teamCalendar(from: IsoDate, to: IsoDate): Promise<TeamCalendarEntry[]> {
    return (await http.get<ItemList<TeamCalendarEntry>>('/team-calendar', { params: { from, to } }))
      .data.items;
  },
};
