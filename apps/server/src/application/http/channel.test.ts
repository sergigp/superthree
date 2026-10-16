import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pino } from 'pino';
import { afterAll, expect, it } from 'vitest';
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
const chunkBytes = new Uint8Array([0x47, 0x40, 0x00, 0x10, 0xff]);
const mediaDir = mkdtempSync(join(tmpdir(), 'superthree-media-'));
mkdirSync(join(mediaDir, 'card'));
writeFileSync(join(mediaDir, 'card', 'seg_0001.ts'), chunkBytes);

afterAll(() => rmSync(mediaDir, { recursive: true, force: true }));

it('should serve the channel list', async () => {
  const app = buildApp(defaultLineup(epA, epB, card), fixedClock(start), mediaDir);

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
  const app = buildApp(defaultLineup(epA, epB, card), fixedClock(at(12_000)), mediaDir);

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
  const app = buildApp(endingLineup(longA, epB), fixedClock(at(50_000)), mediaDir);

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
  const app = buildApp(defaultLineup(epA, epB, card), fixedClock(at(22_080)), mediaDir);

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
  const app = buildApp(defaultLineup(epA, epB, card), fixedClock(at(64_080)), mediaDir);

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

it('should end the broadcast', async () => {
  const app = buildApp(endingLineup(epA, epB), fixedClock(at(3_600_000)), mediaDir);

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
      '#EXT-X-ENDLIST',
      '',
    ].join('\n'),
  });
});

it('should fail to serve the playlist before the first chunk is published', async () => {
  const beforeStart = buildApp(defaultLineup(epA, epB, card), fixedClock(at(-1_000)), mediaDir);
  const duringFirstChunk = buildApp(defaultLineup(epA, epB, card), fixedClock(at(3_000)), mediaDir);

  const responses = [await beforeStart.request('/tv/live.m3u8'), await duringFirstChunk.request('/tv/live.m3u8')];

  expect(
    await Promise.all(responses.map(async (response) => ({ status: response.status, body: await response.text() }))),
  ).toEqual([
    { status: 503, body: '{"error":"Channel has not started yet"}' },
    { status: 503, body: '{"error":"Channel has not started yet"}' },
  ]);
});

it('should serve a chunk', async () => {
  const app = buildApp(defaultLineup(epA, epB, card), fixedClock(start), mediaDir);

  const response = await app.request('/tv/media/card/seg_0001.ts');

  expect({
    status: response.status,
    contentType: response.headers.get('content-type'),
    body: new Uint8Array(await response.arrayBuffer()),
  }).toEqual({ status: 200, contentType: 'video/mp2t', body: chunkBytes });
});

it('should fail to serve a chunk that does not exist', async () => {
  const app = buildApp(defaultLineup(epA, epB, card), fixedClock(start), mediaDir);

  const responses = [
    await app.request('/tv/media/card/seg_9999.ts'),
    await app.request('/tv/media/..%2F..%2Fpackage.json'),
  ];

  expect(
    await Promise.all(responses.map(async (response) => ({ status: response.status, body: await response.text() }))),
  ).toEqual([
    { status: 404, body: '{"error":"Route GET /tv/media/card/seg_9999.ts not found"}' },
    { status: 404, body: '{"error":"Route GET /tv/media/..%2F..%2Fpackage.json not found"}' },
  ]);
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
