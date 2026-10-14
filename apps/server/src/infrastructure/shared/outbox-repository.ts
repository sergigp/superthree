import type { Kysely } from 'kysely';
import type { DomainEvent } from '../../domain/shared/domain-event.ts';
import type { Database } from './database.ts';

export interface OutboxEntry {
  readonly id: number;
  readonly event: DomainEvent;
  readonly createdAt: string;
  readonly processedAt: string | undefined;
}

export interface OutboxRepository {
  pending(): Promise<OutboxEntry[]>;
  markProcessed(entry: OutboxEntry, processedAt: Date): Promise<void>;
}

export function createSqliteOutboxRepository(
  _db: Kysely<Database>,
): OutboxRepository & { list(): Promise<OutboxEntry[]> } {
  return {
    pending: () => Promise.resolve([]),
    markProcessed: (_entry, _processedAt) => Promise.resolve(),
    list: () => Promise.resolve([]),
  };
}
