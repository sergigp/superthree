import type { Kysely } from 'kysely';
import type { DomainEvent } from '../../domain/shared/domain-event.ts';
import type { Clock } from './clock.ts';
import type { Database } from './database.ts';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export function createSqliteEventPublisher(db: Kysely<Database>, clock: Clock): EventPublisher {
  return {
    publish: async (event) => {
      await db
        .insertInto('outbox')
        .values({ type: event.type, payload: JSON.stringify(event), created_at: clock.now().toISOString(), processed_at: null })
        .execute();
    },
  };
}
