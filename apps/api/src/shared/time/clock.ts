import { type IsoDate, isoDateInTimeZone } from '@leaveflow/contracts';

/** Time source. Injected so business rules ("no past dates") are testable and timezone-explicit. */
export interface Clock {
  now(): Date;
  /** Today's calendar date in the business time zone. */
  today(): IsoDate;
}

export class SystemClock implements Clock {
  constructor(private readonly timeZone: string) {}

  now(): Date {
    return new Date();
  }

  today(): IsoDate {
    return isoDateInTimeZone(new Date(), this.timeZone);
  }
}

/** Deterministic clock for tests. */
export class FixedClock implements Clock {
  constructor(
    private readonly todayValue: IsoDate,
    private readonly nowValue: Date = new Date(`${todayValue}T09:00:00.000Z`),
  ) {}

  now(): Date {
    return new Date(this.nowValue);
  }

  today(): IsoDate {
    return this.todayValue;
  }
}
