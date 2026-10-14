import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import type { Logger } from 'pino';
import { createHealthRoutes } from './health.ts';
import { requestLogger } from './request-logger.ts';
import { createShowRoutes, type ShowServices } from './shows.ts';

export interface AppOptions {
  webDist?: string;
}

export function createApp(services: ShowServices, logger: Logger, options: AppOptions = {}) {
  const app = new Hono()
    .use(requestLogger(logger))
    .route('/api/health', createHealthRoutes())
    .route('/api/shows', createShowRoutes(services));
  app.onError((error, c) => {
    logger.error({ err: error }, 'unhandled error');
    return c.json({ error: 'Internal server error' }, 500);
  });
  app.notFound((c) => c.json({ error: `Route ${c.req.method} ${c.req.path} not found` }, 404));
  // Keeps unknown API paths out of the SPA fallback below.
  app.all('/api/*', (c) => c.notFound());
  if (options.webDist !== undefined) {
    app.use('/*', serveStatic({ root: options.webDist }));
    app.get('/*', serveStatic({ root: options.webDist, path: 'index.html' }));
  }
  return app;
}

export type AppType = ReturnType<typeof createApp>;
