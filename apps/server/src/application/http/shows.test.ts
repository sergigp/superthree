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

function createRoutes(shows: ShowRepository, transactor: Transactor) {
  return createShowRoutes({
    finder: createShowFinder(shows),
    creator: createShowCreator(shows, transactor, fixedClock(now), sequentialIds()),
    updater: createShowUpdater(shows),
    deleter: createShowDeleter(shows),
  });
}
