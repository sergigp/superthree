import type { Show } from '@superthree/domain/show/show';
import type { ShowId } from '@superthree/domain/show/show-id';
import { Result } from 'better-result';
import type { ShowRepository } from '../../infrastructure/repositories/sqlite-show-repository.ts';
import type { GetShowError } from '../show/errors.ts';

export interface ShowFinder {
  /** All shows, sorted by name ignoring case. */
  list(): Promise<Show[]>;
  get(id: ShowId): Promise<Result<Show, GetShowError>>;
}

export function createShowFinder(shows: ShowRepository): ShowFinder {
  return {
    list: () => shows.list(),
    get: async (id) => {
      const show = await shows.findById(id);
      if (show === undefined) {
        throw new Error(`Show ${id} not found`);
      }
      return Result.ok(show);
    },
  };
}
