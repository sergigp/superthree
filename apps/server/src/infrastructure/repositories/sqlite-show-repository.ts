import type { Show } from '@superthree/domain/show/show';
import type { ShowId } from '@superthree/domain/show/show-id';
import type { ShowName } from '@superthree/domain/show/show-name';
import type { Kysely } from 'kysely';
import type { Database } from '../shared/database.ts';

export interface ShowRepository {
  list(): Promise<Show[]>;
  findById(id: ShowId): Promise<Show | undefined>;
  /** Matches ignoring case. */
  findByName(name: ShowName): Promise<Show | undefined>;
  insert(show: Show): Promise<void>;
  update(show: Show): Promise<void>;
  delete(id: ShowId): Promise<void>;
}

export function createSqliteShowRepository(_db: Kysely<Database>): ShowRepository {
  return {
    list: () => Promise.resolve([]),
    findById: (_id) => Promise.resolve(undefined),
    findByName: (_name) => Promise.resolve(undefined),
    insert: (_show) => Promise.resolve(),
    update: (_show) => Promise.resolve(),
    delete: (_id) => Promise.resolve(),
  };
}
