import type {
  CreateVacationRequestBody,
  Page,
  VacationRequestDto,
  VacationRequestStatus,
} from '@leaveflow/contracts';
import { http } from '@/shared/api/http';

export interface PageParams {
  page: number;
  pageSize: number;
}

export const myRequestsApi = {
  async list(
    params: PageParams & { status?: VacationRequestStatus },
  ): Promise<Page<VacationRequestDto>> {
    return (await http.get<Page<VacationRequestDto>>('/me/vacation-requests', { params })).data;
  },
  async create(
    body: CreateVacationRequestBody,
    idempotencyKey: string,
  ): Promise<VacationRequestDto> {
    const res = await http.post<VacationRequestDto>('/vacation-requests', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return res.data;
  },
};
