import { type IsoDate, isoDateInTimeZone } from '@leaveflow/contracts';
import type { Clock } from '../application/clock';

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
