import { Show } from '@superthree/domain/show/show';
import { pino } from 'pino';
import { expect, it } from 'vitest';
import { showCreated, type ShowCreated } from '../../domain/show/show-created.ts';
import { fixedClock } from '../../infrastructure/shared/clock.ts';
import { createSqliteEventPublisher } from '../../infrastructure/shared/event-publisher.ts';
import { createSqliteOutboxRepository } from '../../infrastructure/shared/outbox-repository.ts';
import { testDatabase } from '../../infrastructure/shared/test-database.ts';
import { createOutboxDispatcher } from './outbox-dispatcher.ts';

const publishedAt = new Date('2026-10-14T10:00:00.000Z');
const dispatchedAt = new Date('2026-10-14T10:00:01.000Z');
const silent = pino({ level: 'silent' });

it('should dispatch pending events in order', async () => {
  const db = await testDatabase();
  const outbox = createSqliteOutboxRepository(db);
  const events = createSqliteEventPublisher(db, fixedClock(publishedAt));
  const bluey = created('11111111-1111-4111-8111-000000000001', 'Bluey');
  const peppa = created('11111111-1111-4111-8111-000000000002', 'Peppa');
  await events.publish(bluey);
  await events.publish(peppa);
  const received: ShowCreated[] = [];
  const dispatcher = createOutboxDispatcher(
    outbox,
    { ShowCreated: async (event) => void received.push(event) },
    fixedClock(dispatchedAt),
    silent,
  );

  await dispatcher.dispatchPending();

  expect(received).toEqual([bluey, peppa]);
  expect(await outbox.list()).toEqual([
    { id: 1, event: bluey, createdAt: publishedAt.toISOString(), processedAt: dispatchedAt.toISOString() },
    { id: 2, event: peppa, createdAt: publishedAt.toISOString(), processedAt: dispatchedAt.toISOString() },
  ]);
});

it('should keep an event pending if its handler fails', async () => {
  const db = await testDatabase();
  const outbox = createSqliteOutboxRepository(db);
  const events = createSqliteEventPublisher(db, fixedClock(publishedAt));
  const bluey = created('11111111-1111-4111-8111-000000000001', 'Bluey');
  const peppa = created('11111111-1111-4111-8111-000000000002', 'Peppa');
  await events.publish(bluey);
  await events.publish(peppa);
  const dispatcher = createOutboxDispatcher(
    outbox,
    { ShowCreated: (event) => (event.name === 'Bluey' ? Promise.reject(new Error('boom')) : Promise.resolve()) },
    fixedClock(dispatchedAt),
    silent,
  );

  await expect(dispatcher.dispatchPending()).resolves.toBeUndefined();

  expect(await outbox.list()).toEqual([
    { id: 1, event: bluey, createdAt: publishedAt.toISOString(), processedAt: undefined },
    { id: 2, event: peppa, createdAt: publishedAt.toISOString(), processedAt: undefined },
  ]);
});

function created(id: string, name: string): ShowCreated {
  return showCreated(Show.parse({ id, name, audioLanguage: 'en', createdAt: publishedAt.toISOString() }), publishedAt);
}
