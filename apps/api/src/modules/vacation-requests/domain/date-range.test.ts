import { describe, expect, it } from 'vitest';
import { DateRange } from './date-range';
import { InvalidDateRangeError } from './vacation-request.errors';

describe('DateRange (BR-1: end strictly after start)', () => {
  it('accepts an end date one day after the start — a single day off', () => {
    expect(DateRange.of('2026-11-09', '2026-11-10')).toMatchObject({
      start: '2026-11-09',
      end: '2026-11-10',
    });
  });

  it('rejects a same-day range and a reversed range', () => {
    expect(() => DateRange.of('2026-11-09', '2026-11-09')).toThrow(InvalidDateRangeError);
    expect(() => DateRange.of('2026-11-10', '2026-11-09')).toThrow(InvalidDateRangeError);
  });
});

describe('DateRange.overlaps (BR-2, half-open: end = first day back)', () => {
  // [9 Nov, 13 Nov): days off 9–12, back at work on the 13th.
  const base = DateRange.of('2026-11-09', '2026-11-13');

  it.each([
    ['identical', '2026-11-09', '2026-11-13'],
    ['contained', '2026-11-10', '2026-11-12'],
    ['containing', '2026-11-01', '2026-11-30'],
    ['sharing the first day off', '2026-11-05', '2026-11-10'],
    ['sharing the last day off', '2026-11-12', '2026-11-15'],
  ])('overlaps when %s', (_label, start, end) => {
    expect(base.overlaps(DateRange.of(start, end))).toBe(true);
    expect(DateRange.of(start, end).overlaps(base)).toBe(true);
  });

  it.each([
    ['starting on the return day', '2026-11-13', '2026-11-15'],
    ['ending (returning) on the first day off', '2026-11-05', '2026-11-09'],
  ])('does not overlap a range %s', (_label, start, end) => {
    expect(base.overlaps(DateRange.of(start, end))).toBe(false);
    expect(DateRange.of(start, end).overlaps(base)).toBe(false);
  });
});

describe('DateRange.days', () => {
  it('counts days off, excluding the return day', () => {
    expect(DateRange.of('2026-11-02', '2026-11-03').days).toBe(1);
    expect(DateRange.of('2026-11-09', '2026-11-13').days).toBe(4);
  });
});
