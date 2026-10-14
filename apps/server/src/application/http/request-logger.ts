import { randomUUID } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import type { Logger } from 'pino';

export function requestLogger(logger: Logger) {
  return createMiddleware<{ Variables: { logger: Logger } }>(async (c, next) => {
    const started = performance.now();
    const child = logger.child({ reqId: randomUUID() });
    c.set('logger', child);
    await next();
    child.info(
      { method: c.req.method, path: c.req.path, status: c.res.status, ms: Math.round(performance.now() - started) },
      'request',
    );
  });
}
