<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseButton from '@/shared/components/ui/BaseButton.vue';
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
    <ErrorState v-else-if="error" :message="describeError(error)" @retry="store.load(month)" />
    <EmptyState v-else-if="rows.length === 0" title="No one is away this month." />
    <TeamTimeline
      v-else-if="bounds"
      :bounds="bounds"
      :rows="rows"
      :today="today"
      :loading="loading"
    />
  </section>
</template>
