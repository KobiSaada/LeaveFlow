<script setup lang="ts">
import {
  type PublicUser,
  VACATION_REQUEST_STATUSES,
  type VacationRequestDto,
  type VacationRequestStatus,
} from '@leaveflow/contracts';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toApiError } from '@/shared/api/http';
import { approvalsApi } from '../approvals.api';
import BaseButton from '@/shared/components/ui/BaseButton.vue';
import BaseSelect from '@/shared/components/ui/BaseSelect.vue';
import DataTable, { type Column } from '@/shared/components/ui/DataTable.vue';
import DecisionDialog from '@/features/approvals/components/DecisionDialog.vue';
import EmptyState from '@/shared/components/ui/EmptyState.vue';
import ErrorState from '@/shared/components/ui/ErrorState.vue';
import LoadingState from '@/shared/components/ui/LoadingState.vue';
import PaginationControls from '@/shared/components/ui/PaginationControls.vue';
import StatusBadge from '@/shared/components/ui/StatusBadge.vue';
import DecisionInfo from '@/features/vacation-requests/components/DecisionInfo.vue';
import RequestHistory from '@/features/vacation-requests/components/RequestHistory.vue';
import { usePaginatedQuery } from '@/shared/composables/usePaginatedQuery';
import { useToast } from '@/shared/composables/useToast';
import { dayCount, formatRange, formatTimestamp } from '@/shared/utils/dates';
import { describeError } from '@/shared/utils/errors';

const route = useRoute();
const router = useRouter();
const toast = useToast();

// Filters and page live in the URL: refresh, back/forward and shared links keep the view.
const ALL = 'ALL';
const isStatus = (v: unknown): v is VacationRequestStatus =>
  VACATION_REQUEST_STATUSES.includes(v as VacationRequestStatus);
const status = computed(() =>
  route.query.status === ALL ? ALL : isStatus(route.query.status) ? route.query.status : 'PENDING',
);
const userId = computed(() => (typeof route.query.userId === 'string' ? route.query.userId : ''));
const page = computed(() => Math.max(1, Number(route.query.page) || 1));

function setQuery(patch: Record<string, string | undefined>): void {
  void router.replace({ query: { ...route.query, ...patch } });
}

const params = computed(() => ({
  page: page.value,
  pageSize: 10,
  status: status.value === ALL ? undefined : status.value,
  userId: userId.value || undefined,
}));
const { items, pageInfo, loading, error, reload } = usePaginatedQuery<
  VacationRequestDto,
  typeof params.value
>(params, (p) => approvalsApi.list(p));

const requesters = ref<PublicUser[]>([]);
onMounted(async () => {
  try {
    requesters.value = await approvalsApi.listRequesters();
  } catch {
    // The filter degrades to "All employees"; the list itself still works.
  }
});

const statusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: ALL, label: 'All statuses' },
];
const employeeOptions = computed(() => [
  { value: '', label: 'All employees' },
  ...requesters.value.map((u) => ({ value: u.id, label: u.name })),
]);

const dialog = ref<{ mode: 'approve' | 'reject'; request: VacationRequestDto } | null>(null);
const deciding = ref(false);
const openHistory = ref<string | null>(null);

async function decide(comment: string | null): Promise<void> {
  if (!dialog.value) return;
  const { mode, request } = dialog.value;
  deciding.value = true;
  try {
    if (mode === 'approve') await approvalsApi.approve(request.id, comment);
    else await approvalsApi.reject(request.id, comment ?? '');
    toast.show(
      `Request ${mode === 'approve' ? 'approved' : 'rejected'}: ${request.userName}, ${formatRange(request.startDate, request.endDate)}.`,
    );
  } catch (e) {
    const apiError = toApiError(e);
    toast.show(describeError(apiError), apiError.code === 'REQUEST_NOT_PENDING' ? 'info' : 'error');
  } finally {
    deciding.value = false;
    dialog.value = null;
    await reload();
    // The decided row may have been the last one on this page (e.g. under the Pending filter).
    if (items.value.length === 0 && page.value > 1) setQuery({ page: String(page.value - 1) });
  }
}

const columns: Column[] = [
  { key: 'employee', label: 'Employee' },
  { key: 'dates', label: 'Dates' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'decision', label: 'Decision' },
  { key: 'actions', label: 'Actions', class: 'text-right' },
];
</script>

<template>
  <section>
    <div class="mb-6">
      <h1 class="text-2xl font-semibold">Requests dashboard</h1>
      <p class="text-sm text-slate-600">Review, approve or reject vacation requests.</p>
    </div>

    <div class="mb-4 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
      <BaseSelect
        label="Status"
        :model-value="status"
        :options="statusOptions"
        @update:model-value="setQuery({ status: $event, page: undefined })"
      />
      <BaseSelect
        label="Employee"
        :model-value="userId"
        :options="employeeOptions"
        @update:model-value="setQuery({ userId: $event || undefined, page: undefined })"
      />
      <div class="flex items-end">
        <BaseButton variant="ghost" @click="router.replace({ query: {} })"
          >Clear filters</BaseButton
        >
      </div>
    </div>

    <LoadingState v-if="loading && !pageInfo" />
    <ErrorState v-else-if="error" :message="describeError(error)" @retry="reload" />
    <EmptyState v-else-if="items.length === 0" title="No requests match these filters.">
      <BaseButton variant="secondary" @click="router.replace({ query: {} })"
        >Clear filters</BaseButton
      >
    </EmptyState>
    <template v-else>
      <DataTable
        :columns="columns"
        :rows="items"
        caption="Vacation requests"
        :class="{ 'opacity-60': loading }"
      >
        <template #cell-employee="{ row }">
          <span class="font-medium">{{ row.userName }}</span>
          <span class="block text-xs text-slate-500"
            >Submitted {{ formatTimestamp(row.createdAt) }}</span
          >
        </template>
        <template #cell-dates="{ row }">
          {{ formatRange(row.startDate, row.endDate) }}
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
        <template #cell-decision="{ row }">
          <DecisionInfo :request="row" />
          <button
            type="button"
            class="mt-1 block text-xs text-indigo-700 hover:underline"
            :aria-expanded="openHistory === row.id"
            @click="openHistory = openHistory === row.id ? null : row.id"
          >
            {{ openHistory === row.id ? 'Hide history' : 'History' }}
          </button>
          <RequestHistory v-if="openHistory === row.id" :request-id="row.id" />
        </template>
        <template #cell-actions="{ row }">
          <div v-if="row.status === 'PENDING'" class="flex justify-end gap-2">
            <BaseButton
              size="sm"
              :disabled="deciding"
              @click="dialog = { mode: 'approve', request: row }"
              >Approve</BaseButton
            >
            <BaseButton
              size="sm"
              variant="secondary"
              :disabled="deciding"
              @click="dialog = { mode: 'reject', request: row }"
              >Reject</BaseButton
            >
          </div>
        </template>
      </DataTable>
      <PaginationControls
        v-if="pageInfo"
        :page-info="pageInfo"
        :disabled="loading"
        @update:page="setQuery({ page: String($event) })"
      />
    </template>

    <DecisionDialog
      :open="dialog !== null"
      :mode="dialog?.mode ?? 'approve'"
      :summary="
        dialog
          ? `${dialog.request.userName} · ${formatRange(dialog.request.startDate, dialog.request.endDate)}`
          : ''
      "
      :busy="deciding"
      @confirm="decide"
      @cancel="dialog = null"
    />
  </section>
</template>
