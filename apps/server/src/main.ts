import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { serve } from '@hono/node-server';
import { type AppOptions, createApp } from './application/http/app.ts';
import { createShowCreatedLogger } from './application/subscribers/show-created-logger.ts';
import { createOutboxDispatcher } from './application/tasks/outbox-dispatcher.ts';
import { loadConfig } from './config.ts';
import { defaultLineup, endingLineup } from './domain/channel/lineup.ts';
import { createShowCreator } from './domain/services/show-creator.ts';
import { createShowDeleter } from './domain/services/show-deleter.ts';
import { createShowFinder } from './domain/services/show-finder.ts';
import { createShowUpdater } from './domain/services/show-updater.ts';
import { createSqliteShowRepository } from './infrastructure/repositories/sqlite-show-repository.ts';
import { createFsVodPlaylistReader } from './infrastructure/client/fs-vod-playlist-reader.ts';
import { systemClock } from './infrastructure/shared/clock.ts';
import { openDatabase } from './infrastructure/shared/database.ts';
import { randomIds } from './infrastructure/shared/id-generator.ts';
import { createLogger } from './infrastructure/shared/logger.ts';
import { migrateToLatest } from './infrastructure/shared/migrations.ts';
import { createSqliteOutboxRepository } from './infrastructure/shared/outbox-repository.ts';
import { createSqliteTransactor } from './infrastructure/shared/transactor.ts';

const config = loadConfig(process.env);
const logger = createLogger(config.LOG_LEVEL, config.NODE_ENV !== 'production');

mkdirSync(config.DATA_DIR, { recursive: true });
const db = openDatabase(join(config.DATA_DIR, 'superthree.db'));
await migrateToLatest(db);

const shows = createSqliteShowRepository(db);
const transactor = createSqliteTransactor(db, systemClock);
const services = {
  finder: createShowFinder(shows),
  creator: createShowCreator(shows, transactor, systemClock, randomIds),
  updater: createShowUpdater(shows),
  deleter: createShowDeleter(shows),
};
const app = createApp(services, logger, {
  ...(config.WEB_DIST !== undefined ? { webDist: config.WEB_DIST } : {}),
  ...(config.MEDIA_DIR !== undefined ? { channel: await channelOptions(config.MEDIA_DIR) } : {}),
});
const server = serve({ fetch: app.fetch, port: config.PORT, hostname: '0.0.0.0' }, ({ port }) =>
  logger.info({ port }, 'listening'),
);

const dispatcher = createOutboxDispatcher(
  createSqliteOutboxRepository(db),
  { ShowCreated: createShowCreatedLogger(logger) },
  systemClock,
  logger,
);
dispatcher.start(1000);

process.on('SIGTERM', () => {
  server.close(async () => {
    await dispatcher.stop();
    await db.destroy();
    process.exit(0);
  });
});

async function channelOptions(mediaDir: string): Promise<NonNullable<AppOptions['channel']>> {
  const reader = createFsVodPlaylistReader(mediaDir);
  const [a, b, card] = await Promise.all([reader.read('ep-a'), reader.read('ep-b'), reader.read('card')]);
  const lineup = config.POC_LINEUP === 'ends' ? endingLineup(a, b) : defaultLineup(a, b, card);
  return { lineup, start: config.POC_START, clock: systemClock, mediaDir };
}
