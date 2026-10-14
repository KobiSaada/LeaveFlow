<script setup lang="ts">
import { CalendarDays, History, ListChecks, Plus } from 'lucide-vue-next';
import PageHeader from '@/shared/components/ui/PageHeader.vue';
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
import { formatDaysOff, formatTimestamp, formatVacation } from '@/shared/utils/dates';
import { describeError } from '@/shared/utils/errors';
import { useMyRequestsStore } from '../my-requests.store';

const store = useMyRequestsStore();
const { items, pageInfo, loading, error } = storeToRefs(store);
onMounted(() => store.load());

const openHistory = ref<string | null>(null);

const columns: Column[] = [
  { key: 'dates', label: 'Dates', class: 'whitespace-nowrap' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'decision', label: 'Decision' },
  { key: 'submitted', label: 'Submitted', class: 'whitespace-nowrap' },
];
</script>

<template>
  <section>
    <PageHeader
      :icon="ListChecks"
      title="My requests"
      description="Track the status of your vacation requests."
    >
      <template v-if="pageInfo" #meta>
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{{
          pageInfo.totalItems
        }}</span>
      </template>
      <template #actions>
        <RouterLink to="/requests/new"
          ><BaseButton :icon="Plus">New request</BaseButton></RouterLink
        >
      </template>
    </PageHeader>

    <LoadingState v-if="loading && !pageInfo" />
    <ErrorState v-else-if="error" :message="describeError(error)" @retry="store.load()" />
    <EmptyState
      v-else-if="items.length === 0"
      title="No vacation requests yet."
      description="Submit your first request to see it here."
    >
      <RouterLink to="/requests/new"><BaseButton :icon="Plus">New request</BaseButton></RouterLink>
    </EmptyState>
    <template v-else>
      <DataTable
        :columns="columns"
        :rows="items"
        caption="My vacation requests"
        :class="{ 'opacity-60': loading }"
      >
        <template #cell-dates="{ row }">
          <span class="inline-flex items-center gap-1.5 font-medium text-slate-900">
            <CalendarDays class="hidden size-4 text-slate-400 md:inline" aria-hidden="true" />
            {{ formatVacation(row.startDate, row.endDate) }}
          </span>
          <span class="block text-xs text-slate-500">{{
            formatDaysOff(row.startDate, row.endDate)
          }}</span>
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
            class="mt-1 flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline"
            :aria-expanded="openHistory === row.id"
            @click="openHistory = openHistory === row.id ? null : row.id"
          >
            <History class="size-3.5" aria-hidden="true" />{{
              openHistory === row.id ? 'Hide history' : 'History'
            }}
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
