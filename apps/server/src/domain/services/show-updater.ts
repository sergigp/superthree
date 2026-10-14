import type { Show } from '@superthree/domain/show/show';
import type { ShowId } from '@superthree/domain/show/show-id';
import { ShowName } from '@superthree/domain/show/show-name';
import { Result } from 'better-result';
import type { ShowRepository } from '../../infrastructure/repositories/sqlite-show-repository.ts';
import type { UpdateShowError } from '../show/errors.ts';
import type { ShowPatch } from '../show/show-patch.ts';

export interface ShowUpdater {
  /** Renaming to a case variant of the show's own name is allowed. */
  update(id: ShowId, patch: ShowPatch): Promise<Result<Show, UpdateShowError>>;
}

export function createShowUpdater(_shows: ShowRepository): ShowUpdater {
  return {
    update: (id, _patch) =>
      Promise.resolve(
        Result.ok({ id, name: ShowName.parse('Placeholder'), audioLanguage: 'en', createdAt: '1970-01-01T00:00:00.000Z' }),
      ),
  };
}
