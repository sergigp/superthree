import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'kysely';
import { afterAll, expect, it } from 'vitest';
import { openDatabase } from './database.ts';

const directory = mkdtempSync(join(tmpdir(), 'superthree-database-'));

afterAll(() => rmSync(directory, { recursive: true, force: true }));

it('should enable WAL and foreign keys on a file database', async () => {
  const db = openDatabase(join(directory, 'test.db'));

  const journalMode = await sql<{ journal_mode: string }>`PRAGMA journal_mode`.execute(db);
  const foreignKeys = await sql<{ foreign_keys: number }>`PRAGMA foreign_keys`.execute(db);
  await db.destroy();

  expect({ journalMode: journalMode.rows, foreignKeys: foreignKeys.rows }).toEqual({
    journalMode: [{ journal_mode: 'wal' }],
    foreignKeys: [{ foreign_keys: 1 }],
  });
});
