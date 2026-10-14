import type { IsoDate } from '@leaveflow/contracts';

/** Time source. Injected so business rules ("no past dates") are testable and timezone-explicit. */
export interface Clock {
  now(): Date;
  /** Today's calendar date in the business time zone. */
  today(): IsoDate;
}
