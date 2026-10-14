<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';
import DecisionInfo from '@/features/vacation-requests/components/DecisionInfo.vue';
import RequestHistory from '@/features/vacation-requests/components/RequestHistory.vue';
import BaseButton from '@/shared/components/ui/BaseButton.vue';
import DataTable, { type Column } from '@/shared/components/ui/DataTable.vue';
import EmptyState from '@/shared/components/ui/EmptyState.vue';
import ErrorState from '@/shared/components/ui/ErrorState.vue';
import LoadingState from '@/shared/components/ui/LoadingState.vue';
import PaginationControls from '@/shared/components/ui/PaginationControls.vue';
import StatusBadge from '@/shared/components/ui/StatusBadge.vue';
import { dayCount, formatRange, formatTimestamp } from '@/shared/utils/dates';
import { describeError } from '@/shared/utils/errors';
import { useMyRequestsStore } from '../my-requests.store';

const store = useMyRequestsStore();
const { items, pageInfo, loading, error } = storeToRefs(store);
onMounted(() => store.load());

const openHistory = ref<string | null>(null);

const columns: Column[] = [
  { key: 'dates', label: 'Dates' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'decision', label: 'Decision' },
  { key: 'submitted', label: 'Submitted', class: 'whitespace-nowrap' },
];
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">My requests</h1>
        <p class="text-sm text-slate-600">Track the status of your vacation requests.</p>
      </div>
      <RouterLink to="/requests/new"><BaseButton>New request</BaseButton></RouterLink>
    </div>

    <LoadingState v-if="loading && !pageInfo" />
    <ErrorState v-else-if="error" :message="describeError(error)" @retry="store.load()" />
    <EmptyState
      v-else-if="items.length === 0"
      title="No vacation requests yet."
      description="Submit your first request to see it here."
    >
      <RouterLink to="/requests/new"><BaseButton>New request</BaseButton></RouterLink>
    </EmptyState>
    <template v-else>
      <DataTable
        :columns="columns"
        :rows="items"
        caption="My vacation requests"
        :class="{ 'opacity-60': loading }"
      >
        <template #cell-dates="{ row }">
          <span class="font-medium">{{ formatRange(row.startDate, row.endDate) }}</span>
          <span class="block text-xs text-slate-500"
            >{{ dayCount(row.startDate, row.endDate) }} days</span
          >
        </template>
        <template #cell-reason="{ row }">
          <span :class="row.reason ? 'text-slate-700' : 'text-slate-400'">{{
            row.reason ?? '—'
          }}</span>
        </template>
        <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #cell-decision="{ row }"><DecisionInfo :request="row" /></template>
        <template #cell-submitted="{ row }">
          <span class="text-slate-600">{{ formatTimestamp(row.createdAt) }}</span>
          <button
            type="button"
            class="block text-xs text-indigo-700 hover:underline"
            :aria-expanded="openHistory === row.id"
            @click="openHistory = openHistory === row.id ? null : row.id"
          >
            {{ openHistory === row.id ? 'Hide history' : 'History' }}
          </button>
          <RequestHistory v-if="openHistory === row.id" :request-id="row.id" />
        </template>
      </DataTable>
      <PaginationControls
        v-if="pageInfo"
        :page-info="pageInfo"
        :disabled="loading"
        @update:page="store.load($event)"
      />
    </template>
  </section>
</template>
