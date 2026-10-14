# SPEC-003 — Execution plan

## 1. Meta

| Field | Value |
|---|---|
| Parent epic | [SPEC-003](./epic.md) |
| Tasks source | [tasks.md](./tasks.md) |
| Status | `in-progress` |
| Created | 2026-10-14 |

| Execution preference | Value |
|---|---|
| Engine | `task-tool` — executed in-session by the orchestrator, sequentially (tightly coupled moves) |
| Stop mode | `auto` (owner: "execute") |
| Concurrency cap | 1 |
| Review enabled | `false` |

## 3. Dependency graph

```mermaid
flowchart LR
  T001 --> T002 --> T003 --> T006
  T004 --> T005 --> T006 --> T007
```

## 6. Waves

1. T-001 → T-002 → T-003 (backend, sequential: shared paths)
2. T-004 → T-005 (frontend)
3. T-006 → T-007 (docs, after code settles so cited paths are final)

## 8. Review gates

| Gate | When | How |
|---|---|---|
| Behaviour preservation | after each structural task | `npm run verify`; integration ×3 after T-003 |
| UI walkthrough | after T-005 | browser, both roles |
| Docs truthfulness | after T-006/T-007 | path-existence script |

## 11. Progress log

| Task | Started | Completed | Status | Notes |
|---|---|---|---|---|
| T-001 | 2026-10-14 | — | in-progress | |
| T-002 | — | — | not-started | |
| T-003 | — | — | not-started | |
| T-004 | — | — | not-started | |
| T-005 | — | — | not-started | |
| T-006 | — | — | not-started | |
| T-007 | — | — | not-started | |
