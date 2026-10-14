import { describe, expect, it } from 'vitest';
import type { Principal } from '../../../../shared/security/principal';
import type { Transaction, UnitOfWork } from '../../../../shared/cqrs/unit-of-work';
import type { DomainEvent } from '../../../../shared/domain/domain-event';
import { ForbiddenError } from '../../../../shared/errors/application-errors';
import { FixedClock } from '../../../../shared/time/clock';
import type { UserRepository } from '../../../users/repositories/user.repository';
import type { DateRange } from '../../domain/date-range';
import { VacationRequest } from '../../domain/vacation-request';
import {
  IdempotencyKeyReusedError,
  RequestNotPendingError,
  VacationOverlapError,
} from '../../domain/vacation-request.errors';
import type { VacationRequestRepository } from '../ports/vacation-request-repository';
import {
  CreateVacationRequestCommand,
  CreateVacationRequestHandler,
} from './create-vacation-request.command';
import { VacationRequestDecider } from './decide-vacation-request';

const alice: Principal = {
  userId: '8c1d6661-f2f8-45be-9424-7a9ddaafb0a3',
  role: 'REQUESTER',
  name: 'Alice Cohen',
};
const dana: Principal = {
  userId: '1a2b3c4d-0000-4000-8000-000000000001',
  role: 'VALIDATOR',
  name: 'Dana Mizrahi',
};
const yossi = { id: '1a2b3c4d-0000-4000-8000-000000000002', name: 'Yossi Ben-David' };
const clock = new FixedClock('2026-10-14');
const KEY = '5b8f7a52-1d3b-4a8e-9c1f-3f2a1b0c9d8e';

/** In-memory unit of work: events are "committed" only when work resolves. */
class FakeUnitOfWork implements UnitOfWork {
  committed: DomainEvent[] = [];
  async run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    const pending: DomainEvent[] = [];
    const result = await work({ recordEvents: (events) => pending.push(...events) });
    this.committed.push(...pending);
    return result;
  }
}

class FakeRepository implements VacationRequestRepository {
  rows = new Map<string, VacationRequest>();
  /** Simulates a concurrent writer committing between our read and our write. */
  beforeSaveDecision?: (id: string) => void;
  failInsertWith?: Error;

  async lockScheduleOf() {}
  async findById(_tx: Transaction, id: string) {
    const row = this.rows.get(id);
    return row ? VacationRequest.rehydrate(row.snapshot()) : null;
  }
  async findByIdempotencyKey(_tx: Transaction, userId: string, key: string) {
    const row = [...this.rows.values()].find(
      (r) => r.userId === userId && r.snapshot().idempotencyKey === key,
    );
    return row ? VacationRequest.rehydrate(row.snapshot()) : null;
  }
  async findActiveOverlapping(_tx: Transaction, userId: string, range: DateRange) {
    return (
      [...this.rows.values()].find(
        (r) => r.userId === userId && r.status !== 'REJECTED' && r.range.overlaps(range),
      ) ?? null
    );
  }
  async insert(_tx: Transaction, request: VacationRequest) {
    if (this.failInsertWith) {
      const error = this.failInsertWith;
      this.failInsertWith = undefined;
      throw error;
    }
    this.rows.set(request.id, VacationRequest.rehydrate(request.snapshot()));
  }
  async saveDecision(_tx: Transaction, request: VacationRequest) {
    this.beforeSaveDecision?.(request.id);
    if (this.rows.get(request.id)?.status !== 'PENDING') return false;
    this.rows.set(request.id, VacationRequest.rehydrate(request.snapshot()));
    return true;
  }
}

const users: UserRepository = {
  findById: async (id) =>
    id === yossi.id ? { ...yossi, email: 'yossi@leaveflow.dev', role: 'VALIDATOR' } : null,
  findCredentialsByEmail: async () => null,
  list: async () => [],
};

function setup() {
  const uow = new FakeUnitOfWork();
  const repo = new FakeRepository();
  return {
    uow,
    repo,
    create: new CreateVacationRequestHandler(uow, repo, clock),
    decider: new VacationRequestDecider(uow, repo, users, clock),
  };
}

const createCmd = (
  start: string,
  end: string,
  key: string | null = null,
  reason: string | null = null,
  actor = alice,
) => new CreateVacationRequestCommand(actor, start, end, reason, key);

describe('CreateVacationRequestHandler', () => {
  it('creates a request and commits exactly one Created event', async () => {
    const { create, repo, uow } = setup();
    const result = await create.handle(createCmd('2026-11-09', '2026-11-13'));
    expect(result.created).toBe(true);
    expect(repo.rows.get(result.id)?.status).toBe('PENDING');
    expect(uow.committed.map((e) => e.eventType)).toEqual(['VacationRequestCreated']);
  });

  it('refuses validators (BR-6 / D-3)', async () => {
    const { create } = setup();
    await expect(
      create.handle(createCmd('2026-11-09', '2026-11-13', null, null, dana)),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('reports the conflicting range on overlap and commits nothing', async () => {
    const { create, uow } = setup();
    const first = await create.handle(createCmd('2026-11-09', '2026-11-13'));
    uow.committed = [];
    await expect(create.handle(createCmd('2026-11-13', '2026-11-15'))).rejects.toMatchObject({
      code: 'VACATION_OVERLAP',
      extensions: {
        conflictingRange: { id: first.id, startDate: '2026-11-09', endDate: '2026-11-13' },
      },
    });
    expect(uow.committed).toEqual([]);
  });

  it('replays the original request for the same key and payload, without a second event', async () => {
    const { create, repo, uow } = setup();
    const first = await create.handle(createCmd('2026-11-09', '2026-11-13', KEY, 'Trip'));
    const retry = await create.handle(createCmd('2026-11-09', '2026-11-13', KEY, 'Trip'));
    expect(retry).toEqual({ id: first.id, created: false });
    expect(repo.rows.size).toBe(1);
    expect(uow.committed).toHaveLength(1);
  });

  it('refuses a reused key with a different payload', async () => {
    const { create } = setup();
    await create.handle(createCmd('2026-11-09', '2026-11-13', KEY));
    await expect(create.handle(createCmd('2026-12-01', '2026-12-03', KEY))).rejects.toBeInstanceOf(
      IdempotencyKeyReusedError,
    );
  });

  it('surfaces a database-detected overlap (lost insert race) as VACATION_OVERLAP', async () => {
    const { create, repo } = setup();
    repo.failInsertWith = new VacationOverlapError();
    await expect(create.handle(createCmd('2026-11-09', '2026-11-13'))).rejects.toBeInstanceOf(
      VacationOverlapError,
    );
  });
});

describe('VacationRequestDecider', () => {
  async function pendingRequest() {
    const ctx = setup();
    const { id } = await ctx.create.handle(createCmd('2026-11-09', '2026-11-13'));
    ctx.uow.committed = [];
    return { ...ctx, id };
  }

  it('refuses requesters (BR-6)', async () => {
    const { decider, id } = await pendingRequest();
    await expect(decider.decide(alice, id, 'APPROVED', null)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('when a concurrent identical decision wins, reports unchanged and emits nothing', async () => {
    const { decider, repo, uow, id } = await pendingRequest();
    repo.beforeSaveDecision = (rowId) => {
      const winner = VacationRequest.rehydrate(repo.rows.get(rowId)!.snapshot());
      winner.decide('APPROVED', yossi.id, null, new Date());
      repo.rows.set(rowId, winner);
    };
    await expect(decider.decide(dana, id, 'APPROVED', null)).resolves.toEqual({
      id,
      changed: false,
    });
    expect(uow.committed).toEqual([]);
  });

  it('when a concurrent conflicting decision wins, fails with 409 naming the winner', async () => {
    const { decider, repo, uow, id } = await pendingRequest();
    repo.beforeSaveDecision = (rowId) => {
      const winner = VacationRequest.rehydrate(repo.rows.get(rowId)!.snapshot());
      winner.decide('REJECTED', yossi.id, 'Release freeze', new Date());
      repo.rows.set(rowId, winner);
    };
    const error = await decider.decide(dana, id, 'APPROVED', null).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RequestNotPendingError);
    expect(error).toMatchObject({ extensions: { currentStatus: 'REJECTED', decidedBy: yossi } });
    expect(uow.committed).toEqual([]);
    expect(repo.rows.get(id)?.status).toBe('REJECTED');
  });
});
