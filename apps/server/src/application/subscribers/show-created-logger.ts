import type { Logger } from 'pino';
import type { ShowCreated } from '../../domain/show/show-created.ts';

/** Idempotent: only logs. */
export function createShowCreatedLogger(logger: Logger): (event: ShowCreated) => Promise<void> {
  return async (event) => {
    logger.info(event, 'show created');
  };
}
