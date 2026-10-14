import type { Kysely } from 'kysely';
import { openDatabase, type Database } from './database.ts';
import { migrateToLatest } from './migrations.ts';

export async function testDatabase(): Promise<Kysely<Database>> {
  const db = openDatabase(':memory:');
  await migrateToLatest(db);
  return db;
}

export function unmigratedTestDatabase(): Kysely<Database> {
  return openDatabase(':memory:');
}
