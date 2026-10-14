import type { TeamCalendarEntry } from '@leaveflow/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { teamPlanningApi } from './team-planning.api';
import { useTeamPlanningStore } from './team-planning.store';

vi.mock('./team-planning.api', () => ({ teamPlanningApi: { calendar: vi.fn() } }));
const api = vi.mocked(teamPlanningApi);

const entry = (id: string, userId: string, userName: string): TeamCalendarEntry => ({
  id,
  userId,
  userName,
  startDate: '2026-11-09',
  endDate: '2026-11-13',
  status: 'APPROVED',
});

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
});

describe('team-planning store', () => {
  it('requests the whole month', async () => {
    api.calendar.mockResolvedValue([]);
    const store = useTeamPlanningStore();
    await store.load('2026-11');
    expect(api.calendar).toHaveBeenCalledWith('2026-11-01', '2026-11-30');
    expect(store.bounds?.days).toHaveLength(30);
  });

  it('groups vacations into one row per person, sorted by name', async () => {
    api.calendar.mockResolvedValue([
      entry('1', 'b', 'Bob Levi'),
      entry('2', 'a', 'Alice Cohen'),
      entry('3', 'b', 'Bob Levi'),
    ]);
    const store = useTeamPlanningStore();
    await store.load('2026-11');
    expect(store.rows.map((r) => [r.userName, r.entries.length])).toEqual([
      ['Alice Cohen', 1],
      ['Bob Levi', 2],
    ]);
  });
});
