import { sql, type Kysely } from 'kysely';
import { Migrator, type Migration } from 'kysely/migration';
import type { Database } from './database.ts';

const migrations: Record<string, Migration> = {
  '0001_init': {
    up: async (db) => {
      await db.schema
        .createTable('shows')
        .addColumn('id', 'text', (column) => column.primaryKey())
        .addColumn('name', 'text', (column) => column.notNull())
        .addColumn('audio_language', 'text', (column) => column.notNull())
        .addColumn('created_at', 'text', (column) => column.notNull())
        .execute();
      await db.schema
        .createIndex('shows_name_unique')
        .on('shows')
        .unique()
        .expression(sql`name COLLATE NOCASE`)
        .execute();
      await db.schema
        .createTable('outbox')
        .addColumn('id', 'integer', (column) => column.primaryKey().autoIncrement())
        .addColumn('type', 'text', (column) => column.notNull())
        .addColumn('payload', 'text', (column) => column.notNull())
        .addColumn('created_at', 'text', (column) => column.notNull())
        .addColumn('processed_at', 'text')
        .execute();
    },
  },
};

export async function migrateToLatest(db: Kysely<Database>): Promise<void> {
  const migrator = new Migrator({ db, provider: { getMigrations: () => Promise.resolve(migrations) } });
  const { error } = await migrator.migrateToLatest();
  if (error !== undefined) {
    throw error;
  }
}
