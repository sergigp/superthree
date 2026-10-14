# Tech stack

Superthree's stack decisions as of October 7, 2026.

Guiding principle: a pure, functional core (the scheduler and the live playlist generation) with effects at the edges (HTTP, SQLite, ffmpeg). Each library is chosen to reinforce that split: strict types inside, validation wherever data comes in.

## Summary

| Area                       | Choice                                    | Packages                    |
| -------------------------- | ----------------------------------------- | --------------------------- |
| Language                   | TypeScript                                | `typescript`                |
| Runtime                    | Node 24 LTS                               | —                           |
| Boundary validation        | Zod 4                                     | `zod`                       |
| Errors (`Result`)          | better-result                             | `better-result`             |
| Optional values (`Option`) | Native `T \| undefined`                   | —                           |
| Collections                | Native array and iterator methods         | —                           |
| Logging                    | pino                                      | `pino`                      |
| HTTP layer                 | Hono                                      | `hono`, `@hono/node-server` |
| Shared domain (front/back) | Hono RPC + a `domain` workspace package   | `hono/client`               |
| SQLite access              | Kysely                                    | `kysely`                    |
| SQLite driver              | better-sqlite3                            | `better-sqlite3`            |
| Domain events              | Outbox in SQLite, in-house implementation | —                           |
| Schedule editor frontend   | React + Vite                              | `react`, `vite`             |
| Tests                      | Vitest + fast-check                       | `vitest`, `fast-check`      |

## Why each choice

### Language: TypeScript

Its type system, with discriminated unions and exhaustiveness checking, lets us model the domain as precisely as we want. It is also a single language for both the server and the web editor, with domain types shared between them.

### Runtime: Node 24 LTS

It is the current LTS release. Performance doesn't drive the choice: the server only computes playlists and serves static files, while ffmpeg does the heavy lifting.

### Boundary validation: Zod 4

All incoming data (HTTP requests, ffprobe's JSON output, configuration) is parsed through a schema and comes out typed, and domain types are inferred from those schemas. It is the de facto standard, and Hono integrates it into its validator.

### Errors: better-result

Domain errors are part of the return type instead of being thrown as exceptions. `Result.gen` composes them much like a for-comprehension, and tagged errors are handled with an exhaustive match.

### Optional values: native `T | undefined`

With `strict` and `noUncheckedIndexedAccess`, the compiler already forces us to check for missing values, and `?.` and `??` cover what `map` and `getOrElse` would do. A custom `Option` type would go against the language's conventions.

### Collections: native methods

`map`, `flatMap`, `reduce`, immutable variants such as `toSorted`, and lazy iterator helpers cover what we need without adding dependencies.

### Logging: pino

It writes structured JSON logs to stdout, which is what Docker collects on the NAS. It is Node's standard logger and supports child loggers that carry context, such as the current episode or request.

### HTTP layer: Hono

A small HTTP framework built on web standards (`Request`/`Response`) that feels more like a library than a framework. It infers types along the route chain, which is what makes the typed RPC client possible.

### Shared domain: Hono RPC + `domain` package

The frontend client is derived directly from the server routes, with no code generation and no extra layer. Domain schemas, types and errors live in a shared workspace package used by both the server and the editor.

### SQLite access: Kysely

It is a query builder, not an ORM: queries are typed SQL, almost one to one, with no hidden magic. It fits our preference for libraries over frameworks.

### SQLite driver: better-sqlite3

It is the most widely used and stable SQLite driver for Node, and Kysely supports it out of the box. Its synchronous API is not a drawback because SQLite is an embedded database that answers in microseconds.

### Domain events: outbox in SQLite, in-house implementation

Each domain change and its event are stored in the same transaction, so one can never exist without the other, and pending events survive restarts without extra infrastructure. The implementation is small and in-house to preserve that atomicity; since delivery is at-least-once, handlers are idempotent.

### Schedule editor frontend: React + Vite

The schedule editor is a SPA that consumes the Hono RPC client. It is built into static files served by Hono itself, so everything stays in a single container.

### Tests: Vitest + fast-check

Vitest is a fast test runner with direct support for TypeScript and ESM. fast-check adds property-based tests, which suit the scheduler well: for example, checking that `MEDIA-SEQUENCE` never goes backwards.
