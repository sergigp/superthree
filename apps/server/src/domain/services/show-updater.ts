import { withAudioLanguage, withName, type Show } from '@superthree/domain/show/show';
import type { ShowId } from '@superthree/domain/show/show-id';
import { Result } from 'better-result';
import type { ShowRepository } from '../../infrastructure/repositories/sqlite-show-repository.ts';
import type { UpdateShowError } from '../show/errors.ts';
import type { ShowPatch } from '../show/show-patch.ts';

export interface ShowUpdater {
  /** Renaming to a case variant of the show's own name is allowed. */
  update(id: ShowId, patch: ShowPatch): Promise<Result<Show, UpdateShowError>>;
}

export function createShowUpdater(shows: ShowRepository): ShowUpdater {
  return {
    update: async (id, patch) => {
      const show = await shows.findById(id);
      if (show === undefined) {
        throw new Error(`Show ${id} not found`);
      }
      const updated = applyPatch(show, patch);
      await shows.update(updated);
      return Result.ok(updated);
    },
  };
}

function applyPatch(show: Show, patch: ShowPatch): Show {
  const renamed = patch.name === undefined ? show : withName(show, patch.name);
  return patch.audioLanguage === undefined ? renamed : withAudioLanguage(renamed, patch.audioLanguage);
}
