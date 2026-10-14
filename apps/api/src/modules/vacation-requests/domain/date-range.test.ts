import { describe, expect, it } from 'vitest';
import { DateRange } from './date-range';
import { InvalidDateRangeError } from './vacation-request.errors';

describe('DateRange (BR-1, literal: end strictly after start)', () => {
  it('accepts an end date one day after the start', () => {
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

describe('DateRange.overlaps (BR-2, inclusive bounds)', () => {
  const base = DateRange.of('2026-11-09', '2026-11-13');

  it.each([
    ['identical', '2026-11-09', '2026-11-13'],
    ['contained', '2026-11-10', '2026-11-12'],
    ['containing', '2026-11-01', '2026-11-30'],
    ['partial at start', '2026-11-05', '2026-11-09'],
    ['shares the last day', '2026-11-13', '2026-11-15'],
  ])('overlaps when %s', (_label, start, end) => {
    expect(base.overlaps(DateRange.of(start, end))).toBe(true);
    expect(DateRange.of(start, end).overlaps(base)).toBe(true);
  });

  it.each([
    ['the day after', '2026-11-14', '2026-11-15'],
    ['ending the day before', '2026-11-07', '2026-11-08'],
  ])('does not overlap a range starting/ending %s', (_label, start, end) => {
    expect(base.overlaps(DateRange.of(start, end))).toBe(false);
  });
});
