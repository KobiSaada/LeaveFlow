# Feature specs

Living documentation of what LeaveFlow does, one file per feature or cross-cutting flow. Each spec states the behaviour, the rules, the API, the security model, the edge cases, and **which test proves each acceptance criterion**, with a code map pointing at the implementation.

SPEC folders under [`docs/specs/`](../specs) are the change history (how the product was planned and built); these files describe the product as it is now. Requirement-by-requirement status against the assignment: [`requirements-compliance.md`](../requirements-compliance.md).

| ID                                                | Feature                                        | Actors               |
| ------------------------------------------------- | ---------------------------------------------- | -------------------- |
| [F-01](./F-01-authentication-and-roles.md)        | Authentication and roles                       | everyone             |
| [F-02](./F-02-submit-vacation-request.md)         | Submit a vacation request                      | requester            |
| [F-03](./F-03-my-requests.md)                     | My requests                                    | requester            |
| [F-04](./F-04-approval-workflow.md)               | Approval workflow (dashboard, approve, reject) | validator            |
| [F-05](./F-05-team-planning.md)                   | Team planning                                  | requester, validator |
| [F-06](./F-06-commands-events-and-audit-trail.md) | Commands, events and audit trail               | system               |
| [F-07](./F-07-security.md)                        | Security (cross-cutting)                       | system               |
| [F-08](./F-08-platform-cef-errors-logging.md)     | Platform: CEF, errors, logging, configuration  | system               |

**Request path, for every feature:** browser → Vite `/api` proxy → CEF handler (`app.ts`) → route from `root.yaml` → controller (`endpoint()`: authenticate → authorize → validate) → command handler (writes) or service (reads) → repository → PostgreSQL.
