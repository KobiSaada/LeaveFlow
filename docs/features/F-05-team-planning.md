# F-05 — Team planning

## Purpose

Show who is away in a month — approved and pending vacations of the whole team — to both roles.

## Actors

Requester and validator.

## Flow

`TeamPlanningView` reads `?month=YYYY-MM` → `useTeamPlanningStore.load(month)` → `GET /team-calendar?from=<first>&to=<last>` → rows grouped per person → `TeamTimeline` draws one bar per vacation, clipped to the month.

## Rules

- Active requests only (PENDING, APPROVED); pending drawn dashed with a "Pending" label (decision D-2).
- **Never** returns `reason` or `comments` (privacy by projection).
- Window ≤ 92 days, `to ≥ from`.
- Single team: everyone sees everyone (documented limitation).

## API

`GET /team-calendar?from&to` → `{ items: [{ id, userId, userName, startDate, endDate, status }] }`; 422 on an invalid window.

## Data

Range query `daterange(start,end,'[]') && daterange(from,to,'[]')` over active rows — served by the GiST index behind the exclusion constraint.

## Security

Authenticated users only; projection excludes free text.

## Edge cases

Bars end the day before the return date (the end date is the first day back); a vacation spanning two months is clipped to the visible month; empty month → empty state; dates rendered from `YYYY-MM-DD` without time-zone shifts.

## Acceptance criteria → tests

| Criterion                                                               | Test                                                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Active requests of all users in the window, no `reason`/`comments` keys | `apps/api/test/integration/vacation-queries.test.ts`                                                         |
| Window validation                                                       | `apps/api/test/integration/vacation-queries.test.ts`, `packages/contracts/src/schemas.test.ts`               |
| Month bounds and grouping                                               | `apps/web/src/features/team-planning/team-planning.store.test.ts`, `apps/web/src/shared/utils/dates.test.ts` |

## Code map

- API: `apps/api/src/modules/vacation-requests/services/vacation-requests.service.ts` (`teamCalendar`), `.../repositories/typeorm-vacation-request-read.repository.ts`
- Web: `apps/web/src/features/team-planning/` — `views/TeamPlanningView.vue`, `components/TeamTimeline.vue`, `team-planning.store.ts`
