import type { VacationRequestDto } from '@leaveflow/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/http';
import { myRequestsApi } from './my-requests.api';
import { useMyRequestsStore } from './my-requests.store';

vi.mock('./my-requests.api', () => ({ myRequestsApi: { list: vi.fn(), create: vi.fn() } }));
const api = vi.mocked(myRequestsApi);
const body = { startDate: '2026-11-09', endDate: '2026-11-13', reason: 'Trip' };
const keyOf = (call: number) => api.create.mock.calls[call]?.[1];

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
});

describe('my-requests store', () => {
  it('loads the requested page', async () => {
    api.list.mockResolvedValue({
      items: [],
      pageInfo: { page: 2, pageSize: 10, totalItems: 11, totalPages: 2 },
    });
    const store = useMyRequestsStore();
    await store.load(2);
    expect(api.list).toHaveBeenCalledWith({ page: 2, pageSize: 10 });
    expect(store.pageInfo?.page).toBe(2);
  });

  it('reuses the idempotency key when the outcome of a submission is unknown (network error)', async () => {
    api.create
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'offline'))
      .mockResolvedValueOnce({ id: 'r1' } as VacationRequestDto);
    const store = useMyRequestsStore();
    await expect(store.submit(body)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    await store.submit(body);
    expect(keyOf(1)).toBe(keyOf(0));
  });

  it('issues a fresh key after the server answered, success or rejection', async () => {
    api.create
      .mockRejectedValueOnce(new ApiError(409, 'VACATION_OVERLAP', 'overlap'))
      .mockResolvedValueOnce({ id: 'r1' } as VacationRequestDto)
      .mockResolvedValueOnce({ id: 'r2' } as VacationRequestDto);
    const store = useMyRequestsStore();
    await expect(store.submit(body)).rejects.toMatchObject({ code: 'VACATION_OVERLAP' });
    await store.submit(body);
    await store.submit(body);
    expect(new Set([keyOf(0), keyOf(1), keyOf(2)]).size).toBe(3);
    expect(store.submitting).toBe(false);
  });
});
