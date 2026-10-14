import type { IsoDate, ItemList, TeamCalendarEntry } from '@leaveflow/contracts';
import { http } from '@/shared/api/http';

export const teamPlanningApi = {
  async calendar(from: IsoDate, to: IsoDate): Promise<TeamCalendarEntry[]> {
    return (await http.get<ItemList<TeamCalendarEntry>>('/team-calendar', { params: { from, to } }))
      .data.items;
  },
};
