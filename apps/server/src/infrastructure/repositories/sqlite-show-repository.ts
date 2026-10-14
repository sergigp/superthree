import { Show } from '@superthree/domain/show/show';
import type { ShowId } from '@superthree/domain/show/show-id';
import type { ShowName } from '@superthree/domain/show/show-name';
import { sql, type Kysely, type Selectable } from 'kysely';
import type { Database, ShowsTable } from '../shared/database.ts';

export interface ShowRepository {
  list(): Promise<Show[]>;
  findById(id: ShowId): Promise<Show | undefined>;
  /** Matches ignoring case. */
  findByName(name: ShowName): Promise<Show | undefined>;
  insert(show: Show): Promise<void>;
  update(show: Show): Promise<void>;
  delete(id: ShowId): Promise<void>;
}

export function createSqliteShowRepository(db: Kysely<Database>): ShowRepository {
  return {
    list: async () =>
      (await db.selectFrom('shows').selectAll().orderBy(sql`name COLLATE NOCASE`).execute()).map(toShow),
    findById: (_id) => Promise.resolve(undefined),
    findByName: async (name) => {
      const row = await db
        .selectFrom('shows')
        .selectAll()
        .where(sql<boolean>`name = ${name} COLLATE NOCASE`)
        .executeTakeFirst();
      return row === undefined ? undefined : toShow(row);
    },
    insert: async (show) => {
      await db.insertInto('shows').values(toRow(show)).execute();
    },
    update: (_show) => Promise.resolve(),
    delete: (_id) => Promise.resolve(),
  };
}

function toRow(show: Show): ShowsTable {
  return { id: show.id, name: show.name, audio_language: show.audioLanguage, created_at: show.createdAt };
}

function toShow(row: Selectable<ShowsTable>): Show {
  return Show.parse({ id: row.id, name: row.name, audioLanguage: row.audio_language, createdAt: row.created_at });
}
