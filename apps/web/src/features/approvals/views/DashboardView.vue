<script setup lang="ts">
import { Check, FilterX, History, LayoutDashboard, PartyPopper, SearchX, X } from 'lucide-vue-next';
import PageHeader from '@/shared/components/ui/PageHeader.vue';
import UserAvatar from '@/shared/components/ui/UserAvatar.vue';
import {
  VACATION_REQUEST_STATUSES,
  type VacationRequestDto,
  type VacationRequestStatus,
} from '@leaveflow/contracts';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DecisionInfo from '@/features/vacation-requests/components/DecisionInfo.vue';
import RequestHistory from '@/features/vacation-requests/components/RequestHistory.vue';
import BaseButton from '@/shared/components/ui/BaseButton.vue';
import BaseSelect from '@/shared/components/ui/BaseSelect.vue';
import DataTable, { type Column } from '@/shared/components/ui/DataTable.vue';
import EmptyState from '@/shared/components/ui/EmptyState.vue';
import ErrorState from '@/shared/components/ui/ErrorState.vue';
import LoadingState from '@/shared/components/ui/LoadingState.vue';
import PaginationControls from '@/shared/components/ui/PaginationControls.vue';
import StatusBadge from '@/shared/components/ui/StatusBadge.vue';
import { useToast } from '@/shared/composables/useToast';
import { formatDaysOff, formatTimestamp, formatVacation } from '@/shared/utils/dates';
import { describeError } from '@/shared/utils/errors';
import { type Decision, useApprovalsStore } from '../approvals.store';
import DecisionDialog from '../components/DecisionDialog.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const store = useApprovalsStore();
const { items, pageInfo, loading, error, requesters, deciding } = storeToRefs(store);

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

watch(
  [status, userId, page],
  () =>
    store.load({
      page: page.value,
      pageSize: 10,
      status: status.value === ALL ? undefined : status.value,
      userId: userId.value || undefined,
    }),
  { immediate: true },
);
onMounted(() => store.loadRequesters());

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

const dialog = ref<{ mode: Decision; request: VacationRequestDto } | null>(null);
const openHistory = ref<string | null>(null);

async function decide(comment: string | null): Promise<void> {
  if (!dialog.value) return;
  const { mode, request } = dialog.value;
  const outcome = await store.decide(mode, request, comment);
  dialog.value = null;
  toast.show(
    outcome.message,
    outcome.kind === 'success' ? 'success' : outcome.kind === 'conflict' ? 'info' : 'error',
  );
  // The decided row may have been the last one on this page (e.g. under the Pending filter).
  if (items.value.length === 0 && page.value > 1) setQuery({ page: String(page.value - 1) });
}

const columns: Column[] = [
  { key: 'employee', label: 'Employee' },
  { key: 'dates', label: 'Dates', class: 'whitespace-nowrap' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'decision', label: 'Decision' },
  { key: 'actions', label: 'Actions', class: 'text-right' },
];
</script>

<template>
  <section>
    <PageHeader
      :icon="LayoutDashboard"
      title="Requests dashboard"
      description="Review, approve or reject vacation requests."
    >
      <template v-if="pageInfo" #meta>
        <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
          {{ pageInfo.totalItems }} {{ status === 'ALL' ? 'total' : status.toLowerCase() }}
        </span>
      </template>
    </PageHeader>

    <div
      class="mb-4 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]"
    >
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
        <BaseButton variant="ghost" :icon="FilterX" @click="router.replace({ query: {} })"
          >Clear filters</BaseButton
        >
      </div>
    </div>

    <LoadingState v-if="loading && !pageInfo" />
    <ErrorState v-else-if="error" :message="describeError(error)" @retry="store.reload()" />
    <EmptyState
      v-else-if="items.length === 0"
      :icon="status === 'PENDING' ? PartyPopper : SearchX"
      :title="
        status === 'PENDING' && !userId
          ? 'All caught up — nothing waiting for a decision.'
          : 'No requests match these filters.'
      "
    >
      <BaseButton
        variant="secondary"
        :icon="FilterX"
        @click="router.replace({ query: { status: 'ALL' } })"
        >Show all requests</BaseButton
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
          <span class="flex items-center gap-3 text-left">
            <UserAvatar :name="row.userName" size="sm" />
            <span>
              <span class="block font-medium text-slate-900">{{ row.userName }}</span>
              <span class="block text-xs whitespace-nowrap text-slate-500"
                >Submitted {{ formatTimestamp(row.createdAt) }}</span
              >
            </span>
          </span>
        </template>
        <template #cell-dates="{ row }">
          <span class="font-medium text-slate-900">{{
            formatVacation(row.startDate, row.endDate)
          }}</span>
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
        <template #cell-decision="{ row }">
          <DecisionInfo :request="row" />
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
        <template #cell-actions="{ row }">
          <div v-if="row.status === 'PENDING'" class="flex justify-end gap-2">
            <BaseButton
              size="sm"
              variant="success"
              :icon="Check"
              :disabled="deciding"
              @click="dialog = { mode: 'approve', request: row }"
            >
              Approve
            </BaseButton>
            <BaseButton
              size="sm"
              variant="secondary"
              :icon="X"
              :disabled="deciding"
              @click="dialog = { mode: 'reject', request: row }"
            >
              Reject
            </BaseButton>
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
          ? `${dialog.request.userName} · ${formatVacation(dialog.request.startDate, dialog.request.endDate)}`
          : ''
      "
      :busy="deciding"
      @confirm="decide"
      @cancel="dialog = null"
    />
  </section>
</template>
