import { addDays, daysBetween, type IsoDate, isoDateInTimeZone } from '@leaveflow/contracts';

// Calendar dates are rendered from their Y-M-D parts in UTC: `new Date('2026-11-09')` is UTC
// midnight and would show as 8 Nov in any negative-offset time zone.
function utc(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

const dayMonthYear = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const dayMonth = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const monthYear = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'narrow', timeZone: 'UTC' });
const timestamp = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** `9 Nov 2026` */
export function formatDate(date: IsoDate): string {
  return dayMonthYear.format(utc(date));
}

/** `9 Nov – 13 Nov 2026` (year shown once when shared). */
export function formatRange(start: IsoDate, end: IsoDate): string {
  if (start.slice(0, 4) === end.slice(0, 4))
    return `${dayMonth.format(utc(start))} – ${formatDate(end)}`;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/**
 * A vacation is the half-open range [start, end): `end` is the first day back at work (SPEC-005).
 * 2 Nov → 3 Nov is one day off.
 */
export function daysOff(start: IsoDate, end: IsoDate): number {
  return daysBetween(start, end);
}

/** Days off as people read them: `2 Nov 2026`, or `9 Nov – 12 Nov 2026` (the last day off). */
export function formatVacation(start: IsoDate, end: IsoDate): string {
  const lastDayOff = addDays(end, -1);
  return lastDayOff === start ? formatDate(start) : formatRange(start, lastDayOff);
}

/** `4 days off · back 13 Nov` */
export function formatDaysOff(start: IsoDate, end: IsoDate): string {
  const days = daysOff(start, end);
  return `${days} ${days === 1 ? 'day' : 'days'} off · back ${dayMonth.format(utc(end))}`;
}

export function formatTimestamp(iso: string): string {
  return timestamp.format(new Date(iso));
}

/** Today in the browser's own time zone (UX hint only; the server decides with its business TZ). */
export function todayLocal(): IsoDate {
  return isoDateInTimeZone(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/** `YYYY-MM` → first and last day of that month. */
export function monthBounds(month: string): { from: IsoDate; to: IsoDate; days: IsoDate[] } {
  const from = `${month}-01`;
  const [y, m] = month.split('-').map(Number) as [number, number];
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const days = Array.from({ length: daysBetween(from, to) + 1 }, (_, i) => addDays(from, i));
  return { from, to, days };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function formatMonth(month: string): string {
  return monthYear.format(utc(`${month}-01`));
}

export function weekdayInitial(date: IsoDate): string {
  return weekday.format(utc(date));
}

export function isWeekend(date: IsoDate): boolean {
  const day = utc(date).getUTCDay();
  return day === 0 || day === 6;
}
