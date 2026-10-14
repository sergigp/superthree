import SqliteDatabase from 'better-sqlite3';
import { Kysely, SqliteDialect, type Generated } from 'kysely';

export interface ShowsTable {
  id: string;
  name: string;
  audio_language: string;
  created_at: string;
}

export interface OutboxTable {
  id: Generated<number>;
  type: string;
  payload: string;
  created_at: string;
  processed_at: string | null;
}

export interface Database {
  shows: ShowsTable;
  outbox: OutboxTable;
}

/** Enables WAL (file databases only) and foreign keys. */
export function openDatabase(path: string): Kysely<Database> {
  const database = new SqliteDatabase(path);
  if (path !== ':memory:') {
    database.pragma('journal_mode = WAL');
  }
  database.pragma('foreign_keys = ON');
  return new Kysely<Database>({ dialect: new SqliteDialect({ database }) });
}
