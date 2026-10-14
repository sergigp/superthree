# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Superthree: self-hosted, broadcast-style TV channel for kids. Parent builds a schedule in a web UI; server generates an M3U/HLS playlist consumed by an IPTV client (Apple TV). Runs in a single Docker container on a Synology NAS.

Early stage: one vertical slice (`Show` CRUD + outbox) proves the stack end to end. See `README.md` (pipeline, PoC phases) and `doc/TECH_STACK.md` (stack decisions and rationale) — keep them in sync when decisions change.

## Commands

- `pnpm install` — Node 24 (`.nvmrc`), pnpm workspaces.
- `scripts/run-local.sh` — builds the SPA and runs the server serving it on :8080, DB persisted in `data/` (`--fresh-db`, `--skip-web-build`, `--port`; `--help`). Use it to try the app the way the container runs it.
- `pnpm dev` — server (`node --watch`, port 8080) + Vite (proxies `/api`), for hot reload while developing.
- `pnpm test` — Vitest over every package; `pnpm test -- <file>` for one file.
- `pnpm typecheck` — `tsc` per package (typecheck only, no emit).
- `pnpm build` — builds the web SPA only; server and domain run as `.ts` via Node type stripping.
- Server env: `PORT`, `DATA_DIR` (SQLite at `$DATA_DIR/superthree.db`), `LOG_LEVEL`, `WEB_DIST` (serve built SPA), `NODE_ENV`.

## Layout

- `packages/domain` (`@superthree/domain`) — shared Zod value objects and entities, imported by concrete path (`@superthree/domain/show/show`), no barrel.
- `apps/server` (`@superthree/server`) — `domain/` (services, errors, events), `application/` (Hono routes, subscribers, tasks), `infrastructure/` (Kysely repositories, ports). Exports `./app` for the web's `AppType` import.
- `apps/web` (`@superthree/web`) — React + Vite SPA using the Hono RPC client.

Follow the `typescript-architect` skill for layering, naming and testing.

## Architecture

- **Ingest**: ffmpeg pre-segments library episodes into HLS once. No live transcoding.
- **Schedule**: stored in SQLite, edited via React + Vite SPA served by Hono.
- **Playout**: server computes the live M3U playlist from the schedule.

Pure functional core (scheduler, playlist generation); effects at the edges (HTTP, SQLite, ffmpeg).

## Conventions

- TypeScript at maximum strictness (`tsconfig.base.json`, every package extends it) on Node 24. Relative imports use `.ts` extensions; only erasable syntax. Libraries over frameworks.
- Errors as values via `better-result`; don't throw domain errors.
- Optional values: native `T | undefined`, no custom `Option`.
- Validate all incoming data with Zod 4; infer domain types from schemas.
- Domain events via in-house SQLite outbox, written in same transaction as the change; handlers must be idempotent.
- Shared domain types live in a `domain` workspace package; frontend uses Hono RPC client.
- Tests: Vitest + fast-check (property-based for scheduler invariants).

- add tests about reconciling an existing channel lowering and raising the video limit.so

- add edit settings in sidebar for each channel
- in edit settigns form, when quality is changed add an info message that it will apply to new videos only
- in edit settings form, change title from Edit Channel to Edit $channelName settings
