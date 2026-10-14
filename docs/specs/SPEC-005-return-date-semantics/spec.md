# SPEC-005 — End date is the return-to-work date (half-open ranges)

## 1. Meta

| Field | Value |
|---|---|
| ID | SPEC-005 |
| Title | End date is the return-to-work date (half-open ranges) |
| Track | small-spec |
| Status | approved |
| Compliance critical | `false` |
| Created | 2026-10-14 |
| Owner | Kobi Saada |

## 2. Summary

SPEC-001 decision D-1 read business rule 1 ("the end date must be after the start date") with an **inclusive** end date, which made a single-day vacation impossible. The owner's reading is better and still literal: the **end date is the first day back at work**. A request from 2 Nov to 3 Nov is one day off (2 Nov); the rule "end after start" holds and single-day leave is possible. Vacation ranges become **half-open** `[start, end)` everywhere.

## 3. Goal

Every layer — domain, database constraint, queries, API docs, UI copy and day counts — uses the same half-open meaning, proven by tests.

## 4. Scope

**In scope**

1. Domain: `DateRange` documents `[start, end)`; overlap becomes `start < other.end && other.start < end`; `end > start` unchanged.
2. Database: new migration replacing `vr_no_overlapping_active` with `daterange(start_date, end_date, '[)')` (relaxing — existing rows always satisfy it); `down` restores the inclusive form.
3. Queries: overlap pre-check and team calendar use `'[)'` for requests (the calendar window stays inclusive).
4. UI: end field labelled as the return date with an example; day counts = `end − start`; ranges displayed as days off (`2 Nov`, `4 Nov – 7 Nov 2026`) with "back on …"; timeline bars end the day before the return date.
5. Tests updated for the new boundary: back-to-back requests (`[9,13)` then `[13,15)`) are allowed; a one-day request is accepted; same-day start/end still rejected.
6. Docs: SPEC-001 change log (D-1 superseded), README rules table, feature specs F-02/F-05, compliance matrix (rule 1 ⚠️ → ✅), OpenAPI description.

**Out of scope**: working-day calculations (weekends/holidays), changing column names.

## 5. Acceptance criteria

- **AC-1** — `POST` 2026-11-02 → 2026-11-03 returns 201 and the UI shows "1 day".
- **AC-2** — start = end → 422 `INVALID_DATE_RANGE`; end < start → 422.
- **AC-3** — An active request `[9 Dec, 13 Dec)` blocks `[12 Dec, 15 Dec)` (409) but allows `[13 Dec, 15 Dec)` (201) — in the domain, the handler pre-check and the database constraint (direct SQL).
- **AC-4** — Migration `up → down → up` runs cleanly; the 10-way concurrency test stays green.
- **AC-5** — Team calendar and timeline show the last day off as `end − 1`.
- **AC-6** — `npm run verify` green; every document listed in §4.6 updated.

## 6. Commits

| Task | Commit |
|---|---|
| T-001 API | `feat(api): end date is the return-to-work date (half-open ranges)` |
| T-002 Web | `feat(web): show vacations as days off with a return date` |
| T-003 Docs | `docs: half-open vacation ranges across specs, README and compliance` |

## 10. Change log

| Date | What changed | Reason | Approved by |
|---|---|---|---|
| 2026-10-14 | created, approved; supersedes SPEC-001 D-1 | owner: "2.11–3.11 is one day off on the 2nd, back at work on the 3rd" | Kobi |
