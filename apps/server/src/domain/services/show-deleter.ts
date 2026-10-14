import type { ShowId } from '@superthree/domain/show/show-id';
import { Result } from 'better-result';
import type { ShowRepository } from '../../infrastructure/repositories/sqlite-show-repository.ts';
import type { DeleteShowError } from '../show/errors.ts';

export interface ShowDeleter {
  delete(id: ShowId): Promise<Result<void, DeleteShowError>>;
}

export function createShowDeleter(_shows: ShowRepository): ShowDeleter {
  return {
    delete: (_id) => Promise.resolve(Result.ok(undefined)),
  };
}
