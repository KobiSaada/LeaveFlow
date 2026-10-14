<script setup lang="ts">
import { compareIsoDates, type TeamCalendarEntry } from '@leaveflow/contracts';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { type ApiError, toApiError } from '@/shared/api/http';
import { teamPlanningApi } from '../team-planning.api';
import BaseButton from '@/shared/components/ui/BaseButton.vue';
import EmptyState from '@/shared/components/ui/EmptyState.vue';
import ErrorState from '@/shared/components/ui/ErrorState.vue';
import LoadingState from '@/shared/components/ui/LoadingState.vue';
import {
  formatMonth,
  formatRange,
  isWeekend,
  monthBounds,
  shiftMonth,
  todayLocal,
  weekdayInitial,
} from '@/shared/utils/dates';
import { describeError } from '@/shared/utils/errors';

const route = useRoute();
const router = useRouter();
const today = todayLocal();

const month = computed(() =>
  typeof route.query.month === 'string' && /^\d{4}-\d{2}$/.test(route.query.month)
    ? route.query.month
    : today.slice(0, 7),
);
const bounds = computed(() => monthBounds(month.value));

const entries = ref<TeamCalendarEntry[]>([]);
const loading = ref(false);
const error = ref<ApiError | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    entries.value = await teamPlanningApi.calendar(bounds.value.from, bounds.value.to);
  } catch (e) {
    error.value = toApiError(e);
  } finally {
    loading.value = false;
  }
}
watch(month, load, { immediate: true });

const goTo = (delta: number) =>
  router.replace({ query: { month: shiftMonth(month.value, delta) } });

/** One row per person; each vacation becomes a bar clipped to the visible month. */
const rows = computed(() => {
  const byUser = new Map<
    string,
    { userId: string; userName: string; entries: TeamCalendarEntry[] }
  >();
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

function barStyle(entry: TeamCalendarEntry): Record<string, string> {
  const { from, to, days } = bounds.value;
  const start = compareIsoDates(entry.startDate, from) < 0 ? from : entry.startDate;
  const end = compareIsoDates(entry.endDate, to) > 0 ? to : entry.endDate;
  const startIndex = days.indexOf(start);
  const endIndex = days.indexOf(end);
  return { gridColumn: `${startIndex + 1} / ${endIndex + 2}` };
}
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Team planning</h1>
        <p class="text-sm text-slate-600">Who is away — approved and pending vacations.</p>
      </div>
      <div class="flex items-center gap-2">
        <BaseButton variant="secondary" size="sm" aria-label="Previous month" @click="goTo(-1)"
          >‹</BaseButton
        >
        <p class="min-w-36 text-center font-medium" aria-live="polite">{{ formatMonth(month) }}</p>
        <BaseButton variant="secondary" size="sm" aria-label="Next month" @click="goTo(1)"
          >›</BaseButton
        >
      </div>
    </div>

    <div class="mb-4 flex flex-wrap gap-4 text-xs text-slate-600" aria-label="Legend">
      <span class="flex items-center gap-1.5"
        ><span class="h-3 w-6 rounded bg-emerald-500" /> Approved</span
      >
      <span class="flex items-center gap-1.5"
        ><span class="h-3 w-6 rounded border-2 border-dashed border-amber-500 bg-amber-100" />
        Pending</span
      >
    </div>

    <LoadingState v-if="loading && entries.length === 0" />
    <ErrorState v-else-if="error" :message="describeError(error)" @retry="load" />
    <EmptyState v-else-if="rows.length === 0" title="No one is away this month." />
    <div
      v-else
      class="overflow-x-auto rounded-xl border border-slate-200 bg-white"
      :class="{ 'opacity-60': loading }"
    >
      <div class="min-w-[44rem]">
        <div
          class="grid grid-cols-[10rem_1fr] border-b border-slate-200 bg-slate-50 text-[10px] text-slate-500"
        >
          <div class="px-3 py-2 text-xs font-semibold text-slate-600">Employee</div>
          <div
            class="grid"
            :style="{ gridTemplateColumns: `repeat(${bounds.days.length}, minmax(0, 1fr))` }"
            aria-hidden="true"
          >
            <div
              v-for="day in bounds.days"
              :key="day"
              class="py-1 text-center"
              :class="{
                'bg-slate-100': isWeekend(day),
                'font-bold text-indigo-700': day === today,
              }"
            >
              <div>{{ weekdayInitial(day) }}</div>
              <div>{{ Number(day.slice(8)) }}</div>
            </div>
          </div>
        </div>
        <ul>
          <li
            v-for="row in rows"
            :key="row.userId"
            class="grid grid-cols-[10rem_1fr] border-b border-slate-100 last:border-0"
          >
            <div class="px-3 py-3 text-sm font-medium">{{ row.userName }}</div>
            <div
              class="relative grid items-center py-2"
              :style="{ gridTemplateColumns: `repeat(${bounds.days.length}, minmax(0, 1fr))` }"
            >
              <div
                v-for="entry in row.entries"
                :key="entry.id"
                class="mx-px h-6 truncate rounded px-1 text-[11px] leading-6"
                :class="
                  entry.status === 'APPROVED'
                    ? 'bg-emerald-500 text-white'
                    : 'border-2 border-dashed border-amber-500 bg-amber-100 leading-5 text-amber-900'
                "
                :style="barStyle(entry)"
                :title="`${row.userName}: ${formatRange(entry.startDate, entry.endDate)} (${entry.status.toLowerCase()})`"
              >
                <span class="sr-only"
                  >{{ formatRange(entry.startDate, entry.endDate) }},
                  {{ entry.status === 'APPROVED' ? 'approved' : 'pending' }}</span
                >
                <span aria-hidden="true">{{ entry.status === 'PENDING' ? 'Pending' : '' }}</span>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
