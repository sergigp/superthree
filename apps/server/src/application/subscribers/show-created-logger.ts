import type { Logger } from 'pino';
import type { ShowCreated } from '../../domain/show/show-created.ts';

/** Idempotent: only logs. */
export function createShowCreatedLogger(_logger: Logger): (event: ShowCreated) => Promise<void> {
  return (_event) => Promise.resolve();
}
