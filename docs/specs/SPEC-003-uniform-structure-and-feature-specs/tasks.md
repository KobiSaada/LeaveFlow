# SPEC-003 — Tasks

Epic: [epic.md](./epic.md) (`approved`). Checklist: [verification-checklist.md](./verification-checklist.md). Global DoD from the `spec-development` skill applies.

| ID | Title | Type | Size | Status | Blocked by | Blocks |
|---|---|---|---|---|---|---|
| T-001 | Backend `shared/` grouped by concern | refactor | M | not-started | — | T-002 |
| T-002 | Uniform layout: users, auth, health, notifications | refactor | M | not-started | T-001 | T-003 |
| T-003 | Uniform layout: vacation-requests (split command/handler) | refactor | M | not-started | T-002 | T-006 |
| T-004 | Frontend feature-based folders + shared | refactor | M | not-started | — | T-005 |
| T-005 | Feature Pinia stores; thin views; store tests | refactor | L | not-started | T-004 | T-006 |
| T-006 | Feature specs F-01…F-08 | docs | M | not-started | T-003, T-005 | T-007 |
| T-007 | Requirements-compliance matrix; README/CLAUDE.md structure | docs | M | not-started | T-006 | — |

## T-001 — Backend `shared/` grouped by concern
- **Scope:** move files per epic §11.1 (`shared/application|domain|infrastructure` → `cqrs`, `domain`, `errors`, `database`, `security`, `time`, `logging`); merge `SystemClock`/`FixedClock` with the `Clock` port into `time/clock.ts`; update imports.
- **Tests:** `npm run verify`; integration ×3.
- **AC:** epic AC-2, AC-7.

## T-002 — Uniform layout: users, auth, health, notifications
- **Scope:** users → `controllers/ services/ repositories/ entities/`; auth → `controllers/ services/` (auth, jwt-token, password-hasher); notifications → `notifications.module.ts` + `subscribers/`; health unchanged (controller only). Update `root.yaml`, regenerate registry, update seed/migration/test imports.
- **AC:** epic AC-1 (for these modules), AC-7.

## T-003 — Uniform layout: vacation-requests
- **Scope:** `commands/<name>.command.ts` + `commands/<name>.handler.ts` (decider → `commands/vacation-request-decider.ts`), `services/vacation-requests.service.ts` (`VacationRequestsService`, was `VacationRequestQueries`), `repositories/` (write + read interfaces and TypeORM implementations), `entities/`, `domain/` unchanged.
- **AC:** epic AC-1, AC-7 (integration ×3).

## T-004 — Frontend feature-based folders
- **Scope:** move to epic §11.2; per-feature `*.routes.ts` composed in `router.ts`; per-feature `*.api.ts`.
- **AC:** epic AC-3; `vue-tsc`, tests, build green.

## T-005 — Feature Pinia stores
- **Scope:** `useAuthStore` (exists, moved), `useMyRequestsStore` (list, page, submit with idempotency key), `useApprovalsStore` (filters, page, approve/reject, conflict handling, requesters), `useTeamPlanningStore` (month, entries, grouped rows); extract `TeamTimeline.vue`; remove `usePaginatedQuery` if unused; store unit tests with mocked API.
- **AC:** epic AC-4; browser walkthrough (VR-07).

## T-006 — Feature specs
- **Scope:** epic §11.3; each spec: purpose, actors, flow (mermaid), rules, API, data, security, edge cases, acceptance criteria → tests, code map.
- **AC:** epic AC-5; path-existence script.

## T-007 — Compliance matrix and docs
- **Scope:** `docs/requirements-compliance.md` (every brief requirement → status → evidence); README architecture/structure sections and CLAUDE.md updated to the new layout.
- **AC:** epic AC-6; path-existence script; `npm run verify`.
