/**
 * Calendar-date helpers that operate on `YYYY-MM-DD` strings.
 *
 * Vacation dates are calendar dates, not instants. Parsing them with `new Date('YYYY-MM-DD')`
 * yields UTC midnight, which renders as the previous day in negative-offset time zones.
 * All arithmetic here is done in UTC on purpose and never touches the local time zone.
 */
export type IsoDate = string;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function toUtcMs(date: IsoDate): number {
  const match = ISO_DATE_PATTERN.exec(date);
  if (!match) throw new RangeError(`Not an ISO calendar date: ${date}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function fromUtcMs(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** True for a well-formed `YYYY-MM-DD` string that names a real calendar day (rejects 2026-02-30). */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** Negative when `a` is before `b`, zero when equal, positive when after. */
export function compareIsoDates(a: IsoDate, b: IsoDate): number {
  return toUtcMs(a) - toUtcMs(b);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** Whole days from `from` to `to` (`2026-01-01` → `2026-01-03` is 2). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** The calendar date of `instant` in an IANA time zone, e.g. `todayIn('Asia/Jerusalem')`. */
export function isoDateInTimeZone(instant: Date, timeZone: string): IsoDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}
