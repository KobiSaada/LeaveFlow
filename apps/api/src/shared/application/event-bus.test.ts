import { describe, expect, it, vi } from 'vitest';
import type { DomainEvent } from '../domain/domain-event';
import { EventBus } from './event-bus';

const event = (eventType: string): DomainEvent => ({
  eventId: 'e1',
  eventType,
  aggregateType: 'Test',
  aggregateId: 'a1',
  actorId: 'u1',
  occurredAt: new Date(),
  payload: {},
});

describe('EventBus', () => {
  it('delivers events only to subscribers of that type', async () => {
    const bus = new EventBus(vi.fn());
    const approved = vi.fn();
    const rejected = vi.fn();
    bus.subscribe('Approved', 'approved-sub', approved);
    bus.subscribe('Rejected', 'rejected-sub', rejected);
    await bus.publish([event('Approved')]);
    expect(approved).toHaveBeenCalledOnce();
    expect(rejected).not.toHaveBeenCalled();
  });

  it('isolates a failing subscriber: others still run and the error is reported, not thrown', async () => {
    const report = vi.fn();
    const bus = new EventBus(report);
    const after = vi.fn();
    bus.subscribe('Approved', 'broken', () => {
      throw new Error('smtp down');
    });
    bus.subscribe('Approved', 'after', after);
    await expect(bus.publish([event('Approved')])).resolves.toBeUndefined();
    expect(after).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ eventType: 'Approved' }),
      'broken',
    );
  });
});
