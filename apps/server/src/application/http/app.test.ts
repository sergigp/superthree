import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pino } from 'pino';
import { afterAll, expect, it } from 'vitest';
import { createShowCreator } from '../../domain/services/show-creator.ts';
import { createShowDeleter } from '../../domain/services/show-deleter.ts';
import { createShowFinder } from '../../domain/services/show-finder.ts';
import { createShowUpdater } from '../../domain/services/show-updater.ts';
import { createSqliteShowRepository } from '../../infrastructure/repositories/sqlite-show-repository.ts';
import { fixedClock } from '../../infrastructure/shared/clock.ts';
import { sequentialIds } from '../../infrastructure/shared/id-generator.ts';
import { unmigratedTestDatabase } from '../../infrastructure/shared/test-database.ts';
import { createSqliteTransactor } from '../../infrastructure/shared/transactor.ts';
import { createApp } from './app.ts';

const webDist = mkdtempSync(join(tmpdir(), 'superthree-web-dist-'));
writeFileSync(join(webDist, 'index.html'), '<!doctype html><title>Superthree</title>');

afterAll(() => rmSync(webDist, { recursive: true, force: true }));

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

function buildApp() {
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
    { webDist },
  );
}
