import type { Page, PageInfo } from '@leaveflow/contracts';
import { ref, shallowRef, watch, type WatchSource } from 'vue';
import { type ApiError, toApiError } from '@/api/http';

/**
 * Loads a page whenever `source` changes. Stale responses are dropped, so quickly changing
 * filters never shows the result of an older request.
 */
export function usePaginatedQuery<T, P>(
  source: WatchSource<P>,
  fetchPage: (params: P) => Promise<Page<T>>,
) {
  const items = shallowRef<T[]>([]);
  const pageInfo = ref<PageInfo | null>(null);
  const loading = ref(false);
  const error = shallowRef<ApiError | null>(null);
  let generation = 0;

  async function load(params: P): Promise<void> {
    const current = ++generation;
    loading.value = true;
    error.value = null;
    try {
      const page = await fetchPage(params);
      if (current !== generation) return;
      items.value = page.items;
      pageInfo.value = page.pageInfo;
    } catch (e) {
      if (current === generation) error.value = toApiError(e);
    } finally {
      if (current === generation) loading.value = false;
    }
  }

  let lastParams: P | undefined;
  watch(
    source,
    (params) => {
      lastParams = params;
      void load(params);
    },
    { immediate: true, deep: true },
  );

  return {
    items,
    pageInfo,
    loading,
    error,
    reload: () => (lastParams === undefined ? Promise.resolve() : load(lastParams)),
  };
}
