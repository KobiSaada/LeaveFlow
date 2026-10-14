import { compareIsoDates, daysBetween, type IsoDate } from '@leaveflow/contracts';
import { InvalidDateRangeError } from './vacation-request.errors';

/**
 * Half-open calendar-date range [start, end): `start` is the first day off and `end` is the first
 * day back at work. BR-1 ("the end date must be after the start date") therefore allows a single
 * day off — 2 Nov → 3 Nov is one day (the 2nd). See SPEC-005.
 */
export class DateRange {
  private constructor(
    readonly start: IsoDate,
    readonly end: IsoDate,
  ) {}

  static of(start: IsoDate, end: IsoDate): DateRange {
    if (compareIsoDates(end, start) <= 0) throw new InvalidDateRangeError(start, end);
    return new DateRange(start, end);
  }

  /** Rehydration from storage, where the database constraint already guarantees validity. */
  static fromTrusted(start: IsoDate, end: IsoDate): DateRange {
    return new DateRange(start, end);
  }

  /** Number of days off (the return day is not one of them). */
  get days(): number {
    return daysBetween(this.start, this.end);
  }

  /**
   * Two ranges overlap when they share at least one day off. Back-to-back ranges do not: returning
   * on the 13th and starting the next vacation on the 13th is fine.
   */
  overlaps(other: DateRange): boolean {
    return compareIsoDates(this.start, other.end) < 0 && compareIsoDates(other.start, this.end) < 0;
  }

  equals(other: DateRange): boolean {
    return this.start === other.start && this.end === other.end;
  }
}
