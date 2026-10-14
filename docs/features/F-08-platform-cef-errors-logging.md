# F-08 — Platform: CEF, errors, logging, configuration

## Purpose

The HTTP edge and operational behaviour shared by every feature, built on TravelFactory's `commoneventframework` (CEF).

## CEF integration

- Routing: every endpoint declared in `apps/api/src/root.yaml` (OpenAPI 3.0) with `x-handler` and `x-inputParser` → `file#export` under `src/`. `npm run codegen -w @leaveflow/api` regenerates `src/generated/HandlerRegistry.ts`; `codegen:check` fails on drift.
- Entry: `src/index.ts` (`loadEnv`, registry, Lambda `handler`, `startDevServer` on `--local`) → `src/app.ts` (`createHttpHandler`).
- Local dev server on :3000; Swagger UI at `/doc`; Lambda bundle via `npm run build` (`cef-build`), verified to run.

## Request lifecycle (`app.ts`)

1. Assign a request id (valid incoming `x-request-id` or a new UUID) and open the request context.
2. `buildCommonEvent` (routes loaded from an explicit `root.yaml` path on the first call).
3. Block `/context` and `/dependencies` outside development.
4. Resolve route → **await** the input parser → handler.
5. Map any thrown error to Problem Details; never let an exception reach CEF (its dev server crashes on one).
6. Add `x-request-id`; log one line per request.

## Error contract

RFC 9457 `application/problem+json`: `{ type, title, status, code, detail?, errors?[], requestId, …extensions }`.

| HTTP | Codes                                                                                         |
| ---- | --------------------------------------------------------------------------------------------- |
| 400  | `MALFORMED_JSON`                                                                              |
| 401  | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`                                                      |
| 403  | `FORBIDDEN`                                                                                   |
| 404  | `NOT_FOUND`, `ROUTE_NOT_FOUND`                                                                |
| 409  | `VACATION_OVERLAP`, `REQUEST_NOT_PENDING`, `IDEMPOTENCY_KEY_REUSED`                           |
| 422  | `VALIDATION_FAILED`, `INVALID_DATE_RANGE`, `START_DATE_IN_PAST`, `REJECTION_COMMENT_REQUIRED` |
| 500  | `INTERNAL_ERROR` (generic body; details in logs)                                              |

## Logging

pino JSON with `requestId`, `userId`, `role`; one line per request (method, path, status, duration, error code) and per command (name, outcome, duration); redaction of secrets and free text.

## Configuration

zod-validated environment at start-up (fail fast): `DATABASE_URL`, `JWT_*`, `BUSINESS_TIMEZONE`, `LOG_LEVEL`, `NODE_ENV`. TypeORM `synchronize: false`; schema only via migrations.

## CEF issues found and handled

Dev server crashes on thrown errors · preflight lacks `PATCH` and its `Allow-Headers: *` never covers `Authorization` (→ same-origin proxy, task-based POSTs) · query values not URL-decoded · `root.yaml` lookup from `argv[1]` · sample entry calls the parser synchronously · `cef-gen-handlers` bin is a no-op via npm/npx · built-ins expose metadata · `FRONT_END_URL` read before `loadEnv()` · esbuild has no decorator metadata (explicit column types, manual DI).

## Acceptance criteria → tests

| Criterion                                                                       | Test / command                                     |
| ------------------------------------------------------------------------------- | -------------------------------------------------- |
| Problem Details shape, request id echo/replace, unknown route, built-ins hidden | `apps/api/test/integration/http-contract.test.ts`  |
| 500 hides internals and the next request is served                              | `apps/api/test/integration/http-contract.test.ts`  |
| Query decoding, header case, JSON/base64 bodies                                 | `apps/api/src/shared/http/request.test.ts`         |
| Error mapping                                                                   | `apps/api/src/shared/http/problem-details.test.ts` |
| Registry matches `root.yaml`                                                    | `npm run codegen:check -w @leaveflow/api`          |

## Code map

`apps/api/src/index.ts`, `apps/api/src/app.ts`, `apps/api/src/root.yaml`, `apps/api/scripts/codegen.js`, `apps/api/src/shared/http/`, `apps/api/src/shared/logging/logger.ts`, `apps/api/src/bootstrap/config.ts`
