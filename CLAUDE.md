# LeaveFlow

Vacation request management — TravelFactory home assignment. See [README.md](./README.md) for setup and architecture.

## Workflow

See [`docs/workflow.md`](./docs/workflow.md) for how we plan and ship work (three tracks, six phases, gates).
All work follows spec-driven development via the `spec-development` skill (`.claude/skills/spec-development/`, vendored from evgeny-birch/spec-driven-development-skill @ 688967f). Specs live under `docs/specs/`; SPEC-001 is the whole product.

## Conventions

- npm workspaces: `apps/api` (CommonJS, CEF), `apps/web` (ESM, Vite), `packages/contracts` (shared types/schemas — change contracts first).
- Node via `.nvmrc` (24). PostgreSQL via `npm run db:up` on host port 5544.
- API routes live in `apps/api/src/root.yaml`; after editing run `npm run codegen -w @leaveflow/api` (never the `cef-gen-handlers` bin — it is a no-op via npm in CEF 1.0.19).
- New state changes = a Command + handler running in the UnitOfWork; reads = a Query on the read model. Endpoints are built with `endpoint()` (auth → role → validation in the input parser).
- TypeORM: explicit column types on every column (esbuild has no decorator metadata); schema only via migrations.
- Calendar dates are `YYYY-MM-DD` strings end to end; never `new Date('YYYY-MM-DD')`.
- Gate before committing: `npm run verify` (needs the database up). Conventional commits, one logical change each.
