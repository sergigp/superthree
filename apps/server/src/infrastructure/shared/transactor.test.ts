import { Show } from '@superthree/domain/show/show';
import { expect, it } from 'vitest';
import { showCreated } from '../../domain/show/show-created.ts';
import { createSqliteShowRepository } from '../repositories/sqlite-show-repository.ts';
import { fixedClock } from './clock.ts';
import { createSqliteOutboxRepository } from './outbox-repository.ts';
import { testDatabase } from './test-database.ts';
import { createSqliteTransactor } from './transactor.ts';

const now = new Date('2026-10-14T10:00:00.000Z');

it('should roll back every write if the work throws', async () => {
  const db = await testDatabase();
  const shows = createSqliteShowRepository(db);
  const outbox = createSqliteOutboxRepository(db);
  const transactor = createSqliteTransactor(db, fixedClock(now));
  const bluey = Show.parse({
    id: '11111111-1111-4111-8111-000000000001',
    name: 'Bluey',
    audioLanguage: 'en',
    createdAt: now.toISOString(),
  });

  await expect(
    transactor.run(async (scope) => {
      await scope.shows.insert(bluey);
      await scope.events.publish(showCreated(bluey, now));
      throw new Error('boom');
    }),
  ).rejects.toThrow('boom');

  expect(await shows.list()).toEqual([]);
  expect(await outbox.list()).toEqual([]);
});
