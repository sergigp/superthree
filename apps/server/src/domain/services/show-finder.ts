import type { Show } from '@superthree/domain/show/show';
import type { ShowId } from '@superthree/domain/show/show-id';
import { ShowName } from '@superthree/domain/show/show-name';
import { Result } from 'better-result';
import type { ShowRepository } from '../../infrastructure/repositories/sqlite-show-repository.ts';
import type { GetShowError } from '../show/errors.ts';

export interface ShowFinder {
  /** All shows, sorted by name ignoring case. */
  list(): Promise<Show[]>;
  get(id: ShowId): Promise<Result<Show, GetShowError>>;
}

export function createShowFinder(_shows: ShowRepository): ShowFinder {
  return {
    list: () => Promise.resolve([]),
    get: (id) =>
      Promise.resolve(
        Result.ok({ id, name: ShowName.parse('Placeholder'), audioLanguage: 'en', createdAt: '1970-01-01T00:00:00.000Z' }),
      ),
  };
}
