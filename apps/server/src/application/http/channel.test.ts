import { pino } from 'pino';
import { expect, it } from 'vitest';
import { defaultLineup, type Lineup } from '../../domain/channel/lineup.ts';
import { createShowCreator } from '../../domain/services/show-creator.ts';
import { createShowDeleter } from '../../domain/services/show-deleter.ts';
import { createShowFinder } from '../../domain/services/show-finder.ts';
import { createShowUpdater } from '../../domain/services/show-updater.ts';
import { createSqliteShowRepository } from '../../infrastructure/repositories/sqlite-show-repository.ts';
import { type Clock, fixedClock } from '../../infrastructure/shared/clock.ts';
import { sequentialIds } from '../../infrastructure/shared/id-generator.ts';
import { unmigratedTestDatabase } from '../../infrastructure/shared/test-database.ts';
import { createSqliteTransactor } from '../../infrastructure/shared/transactor.ts';
import { createApp } from './app.ts';

const start = new Date('2026-10-16T18:00:00.000Z');
const epA = { id: 'ep-a', chunkDurationsMs: [6000, 6000, 2040] };
const epB = { id: 'ep-b', chunkDurationsMs: [6000, 2040] };
const card = { id: 'card', chunkDurationsMs: [6000, 6000] };

it('should serve the channel list', async () => {
  const app = buildApp(defaultLineup(epA, epB, card), fixedClock(start), '/nonexistent');

  const response = await app.request('/tv/superthree.m3u', { headers: { Host: '192.168.1.10:8080' } });

  expect({
    status: response.status,
    contentType: response.headers.get('content-type'),
    body: await response.text(),
  }).toEqual({
    status: 200,
    contentType: 'audio/x-mpegurl',
    body: '#EXTM3U\n#EXTINF:-1,Superthree\nhttp://192.168.1.10:8080/tv/live.m3u8\n',
  });
});

function buildApp(lineup: Lineup, clock: Clock, mediaDir: string) {
  const db = unmigratedTestDatabase();
  const shows = createSqliteShowRepository(db);
  return createApp(
    {
      finder: createShowFinder(shows),
      creator: createShowCreator(shows, createSqliteTransactor(db, clock), clock, sequentialIds()),
      updater: createShowUpdater(shows),
      deleter: createShowDeleter(shows),
    },
    pino({ level: 'silent' }),
    { channel: { lineup, start, clock, mediaDir } },
  );
}
