# Future work

Register of deferred work that is **not** a defect (defects go to `docs/bugs/`). Numbering `FW-NN`, never reused.

| Status      | Meaning                            |
| ----------- | ---------------------------------- |
| `open`      | in the queue, not yet scheduled    |
| `scheduled` | a SPEC / HF has been opened for it |
| `done`      | shipped; kept as history           |
| `wont-do`   | dropped, with a reason             |

## Register

| ID    | Item                                                                                                                                             | Source                    | Status | Notes                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| FW-01 | Cancel a pending request (`CancelVacationRequestCommand`, `VacationRequestCancelled`)                                                            | SPEC-001 §21              | open   | Natural next command; the state machine gains `PENDING → CANCELLED`, the overlap constraint already ignores non-active statuses. |
| FW-02 | Teams/departments; team planning scoped to the viewer's team                                                                                     | SPEC-001 §21, §23.2       | open   | Needs a `teams` table and membership; calendar query gains a team filter.                                                        |
| FW-03 | Durable outbox relay, or an SQS `EventPublisher` adapter consumed through CEF's `/sqs/{queue}` routing                                           | SPEC-001 §11.3, §21       | open   | Closes the "persisted but not published" gap of the outbox-lite.                                                                 |
| FW-04 | Real notifications (email) behind the existing subscriber                                                                                        | SPEC-001 §21              | open   | Depends on FW-03 for at-least-once delivery.                                                                                     |
| FW-05 | Refresh tokens and httpOnly-cookie sessions (with CSRF protection)                                                                               | SPEC-001 §16.7            | open   | Removes the token from script-readable storage.                                                                                  |
| FW-06 | Login rate limiting and request-body size limits                                                                                                 | SPEC-001 §16.7, §21       | open   | API Gateway / WAF in production; app-level limiter locally.                                                                      |
| FW-07 | Keyset pagination for the dashboard                                                                                                              | SPEC-001 §11.3            | open   | Only needed far beyond the assumed 100k requests.                                                                                |
| FW-08 | Leave balances, half days, public holidays, working-day counts                                                                                   | SPEC-001 §3 non-goals     | open   |                                                                                                                                  |
| FW-09 | CI pipeline running `npm run verify` against a PostgreSQL service                                                                                | SPEC-001 §21 (D-4)        | open   |                                                                                                                                  |
| FW-10 | Automated browser E2E (Playwright) for both roles                                                                                                | SPEC-001 §21              | open   | Pin locale/timezone per the verification checklist.                                                                              |
| FW-11 | Report the `cef-gen-handlers` no-op bin, the dev-server `res.end(object)` crash and the missing `PATCH` in preflight upstream to CEF maintainers | SPEC-001 T-004            | open   | Workarounds are in place in this repo.                                                                                           |
| FW-12 | User provisioning: admin-only `CreateUserCommand` (role chosen by an admin) or SSO; optional invite flow                                         | owner question 2026-10-14 | open   | Self-registration deliberately omitted — a user must never choose their own role.                                                |
