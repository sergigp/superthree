import type { Kysely, Selectable } from 'kysely';
import { DomainEvent } from '../../domain/shared/domain-event.ts';
import type { Database, OutboxTable } from './database.ts';

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
  db: Kysely<Database>,
): OutboxRepository & { list(): Promise<OutboxEntry[]> } {
  return {
    pending: () => Promise.resolve([]),
    markProcessed: (_entry, _processedAt) => Promise.resolve(),
    list: async () => (await db.selectFrom('outbox').selectAll().orderBy('id').execute()).map(toEntry),
  };
}

function toEntry(row: Selectable<OutboxTable>): OutboxEntry {
  return {
    id: row.id,
    event: DomainEvent.parse(JSON.parse(row.payload)),
    createdAt: row.created_at,
    processedAt: row.processed_at ?? undefined,
  };
}
