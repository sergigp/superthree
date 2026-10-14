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

export function openDatabase(path: string): Kysely<Database> {
  return new Kysely<Database>({ dialect: new SqliteDialect({ database: new SqliteDatabase(path) }) });
}
