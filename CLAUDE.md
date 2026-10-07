# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Superthree: self-hosted, broadcast-style TV channel for kids. Parent builds a schedule in a web UI; server generates an M3U/HLS playlist consumed by an IPTV client (Apple TV). Runs in a single Docker container on a Synology NAS.

Early stage, no code yet. See `README.md` (pipeline, PoC phases) and `TECH_STACK.md` (stack decisions and rationale) — keep them in sync when decisions change.

## Architecture

- **Ingest**: ffmpeg pre-segments library episodes into HLS once. No live transcoding.
- **Schedule**: stored in SQLite, edited via React + Vite SPA served by Hono.
- **Playout**: server computes the live M3U playlist from the schedule.

Pure functional core (scheduler, playlist generation); effects at the edges (HTTP, SQLite, ffmpeg).

## Conventions

- TypeScript (strict, `noUncheckedIndexedAccess`) on Node 24. Libraries over frameworks.
- Errors as values via `better-result`; don't throw domain errors.
- Optional values: native `T | undefined`, no custom `Option`.
- Validate all incoming data with Zod 4; infer domain types from schemas.
- Domain events via in-house SQLite outbox, written in same transaction as the change; handlers must be idempotent.
- Shared domain types live in a `domain` workspace package; frontend uses Hono RPC client.
- Tests: Vitest + fast-check (property-based for scheduler invariants).
