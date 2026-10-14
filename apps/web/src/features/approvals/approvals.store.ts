import type { PageInfo, PublicUser, VacationRequestDto } from '@leaveflow/contracts';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { type ApiError, toApiError } from '@/shared/api/http';
import { describeError } from '@/shared/utils/errors';
import { type ApprovalsQuery, approvalsApi } from './approvals.api';

export type Decision = 'approve' | 'reject';

interface DecisionOutcome {
  kind: 'success' | 'conflict' | 'error';
  message: string;
}

/**
 * Validator dashboard. The current filters/page live in the URL (owned by the view); the store
 * owns the server state and the decision workflow.
 */
export const useApprovalsStore = defineStore('approvals', () => {
  const items = shallowRef<VacationRequestDto[]>([]);
  const pageInfo = ref<PageInfo | null>(null);
  const loading = ref(false);
  const error = shallowRef<ApiError | null>(null);
  const requesters = shallowRef<PublicUser[]>([]);
  const deciding = ref(false);
  let lastQuery: ApprovalsQuery | null = null;
  let latestLoad = 0;

  async function load(query: ApprovalsQuery): Promise<void> {
    lastQuery = query;
    const current = ++latestLoad;
    loading.value = true;
    error.value = null;
    try {
      const result = await approvalsApi.list(query);
      if (current !== latestLoad) return; // filters changed while this request was in flight
      items.value = result.items;
      pageInfo.value = result.pageInfo;
    } catch (e) {
      if (current === latestLoad) error.value = toApiError(e);
    } finally {
      if (current === latestLoad) loading.value = false;
    }
  }

  const reload = () => (lastQuery ? load(lastQuery) : Promise.resolve());

  async function loadRequesters(): Promise<void> {
    if (requesters.value.length > 0) return;
    try {
      requesters.value = await approvalsApi.listRequesters();
    } catch {
      // The employee filter degrades to "All employees"; the list itself still works.
    }
  }

  /** Approves or rejects, then refreshes the list whatever happened (the row may be stale). */
  async function decide(
    decision: Decision,
    request: VacationRequestDto,
    comment: string | null,
  ): Promise<DecisionOutcome> {
    deciding.value = true;
    try {
      if (decision === 'approve') await approvalsApi.approve(request.id, comment);
      else await approvalsApi.reject(request.id, comment ?? '');
      return {
        kind: 'success',
        message: `Request ${decision === 'approve' ? 'approved' : 'rejected'}: ${request.userName}.`,
      };
    } catch (e) {
      const apiError = toApiError(e);
      return {
        kind: apiError.code === 'REQUEST_NOT_PENDING' ? 'conflict' : 'error',
        message: describeError(apiError),
      };
    } finally {
      deciding.value = false;
      await reload();
    }
  }

  return {
    items,
    pageInfo,
    loading,
    error,
    requesters,
    deciding,
    load,
    reload,
    loadRequesters,
    decide,
  };
});
