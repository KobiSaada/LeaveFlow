import type { CreateVacationRequestBody, PageInfo, VacationRequestDto } from '@leaveflow/contracts';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { type ApiError, toApiError } from '@/shared/api/http';
import { myRequestsApi } from './my-requests.api';

const PAGE_SIZE = 10;

/** The requester's own requests and the submission of new ones. */
export const useMyRequestsStore = defineStore('my-requests', () => {
  const items = shallowRef<VacationRequestDto[]>([]);
  const pageInfo = ref<PageInfo | null>(null);
  const loading = ref(false);
  const error = shallowRef<ApiError | null>(null);
  const submitting = ref(false);
  // One key per draft: retrying after a lost response replays the original request instead of
  // creating a duplicate. A new key is issued once the server has answered.
  let draftKey = crypto.randomUUID();
  let latestLoad = 0;

  async function load(page = pageInfo.value?.page ?? 1): Promise<void> {
    const current = ++latestLoad;
    loading.value = true;
    error.value = null;
    try {
      const result = await myRequestsApi.list({ page, pageSize: PAGE_SIZE });
      if (current !== latestLoad) return; // a newer load superseded this one
      items.value = result.items;
      pageInfo.value = result.pageInfo;
    } catch (e) {
      if (current === latestLoad) error.value = toApiError(e);
    } finally {
      if (current === latestLoad) loading.value = false;
    }
  }

  /** Submits the draft; throws ApiError so the form can map it to fields. */
  async function submit(body: CreateVacationRequestBody): Promise<VacationRequestDto> {
    submitting.value = true;
    try {
      const created = await myRequestsApi.create(body, draftKey);
      draftKey = crypto.randomUUID();
      pageInfo.value = null; // next visit to the list starts from page 1
      return created;
    } catch (e) {
      const apiError = toApiError(e);
      // Keep the key only when we don't know whether the server saved the request.
      if (apiError.code !== 'NETWORK_ERROR') draftKey = crypto.randomUUID();
      throw apiError;
    } finally {
      submitting.value = false;
    }
  }

  return { items, pageInfo, loading, error, submitting, load, submit };
});
