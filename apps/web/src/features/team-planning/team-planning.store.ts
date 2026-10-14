import { type TeamCalendarEntry } from '@leaveflow/contracts';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { type ApiError, toApiError } from '@/shared/api/http';
import { monthBounds } from '@/shared/utils/dates';
import { teamPlanningApi } from './team-planning.api';

export interface TeamRow {
  userId: string;
  userName: string;
  entries: TeamCalendarEntry[];
}

/** Who is away in a given month: one row per person, sorted by name. */
export const useTeamPlanningStore = defineStore('team-planning', () => {
  const month = ref<string | null>(null);
  const entries = shallowRef<TeamCalendarEntry[]>([]);
  const loading = ref(false);
  const error = shallowRef<ApiError | null>(null);
  let latestLoad = 0;

  const bounds = computed(() => (month.value ? monthBounds(month.value) : null));

  const rows = computed<TeamRow[]>(() => {
    const byUser = new Map<string, TeamRow>();
    for (const entry of entries.value) {
      const row = byUser.get(entry.userId) ?? {
        userId: entry.userId,
        userName: entry.userName,
        entries: [],
      };
      row.entries.push(entry);
      byUser.set(entry.userId, row);
    }
    return [...byUser.values()].sort((a, b) => a.userName.localeCompare(b.userName));
  });

  async function load(nextMonth: string): Promise<void> {
    month.value = nextMonth;
    const { from, to } = monthBounds(nextMonth);
    const current = ++latestLoad;
    loading.value = true;
    error.value = null;
    try {
      const result = await teamPlanningApi.calendar(from, to);
      if (current === latestLoad) entries.value = result;
    } catch (e) {
      if (current === latestLoad) error.value = toApiError(e);
    } finally {
      if (current === latestLoad) loading.value = false;
    }
  }

  return { month, entries, loading, error, bounds, rows, load };
});
