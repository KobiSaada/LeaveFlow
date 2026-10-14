import { compareIsoDates, type IsoDate } from '@leaveflow/contracts';
import { InvalidDateRangeError } from './vacation-request.errors';

/**
 * Inclusive calendar-date range [start, end]. Business rule BR-1 (taken literally, decision D-1):
 * the end date must be strictly after the start date, so the shortest range spans two days.
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

  /** Inclusive bounds: ranges sharing a single day overlap. */
  overlaps(other: DateRange): boolean {
    return (
      compareIsoDates(this.start, other.end) <= 0 && compareIsoDates(other.start, this.end) <= 0
    );
  }

  equals(other: DateRange): boolean {
    return this.start === other.start && this.end === other.end;
  }
}
