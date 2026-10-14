import type { ItemList, VacationRequestEventDto } from '@leaveflow/contracts';
import { http } from '@/shared/api/http';

/** Endpoints shared by several features (request history is shown to requesters and validators). */
export const vacationRequestsApi = {
  async events(id: string): Promise<VacationRequestEventDto[]> {
    return (await http.get<ItemList<VacationRequestEventDto>>(`/vacation-requests/${id}/events`))
      .data.items;
  },
};
