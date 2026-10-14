## Why

The repo has docs but no code. Before building HLS, ingest or the scheduler, we need to prove the whole stack end to end (Zod domain → SQLite → domain services → Hono routes → typed RPC client → React page, plus the outbox) with one trivial entity, `Show`, built to the `typescript-architect` conventions.

## What Changes

- pnpm monorepo on Node 24 LTS: `packages/domain` (`@superthree/domain`), `apps/server` (`@superthree/server`), `apps/web` (`@superthree/web`). No build step for server/domain (Node type stripping); `tsc` is typecheck only.
- `Show` aggregate: `ShowId`, `ShowName`, `AudioLanguage` value objects, `Show` entity, `ShowNotFound` / `ShowNameTaken` errors, `ShowCreated` event.
- Domain services `ShowFinder`, `ShowCreator`, `ShowUpdater`, `ShowDeleter`; name uniqueness checked in the service (find-then-write), unique `NOCASE` index as backstop.
- New infra ports: `Clock`, `IdGenerator`, `Transactor` (groups writes in one SQLite transaction), `EventPublisher` (outbox).
- HTTP API `/api/health` and `/api/shows` CRUD; failure body `{ error: string }`; `AppType` exported for Hono RPC.
- Outbox dispatcher polling every second; one handler logging `ShowCreated`.
- React + Vite "Shows" page using the typed client.
- Docs: `doc/TECH_STACK.md` (better-result v3, Node 24 LTS), `typescript-architect` skill (`Transactor`, `IdGenerator`), `CLAUDE.md` (commands, layout).

## Capabilities

### New Capabilities
- `shows`: create, list, get, rename/change language, and delete shows, with case-insensitive unique names.
- `domain-events`: domain events stored atomically with the change in an outbox and dispatched at least once.
- `health`: liveness endpoint.

### Modified Capabilities

## Impact

- New code: everything under `packages/` and `apps/`, root workspace config.
- Dependencies: `typescript`, `zod` 4, `better-result` 3, `pino` (+ `pino-pretty` dev), `hono`, `@hono/node-server`, `@hono/zod-validator`, `kysely`, `better-sqlite3`, `react`, `vite`, `vitest`, `fast-check`.
- Out of scope: HLS, ffmpeg, scheduler, Docker, auth.
