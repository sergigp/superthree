# Superthree

<h1>
<p align="center">
  <img width="335" height="314" alt="image" src="https://github.com/user-attachments/assets/cd18b296-d3a2-443a-ad5a-9c259654c76b" />
</p>
</h1>
  <p align="center">
    A self-hosted, broadcast-style TV channel for kids.
    <br />
  </p>
</p>


## About

A parent builds the schedule; the child just turns on the TV and watches whatever is on. No menus, no thumbnails, no "one more episode" — like a real channel, but with content you picked.

## How it works

1. **Ingest** — Episodes from the video library are pre-segmented into HLS with ffmpeg. The library has mixed formats, so everything is normalised once at ingest; there is no live transcoding.
2. **Schedule** — A web UI lets the parent build the rundown (what plays and when). The schedule is stored in SQLite.
3. **Playout** — From the schedule, the server generates an M3U playlist that any IPTV client can consume. In my setup that is an IPTV app on an Apple TV.

```
 Video library ──► Ingest (ffmpeg → HLS) ──► HLS segments ─┐
                                                          ├──► M3U ──► IPTV client (Apple TV)
 Web UI ──► Schedule (SQLite) ────────────────────────────┘
```

Everything runs in a single Docker container on a Synology NAS, next to the video files.

## Tech stack

- **TypeScript on Node.js**, with a minimalist functional style: `Result`/`Option` types and a thin HTTP layer that understands them. Libraries over frameworks.
- **SQLite** for the schedule and for domain events (outbox pattern)
- **Zod 4** for validation
- **better-result** for typed error handling
- **pino** for logging
- **ffmpeg** for HLS segmentation (CPU by default, Intel Quick Sync optional)
- **Docker** for deployment

## Status

Early stage, built as a proof of concept in phases:

1. One hand-segmented episode served from a Mac to the Apple TV
2. The same, served from a Docker container on the NAS
3. Ingest running inside the container


# Task: bootstrap the superthree TypeScript monorepo with one vertical slice (`Show`)

Read `doc/TECH_STACK.md` and use the skill `typescript-architect` first. Where they disagree, `stack.md` wins: the architecture doc still mentions Rust/axum and a `FROM scratch` image, and both are obsolete. I am assuming the repo contains only those two docs.

Goal: prove the whole pipeline end to end with one trivial entity: domain schema → SQLite table → repository → use cases → HTTP routes → typed client → React page. Nothing about HLS, ffmpeg, the scheduler, Docker or auth belongs in this task.

## Ground rules

- Use only the libraries in `stack.md`, plus `@hono/zod-validator` and `pino-pretty` (dev only). Ask before adding anything else. No linter or formatter yet.
- Check the installed versions' READMEs and types for Zod 4, better-result v2, Hono RPC and `@hono/zod-validator` instead of writing their APIs from memory.
- Functional style: plain functions and data, no classes except better-result `TaggedError`s. No `any`. No custom `Option`: use `T | undefined`.
- Domain errors are returned as `Result`, never thrown. Unexpected failures (I/O, bugs) may throw and end up as a 500 in Hono's `onError`, logged with pino.
- Code, comments and docs in English.
- Commit after each numbered step.

## 1. Workspace

- pnpm workspaces, Node 24 (`.nvmrc`, `engines`). Packages: `packages/domain` (`@superthree/domain`), `apps/server` (`@superthree/server`), `apps/web` (`@superthree/web`).
- pnpm blocks install scripts by default: allow `better-sqlite3` and `esbuild` builds in `pnpm-workspace.yaml`.
- No build step for server or domain. Node 24 runs `.ts` directly (type stripping); `tsc` is typecheck only.
- `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `noEmit`, `module: nodenext`. Relative imports use `.ts` extensions.
- `@superthree/domain` exports its source directly (`"exports": "./src/index.ts"`). If type stripping refuses the workspace import, stop and tell me rather than adding a build step.
- Root scripts: `dev` (server with `node --watch` + Vite, in parallel), `test`, `typecheck`, `build` (web only).

## 2. Domain (`packages/domain`)

Zod 4 schemas, with types inferred from them:

- `AudioLanguage`: enum `'ca' | 'es' | 'en'`
- `Show`: `id` (uuid string), `name` (trimmed, 1–100 chars), `audioLanguage`, `createdAt` (ISO 8601 UTC string, not `Date`, so it survives JSON unchanged)
- `NewShow`: `name`, `audioLanguage`
- `ShowPatch`: both fields optional, at least one present

Tagged errors (`TaggedError("…")<Props>()`): `ShowNotFound { id }`, `ShowNameTaken { name }`.

Event type: `ShowCreated { showId, name, audioLanguage, occurredAt }`.

## 3. Database (`apps/server/src/db`)

- Kysely + better-sqlite3. File at `${DATA_DIR}/superthree.db`. Pragmas: `journal_mode = WAL`, `foreign_keys = ON`.
- Hand-written Kysely `Database` interface. Columns in snake_case, with an explicit row → domain mapping function in the repository (no `CamelCasePlugin`).
- Kysely `Migrator` with a static in-code migration map, run at startup. Migration `0001_init`:
  - `shows`: `id TEXT PRIMARY KEY`, `name TEXT NOT NULL`, `audio_language TEXT NOT NULL CHECK (audio_language IN ('ca','es','en'))`, `created_at TEXT NOT NULL`, unique index on `name COLLATE NOCASE`
  - `outbox`: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `type TEXT NOT NULL`, `payload TEXT NOT NULL` (JSON), `created_at TEXT NOT NULL`, `processed_at TEXT` (nullable)
- Config parsed with Zod in `config.ts`: `PORT` (default 8080), `DATA_DIR` (default `./data`), `LOG_LEVEL` (default `info`), `WEB_DIST` (optional).

## 4. Server (`apps/server/src`)

Three thin layers under `shows/`:

- `repository.ts`: SQL only. Functions take a Kysely instance or transaction. Name uniqueness is enforced by the index: catch `SQLITE_CONSTRAINT_UNIQUE` and return `ShowNameTaken`; do not pre-check with a SELECT.
- `usecases.ts`: `listShows`, `getShow`, `createShow`, `updateShow`, `deleteShow`, each returning `Promise<Result<…>>`. Compose with `Result.gen` / `Result.await`. `now` and `newId` (`crypto.randomUUID`) are injected so tests are deterministic.
- `routes.ts`: HTTP only. Validate with `@hono/zod-validator` using the domain schemas.

Routes, chained so the type is inferable, with `AppType` exported from `app.ts`:

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| GET | `/api/health` | 200 `{ status: 'ok' }` | |
| GET | `/api/shows` | 200 `Show[]`, sorted by name | |
| GET | `/api/shows/:id` | 200 `Show` | 404 |
| POST | `/api/shows` | 201 `Show` | 400, 409 |
| PATCH | `/api/shows/:id` | 200 `Show` | 400, 404, 409 |
| DELETE | `/api/shows/:id` | 204 | 404 |

- Error body: `{ error: { _tag, message, …props } }`.
- `http/result.ts` is the one place that maps `_tag` → status (`ShowNotFound` → 404, `ShowNameTaken` → 409), exhaustively via `matchError`. Whatever shape that helper takes, Hono RPC inference must survive: the client has to see typed success and error bodies per status code.
- pino: one logger, a child logger per request with a request id, one log line per request. `pino-pretty` in dev only.
- `main.ts` is the composition root: config → db → migrate → app → listen. Graceful shutdown on SIGTERM.
- If `WEB_DIST` is set, serve it with `serveStatic` from `@hono/node-server/serve-static`, with an SPA fallback to `index.html`.

## 5. Web (`apps/web`)

- React + Vite + TypeScript. The Vite dev server proxies `/api` to `http://localhost:8080`.
- `api.ts`: `hc<AppType>('/')`, with a type-only import of `AppType` from `@superthree/server` (workspace devDependency).
- One page, "Shows":
  - table with name, audio language, created at
  - add form with a name input and a language select
  - per-row language select that PATCHes on change
  - delete button with a confirm
- Narrow on the response status and render domain errors inline from the typed error body (for example, a 409 shows "A show named X already exists").
- Plain `useState`/`useEffect`, refetch after each mutation. No router, no data-fetching library, no UI kit; one small CSS file.

## 6. Outbox (do this last, in its own commit)

- `createShow` inserts the show and a `ShowCreated` outbox row in the same transaction.
- `outbox/dispatcher.ts`: polls every second, reads unprocessed rows in id order, calls the handler registered for that `type`, sets `processed_at`. Delivery is at-least-once, so handlers must be idempotent. The only handler for now logs the event with pino. Start it in `main.ts`, stop it on shutdown.

## 7. Tests (Vitest, colocated `*.test.ts`)

- Route tests through `app.request()` against a fresh in-memory SQLite (`:memory:`) per test:
  - happy path for all five operations
  - duplicate name → 409, including a case-only difference
  - unknown id → 404
  - invalid language or blank name → 400
- Outbox: a successful create writes exactly one `ShowCreated` row; a rejected create writes none.
- One fast-check property: for any valid `NewShow`, POST then GET returns the same trimmed name and language (fresh DB per run).

## Done when

- `pnpm typecheck` and `pnpm test` pass.
- With `pnpm dev` running, the CRUD works over curl against `:8080`, and at `http://localhost:5173` I can create, edit and delete a show and see the 409 message on a duplicate name.
- A `ShowCreated` log line appears after each create.
- A short `CLAUDE.md` exists with the commands, the layout and the conventions above.
- You finish with a summary of anything you did differently from this prompt and why.