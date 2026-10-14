import { z } from 'zod';
import { compareIsoDates, daysBetween, isValidIsoDate } from './dates';
import { USER_ROLES, VACATION_REQUEST_STATUSES } from './enums';

export const REASON_MAX_LENGTH = 500;
export const COMMENT_MAX_LENGTH = 1000;
export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;
/** Inclusive number of days a team-calendar window may span. */
export const TEAM_CALENDAR_MAX_DAYS = 92;

export const isoDateSchema = z
  .string({ required_error: 'Required' })
  .refine(isValidIsoDate, { message: 'Must be a valid date in YYYY-MM-DD format' });

export const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

/** Trims; an empty or whitespace-only string becomes `null`. */
const optionalText = (max: number) =>
  z
    .string()
    .max(max * 4) // generous pre-trim bound; the precise limit is checked after trimming
    .nullish()
    .transform((value) => {
      const trimmed = value?.trim() ?? '';
      return trimmed.length === 0 ? null : trimmed;
    })
    .refine((value) => value === null || value.length <= max, {
      message: `Must be at most ${max} characters`,
    });

export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Must be a valid email address' }),
  password: z.string().min(1, { message: 'Required' }).max(200),
});
export type LoginRequest = z.input<typeof loginRequestSchema>;

/**
 * Shape-only validation. Business rules (end strictly after start, no past start, no overlap)
 * belong to the domain so they produce their own error codes.
 */
export const createVacationRequestSchema = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  reason: optionalText(REASON_MAX_LENGTH),
});
export type CreateVacationRequestBody = z.input<typeof createVacationRequestSchema>;

export const approveVacationRequestSchema = z
  .object({ comment: optionalText(COMMENT_MAX_LENGTH) })
  .default({});
export type ApproveVacationRequestBody = z.input<typeof approveVacationRequestSchema>;

/** A missing/blank comment is left to the domain, which answers REJECTION_COMMENT_REQUIRED. */
export const rejectVacationRequestSchema = z
  .object({ comment: optionalText(COMMENT_MAX_LENGTH) })
  .default({});
export type RejectVacationRequestBody = z.input<typeof rejectVacationRequestSchema>;

export const idempotencyKeySchema = uuidSchema;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
});

export const listMyVacationRequestsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(VACATION_REQUEST_STATUSES).optional(),
});

export const listVacationRequestsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(VACATION_REQUEST_STATUSES).optional(),
  userId: uuidSchema.optional(),
});

export const teamCalendarQuerySchema = z
  .object({ from: isoDateSchema, to: isoDateSchema })
  .superRefine(({ from, to }, ctx) => {
    if (!isValidIsoDate(from) || !isValidIsoDate(to)) return;
    if (compareIsoDates(to, from) < 0) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'Must be on or after "from"' });
    } else if (daysBetween(from, to) + 1 > TEAM_CALENDAR_MAX_DAYS) {
      ctx.addIssue({
        code: 'custom',
        path: ['to'],
        message: `The window may span at most ${TEAM_CALENDAR_MAX_DAYS} days`,
      });
    }
  });

export const listUsersQuerySchema = z.object({ role: z.enum(USER_ROLES).optional() });
