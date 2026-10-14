import type {
  ItemList,
  Page,
  PublicUser,
  VacationRequestDto,
  VacationRequestStatus,
} from '@leaveflow/contracts';
import { http } from '@/shared/api/http';

export interface ApprovalsQuery {
  page: number;
  pageSize: number;
  status?: VacationRequestStatus;
  userId?: string;
}

export const approvalsApi = {
  async list(params: ApprovalsQuery): Promise<Page<VacationRequestDto>> {
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
  /** Employees for the dashboard filter. */
  async listRequesters(): Promise<PublicUser[]> {
    return (await http.get<ItemList<PublicUser>>('/users', { params: { role: 'REQUESTER' } })).data
      .items;
  },
};
