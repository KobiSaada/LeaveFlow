<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { CalendarClock, ChevronLeft, ChevronRight, Sun, UsersRound } from 'lucide-vue-next';
import BaseButton from '@/shared/components/ui/BaseButton.vue';
import PageHeader from '@/shared/components/ui/PageHeader.vue';
import EmptyState from '@/shared/components/ui/EmptyState.vue';
import ErrorState from '@/shared/components/ui/ErrorState.vue';
import LoadingState from '@/shared/components/ui/LoadingState.vue';
import { formatMonth, shiftMonth, todayLocal } from '@/shared/utils/dates';
import { describeError } from '@/shared/utils/errors';
import TeamTimeline from '../components/TeamTimeline.vue';
import { useTeamPlanningStore } from '../team-planning.store';

const route = useRoute();
const router = useRouter();
const store = useTeamPlanningStore();
const { entries, rows, bounds, loading, error } = storeToRefs(store);
const today = todayLocal();

// The visible month lives in the URL (?month=YYYY-MM) so it survives refresh and sharing.
const month = computed(() =>
  typeof route.query.month === 'string' && /^\d{4}-\d{2}$/.test(route.query.month)
    ? route.query.month
    : today.slice(0, 7),
);
watch(month, (m) => store.load(m), { immediate: true });

const goTo = (delta: number) =>
  router.replace({ query: { month: shiftMonth(month.value, delta) } });
</script>

<template>
  <section>
    <PageHeader
      :icon="UsersRound"
      title="Team planning"
      description="Who is away — approved and pending vacations."
    >
      <template #actions>
        <div
          class="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs"
        >
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Previous month"
            @click="goTo(-1)"
          >
            <ChevronLeft class="size-5" aria-hidden="true" />
          </button>
          <p class="min-w-36 text-center text-sm font-semibold text-slate-800" aria-live="polite">
            {{ formatMonth(month) }}
          </p>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Next month"
            @click="goTo(1)"
          >
            <ChevronRight class="size-5" aria-hidden="true" />
          </button>
        </div>
        <BaseButton
          variant="secondary"
          size="sm"
          :icon="CalendarClock"
          :disabled="month === today.slice(0, 7)"
          @click="router.replace({ query: {} })"
        >
          Today
        </BaseButton>
      </template>
    </PageHeader>

    <div class="mb-4 flex flex-wrap gap-4 text-xs text-slate-600" aria-label="Legend">
      <span class="flex items-center gap-1.5"
        ><span class="h-3 w-6 rounded bg-gradient-to-r from-emerald-500 to-emerald-600" />
        Approved</span
      >
      <span class="flex items-center gap-1.5"
        ><span class="h-3 w-6 rounded border border-dashed border-amber-400 bg-amber-50" />
        Pending</span
      >
      <span class="flex items-center gap-1.5"
        ><span class="size-3 rounded-full bg-indigo-600" /> Today</span
      >
    </div>

    <LoadingState v-if="loading && entries.length === 0" />
    <ErrorState v-else-if="error" :message="describeError(error)" @retry="store.load(month)" />
    <EmptyState
      v-else-if="rows.length === 0"
      :icon="Sun"
      title="No one is away this month."
      description="Everyone is around — a good time to plan."
    />
    <TeamTimeline
      v-else-if="bounds"
      :bounds="bounds"
      :rows="rows"
      :today="today"
      :loading="loading"
    />
  </section>
</template>
