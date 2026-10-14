# SPEC-001 — Tasks

## Header

- **Epic:** [SPEC-001: LeaveFlow — Vacation Request Management](./epic.md) (status `approved`)
- **Checklist:** [verification-checklist.md](./verification-checklist.md) — every task hand-off walks §0–§9 and the spec-specific §10–§15.
- **Global DoD:** as defined in the `spec-development` skill (types, lint, tests green, rigour rules VR-01…VR-18 accounted for, adjacent configs swept).
- **Runtime facts for every task:** Node ≥ 20.19 (`.nvmrc` = 24); PostgreSQL 16 in Docker on host port **5544** (`leaveflow` dev DB, `leaveflow_test` test DB); API on `:3000` (CEF dev server), web on `:5173` (Vite, proxies `/api` → `:3000`). Pinned majors: TypeScript 5.9, TypeORM 0.3, Vitest 3, Vite 7, Vue 3.5, Vue Router 4, Pinia 3, zod 3, pino 9, Tailwind 4, CEF `1.0.19` exact.

### Task index

| ID | Title | Type | Size | Status | Languages | Blocked by | Blocks |
|---|---|---|---|---|---|---|---|
| T-001 | Monorepo scaffold, tooling, Docker Postgres | infra | M | not-started | TS, YAML | — | T-002, T-003 |
| T-002 | Shared contracts package | feature | S | not-started | TS | T-001 | T-004, T-005, T-006, T-007, T-009 |
| T-003 | Persistence: config, DataSource, entities, migrations, seed | feature | M | not-started | TS, SQL | T-001 | T-005, T-006 |
| T-004 | API kernel: CEF entry, error boundary, buses, UoW, auth guard, logging | feature | M | not-started | TS, YAML | T-002 | T-005, T-006, T-007 |
| T-005 | Auth module (login, me) | feature | S | not-started | TS | T-003, T-004 | T-007, T-008 |
| T-006 | Vacation domain + commands + events | feature | L | not-started | TS, SQL | T-003, T-004 | T-007, T-008 |
| T-007 | Queries + HTTP endpoints + root.yaml | feature | M | not-started | TS, YAML | T-005, T-006 | T-008, T-009 |
| T-008 | API integration test suite | test | M | not-started | TS, SQL | T-007 | T-010 |
| T-009 | Vue web app | feature | L | not-started | TS, Vue | T-002, T-007 | T-010 |
| T-010 | README, decisions, known limitations, fresh-clone verification | docs | M | not-started | MD | T-008, T-009 | — |

---

### T-001: Monorepo scaffold, tooling, Docker Postgres

#### Meta

| Field | Value |
|---|---|
| Type | infra |
| Size | M |
| Status | not-started |
| Languages | TS, YAML |
| Scope paths | `/package.json`, `/tsconfig.base.json`, `/eslint.config.js`, `/.prettierrc`, `/.editorconfig`, `/.gitignore`, `/.nvmrc`, `/.env.example`, `/docker-compose.yml`, `/docker/postgres/init.sql`, `apps/*/package.json`, `packages/contracts/package.json` |
| Blocked by | — |
| Blocks | T-002, T-003 |
| Epic sections | §11.1, §11.2, §15.2, §19 |

#### Goal

A reviewer can `npm install` at the root and `npm run db:up` to get a healthy PostgreSQL 16 with `leaveflow` and `leaveflow_test` databases and `btree_gist` available.

#### Scope

- npm workspaces `apps/api`, `apps/web`, `packages/contracts`; shared strict `tsconfig.base.json`.
- ESLint (flat config, typescript-eslint, eslint-plugin-vue) + Prettier; root scripts `lint`, `format:check`, `typecheck`, `test`, `dev`, `db:up`, `db:down`, `db:migrate`, `db:seed`, `setup`.
- `docker-compose.yml`: `postgres:16-alpine`, host port 5544, healthcheck, named volume; init script creates `leaveflow_test`.
- `.env.example` with every variable the API needs (documented inline).

#### Acceptance criteria

- `docker compose up -d` → container healthy; both databases exist (`psql -l` inside the container).
- `npm install` succeeds from clean; `npm run lint` and `npm run typecheck` run (may be trivially green).

#### Tests

- **Strategy:** live exercise (VR-13).
- **Core scenarios:** compose healthcheck passes; `SELECT 1` against both DBs; re-running `db:up` is a no-op (VR-14).
- **Manual verification:** none.

---

### T-002: Shared contracts package

#### Meta

| Field | Value |
|---|---|
| Type | feature |
| Size | S |
| Status | not-started |
| Languages | TS |
| Scope paths | `packages/contracts/src/**` |
| Blocked by | T-001 |
| Blocks | T-004, T-005, T-006, T-007, T-009 |
| Epic sections | §8.6, §13 |

#### Goal

One source of truth for enums, DTO types, request schemas and error codes used by both API and web.

#### Scope

- Enums: `UserRole` (`REQUESTER`, `VALIDATOR`), `VacationRequestStatus` (`PENDING`, `APPROVED`, `REJECTED`).
- `ErrorCode` union + HTTP status table exactly as epic §13.10.
- zod schemas: `isoDateSchema` (strict `YYYY-MM-DD` **and** a real calendar date — rejects `2026-02-30`), `loginRequestSchema`, `createVacationRequestSchema` (reason ≤ 500, trimmed, empty → null), `approveRequestSchema` (comment ≤ 1000 optional), `rejectRequestSchema` (comment required non-blank after trim), `paginationQuerySchema` (page ≥ 1 default 1; pageSize 1–100 default 20), `listVacationRequestsQuerySchema` (status?, userId uuid?), `teamCalendarQuerySchema` (from, to, to ≥ from, span ≤ 92 days), `idempotencyKeySchema` (uuid).
- DTO types: `PublicUser`, `LoginResponse`, `VacationRequestDto`, `TeamCalendarEntry`, `Page<T>` with `pageInfo`, `ProblemDetails`.
- Date helpers on strings only: compare, add days, days between — no `Date` local-time parsing.

#### Acceptance criteria

- Schemas behave per epic §13 (AC-20 field errors, AC-12 pageSize cap).

#### Tests

- **Core scenarios:** `isoDateSchema` accepts `2028-02-29`, rejects `2026-02-30`, `2026-1-01`, `2026-01-01T00:00`; reject schema rejects `"   "`; pageSize 101 rejected; team window 93 days rejected; positive cases for each (VR-05).

---

### T-003: Persistence — config, DataSource, entities, migrations, seed

#### Meta

| Field | Value |
|---|---|
| Type | feature |
| Size | M |
| Status | not-started |
| Languages | TS, SQL |
| Scope paths | `apps/api/src/bootstrap/config.ts`, `apps/api/src/shared/infrastructure/**`, `apps/api/src/modules/*/infrastructure/*.entity.ts`, `apps/api/src/migrations/**`, `apps/api/scripts/**` |
| Blocked by | T-001 |
| Blocks | T-005, T-006 |
| Epic sections | §10, §16.7, §19 |

#### Goal

The exact schema of epic §10.1 exists via migrations; demo data is seeded idempotently.

#### Scope

- `config.ts`: zod-validated env (`DATABASE_URL`, `JWT_SECRET` ≥ 32 chars, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_TTL_SECONDS`, `BUSINESS_TIMEZONE`, `LOG_LEVEL`, `NODE_ENV`); fails fast with a readable message.
- `DataSource` singleton with lazy `initialize()` reused across invocations (Lambda-safe), `synchronize: false`, entities/migrations registered as classes.
- Entities `UserEntity`, `VacationRequestEntity`, `DomainEventEntity` — explicit column types on every column; `passwordHash` `select: false`.
- One migration `InitialSchema` with raw SQL = epic §10.1 DDL; `down` reverses it.
- Scripts `db:migrate` (`up`), `db:migrate:revert`, `db:seed` (upsert users by email; inserts sample requests only if the seed user has none — re-runnable).
- PG error translator: `23P01` / `23505` / `23514` → typed infrastructure errors carrying the constraint name.

#### Acceptance criteria

- AC-22 (constraints reject invalid direct writes). Checklist §10 items.

#### Tests

- **Core scenarios:** up → down → up clean; direct-SQL negative test per constraint + positive pair (§10); seed twice → same user count.

---

### T-004: API kernel — CEF entry, error boundary, buses, UoW, auth guard, logging

#### Meta

| Field | Value |
|---|---|
| Type | feature |
| Size | M |
| Status | not-started |
| Languages | TS, YAML |
| Scope paths | `apps/api/src/index.ts`, `apps/api/src/app.ts`, `apps/api/src/root.yaml`, `apps/api/src/shared/{application,domain,http}/**`, `apps/api/src/shared/infrastructure/logger.ts`, `apps/api/src/bootstrap/container.ts` |
| Blocked by | T-002 |
| Blocks | T-005, T-006, T-007 |
| Epic sections | §8.6, §8.7, §11, §13.10, §16.7 |

#### Goal

Every request flows through one pipeline that never throws into CEF, always returns Problem Details on failure, carries a request id, and gives handlers an authenticated principal.

#### Scope

- `app.ts` exports `handler(event, context)`: `buildCommonEvent` → requestId (from `x-request-id` or `randomUUID`) → `getRouteConfig` (404 `ROUTE_NOT_FOUND`) → block `/context` + `/dependencies` outside development → resolve and **await** input parser → handler → wrap object results into `Response(200)` → catch-all → Problem Details. Adds `x-request-id` to every response. Logs one line per request.
- `index.ts`: `loadEnv()`, import generated registry, export `handler`, start dev server on `--local`.
- `CommandBus` (typed registry, one handler per command, middleware: logging + timing), `EventBus` (typed subscribe/publish, subscriber errors caught and logged), `UnitOfWork` port + TypeORM implementation (transaction-scoped `EntityManager`, collects aggregates' events, persists them to `domain_events` before commit, publishes after commit).
- `DomainError` hierarchy with `code` and `httpStatus`; `toProblem()` mapper for domain errors, zod errors (`422 VALIDATION_FAILED` with `errors[]`), JSON parse errors (`400`), infra constraint errors, unknown errors (`500`, generic).
- HTTP helpers: `parseJsonBody`, `decodeQuery` (URL-decodes CEF's raw values), `secured(roles, fn)` (verifies bearer JWT: HS256 only, iss/aud/exp; injects principal).
- pino logger with redaction paths for authorization, password, token, reason, comment(s).
- Manual composition root in `bootstrap/container.ts`.

#### Acceptance criteria

- AC-2, AC-20, AC-21, AC-25 (built-ins), AC-26.

#### Tests

- **Core scenarios:** throwing handler → 500 generic body, next request still served (live `--local`); malformed JSON → 400; unknown route → 404 problem; missing/expired/foreign-signed token → 401; wrong role → 403; log capture shows no token/password.

---

### T-005: Auth module (login, me)

#### Meta

| Field | Value |
|---|---|
| Type | feature |
| Size | S |
| Status | not-started |
| Languages | TS |
| Scope paths | `apps/api/src/modules/auth/**`, `apps/api/src/modules/users/**` |
| Blocked by | T-003, T-004 |
| Blocks | T-007, T-008 |
| Epic sections | §8.1, §13.1, §13.2, §13.9, §16.7 |

#### Goal

Users log in and receive a JWT; `/auth/me` and `/users` work.

#### Scope

- `LoginHandler`: lower-cases email; bcrypt compare; when user missing, compare against a fixed dummy hash (timing parity); single `INVALID_CREDENTIALS` error.
- `TokenService` (sign/verify, claims `sub`, `role`, `name`, `iss`, `aud`, `iat`, `exp`).
- `ListUsersQuery` (optional role filter, ordered by name, cap 500), `GetMeQuery`.

#### Acceptance criteria

- AC-1, AC-2 (me), AC-3 (`/users` forbidden for requester).

#### Tests

- **Core scenarios:** valid login → token decodes with expected claims; wrong password vs unknown email → identical bodies; response never includes `passwordHash`.

---

### T-006: Vacation domain + commands + events

#### Meta

| Field | Value |
|---|---|
| Type | feature |
| Size | L |
| Status | not-started |
| Languages | TS, SQL |
| Scope paths | `apps/api/src/modules/vacation-requests/{domain,application,infrastructure}/**`, `apps/api/src/modules/notifications/**` |
| Blocked by | T-003, T-004 |
| Blocks | T-007, T-008 |
| Epic sections | §8.5, §8.7, §10.3, §11.3, §12.1, §12.2, §13.11 |

#### Goal

The three commands enforce every business rule, are safe under concurrency, and emit persisted events.

#### Scope

- Domain: `DateRange` value object (strict end > start, inclusive overlap test); `VacationRequest` aggregate (`create(…, today)`, `approve(validatorId, comment, now)`, `reject(validatorId, comment, now)`, idempotent-repeat detection, records `VacationRequestCreated|Approved|Rejected`); domain errors `InvalidDateRange`, `StartDateInPast`, `VacationOverlap(conflictingRange)`, `RequestNotPending(currentStatus, decidedBy)`, `RejectionCommentRequired`, `IdempotencyKeyReused`, `NotFound`, `Forbidden`.
- Ports: `VacationRequestRepository` (`findById`, `findByIdempotencyKey`, `findActiveOverlapping`, `insert`, `saveDecision` = compare-and-set returning affected rows), `Clock` (business-TZ `today()` + `now()`).
- Handlers: `CreateVacationRequestHandler`, `ApproveVacationRequestHandler`, `RejectVacationRequestHandler` (shared decide logic), each inside the UoW; translate `23P01` → `VacationOverlap`, idempotency `23505` → replay lookup; CAS 0 rows → re-read → no-op or `RequestNotPending`.
- `NotificationSubscriber`: logs a structured "notification" line per event (stub for email/SQS).

#### Acceptance criteria

- AC-4…AC-9, AC-13, AC-15…AC-18 at the domain/handler level (HTTP-level proof in T-008).

#### Tests

- **Strategy:** Vitest unit tests on domain with a fixed clock; repository behaviour proven in T-008.
- **Core scenarios:** each BR positive + negative; transition matrix (pending→approved/rejected; approved→reject throws; approve twice no-op with no new event); overlap boundary-day inclusive; rejected excluded.

---

### T-007: Queries + HTTP endpoints + root.yaml

#### Meta

| Field | Value |
|---|---|
| Type | feature |
| Size | M |
| Status | not-started |
| Languages | TS, YAML |
| Scope paths | `apps/api/src/root.yaml`, `apps/api/src/generated/HandlerRegistry.ts`, `apps/api/src/modules/*/http/**`, `apps/api/src/modules/vacation-requests/application/queries/**` |
| Blocked by | T-005, T-006 |
| Blocks | T-008, T-009 |
| Epic sections | §8.2–§8.4, §8.6, §12.3, §13, §14 |

#### Goal

Every endpoint of epic §13 is declared in `root.yaml`, wired through CEF, guarded per §14, and documented in `/doc`.

#### Scope

- Queries: `ListMyVacationRequestsQuery`, `ListVacationRequestsQuery` (status/userId filters, `created_at DESC, id DESC`, count + page, user/decider names joined), `GetTeamCalendarQuery` (active ∩ window, projection without reason/comments), `GetVacationRequestEventsQuery` (FR-34 MAY).
- HTTP handlers + input parsers per endpoint; `Idempotency-Key` header parsing; `201` vs `200` on replay.
- `root.yaml` OpenAPI 3.0 with schemas, security scheme, and `x-handler`/`x-inputParser`; regenerate registry; `codegen:check` script.

#### Acceptance criteria

- AC-10, AC-11, AC-12, AC-19, AC-25.

#### Tests

- Covered at HTTP level in T-008; `codegen:check` green.

---

### T-008: API integration test suite

#### Meta

| Field | Value |
|---|---|
| Type | test |
| Size | M |
| Status | not-started |
| Languages | TS, SQL |
| Scope paths | `apps/api/test/**`, `apps/api/vitest.config.ts` |
| Blocked by | T-007 |
| Blocks | T-010 |
| Epic sections | §18 |

#### Goal

Prove every acceptance criterion through the real CEF handler against real PostgreSQL, with storage assertions.

#### Scope

- Harness: migrate `leaveflow_test` once; helper to build `CommonEvent`s and call `handler`; factories that create uniquely-emailed users and tokens; a fixed `Clock` injectable through the container.
- Scenarios T-1…T-18 of epic §18.2, including real parallel races (AC-8, AC-18) and TZ flip runs (§11).

#### Acceptance criteria

- All suites green; no skipped tests without `BUG-NNN` (VR-16); assertions scoped to created rows (VR-17).

---

### T-009: Vue web app

#### Meta

| Field | Value |
|---|---|
| Type | feature |
| Size | L |
| Status | not-started |
| Languages | TS, Vue |
| Scope paths | `apps/web/**` |
| Blocked by | T-002, T-007 |
| Blocks | T-010 |
| Epic sections | §8.2–§8.4, §8.8, §9, §16.2, §16.5 |

#### Goal

Both role interfaces and team planning, usable on mobile and desktop, built from reusable components.

#### Scope

- Vite + Vue 3 + TS + Tailwind 4; proxy `/api` → `http://localhost:3000` (rewrite strips `/api`).
- `api/http.ts` single Axios instance (bearer, `x-request-id`, Problem Details → `ApiError`, 401 → logout + redirect, no mutation retry); typed API modules per resource.
- Pinia `auth` store in `sessionStorage`; router guards with `meta.roles`, role landing redirects, Forbidden / NotFound pages.
- Screens per epic §9.1; components per §9.4; composables `usePaginatedQuery`, `useToast`; URL-synced dashboard filters; idempotency key generated per form session.
- Component tests for `DecisionDialog`, `PaginationControls`, `StatusBadge`, error mapper.

#### Acceptance criteria

- AC-24, AC-27; UI paths of AC-4…AC-19 walked in a browser (VR-07).

#### Tests

- **Manual verification:** epic §18.4 list.

---

### T-010: README, decisions, known limitations, fresh-clone verification

#### Meta

| Field | Value |
|---|---|
| Type | docs |
| Size | M |
| Status | not-started |
| Languages | MD |
| Scope paths | `/README.md`, `/docs/future-work.md`, `/CLAUDE.md` |
| Blocked by | T-008, T-009 |
| Blocks | — |
| Epic sections | §8.9, §11.3, §21 |

#### Goal

The README alone gets a reviewer from clone to running app and explains every decision.

#### Scope

- README: overview, stack, prerequisites, quick start, scripts, DB setup, demo users, architecture (diagram + request lifecycle + module layout), CEF integration notes, business-rule interpretations (D-1…D-4, Q5), API table, error contract, testing, known limitations, AI usage note, SDD docs pointer.
- `docs/future-work.md` from §21.
- Fresh-clone run in a temp directory following only the README (AC-23, VR-12).
