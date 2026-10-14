# F-07 — Security (cross-cutting)

## Threat model (scope)

Authenticated employees and managers on a single team; attackers may hold a valid requester account or none. Out of scope: infrastructure hardening, DoS, rate limiting (documented limitations).

## Permissions matrix

| Action                             | Requester | Validator | Anonymous |
| ---------------------------------- | --------- | --------- | --------- |
| Log in                             | ✓         | ✓         | ✓         |
| `/auth/me`                         | ✓         | ✓         | —         |
| Create request                     | own only  | —         | —         |
| List own requests                  | ✓         | —         | —         |
| List all / filter                  | —         | ✓         | —         |
| Approve / reject                   | —         | ✓         | —         |
| Team calendar (no reason/comments) | ✓         | ✓         | —         |
| List users                         | —         | ✓         | —         |
| Request history                    | own       | ✓         | —         |

## Controls

| Area             | Control                                                                                                                                                               | Where                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Authentication   | HS256 JWT, pinned algorithm, `iss`/`aud`/`exp` checked, claims validated; secret ≥ 32 chars enforced at start-up                                                      | `modules/auth/services/jwt-token.service.ts`, `bootstrap/config.ts` |
| Order of checks  | authenticate → authorize → validate, inside the CEF input parser — anonymous callers get 401 before any validation; a handler reached without its parser fails closed | `shared/http/endpoint.ts`                                           |
| Authorization    | role per route **and** in command handlers (defence in depth)                                                                                                         | controllers, handlers                                               |
| IDOR             | requester scope from the token only; another user's request → 404, not 403                                                                                            | `services/vacation-requests.service.ts`                             |
| Passwords        | bcrypt cost 10; hash `select: false`, loaded by one query, never returned; dummy-hash comparison for unknown emails                                                   | `modules/auth/services/auth.service.ts`                             |
| Injection        | TypeORM bound parameters everywhere; raw SQL only for `SELECT 1` and a parameterised advisory lock                                                                    | repositories                                                        |
| Input            | zod schemas for body, query, path, header (UUIDs, calendar dates, lengths)                                                                                            | `packages/contracts/src/schemas.ts`                                 |
| Data exposure    | Problem Details with stable codes; 500s generic; team calendar omits free text; events carry ids/dates only                                                           | `shared/http/problem-details.ts`                                    |
| Logging          | no bodies logged; redaction of authorization, password, token, reason, comment(s); correlation id validated against log injection                                     | `shared/logging/logger.ts`, `app.ts`                                |
| Runtime metadata | CEF `/context` and `/dependencies` only in development                                                                                                                | `app.ts`                                                            |
| Browser          | no `v-html`; same-origin API via proxy; post-login redirect restricted to in-app paths                                                                                | `apps/web`                                                          |
| Secrets          | only documented local-dev placeholders in the repo; `.env` git-ignored                                                                                                | `apps/api/.env.example`                                             |

## Known limitations

No rate limiting or body-size limit; no refresh tokens; token in `sessionStorage` (XSS-readable — mitigated by having no HTML injection sinks; production: httpOnly cookie + CSRF); role read from the token (a role change would apply at the next login).

## Acceptance criteria → tests

| Criterion                                                                        | Test                                                                                                     |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Full RBAC matrix (401/403 per endpoint), forbidden attempts change nothing, IDOR | `apps/api/test/integration/rbac.test.ts`                                                                 |
| Forged / expired / `alg:none` tokens                                             | `apps/api/test/integration/auth.test.ts`, `apps/api/src/modules/auth/services/jwt-token.service.test.ts` |
| No hash in responses; enumeration-safe login                                     | `apps/api/test/integration/auth.test.ts`                                                                 |
| 500 hides internals; built-ins hidden; log redaction                             | `apps/api/test/integration/http-contract.test.ts`                                                        |
| A security review of the whole codebase found no exploitable issue (2026-10-14)  | recorded in the project history                                                                          |
