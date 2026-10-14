import { describe, expect, it } from 'vitest';
import { DateRange } from './date-range';
import { VacationRequest } from './vacation-request';
import {
  RejectionCommentRequiredError,
  RequestNotPendingError,
  StartDateInPastError,
} from './vacation-request.errors';

const ALICE = '8c1d6661-f2f8-45be-9424-7a9ddaafb0a3';
const DANA = '1a2b3c4d-0000-4000-8000-000000000001';
const NOW = new Date('2026-10-14T09:00:00.000Z');

function submit(start = '2026-11-09', end = '2026-11-13', today = '2026-10-14') {
  return VacationRequest.submit({
    id: 'f0f0f0f0-0000-4000-8000-000000000001',
    requesterId: ALICE,
    range: DateRange.of(start, end),
    reason: 'Family trip',
    idempotencyKey: null,
    today,
    now: NOW,
  });
}

describe('VacationRequest.submit', () => {
  it('creates a PENDING request and records VacationRequestCreated without free text', () => {
    const request = submit();
    expect(request.status).toBe('PENDING');
    const events = request.pullEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: 'VacationRequestCreated',
      aggregateId: request.id,
      actorId: ALICE,
      payload: { userId: ALICE, startDate: '2026-11-09', endDate: '2026-11-13' },
    });
    expect(JSON.stringify(events[0]?.payload)).not.toContain('Family trip');
    expect(request.pullEvents()).toEqual([]); // drained
  });

  it('allows a start date of today (BR-4)', () => {
    expect(submit('2026-10-14', '2026-10-15', '2026-10-14').status).toBe('PENDING');
  });

  it('rejects a start date before today (BR-4)', () => {
    expect(() => submit('2026-10-13', '2026-10-15', '2026-10-14')).toThrow(StartDateInPastError);
  });
});

describe('VacationRequest.decide', () => {
  it('approves a pending request, records the decider and the event', () => {
    const request = submit();
    request.pullEvents();
    expect(request.decide('APPROVED', DANA, null, NOW)).toBe('decided');
    expect(request.snapshot()).toMatchObject({
      status: 'APPROVED',
      decidedBy: DANA,
      decidedAt: NOW,
      comments: null,
    });
    expect(request.pullEvents().map((e) => e.eventType)).toEqual(['VacationRequestApproved']);
  });

  it('keeps an optional approval comment, trimmed', () => {
    const request = submit();
    request.decide('APPROVED', DANA, '  Enjoy!  ', NOW);
    expect(request.snapshot().comments).toBe('Enjoy!');
  });

  it('rejects with a comment (BR-5)', () => {
    const request = submit();
    request.pullEvents();
    expect(request.decide('REJECTED', DANA, 'Release freeze', NOW)).toBe('decided');
    expect(request.snapshot()).toMatchObject({ status: 'REJECTED', comments: 'Release freeze' });
    expect(request.pullEvents().map((e) => e.eventType)).toEqual(['VacationRequestRejected']);
  });

  it.each([null, '', '   '])(
    'refuses to reject with comment %j (BR-5) and stays pending',
    (comment) => {
      const request = submit();
      expect(() => request.decide('REJECTED', DANA, comment, NOW)).toThrow(
        RejectionCommentRequiredError,
      );
      expect(request.status).toBe('PENDING');
    },
  );

  it('treats repeating the same decision as an idempotent no-op without a new event', () => {
    const request = submit();
    request.decide('APPROVED', DANA, null, NOW);
    request.pullEvents();
    expect(request.decide('APPROVED', DANA, null, NOW)).toBe('unchanged');
    expect(request.pullEvents()).toEqual([]);
  });

  it('never leaves a terminal status (BR-3)', () => {
    const approved = submit();
    approved.decide('APPROVED', DANA, null, NOW);
    expect(() => approved.decide('REJECTED', DANA, 'Changed my mind', NOW)).toThrow(
      RequestNotPendingError,
    );
    expect(approved.status).toBe('APPROVED');

    const rejected = submit();
    rejected.decide('REJECTED', DANA, 'No', NOW);
    expect(() => rejected.decide('APPROVED', DANA, null, NOW)).toThrow(RequestNotPendingError);
    expect(rejected.status).toBe('REJECTED');
  });
});
