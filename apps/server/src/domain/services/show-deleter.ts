import type { ShowId } from '@superthree/domain/show/show-id';
import { Result } from 'better-result';
import type { ShowRepository } from '../../infrastructure/repositories/sqlite-show-repository.ts';
import { ShowNotFound, type DeleteShowError } from '../show/errors.ts';

export interface ShowDeleter {
  delete(id: ShowId): Promise<Result<void, DeleteShowError>>;
}

export function createShowDeleter(shows: ShowRepository): ShowDeleter {
  return {
    delete: (id) =>
      Result.gen(async function* () {
        yield* Result.await(ensureExists(shows, id));
        await shows.delete(id);
        return Result.ok(undefined);
      }),
  };
}

async function ensureExists(shows: ShowRepository, id: ShowId): Promise<Result<void, ShowNotFound>> {
  return (await shows.findById(id)) === undefined
    ? Result.err(new ShowNotFound({ id, message: `Show ${id} not found` }))
    : Result.ok(undefined);
}
