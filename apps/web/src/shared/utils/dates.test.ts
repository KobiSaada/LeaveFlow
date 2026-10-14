import { afterEach, describe, expect, it } from 'vitest';
import { dayCount, formatDate, formatRange, monthBounds, shiftMonth } from './dates';

const originalTz = process.env.TZ;
afterEach(() => {
  process.env.TZ = originalTz;
});

describe('date display (no time-zone shift)', () => {
  it.each(['America/Los_Angeles', 'Pacific/Kiritimati', 'UTC'])(
    'renders the stored calendar day with TZ=%s',
    (tz) => {
      process.env.TZ = tz;
      expect(formatDate('2026-11-09')).toBe('9 Nov 2026');
      expect(formatRange('2026-12-30', '2027-01-02')).toBe('30 Dec 2026 – 2 Jan 2027');
    },
  );

  it('shows the year once for ranges within one year', () => {
    expect(formatRange('2026-11-09', '2026-11-13')).toBe('9 Nov – 13 Nov 2026');
  });

  it('counts days inclusively', () => {
    expect(dayCount('2026-11-09', '2026-11-13')).toBe(5);
  });

  it('computes month bounds, including leap February', () => {
    expect(monthBounds('2028-02')).toMatchObject({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthBounds('2026-11').days).toHaveLength(30);
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});
