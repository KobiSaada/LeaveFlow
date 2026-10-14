import type { Page, VacationRequestDto } from '@leaveflow/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/http';
import { approvalsApi } from './approvals.api';
import { useApprovalsStore } from './approvals.store';

vi.mock('./approvals.api', () => ({
  approvalsApi: { list: vi.fn(), approve: vi.fn(), reject: vi.fn(), listRequesters: vi.fn() },
}));
const api = vi.mocked(approvalsApi);

const request = { id: 'r1', userName: 'Alice Cohen', status: 'PENDING' } as VacationRequestDto;
const page = (items: VacationRequestDto[]): Page<VacationRequestDto> => ({
  items,
  pageInfo: { page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 },
});
const query = { page: 1, pageSize: 10, status: 'PENDING' as const };

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
});

describe('approvals store', () => {
  it('loads a page and exposes it', async () => {
    api.list.mockResolvedValue(page([request]));
    const store = useApprovalsStore();
    await store.load(query);
    expect(api.list).toHaveBeenCalledWith(query);
    expect(store.items).toEqual([request]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('keeps the newest result when filters change while a request is in flight', async () => {
    let resolveSlow!: (value: Page<VacationRequestDto>) => void;
    api.list
      .mockReturnValueOnce(new Promise((resolve) => (resolveSlow = resolve)))
      .mockResolvedValueOnce(page([{ ...request, id: 'newer' }]));
    const store = useApprovalsStore();
    const slow = store.load(query);
    await store.load({ ...query, status: undefined });
    resolveSlow(page([{ ...request, id: 'stale' }]));
    await slow;
    expect(store.items.map((i) => i.id)).toEqual(['newer']);
  });

  it('exposes a load failure as an ApiError', async () => {
    api.list.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'boom'));
    const store = useApprovalsStore();
    await store.load(query);
    expect(store.error?.code).toBe('INTERNAL_ERROR');
  });

  it('approves, reports success and reloads the list', async () => {
    api.list.mockResolvedValue(page([]));
    api.approve.mockResolvedValue({ ...request, status: 'APPROVED' });
    const store = useApprovalsStore();
    await store.load(query);
    const outcome = await store.decide('approve', request, null);
    expect(api.approve).toHaveBeenCalledWith('r1', null);
    expect(outcome.kind).toBe('success');
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(store.deciding).toBe(false);
  });

  it('reports a concurrent decision as a conflict naming the other validator', async () => {
    api.list.mockResolvedValue(page([]));
    api.reject.mockRejectedValue(
      new ApiError(409, 'REQUEST_NOT_PENDING', 'already', {}, 'req', {
        type: 'x',
        title: 'already',
        status: 409,
        code: 'REQUEST_NOT_PENDING',
        requestId: 'req',
        currentStatus: 'APPROVED',
        decidedBy: { id: 'd', name: 'Dana Mizrahi' },
      }),
    );
    const store = useApprovalsStore();
    await store.load(query);
    const outcome = await store.decide('reject', request, 'No');
    expect(outcome).toEqual({
      kind: 'conflict',
      message: 'This request was already approved by Dana Mizrahi.',
    });
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('loads requesters once', async () => {
    api.listRequesters.mockResolvedValue([
      { id: 'u', name: 'Alice', email: 'a@x', role: 'REQUESTER' },
    ]);
    const store = useApprovalsStore();
    await store.loadRequesters();
    await store.loadRequesters();
    expect(api.listRequesters).toHaveBeenCalledTimes(1);
    expect(store.requesters).toHaveLength(1);
  });
});
