## Files

Workspace
- `package.json` — root scripts `dev` (`pnpm -r --parallel dev`), `test` (`vitest run`), `typecheck` (`pnpm -r typecheck`), `build` (web only); `engines.node >=24`.
- `pnpm-workspace.yaml` — `packages/*`, `apps/*`; `onlyBuiltDependencies: [better-sqlite3, esbuild]`.
- `.nvmrc` — `24` (current LTS; local v25 is EOL).
- `tsconfig.base.json` — maximum strictness, typecheck only (`typescript@7`, pinned): `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`, `noUnusedLocals`, `noUnusedParameters`, `allowUnreachableCode: false`, `allowUnusedLabels: false`, `noUncheckedSideEffectImports`, `forceConsistentCasingInFileNames`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `noEmit`, `module: nodenext`, `skipLibCheck: true`. If a library fights `exactOptionalPropertyTypes`, report it rather than drop the flag.
- `vitest.config.ts` — `test.projects` over the three packages.
- `.gitignore` — `node_modules`, `data/`, `apps/web/dist`.

`packages/domain` (`@superthree/domain`, shared with web; `"exports": { "./*": "./src/*.ts" }`, no barrel)
- `src/show/show-id.ts` — `ShowId` VO.
- `src/show/show-name.ts` — `ShowName` VO.
- `src/show/audio-language.ts` — `AudioLanguage` VO (web uses `.options` for the select).
- `src/show/show.ts` — `Show` entity + `createShow`, `withName`, `withAudioLanguage`.
- `src/show/*.test.ts` — value object tests.

`apps/server` (`@superthree/server`; `"exports": { "./app": "./src/application/http/app.ts" }` for the web's type import)
- `src/main.ts` — composition root: config → logger → db → migrate → services → app → listen → dispatcher; SIGTERM shutdown.
- `src/config.ts` — env parsed with Zod.
- `src/domain/show/errors.ts` — `ShowNotFound`, `ShowNameTaken`, per-use-case unions.
- `src/domain/show/show-patch.ts` — `ShowPatch` (server-only domain input).
- `src/domain/show/show-created.ts` — `ShowCreated` event schema + `showCreated(show, at)`.
- `src/domain/shared/domain-event.ts` — `DomainEvent` union (outbox payload schema).
- `src/domain/services/show-finder.ts` — list/get.
- `src/domain/services/show-creator.ts` — create + `ShowCreated` in one transaction.
- `src/domain/services/show-updater.ts` — patch name/language.
- `src/domain/services/show-deleter.ts` — delete.
- `src/application/http/app.ts` — composes routers, request logging, `onError`, optional static SPA; exports `AppType`.
- `src/application/http/health.ts` — `/api/health`.
- `src/application/http/shows.ts` — `/api/shows` routes, request schemas, `ShowResponse`, `toShowResponse`.
- `src/application/http/validator.ts` — `zValidator` wrapper whose hook returns `{ error }` 400.
- `src/application/http/request-logger.ts` — child pino logger per request (request id), one line per request.
- `src/application/tasks/outbox-dispatcher.ts` — polls outbox, dispatches to handlers, marks processed.
- `src/application/subscribers/show-created-logger.ts` — logs `ShowCreated`.
- `src/infrastructure/repositories/sqlite-show-repository.ts` — `ShowRepository` port + Kysely impl.
- `src/infrastructure/shared/database.ts` — `Database` interface, `openDatabase` (pragmas).
- `src/infrastructure/shared/migrations.ts` — static migration map (`0001_init`), `migrateToLatest`.
- `src/infrastructure/shared/test-database.ts` — `testDatabase`, `unmigratedTestDatabase`.
- `src/infrastructure/shared/transactor.ts` — `Transactor` port: runs writes in one SQLite transaction.
- `src/infrastructure/shared/event-publisher.ts` — `EventPublisher` port: writes outbox rows.
- `src/infrastructure/shared/outbox-repository.ts` — `OutboxRepository` port: reads pending rows, marks processed.
- `src/infrastructure/shared/clock.ts` — `Clock` port, `systemClock`, `fixedClock`.
- `src/infrastructure/shared/id-generator.ts` — `IdGenerator` port, `randomIds`, `sequentialIds`.
- `src/infrastructure/shared/logger.ts` — pino factory (`pino-pretty` when not production).
- colocated `*.test.ts` per Test Plan.

`apps/web` (`@superthree/web`)
- `vite.config.ts` — React plugin, `/api` proxy → `http://localhost:8080`.
- `index.html`, `src/main.tsx` — mount.
- `src/api.ts` — `hc<AppType>('/')`.
- `src/shows-page.tsx` — table, add form, language select, delete with confirm, inline errors.
- `src/styles.css` — one small stylesheet.

Docs
- `doc/TECH_STACK.md` — better-result v3, Node 24 LTS, `@hono/zod-validator`, `pino-pretty`.
- `.claude/skills/typescript-architect/SKILL.md` — `Transactor` and `IdGenerator` conventions.
- `CLAUDE.md` — commands, layout, conventions.

## Types & Signatures

```ts
// packages/domain/src/show/show-id.ts
export const ShowId = z.uuid().brand('ShowId');
export type ShowId = z.infer<typeof ShowId>;

// packages/domain/src/show/show-name.ts
export const ShowName = z.string().trim().min(1).max(100).brand('ShowName');
export type ShowName = z.infer<typeof ShowName>;

// packages/domain/src/show/audio-language.ts
export const AudioLanguage = z.enum(['ca', 'es', 'en']);
export type AudioLanguage = z.infer<typeof AudioLanguage>;

// packages/domain/src/show/show.ts
export const Show = z.object({
  id: ShowId,
  name: ShowName,
  audioLanguage: AudioLanguage,
  createdAt: z.iso.datetime(), // UTC ISO 8601 string, survives JSON unchanged
}).readonly();
export type Show = z.infer<typeof Show>;
export function createShow(id: ShowId, name: ShowName, audioLanguage: AudioLanguage, createdAt: Date): Show;
export function withName(show: Show, name: ShowName): Show;
export function withAudioLanguage(show: Show, audioLanguage: AudioLanguage): Show;
```

```ts
// apps/server/src/domain/show/errors.ts  (better-result v3: no trailing call)
export class ShowNotFound extends TaggedError('ShowNotFound')<{ id: ShowId; message: string }> {}
export class ShowNameTaken extends TaggedError('ShowNameTaken')<{ name: ShowName; message: string }> {}
export type GetShowError = ShowNotFound;
export type CreateShowError = ShowNameTaken;
export type UpdateShowError = ShowNotFound | ShowNameTaken;
export type DeleteShowError = ShowNotFound;

// apps/server/src/domain/show/show-patch.ts
export type ShowPatch =
  | { readonly name: ShowName; readonly audioLanguage?: AudioLanguage }
  | { readonly name?: ShowName; readonly audioLanguage: AudioLanguage };

// apps/server/src/domain/show/show-created.ts
export const ShowCreated = z.object({
  type: z.literal('ShowCreated'),
  showId: ShowId, name: ShowName, audioLanguage: AudioLanguage, occurredAt: z.iso.datetime(),
});
export type ShowCreated = z.infer<typeof ShowCreated>;
export function showCreated(show: Show, occurredAt: Date): ShowCreated;

// apps/server/src/domain/shared/domain-event.ts
export const DomainEvent = z.discriminatedUnion('type', [ShowCreated]);
export type DomainEvent = z.infer<typeof DomainEvent>;
```

```ts
// apps/server/src/domain/services/show-finder.ts
export interface ShowFinder {
  /** All shows, sorted by name ignoring case. */
  list(): Promise<Show[]>;
  get(id: ShowId): Promise<Result<Show, GetShowError>>;
}
export function createShowFinder(shows: ShowRepository): ShowFinder;

// apps/server/src/domain/services/show-creator.ts
export interface ShowCreator {
  /** Fails if another show has the name ignoring case; stores the show and ShowCreated atomically. */
  create(name: ShowName, audioLanguage: AudioLanguage): Promise<Result<Show, CreateShowError>>;
}
export function createShowCreator(shows: ShowRepository, transactor: Transactor, clock: Clock, ids: IdGenerator): ShowCreator;

// apps/server/src/domain/services/show-updater.ts
export interface ShowUpdater {
  /** Renaming to a case variant of the show's own name is allowed. */
  update(id: ShowId, patch: ShowPatch): Promise<Result<Show, UpdateShowError>>;
}
export function createShowUpdater(shows: ShowRepository): ShowUpdater;

// apps/server/src/domain/services/show-deleter.ts
export interface ShowDeleter {
  delete(id: ShowId): Promise<Result<void, DeleteShowError>>;
}
export function createShowDeleter(shows: ShowRepository): ShowDeleter;
```

```ts
// apps/server/src/infrastructure/repositories/sqlite-show-repository.ts
export interface ShowRepository {
  list(): Promise<Show[]>;                                  // ORDER BY name COLLATE NOCASE
  findById(id: ShowId): Promise<Show | undefined>;
  findByName(name: ShowName): Promise<Show | undefined>;    // case-insensitive
  insert(show: Show): Promise<void>;
  update(show: Show): Promise<void>;
  delete(id: ShowId): Promise<void>;
}
export function createSqliteShowRepository(db: Kysely<Database>): ShowRepository; // db or trx

// apps/server/src/infrastructure/shared/database.ts
export interface ShowsTable { id: string; name: string; audio_language: string; created_at: string }
export interface OutboxTable {
  id: Generated<number>; type: string; payload: string; created_at: string; processed_at: string | null;
}
export interface Database { shows: ShowsTable; outbox: OutboxTable }
export function openDatabase(path: string): Kysely<Database>;  // WAL (file only), foreign_keys = ON

// apps/server/src/infrastructure/shared/migrations.ts
export function migrateToLatest(db: Kysely<Database>): Promise<void>; // throws on failure

// apps/server/src/infrastructure/shared/test-database.ts
export function testDatabase(): Promise<Kysely<Database>>;   // fresh :memory:, migrated
export function unmigratedTestDatabase(): Kysely<Database>;  // for 400 tests

// apps/server/src/infrastructure/shared/transactor.ts
export interface TransactionScope { readonly shows: ShowRepository; readonly events: EventPublisher }
export interface Transactor {
  /** Commits if work resolves, rolls back if it throws. Business checks happen before run; no Result inside. */
  run<T>(work: (scope: TransactionScope) => Promise<T>): Promise<T>;
}
export function createSqliteTransactor(db: Kysely<Database>): Transactor;

// apps/server/src/infrastructure/shared/event-publisher.ts
export interface EventPublisher { publish(event: DomainEvent): Promise<void> }
export function createSqliteEventPublisher(db: Kysely<Database>, clock: Clock): EventPublisher;

// apps/server/src/infrastructure/shared/outbox-repository.ts
export interface OutboxEntry { readonly id: number; readonly event: DomainEvent; readonly createdAt: string; readonly processedAt: string | undefined }
export interface OutboxRepository {
  pending(): Promise<OutboxEntry[]>;                         // processed_at IS NULL, ORDER BY id
  markProcessed(entry: OutboxEntry, processedAt: Date): Promise<void>;
}
export function createSqliteOutboxRepository(db: Kysely<Database>): OutboxRepository & { list(): Promise<OutboxEntry[]> }; // list: test-only

// apps/server/src/infrastructure/shared/clock.ts
export interface Clock { now(): Date }
export const systemClock: Clock;
export function fixedClock(date: Date): Clock;

// apps/server/src/infrastructure/shared/id-generator.ts
export interface IdGenerator { next(): string } // UUID
export const randomIds: IdGenerator;            // crypto.randomUUID
export function sequentialIds(): IdGenerator;   // 00000000-0000-4000-8000-000000000001, ...002, ...

// apps/server/src/infrastructure/shared/logger.ts
export function createLogger(level: string, pretty: boolean): Logger;
```

```ts
// apps/server/src/config.ts
export const Config = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  DATA_DIR: z.string().default('./data'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  WEB_DIST: z.string().optional(),
  NODE_ENV: z.string().optional(),
});
export type Config = z.infer<typeof Config>;
export function loadConfig(env: NodeJS.ProcessEnv): Config; // throws on invalid env

// apps/server/src/application/http/validator.ts
export function validate<T extends 'json' | 'param', S extends z.ZodType>(target: T, schema: S): MiddlewareHandler; // 400 { error: string }

// apps/server/src/application/http/shows.ts
const ShowIdParam = z.object({ id: ShowId });
const CreateShowRequest = z.object({ name: ShowName, audioLanguage: AudioLanguage });
const UpdateShowRequest = z.object({ name: ShowName.optional(), audioLanguage: AudioLanguage.optional() })
  .refine((patch) => patch.name !== undefined || patch.audioLanguage !== undefined, 'Patch must change name or audioLanguage');
export interface ShowResponse { id: string; name: string; audioLanguage: AudioLanguage; createdAt: string } // unbranded for RPC
export interface ShowServices { finder: ShowFinder; creator: ShowCreator; updater: ShowUpdater; deleter: ShowDeleter }
export function createShowRoutes(services: ShowServices): Hono; // chained; GET / , GET /:id, POST /, PATCH /:id, DELETE /:id
function toShowResponse(show: Show): ShowResponse;
// errors: per-route Result.match + matchError, c.json({ error: e.message }, 404 | 409)

// apps/server/src/application/http/health.ts
export function createHealthRoutes(): Hono; // GET / -> 200 { status: 'ok' }

// apps/server/src/application/http/request-logger.ts
export function requestLogger(logger: Logger): MiddlewareHandler; // sets c.var.logger (child with reqId), logs method/path/status/ms

// apps/server/src/application/http/app.ts
export interface AppOptions { webDist?: string }
export function createApp(services: ShowServices, logger: Logger, options?: AppOptions): Hono; // route('/api/health'), route('/api/shows')
export type AppType = ReturnType<typeof createApp>;

// apps/server/src/application/tasks/outbox-dispatcher.ts
export type EventHandlers = { [K in DomainEvent['type']]: (event: Extract<DomainEvent, { type: K }>) => Promise<void> };
export interface OutboxDispatcher {
  /** Dispatches pending events in id order; a throwing handler leaves its event pending and stops the batch. */
  dispatchPending(): Promise<void>;
  start(intervalMs: number): void;
  stop(): Promise<void>; // waits for an in-flight batch
}
export function createOutboxDispatcher(outbox: OutboxRepository, handlers: EventHandlers, clock: Clock, logger: Logger): OutboxDispatcher;

// apps/server/src/application/subscribers/show-created-logger.ts
export function createShowCreatedLogger(logger: Logger): (event: ShowCreated) => Promise<void>; // idempotent: log only
```

```ts
// apps/web/src/api.ts
import type { AppType } from '@superthree/server/app';
export const api = hc<AppType>('/');
```

## Call Stack

Create show
```
POST /api/shows { name, audioLanguage }
  validate('json', CreateShowRequest)                 -> 400 { error } on failure
  creator.create(name: ShowName, audioLanguage)
    shows.findByName(name)                            -> found: Result.err(ShowNameTaken)
    createShow(ShowId.parse(ids.next()), name, audioLanguage, clock.now())
    transactor.run(({ shows, events }) =>
      shows.insert(show)
      events.publish(showCreated(show, clock.now())))
    Result.ok(show)
  match: ok -> 201 toShowResponse(show) | ShowNameTaken -> 409 { error }
```

Update show
```
PATCH /api/shows/:id { name?, audioLanguage? }
  validate('param', ShowIdParam), validate('json', UpdateShowRequest)  -> 400
  updater.update(id, patch)
    shows.findById(id)                                -> undefined: Result.err(ShowNotFound)
    patch.name && shows.findByName(patch.name)        -> other id: Result.err(ShowNameTaken)
    updated = withName / withAudioLanguage(show, ...)
    shows.update(updated)
    Result.ok(updated)
  match: ok -> 200 | ShowNotFound -> 404 | ShowNameTaken -> 409
```

Get / list / delete
```
GET    /api/shows      -> finder.list() -> shows.list() -> 200 ShowResponse[]
GET    /api/shows/:id  -> finder.get(id) -> shows.findById(id) -> 200 | 404
DELETE /api/shows/:id  -> deleter.delete(id) -> shows.findById(id) -> shows.delete(id) -> 204 | 404
```

Outbox dispatch (every 1000 ms)
```
setInterval -> dispatcher.dispatchPending()
  outbox.pending()                                    -> OutboxEntry[] by id
  for each entry, sequentially:
    handlers[entry.event.type](entry.event)           -> throw: log, stop batch, retry next tick
    outbox.markProcessed(entry, clock.now())
```

Startup / shutdown
```
main
  loadConfig(process.env)
  createLogger(config.LOG_LEVEL, config.NODE_ENV !== 'production')
  openDatabase(`${DATA_DIR}/superthree.db`)  (mkdir DATA_DIR)
  migrateToLatest(db)
  repositories, transactor, services (systemClock, randomIds)
  createApp(services, logger, { webDist: config.WEB_DIST })
  serve({ fetch: app.fetch, port })
  dispatcher.start(1000)
SIGTERM -> server.close() -> dispatcher.stop() -> db.destroy() -> exit 0
```

## Test Plan

1. Acceptance and behaviour tests

Value objects (`packages/domain/src/show/*.test.ts`)
- `show-name.test.ts` `it('should trim a valid name')` — `'  Bluey '` parses to `'Bluey'`.
- `it('should accept a name of 100 characters')` — success value equals input.
- `it('should reject a blank name')` — `''` and `'   '` fail with Zod's min message.
- `it('should reject a name over 100 characters')` — 101 chars fail with max message.
- `audio-language.test.ts` `it('should accept supported languages')` — `ca`, `es`, `en` parse.
- `it('should reject an unsupported language')` — `'fr'` fails with the enum message.
- `show-id.test.ts` `it('should accept a uuid')` / `it('should reject a non-uuid')`.

Health (`application/http/health.test.ts`)
- `it('should report the server is up')` — 200 `{ status: 'ok' }`.

Shows (`application/http/shows.test.ts`; fresh `testDatabase()`, `fixedClock`, `sequentialIds`)
- `it('should create a show')` — 201 whole body with trimmed name; `shows.list()` equals `[show]`; `outbox.list()` equals one pending `ShowCreated` entry.
- `it('should create any valid show with its trimmed name')` — fast-check over valid names/languages, fresh db per run: 201 body and `shows.list()` equal the expected show.
- `it('should fail to create if name is taken')` — seeded "Bluey"; 409 `{ error: 'A show named Bluey already exists' }`; shows unchanged; outbox empty.
- `it('should fail to create if name differs only in case')` — "BLUEY" vs seeded "Bluey"; 409; shows unchanged; outbox empty.
- `it('should fail to create if request is invalid')` — unmigrated db; blank name → 400 `{ error }`.
- `it('should list all shows sorted by name')` — seeded "peppa", "Bluey", "Caillou"; 200 in case-insensitive order.
- `it('should get a show')` — 200 whole body.
- `it('should fail to get if show missing')` — 404 `{ error: 'Show <id> not found' }`.
- `it('should update a show')` — language change; 200 body; `shows.list()` reflects it, id/createdAt kept.
- `it('should update a show to a case variant of its own name')` — "Bluey" → "BLUEY"; 200.
- `it('should fail to update if name is taken')` — "Peppa" → "bluey"; 409; shows unchanged.
- `it('should fail to update if show missing')` — 404.
- `it('should fail to update if patch is empty')` — unmigrated db; `{}` → 400.
- `it('should delete a show')` — 204; `shows.list()` equals `[]`.
- `it('should fail to delete if show missing')` — 404.

Outbox dispatcher (`application/tasks/outbox-dispatcher.test.ts`; real outbox, fake handler recording events)
- `it('should dispatch pending events in order')` — two published events; handler receives both in order; `outbox.list()` shows both processed at the fixed clock time.
- `it('should keep an event pending if its handler fails')` — failing handler; `outbox.list()` shows it unprocessed.

Subscriber (`application/subscribers/show-created-logger.test.ts`; pino writing to an in-memory stream)
- `it('should log a created show')` — one log line with the event fields.

2. Infrastructure tests

`sqlite-show-repository.test.ts`
- `it('should reject inserting a name that differs only in case')` — unique NOCASE index backstop throws.

`transactor.test.ts`
- `it('should roll back every write if the work throws')` — insert show + publish then throw; `shows.list()` and `outbox.list()` empty.

`database.test.ts`
- `it('should enable WAL and foreign keys on a file database')` — temp file; pragmas read back `wal` and `1`.
