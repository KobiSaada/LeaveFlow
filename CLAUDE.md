# LeaveFlow

Vacation request management — TravelFactory home assignment. See [README.md](./README.md) for setup and architecture.

## Workflow

See [`docs/workflow.md`](./docs/workflow.md) for how we plan and ship work (three tracks, six phases, gates).
All work follows spec-driven development via the `spec-development` skill (`.claude/skills/spec-development/`, vendored from evgeny-birch/spec-driven-development-skill @ 688967f). Specs live under `docs/specs/`; SPEC-001 is the whole product.

## Conventions

- npm workspaces: `apps/api` (CommonJS, CEF), `apps/web` (ESM, Vite), `packages/contracts` (shared types/schemas — change contracts first).
- Structure (keep it uniform): API modules = `<feature>.module.ts`, `controllers/`, `services/`, `commands/` (`*.command.ts` + `*.handler.ts`), `domain/`, `repositories/` (interface + `typeorm-*`), `entities/`, `subscribers/`; `shared/` by concern. Web features = `features/<feature>/{<feature>.api.ts, <feature>.store.ts, <feature>.routes.ts, views/, components/}`; cross-feature code in `shared/`. Views call their feature store only.
- Feature behaviour is documented in `docs/features/F-NN-*.md`; update the matching spec (and `docs/requirements-compliance.md`) when behaviour changes.
- Node via `.nvmrc` (24). PostgreSQL via `npm run db:up` on host port 5544.
- API routes live in `apps/api/src/root.yaml`; after editing run `npm run codegen -w @leaveflow/api` (never the `cef-gen-handlers` bin — it is a no-op via npm in CEF 1.0.19).
- Layering: controller (`modules/*/controllers`, built with `endpoint()`: auth → role → validation in the input parser) → command handler on the `CommandBus` for writes (runs in the UnitOfWork, records events) or a read service (`container.services.*`) for reads → repository / read model. No query bus.
- TypeORM: explicit column types on every column (esbuild has no decorator metadata); schema only via migrations.
- Calendar dates are `YYYY-MM-DD` strings end to end; never `new Date('YYYY-MM-DD')`.
- Gate before committing: `npm run verify` (needs the database up). Conventional commits, one logical change each.
