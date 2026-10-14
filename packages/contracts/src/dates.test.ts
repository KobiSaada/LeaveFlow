import { describe, expect, it } from 'vitest';
import { addDays, compareIsoDates, daysBetween, isoDateInTimeZone, isValidIsoDate } from './dates';

describe('isValidIsoDate', () => {
  it.each(['2026-10-14', '2028-02-29', '2026-12-31', '2026-01-01'])('accepts %s', (value) => {
    expect(isValidIsoDate(value)).toBe(true);
  });

  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-1-01', '2026-01-01T00:00', '', 'abc'])(
    'rejects %s',
    (value) => {
      expect(isValidIsoDate(value)).toBe(false);
    },
  );
});

describe('date arithmetic', () => {
  it('compares calendar dates', () => {
    expect(compareIsoDates('2026-11-09', '2026-11-13')).toBeLessThan(0);
    expect(compareIsoDates('2026-11-13', '2026-11-13')).toBe(0);
    expect(compareIsoDates('2026-11-14', '2026-11-13')).toBeGreaterThan(0);
  });

  it('adds days across month, year and leap-day boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts whole days, unaffected by DST transitions', () => {
    expect(daysBetween('2026-01-01', '2026-01-03')).toBe(2);
    expect(daysBetween('2026-03-20', '2026-04-05')).toBe(16);
    expect(daysBetween('2026-10-20', '2026-11-05')).toBe(16);
  });

  it('derives the calendar date in a given time zone', () => {
    const instant = new Date('2026-10-14T22:30:00.000Z');
    expect(isoDateInTimeZone(instant, 'Asia/Jerusalem')).toBe('2026-10-15');
    expect(isoDateInTimeZone(instant, 'America/Los_Angeles')).toBe('2026-10-14');
  });
});
