<script setup lang="ts">
import { compareIsoDates, type IsoDate, type TeamCalendarEntry } from '@leaveflow/contracts';
import { CircleCheck, Clock3 } from 'lucide-vue-next';
import { computed } from 'vue';
import UserAvatar from '@/shared/components/ui/UserAvatar.vue';
import { addDays } from '@leaveflow/contracts';
import { formatVacation, isWeekend, weekdayInitial } from '@/shared/utils/dates';
import type { TeamRow } from '../team-planning.store';

/** Month grid: one row per person, one column per day, a bar per vacation clipped to the month. */
const props = defineProps<{
  bounds: { from: IsoDate; to: IsoDate; days: IsoDate[] };
  rows: TeamRow[];
  today: IsoDate;
  loading?: boolean;
}>();

const columns = computed(() => ({
  gridTemplateColumns: `repeat(${props.bounds.days.length}, minmax(0, 1fr))`,
}));

function barStyle(entry: TeamCalendarEntry): Record<string, string> {
  const { from, to, days } = props.bounds;
  // The end date is the first day back at work, so the bar stops the day before (SPEC-005).
  const lastDayOff = addDays(entry.endDate, -1);
  const start = compareIsoDates(entry.startDate, from) < 0 ? from : entry.startDate;
  const end = compareIsoDates(lastDayOff, to) > 0 ? to : lastDayOff;
  return { gridColumn: `${days.indexOf(start) + 1} / ${days.indexOf(end) + 2}` };
}
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"
    :class="{ 'opacity-60': loading }"
  >
    <div class="min-w-[46rem]">
      <!-- Day header -->
      <div
        class="grid grid-cols-[8.5rem_1fr] sm:grid-cols-[11rem_1fr] border-b border-slate-200 bg-slate-50/80 text-[10px] text-slate-500"
      >
        <div class="px-4 py-2 text-xs font-semibold text-slate-600">Employee</div>
        <div class="grid" :style="columns" aria-hidden="true">
          <div
            v-for="day in bounds.days"
            :key="day"
            class="py-1.5 text-center"
            :class="{ 'bg-slate-100/70': isWeekend(day) }"
          >
            <div>{{ weekdayInitial(day) }}</div>
            <div
              class="mx-auto mt-0.5 flex size-5 items-center justify-center rounded-full"
              :class="day === today ? 'bg-indigo-600 font-semibold text-white' : ''"
            >
              {{ Number(day.slice(8)) }}
            </div>
          </div>
        </div>
      </div>
      <!-- One row per person -->
      <ul>
        <li
          v-for="row in rows"
          :key="row.userId"
          class="grid grid-cols-[8.5rem_1fr] sm:grid-cols-[11rem_1fr] border-b border-slate-100 last:border-0"
        >
          <div class="flex min-w-0 items-center gap-2.5 px-3 py-3 sm:px-4">
            <UserAvatar :name="row.userName" size="sm" />
            <span class="truncate text-sm font-medium text-slate-800">{{ row.userName }}</span>
          </div>
          <div class="grid min-h-14" :style="columns">
            <!-- background: weekends and today, behind the bars (same grid row) -->
            <div
              v-for="(day, index) in bounds.days"
              :key="day"
              class="self-stretch"
              :class="day === today ? 'bg-indigo-50/70' : isWeekend(day) ? 'bg-slate-100/60' : ''"
              :style="{ gridColumn: `${index + 1}`, gridRow: '1' }"
              aria-hidden="true"
            />
            <div
              v-for="entry in row.entries"
              :key="entry.id"
              class="relative z-10 mx-0.5 flex h-7 items-center gap-1 self-center truncate rounded-md px-1.5 text-[11px] font-medium shadow-xs"
              :class="
                entry.status === 'APPROVED'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                  : 'border border-dashed border-amber-400 bg-amber-50 text-amber-800'
              "
              :style="{ ...barStyle(entry), gridRow: '1' }"
              :title="`${row.userName}: ${formatVacation(entry.startDate, entry.endDate)} (${entry.status.toLowerCase()})`"
            >
              <span class="sr-only"
                >{{ formatVacation(entry.startDate, entry.endDate) }},
                {{ entry.status === 'APPROVED' ? 'approved' : 'pending' }}</span
              >
              <component
                :is="entry.status === 'APPROVED' ? CircleCheck : Clock3"
                class="size-3 shrink-0"
                aria-hidden="true"
              />
              <span class="truncate" aria-hidden="true">{{
                formatVacation(entry.startDate, entry.endDate)
              }}</span>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
