import type { Kysely } from 'kysely';
import {
  createSqliteShowRepository,
  type ShowRepository,
} from '../repositories/sqlite-show-repository.ts';
import type { Clock } from './clock.ts';
import type { Database } from './database.ts';
import { createSqliteEventPublisher, type EventPublisher } from './event-publisher.ts';

export interface TransactionScope {
  readonly shows: ShowRepository;
  readonly events: EventPublisher;
}

export interface Transactor {
  /** Commits if work resolves, rolls back if it throws. Business checks happen before run; no Result inside. */
  run<T>(work: (scope: TransactionScope) => Promise<T>): Promise<T>;
}

export function createSqliteTransactor(db: Kysely<Database>, clock: Clock): Transactor {
  return {
    run: (work) => work({ shows: createSqliteShowRepository(db), events: createSqliteEventPublisher(db, clock) }),
  };
}
