import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pino } from 'pino';
import { afterAll, expect, it } from 'vitest';
import { defaultLineup } from '../../domain/channel/lineup.ts';
import { createShowCreator } from '../../domain/services/show-creator.ts';
import { createShowDeleter } from '../../domain/services/show-deleter.ts';
import { createShowFinder } from '../../domain/services/show-finder.ts';
import { createShowUpdater } from '../../domain/services/show-updater.ts';
import { createSqliteShowRepository } from '../../infrastructure/repositories/sqlite-show-repository.ts';
import { fixedClock } from '../../infrastructure/shared/clock.ts';
import { sequentialIds } from '../../infrastructure/shared/id-generator.ts';
import { unmigratedTestDatabase } from '../../infrastructure/shared/test-database.ts';
import { createSqliteTransactor } from '../../infrastructure/shared/transactor.ts';
import { type AppOptions, createApp } from './app.ts';

const webDist = mkdtempSync(join(tmpdir(), 'superthree-web-dist-'));
writeFileSync(join(webDist, 'index.html'), '<!doctype html><title>Superthree</title>');
const mediaDir = mkdtempSync(join(tmpdir(), 'superthree-media-'));
const start = new Date('2026-10-16T18:00:00.000Z');
const clip = { id: 'card', chunkDurationsMs: [6000] };
const channel = { lineup: defaultLineup(clip, clip, clip), start, clock: fixedClock(new Date('2026-10-16T18:00:30.000Z')), mediaDir };

afterAll(() => {
  rmSync(webDist, { recursive: true, force: true });
  rmSync(mediaDir, { recursive: true, force: true });
});

it('should fail to route an unknown api path', async () => {
  const app = buildApp();

  const response = await app.request('/api/nope');

  expect({ status: response.status, body: await response.json() }).toEqual({
    status: 404,
    body: { error: 'Route GET /api/nope not found' },
  });
});

it('should serve the web app for an unknown non-api path', async () => {
  const app = buildApp();

  const response = await app.request('/shows/123');

  expect({ status: response.status, body: await response.text() }).toEqual({
    status: 200,
    body: '<!doctype html><title>Superthree</title>',
  });
});

it('should route channel paths ahead of the web app', async () => {
  const withChannel = buildApp({ webDist, channel });
  const withoutChannel = buildApp({ webDist });

  const responses = [
    await withChannel.request('/tv/live.m3u8'),
    await withChannel.request('/tv/nope'),
    await withoutChannel.request('/tv/live.m3u8'),
  ];

  expect(
    responses.map((response) => ({ status: response.status, contentType: response.headers.get('content-type') })),
  ).toEqual([
    { status: 200, contentType: 'application/vnd.apple.mpegurl' },
    { status: 404, contentType: 'application/json' },
    { status: 404, contentType: 'application/json' },
  ]);
});

function buildApp(options: AppOptions = { webDist }) {
  const db = unmigratedTestDatabase();
  const shows = createSqliteShowRepository(db);
  const clock = fixedClock(new Date('2026-10-14T10:00:00.000Z'));
  return createApp(
    {
      finder: createShowFinder(shows),
      creator: createShowCreator(shows, createSqliteTransactor(db, clock), clock, sequentialIds()),
      updater: createShowUpdater(shows),
      deleter: createShowDeleter(shows),
    },
    pino({ level: 'silent' }),
    options,
  );
}
