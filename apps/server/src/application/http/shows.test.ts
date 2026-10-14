import { AudioLanguage } from '@superthree/domain/show/audio-language';
import { Show } from '@superthree/domain/show/show';
import fc from 'fast-check';
import { testClient } from 'hono/testing';
import { expect, it } from 'vitest';
import { createShowCreator } from '../../domain/services/show-creator.ts';
import { createShowDeleter } from '../../domain/services/show-deleter.ts';
import { createShowFinder } from '../../domain/services/show-finder.ts';
import { createShowUpdater } from '../../domain/services/show-updater.ts';
import {
  createSqliteShowRepository,
  type ShowRepository,
} from '../../infrastructure/repositories/sqlite-show-repository.ts';
import { fixedClock } from '../../infrastructure/shared/clock.ts';
import { sequentialIds } from '../../infrastructure/shared/id-generator.ts';
import { createSqliteOutboxRepository } from '../../infrastructure/shared/outbox-repository.ts';
import { testDatabase } from '../../infrastructure/shared/test-database.ts';
import { createSqliteTransactor, type Transactor } from '../../infrastructure/shared/transactor.ts';
import { createShowRoutes } from './shows.ts';

const now = new Date('2026-10-14T10:00:00.000Z');
const firstId = '00000000-0000-4000-8000-000000000001';
const seededAt = '2026-10-01T09:00:00.000Z';

it('should create a show', async () => {
  const db = await testDatabase();
  const shows = createSqliteShowRepository(db);
  const outbox = createSqliteOutboxRepository(db);
  const client = testClient(createRoutes(shows, createSqliteTransactor(db, fixedClock(now))));

  const response = await client.index.$post({ json: { name: '  Bluey ', audioLanguage: 'en' } });

  const show = { id: firstId, name: 'Bluey', audioLanguage: 'en', createdAt: now.toISOString() };
  expect({ status: response.status, body: await response.json() }).toEqual({ status: 201, body: show });
  expect(await shows.list()).toEqual([show]);
  expect(await outbox.list()).toEqual([
    {
      id: 1,
      event: { type: 'ShowCreated', showId: firstId, name: 'Bluey', audioLanguage: 'en', occurredAt: now.toISOString() },
      createdAt: now.toISOString(),
      processedAt: undefined,
    },
  ]);
});

it('should create any valid show with its trimmed name', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 100 }).filter((name) => name.trim().length > 0),
      fc.constantFrom(...AudioLanguage.options),
      async (name, audioLanguage) => {
        const db = await testDatabase();
        const shows = createSqliteShowRepository(db);
        const client = testClient(createRoutes(shows, createSqliteTransactor(db, fixedClock(now))));

        const response = await client.index.$post({ json: { name, audioLanguage } });

        const show = { id: firstId, name: name.trim(), audioLanguage, createdAt: now.toISOString() };
        expect({ status: response.status, body: await response.json() }).toEqual({ status: 201, body: show });
        expect(await shows.list()).toEqual([show]);
      },
    ),
  );
});

it('should fail to create if name is taken', async () => {
  const db = await testDatabase();
  const shows = createSqliteShowRepository(db);
  const outbox = createSqliteOutboxRepository(db);
  const bluey = aShow({ name: 'Bluey' });
  await shows.insert(bluey);
  const client = testClient(createRoutes(shows, createSqliteTransactor(db, fixedClock(now))));

  const response = await client.index.$post({ json: { name: 'Bluey', audioLanguage: 'en' } });

  expect({ status: response.status, body: await response.json() }).toEqual({
    status: 409,
    body: { error: 'A show named Bluey already exists' },
  });
  expect(await shows.list()).toEqual([bluey]);
  expect(await outbox.list()).toEqual([]);
});

function createRoutes(shows: ShowRepository, transactor: Transactor) {
  return createShowRoutes({
    finder: createShowFinder(shows),
    creator: createShowCreator(shows, transactor, fixedClock(now), sequentialIds()),
    updater: createShowUpdater(shows),
    deleter: createShowDeleter(shows),
  });
}

function aShow(overrides: { id?: string; name?: string; audioLanguage?: AudioLanguage }): Show {
  return Show.parse({
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Bluey',
    audioLanguage: 'en',
    createdAt: seededAt,
    ...overrides,
  });
}
