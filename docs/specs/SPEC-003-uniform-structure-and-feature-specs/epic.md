# SPEC-003: Uniform project structure, feature-based frontend state, feature specs and requirements compliance

## 1. Meta

| Field | Value |
|---|---|
| Spec ID | SPEC-003 |
| Title | Uniform project structure, feature-based frontend state, feature specs and requirements compliance |
| Status | `done` |
| Brownfield | no — the code was written in SPEC-001/002 and is held in context |
| Version | 0.1 |
| Owner | Kobi Saada |
| Created | 2026-10-14 |
| Last updated | 2026-10-14 |
| Related specs | SPEC-001 (product), SPEC-002 (commands for writes, services for reads) |

## 2. Summary

The product is complete (SPEC-001) and simplified (SPEC-002). This epic makes it **easy to navigate and to defend line by line**: every backend module uses one identical, familiar layout (controller → service / command → repository → entity), `shared/` is grouped by concern instead of by hexagonal layer, the frontend is organised by feature with one Pinia store per feature, and every main feature and flow — including security — gets a written feature spec. A requirements-compliance matrix checks every requirement of the brief (including the mandated stack: Vue.js, Node.js, PostgreSQL + TypeORM, Tailwind CSS, commoneventframework) against concrete evidence.

## 3. Business goal

- **Primary:** a reviewer (or the owner in an interview) can open any feature and find the same folders in the same places, and can verify each requirement of the brief from one document.
- **Non-goals:** behaviour, API, schema or UI changes.

## 4. Context

- Owner request (2026-10-14): write specs for all main features and flows (security included), check compliance with the mandated stack, split into sub-tasks with meaningful commits, feature-based frontend store, and a uniform backend structure using familiar terms (model, service, controller, command, repository) where they fit.
- Decision: keep SPEC-002's split — **commands for writes, services for reads** — and make the folder vocabulary match it.

## 8. Functional requirements

- **FR-1 MUST** — Every backend feature module has the layout of §11.1; folders that a module does not need are absent (no empty placeholders).
- **FR-2 MUST** — `apps/api/src/shared/` is grouped by concern (§11.1).
- **FR-3 MUST** — The frontend is organised by feature (§11.2); each feature owns its API client, Pinia store, routes, views and feature components; cross-feature UI lives in `shared/`.
- **FR-4 MUST** — Each feature with server state has one Pinia store (setup syntax) that owns loading/error state and actions; views render store state and call store actions only.
- **FR-5 MUST** — `docs/features/` contains one spec per main feature/flow (§11.3) with: purpose, actors, flow (mermaid), rules, API, data, security, edge cases, acceptance criteria mapped to tests, and code map.
- **FR-6 MUST** — `docs/requirements-compliance.md` lists every requirement of the brief (stack, auth, requester UI, validator UI, business rules, API, architecture, database, UI, deliverables, process) with status and evidence (file + test or command).
- **FR-7 MUST** — Behaviour is unchanged: the existing test suite passes, the API contract and schema are untouched.
- **FR-8 MUST** — One meaningful conventional commit per task.

## 11. Architecture

### 11.1 Backend target

```
apps/api/src/
  index.ts · app.ts · root.yaml · generated/ · migrations/
  bootstrap/            config.ts · container.ts · modules.ts
  shared/               (grouped by concern)
    cqrs/               command-bus.ts · event-bus.ts · unit-of-work.ts
    domain/             aggregate-root.ts · domain-event.ts
    errors/             application-errors.ts
    http/               endpoint.ts · request.ts · http-response.ts · problem-details.ts · request-context.ts
    database/           data-source.ts · pg-errors.ts · typeorm-unit-of-work.ts · domain-event.entity.ts
    security/           principal.ts (Principal, TokenIssuer, TokenVerifier)
    time/               clock.ts (Clock, SystemClock, FixedClock)
    logging/            logger.ts
  modules/<feature>/    (same layout everywhere; only the folders a module needs)
    <feature>.module.ts               wiring ("providers")
    controllers/<feature>.controller.ts
    services/<feature>.service.ts     use-case services (reads; auth)
    commands/<name>.command.ts        command message
    commands/<name>.handler.ts        its handler (write use case)
    domain/                           model: aggregate, value objects, events, errors
    repositories/<name>.repository.ts           interface
    repositories/typeorm-<name>.repository.ts   TypeORM implementation
    entities/<name>.entity.ts         TypeORM entity
    subscribers/<name>.subscriber.ts  event subscribers
```

Modules: `auth` (controller, services: auth / token / password hasher), `users` (controller, service, repository, entity), `vacation-requests` (controller, service, commands, domain, repositories, entities), `notifications` (module, subscribers), `health` (controller).

### 11.2 Frontend target

```
apps/web/src/
  main.ts · App.vue · router.ts (composes feature routes + guards) · style.css · env.d.ts
  shared/
    api/http.ts                       Axios instance + ApiError
    components/                       AppShell.vue, ui/* (Base*, DataTable, StatusBadge, …)
    composables/useToast.ts
    utils/dates.ts · utils/errors.ts
    views/ForbiddenView.vue · NotFoundView.vue
  features/
    auth/             auth.api.ts · auth.store.ts · auth.routes.ts · views/LoginView.vue
    my-requests/      my-requests.api.ts · my-requests.store.ts · my-requests.routes.ts · views/(MyRequests|NewRequest)View.vue · components/DateRangeFields.vue
    approvals/        approvals.api.ts · approvals.store.ts · approvals.routes.ts · views/DashboardView.vue · components/DecisionDialog.vue
    team-planning/    team-planning.api.ts · team-planning.store.ts · team-planning.routes.ts · views/TeamPlanningView.vue · components/TeamTimeline.vue
    vacation-requests/ (shared by features) components/(DecisionInfo|RequestHistory).vue · vacation-requests.api.ts (events)
```

### 11.3 Feature specs

`docs/features/`: `F-01-authentication-and-roles.md`, `F-02-submit-vacation-request.md`, `F-03-my-requests.md`, `F-04-approval-workflow.md`, `F-05-team-planning.md`, `F-06-commands-events-and-audit-trail.md`, `F-07-security.md`, `F-08-platform-cef-errors-logging.md`, plus `README.md` (index).

## 20. Acceptance criteria

- **AC-1** — `find apps/api/src/modules -type f` matches §11.1 for every module. *(FR-1)*
- **AC-2** — `apps/api/src/shared` contains only the concern folders of §11.1. *(FR-2)*
- **AC-3** — `apps/web/src` matches §11.2; no `views/`, `api/`, `stores/` or `components/` folders remain at the top level. *(FR-3)*
- **AC-4** — Each of `auth`, `my-requests`, `approvals`, `team-planning` has a Pinia store; their views import no API module directly; store unit tests cover loading, success, error and the main actions. *(FR-4)*
- **AC-5** — Eight feature specs and an index exist with all FR-5 sections; every cited path exists. *(FR-5)*
- **AC-6** — The compliance matrix covers every requirement line of the brief, each with status and evidence. *(FR-6)*
- **AC-7** — `npm run verify` green after every task; concurrency tests green ×3 after backend moves; browser walkthrough after the frontend tasks. *(FR-7)*
- **AC-8** — Git history shows one conventional commit per task referencing SPEC-003. *(FR-8)*

## 21. Out of scope

- Any behavioural change, new endpoint, schema change or visual redesign.
- Splitting SPEC-001 retroactively into several SPEC-NNN folders (feature specs live in `docs/features/` as living documentation; SPEC-NNN folders remain the change history).

## 23. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Broken imports after mass moves | high | low | `tsc`/`vue-tsc` after each task; `git mv` keeps history |
| CEF refs break when controllers move | medium | high | regenerate registry; `codegen:check`; integration suite drives the real handler |
| Docs drift from code | medium | medium | scripted check that every cited path exists (checklist §18) |

## 26. Change log

| Date | Version | What changed | Tasks invalidated | Reason | Approved by |
|---|---|---|---|---|---|
| 2026-10-14 | 0.1 | initial, approved | — | owner request | Kobi |
