import { pino } from 'pino';
import { expect, it } from 'vitest';
import { defaultLineup, endingLineup, type Lineup } from '../../domain/channel/lineup.ts';
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

it('should serve the live playlist', async () => {
  const app = buildApp(defaultLineup(epA, epB, card), fixedClock(at(12_000)), '/nonexistent');

  const response = await app.request('/tv/live.m3u8');

  expect(await playlistResponse(response)).toEqual({
    status: 200,
    contentType: 'application/vnd.apple.mpegurl',
    cacheControl: 'no-cache',
    body: [
      ...header(0, 0),
      '#EXT-X-PROGRAM-DATE-TIME:2026-10-16T18:00:00.000Z',
      '#EXTINF:6.000,',
      'media/ep-a/seg_0000.ts',
      '#EXTINF:6.000,',
      'media/ep-a/seg_0001.ts',
      '',
    ].join('\n'),
  });
});

it('should slide the window to the last 6 published chunks', async () => {
  const longA = { id: 'ep-a', chunkDurationsMs: Array.from({ length: 10 }, () => 6000) };
  const app = buildApp(endingLineup(longA, epB), fixedClock(at(50_000)), '/nonexistent');

  const response = await app.request('/tv/live.m3u8');

  expect(await playlistResponse(response)).toEqual({
    status: 200,
    contentType: 'application/vnd.apple.mpegurl',
    cacheControl: 'no-cache',
    body: [
      ...header(2, 0),
      '#EXT-X-PROGRAM-DATE-TIME:2026-10-16T18:00:12.000Z',
      ...[2, 3, 4, 5, 6, 7].flatMap((index) => ['#EXTINF:6.000,', `media/ep-a/seg_000${index}.ts`]),
      '',
    ].join('\n'),
  });
});

it('should mark the start of the next clip', async () => {
  const app = buildApp(defaultLineup(epA, epB, card), fixedClock(at(22_080)), '/nonexistent');

  const response = await app.request('/tv/live.m3u8');

  expect(await playlistResponse(response)).toEqual({
    status: 200,
    contentType: 'application/vnd.apple.mpegurl',
    cacheControl: 'no-cache',
    body: [
      ...header(0, 0),
      '#EXT-X-PROGRAM-DATE-TIME:2026-10-16T18:00:00.000Z',
      '#EXTINF:6.000,',
      'media/ep-a/seg_0000.ts',
      '#EXTINF:6.000,',
      'media/ep-a/seg_0001.ts',
      '#EXTINF:2.040,',
      'media/ep-a/seg_0002.ts',
      '#EXT-X-DISCONTINUITY',
      '#EXT-X-PROGRAM-DATE-TIME:2026-10-16T18:00:14.040Z',
      '#EXTINF:6.000,',
      'media/ep-b/seg_0000.ts',
      '#EXTINF:2.040,',
      'media/ep-b/seg_0001.ts',
      '',
    ].join('\n'),
  });
});

it('should loop the card', async () => {
  const app = buildApp(defaultLineup(epA, epB, card), fixedClock(at(64_080)), '/nonexistent');

  const response = await app.request('/tv/live.m3u8');

  expect(await playlistResponse(response)).toEqual({
    status: 200,
    contentType: 'application/vnd.apple.mpegurl',
    cacheControl: 'no-cache',
    body: [
      ...header(6, 2),
      '#EXT-X-PROGRAM-DATE-TIME:2026-10-16T18:00:28.080Z',
      '#EXTINF:6.000,',
      'media/card/seg_0001.ts',
      '#EXT-X-DISCONTINUITY',
      '#EXT-X-PROGRAM-DATE-TIME:2026-10-16T18:00:34.080Z',
      '#EXTINF:6.000,',
      'media/card/seg_0000.ts',
      '#EXTINF:6.000,',
      'media/card/seg_0001.ts',
      '#EXT-X-DISCONTINUITY',
      '#EXT-X-PROGRAM-DATE-TIME:2026-10-16T18:00:46.080Z',
      '#EXTINF:6.000,',
      'media/card/seg_0000.ts',
      '#EXTINF:6.000,',
      'media/card/seg_0001.ts',
      '#EXT-X-DISCONTINUITY',
      '#EXT-X-PROGRAM-DATE-TIME:2026-10-16T18:00:58.080Z',
      '#EXTINF:6.000,',
      'media/card/seg_0000.ts',
      '',
    ].join('\n'),
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

function at(elapsedMs: number): Date {
  return new Date(start.getTime() + elapsedMs);
}

function header(mediaSequence: number, discontinuitySequence: number): string[] {
  return [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-TARGETDURATION:6',
    '#EXT-X-INDEPENDENT-SEGMENTS',
    `#EXT-X-MEDIA-SEQUENCE:${mediaSequence}`,
    `#EXT-X-DISCONTINUITY-SEQUENCE:${discontinuitySequence}`,
  ];
}

async function playlistResponse(response: Response) {
  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    cacheControl: response.headers.get('cache-control'),
    body: await response.text(),
  };
}
