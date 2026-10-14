import { Show } from '@superthree/domain/show/show';
import { pino } from 'pino';
import { expect, it } from 'vitest';
import { showCreated } from '../../domain/show/show-created.ts';
import { createShowCreatedLogger } from './show-created-logger.ts';

const occurredAt = new Date('2026-10-14T10:00:00.000Z');

it('should log a created show', async () => {
  const lines: string[] = [];
  const logger = pino({ base: null, timestamp: false }, { write: (line: string) => void lines.push(line) });
  const event = showCreated(
    Show.parse({
      id: '11111111-1111-4111-8111-000000000001',
      name: 'Bluey',
      audioLanguage: 'en',
      createdAt: occurredAt.toISOString(),
    }),
    occurredAt,
  );

  await createShowCreatedLogger(logger)(event);

  expect(lines.map((line) => JSON.parse(line))).toEqual([
    {
      level: 30,
      msg: 'show created',
      type: 'ShowCreated',
      showId: '11111111-1111-4111-8111-000000000001',
      name: 'Bluey',
      audioLanguage: 'en',
      occurredAt: occurredAt.toISOString(),
    },
  ]);
});
