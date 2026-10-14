<script setup lang="ts">
import { compareIsoDates, type IsoDate, type TeamCalendarEntry } from '@leaveflow/contracts';
import { formatRange, isWeekend, weekdayInitial } from '@/shared/utils/dates';
import type { TeamRow } from '../team-planning.store';

/** Month grid: one row per person, one column per day, a bar per vacation clipped to the month. */
const props = defineProps<{
  bounds: { from: IsoDate; to: IsoDate; days: IsoDate[] };
  rows: TeamRow[];
  today: IsoDate;
  loading?: boolean;
}>();

function barStyle(entry: TeamCalendarEntry): Record<string, string> {
  const { from, to, days } = props.bounds;
  const start = compareIsoDates(entry.startDate, from) < 0 ? from : entry.startDate;
  const end = compareIsoDates(entry.endDate, to) > 0 ? to : entry.endDate;
  return { gridColumn: `${days.indexOf(start) + 1} / ${days.indexOf(end) + 2}` };
}
</script>

<template>
  <div
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
</template>
