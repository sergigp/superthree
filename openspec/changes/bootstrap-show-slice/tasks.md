## 1. Walking skeleton

- [x] 1.1 Create the pnpm workspace and every file in design.md (## Files, ## Types & Signatures) across `packages/domain`, `apps/server` and `apps/web`, wired end to end: routers composed in `createApp`, services/repositories/transactor/dispatcher built in `main.ts`, `0001_init` migration, `testDatabase`/`unmigratedTestDatabase`, `fixedClock`/`sequentialIds` fakes. Service and repository bodies return trivial values (`[]`, `undefined`, `Result.ok(...)` with a fixed show, `Promise.resolve()`). The web page is written in full against the typed client. Update `doc/TECH_STACK.md`, the `typescript-architect` skill (`Transactor`, `IdGenerator`) and `CLAUDE.md`. Done when: `pnpm install` succeeds, `tsconfig.base.json` has the full maximum-strict flag set from design.md (every package extends it), `pnpm typecheck` passes, `node apps/server/src/main.ts` starts (proving type stripping accepts the `@superthree/domain` workspace import; if it does not, stop and report), and `curl :8080/api/health` returns `{ "status": "ok" }`.

## 2. Behaviour (TDD)

- [x] 2.1 `show-name.test.ts` `should trim a valid name` — drives `ShowName` trimming.
- [x] 2.2 `show-name.test.ts` `should accept a name of 100 characters` — drives the upper bound.
- [x] 2.3 `show-name.test.ts` `should reject a blank name` — drives `min(1)` after trim.
- [x] 2.4 `show-name.test.ts` `should reject a name over 100 characters` — drives `max(100)`.
- [x] 2.5 `audio-language.test.ts` `should accept supported languages` — drives the `ca`/`es`/`en` enum.
- [x] 2.6 `audio-language.test.ts` `should reject an unsupported language` — drives the enum's rejection.
- [x] 2.7 `show-id.test.ts` `should accept a uuid` and `should reject a non-uuid` (one cycle each) — drives `ShowId`.
- [x] 2.8 `health.test.ts` `should report the server is up` — drives `GET /api/health`.
- [x] 2.9 `shows.test.ts` `should create a show` — drives `ShowCreator`, `createShow`, `toShowResponse`, show insert and `ShowCreated` publish inside `transactor.run`.
- [x] 2.10 `shows.test.ts` `should create any valid show with its trimmed name` — fast-check property over the create route.
- [ ] 2.11 `shows.test.ts` `should fail to create if name is taken` — drives `findByName` check and the 409 mapping; no outbox row.
- [ ] 2.12 `shows.test.ts` `should fail to create if name differs only in case` — drives case-insensitive `findByName`.
- [ ] 2.13 `shows.test.ts` `should fail to create if request is invalid` — drives the validator hook's `{ error }` 400.
- [ ] 2.14 `shows.test.ts` `should list all shows sorted by name` — drives `ShowFinder.list` and case-insensitive ordering.
- [ ] 2.15 `shows.test.ts` `should get a show` — drives `ShowFinder.get` and `findById`.
- [ ] 2.16 `shows.test.ts` `should fail to get if show missing` — drives `ShowNotFound` and the 404 mapping.
- [ ] 2.17 `shows.test.ts` `should update a show` — drives `ShowUpdater`, `withAudioLanguage`, repository `update`.
- [ ] 2.18 `shows.test.ts` `should update a show to a case variant of its own name` — drives `withName` and the own-id exception.
- [ ] 2.19 `shows.test.ts` `should fail to update if name is taken` — drives the update name check and 409.
- [ ] 2.20 `shows.test.ts` `should fail to update if show missing` — drives update's 404.
- [ ] 2.21 `shows.test.ts` `should fail to update if patch is empty` — drives `UpdateShowRequest`'s refine.
- [ ] 2.22 `shows.test.ts` `should delete a show` — drives `ShowDeleter` and repository `delete`.
- [ ] 2.23 `shows.test.ts` `should fail to delete if show missing` — drives delete's 404.
- [ ] 2.24 `outbox-dispatcher.test.ts` `should dispatch pending events in order` — drives `dispatchPending`, `pending`, `markProcessed`.
- [ ] 2.25 `outbox-dispatcher.test.ts` `should keep an event pending if its handler fails` — drives stop-on-failure.
- [ ] 2.26 `show-created-logger.test.ts` `should log a created show` — drives the subscriber.

## 3. Infrastructure adapters (TDD)

- [ ] 3.1 `sqlite-show-repository.test.ts` `should reject inserting a name that differs only in case` — drives the unique `NOCASE` index in `0001_init`.
- [ ] 3.2 `transactor.test.ts` `should roll back every write if the work throws` — drives `createSqliteTransactor` over `db.transaction()`.
- [ ] 3.3 `database.test.ts` `should enable WAL and foreign keys on a file database` — drives `openDatabase` pragmas.
