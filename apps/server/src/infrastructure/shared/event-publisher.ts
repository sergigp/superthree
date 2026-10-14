import type { Kysely } from 'kysely';
import type { DomainEvent } from '../../domain/shared/domain-event.ts';
import type { Clock } from './clock.ts';
import type { Database } from './database.ts';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export function createSqliteEventPublisher(_db: Kysely<Database>, _clock: Clock): EventPublisher {
  return {
    publish: (_event) => Promise.resolve(),
  };
}
