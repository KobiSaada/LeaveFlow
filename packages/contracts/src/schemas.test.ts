import { describe, expect, it } from 'vitest';
import {
  approveVacationRequestSchema,
  createVacationRequestSchema,
  listVacationRequestsQuerySchema,
  loginRequestSchema,
  rejectVacationRequestSchema,
  teamCalendarQuerySchema,
} from './schemas';

describe('createVacationRequestSchema', () => {
  it('accepts valid dates and normalises the reason', () => {
    const parsed = createVacationRequestSchema.parse({
      startDate: '2026-11-09',
      endDate: '2026-11-13',
      reason: '  Family trip  ',
    });
    expect(parsed).toEqual({
      startDate: '2026-11-09',
      endDate: '2026-11-13',
      reason: 'Family trip',
    });
  });

  it('turns a blank or missing reason into null', () => {
    expect(
      createVacationRequestSchema.parse({
        startDate: '2026-11-09',
        endDate: '2026-11-13',
        reason: '   ',
      }).reason,
    ).toBeNull();
    expect(
      createVacationRequestSchema.parse({ startDate: '2026-11-09', endDate: '2026-11-13' }).reason,
    ).toBeNull();
  });

  it('rejects impossible calendar dates with a field-level error', () => {
    const result = createVacationRequestSchema.safeParse({
      startDate: '2026-02-30',
      endDate: '2026-03-02',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['startDate']);
  });

  it('rejects a reason longer than 500 characters after trimming', () => {
    const base = { startDate: '2026-11-09', endDate: '2026-11-13' };
    expect(
      createVacationRequestSchema.safeParse({ ...base, reason: 'x'.repeat(500) }).success,
    ).toBe(true);
    expect(
      createVacationRequestSchema.safeParse({ ...base, reason: 'x'.repeat(501) }).success,
    ).toBe(false);
  });
});

describe('decision schemas', () => {
  it('approve accepts a missing body and an optional comment', () => {
    expect(approveVacationRequestSchema.parse(undefined)).toEqual({ comment: null });
    expect(approveVacationRequestSchema.parse({ comment: ' Enjoy ' })).toEqual({
      comment: 'Enjoy',
    });
  });

  it('reject leaves a blank comment as null for the domain to refuse', () => {
    expect(rejectVacationRequestSchema.parse({ comment: '   ' })).toEqual({ comment: null });
    expect(rejectVacationRequestSchema.parse({ comment: 'Release freeze' })).toEqual({
      comment: 'Release freeze',
    });
  });
});

describe('listVacationRequestsQuerySchema', () => {
  it('applies pagination defaults and coerces strings', () => {
    expect(listVacationRequestsQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(listVacationRequestsQuerySchema.parse({ page: '3', pageSize: '100' })).toEqual({
      page: 3,
      pageSize: 100,
    });
  });

  it('caps pageSize at 100 and rejects page 0', () => {
    expect(listVacationRequestsQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
    expect(listVacationRequestsQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('validates status and userId filters', () => {
    expect(listVacationRequestsQuerySchema.safeParse({ status: 'PENDING' }).success).toBe(true);
    expect(listVacationRequestsQuerySchema.safeParse({ status: 'CANCELLED' }).success).toBe(false);
    expect(listVacationRequestsQuerySchema.safeParse({ userId: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('teamCalendarQuerySchema', () => {
  it('accepts a window of up to 92 days inclusive', () => {
    expect(
      teamCalendarQuerySchema.safeParse({ from: '2026-10-01', to: '2026-12-31' }).success,
    ).toBe(true);
  });

  it('rejects a 93-day window and a reversed window', () => {
    expect(
      teamCalendarQuerySchema.safeParse({ from: '2026-10-01', to: '2027-01-01' }).success,
    ).toBe(false);
    expect(
      teamCalendarQuerySchema.safeParse({ from: '2026-10-10', to: '2026-10-09' }).success,
    ).toBe(false);
  });
});

describe('loginRequestSchema', () => {
  it('normalises the email and requires a password', () => {
    expect(loginRequestSchema.parse({ email: ' Alice@LeaveFlow.dev ', password: 'x' }).email).toBe(
      'alice@leaveflow.dev',
    );
    expect(
      loginRequestSchema.safeParse({ email: 'alice@leaveflow.dev', password: '' }).success,
    ).toBe(false);
  });
});
