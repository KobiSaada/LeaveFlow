# SPEC-002 — Simplify the architecture: commands for writes, services for reads

## 1. Meta

| Field | Value |
|---|---|
| ID | SPEC-002 |
| Title | Simplify the architecture: commands for writes, services for reads |
| Track | small-spec |
| Status | approved |
| Compliance critical | `false` |
| Created | 2026-10-14 |
| Last updated | 2026-10-14 |
| Owner | Kobi Saada |

## 2. Summary

A review of SPEC-001's code against KISS/YAGNI found ceremony the assignment does not ask for: every read goes through a QueryBus and a dedicated query class, and two concurrency fallbacks became dead code once per-user submissions were serialised. This spec keeps the command/event architecture the brief requires for **writes**, turns **reads** into plain services, deletes the dead code, and renames HTTP adapters to the familiar *controller* vocabulary. Behaviour is unchanged.

## 3. Goal

The code reads as **controller → service / command handler → repository**, every remaining abstraction earns its place, and the existing test suite proves nothing observable changed.

## 4. Scope

**In scope**

1. Replace `QueryBus` and the eight query classes/handlers with services:
   - `VacationRequestQueries` (`getById`, `listMine`, `listAll`, `teamCalendar`, `events`) — keeps the visibility rule (another user's request → 404).
   - `AuthService` (`login`, `me`) and `UsersService` (`list`).
   - The composition root exposes them as `container.services.*`.
2. Keep `CommandBus`, the three commands, their handlers, the unit of work and the event bus (required by the brief: "commands such as CreateVacationRequestCommand … events such as vacation approved").
3. Delete dead code:
   - transient-error retry in `TypeOrmUnitOfWork` (zero retries observed since the advisory lock was added);
   - the idempotency-key race recovery in `CreateVacationRequestHandler` and `IdempotencyKeyRaceError` (unreachable: one user's submissions are serialised). The unique index stays as a safety net and maps to `IDEMPOTENCY_KEY_REUSED`.
4. Rename `modules/*/http/*.http.ts` → `modules/*/controllers/*.controller.ts`; update `root.yaml` and the generated registry.
5. Update README, CLAUDE.md and SPEC-001's change log.

**Out of scope**

- Any change to the API contract, database schema or UI.
- Removing the CommandBus or merging commands into a single service (would hollow out the brief's command requirement).

## 5. Acceptance criteria

- **AC-1** — No `QueryBus`, `Query` base class or `*Query` class remains in `apps/api/src`; controllers call `container.services.*` for reads and `container.commandBus` for writes.
- **AC-2** — `TypeOrmUnitOfWork.run` executes the work exactly once; `IdempotencyKeyRaceError` and `isTransientTransactionError` no longer exist.
- **AC-3** — All routes in `root.yaml` reference `modules/*/controllers/*.controller#…`; `npm run codegen:check` passes.
- **AC-4** — `npm run verify` is green; the integration suite passes unchanged apart from AC-1 references, three runs in a row (concurrency included).
- **AC-5** — README's architecture section and CLAUDE.md describe the controller → service / command → repository layering.

## 6. Implementation notes

### Files to create or modify

| Path | Action | Purpose |
|---|---|---|
| `apps/api/src/shared/application/bus.ts` | modify | CommandBus only |
| `apps/api/src/bootstrap/container.ts`, `bootstrap/modules.ts` | modify | `services` instead of `queryBus` |
| `apps/api/src/modules/vacation-requests/application/vacation-request-queries.ts` | create | read service |
| `apps/api/src/modules/vacation-requests/application/queries/*` | delete | replaced |
| `apps/api/src/modules/auth/application/auth.service.ts` | create | replaces LoginQuery/GetMeQuery |
| `apps/api/src/modules/users/application/users.service.ts` | create | replaces ListUsersQuery |
| `apps/api/src/shared/infrastructure/database/typeorm-unit-of-work.ts`, `pg-errors.ts` | modify | drop retry |
| `apps/api/src/modules/vacation-requests/application/commands/create-vacation-request.command.ts`, `ports/…`, `infrastructure/…repository.ts` | modify | drop race recovery |
| `apps/api/src/modules/*/http/*` → `controllers/*.controller.ts` | rename | vocabulary |
| `apps/api/src/root.yaml`, `generated/HandlerRegistry.ts` | modify | new refs |
| tests referencing removed internals | modify | AC-1 |

### Documentation impact

README (architecture table, layers), CLAUDE.md conventions, SPEC-001 §26 change-log row pointing here.

## 7. Tests

### Strategy

Behaviour-preserving refactor: the SPEC-001 suites are the regression net. Unit tests move with the code they test (login handler → `AuthService`).

### Core scenarios

- Full integration suite green ×3 (AC-4), including races.
- `AuthService` unit tests: token issued, wrong password, unknown email uses the dummy hash.
- `VacationRequestQueries`: requester cannot read another user's request (covered by integration IDOR tests).

### Manual verification (run at task end)

- Smoke the running app: login as Alice and Dana, dashboard loads, approve works.

## 7.5 Verification rigour gate

[verification-checklist.md](./verification-checklist.md) §0–§9 plus §16 (behaviour preservation).

## 8. Open questions

None.

## 10. Change log

| Date | What changed | Reason | Approved by |
|---|---|---|---|
| 2026-10-14 | created, approved | owner chose the hybrid direction | Kobi |
