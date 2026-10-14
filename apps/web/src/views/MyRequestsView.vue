<script setup lang="ts">
import type { VacationRequestDto } from '@leaveflow/contracts';
import { reactive, ref } from 'vue';
import { vacationRequestsApi } from '@/api/vacation-requests';
import BaseButton from '@/components/ui/BaseButton.vue';
import DataTable, { type Column } from '@/components/ui/DataTable.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import ErrorState from '@/components/ui/ErrorState.vue';
import LoadingState from '@/components/ui/LoadingState.vue';
import PaginationControls from '@/components/ui/PaginationControls.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import DecisionInfo from '@/components/vacation/DecisionInfo.vue';
import RequestHistory from '@/components/vacation/RequestHistory.vue';
import { usePaginatedQuery } from '@/composables/usePaginatedQuery';
import { dayCount, formatRange, formatTimestamp } from '@/utils/dates';
import { describeError } from '@/utils/errors';

const params = reactive({ page: 1, pageSize: 10 });
const { items, pageInfo, loading, error, reload } = usePaginatedQuery<
  VacationRequestDto,
  typeof params
>(
  () => ({ ...params }),
  (p) => vacationRequestsApi.listMine(p),
);
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
    <ErrorState v-else-if="error" :message="describeError(error)" @retry="reload" />
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
        @update:page="params.page = $event"
      />
    </template>
  </section>
</template>
