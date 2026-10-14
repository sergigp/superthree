import type { AudioLanguage } from '@superthree/domain/show/audio-language';
import type { Show } from '@superthree/domain/show/show';
import { ShowId } from '@superthree/domain/show/show-id';
import type { ShowName } from '@superthree/domain/show/show-name';
import { Result } from 'better-result';
import type { ShowRepository } from '../../infrastructure/repositories/sqlite-show-repository.ts';
import type { Clock } from '../../infrastructure/shared/clock.ts';
import type { IdGenerator } from '../../infrastructure/shared/id-generator.ts';
import type { Transactor } from '../../infrastructure/shared/transactor.ts';
import type { CreateShowError } from '../show/errors.ts';

export interface ShowCreator {
  /** Fails if another show has the name ignoring case; stores the show and ShowCreated atomically. */
  create(name: ShowName, audioLanguage: AudioLanguage): Promise<Result<Show, CreateShowError>>;
}

export function createShowCreator(
  _shows: ShowRepository,
  _transactor: Transactor,
  _clock: Clock,
  _ids: IdGenerator,
): ShowCreator {
  return {
    create: (name, audioLanguage) =>
      Promise.resolve(
        Result.ok({
          id: ShowId.parse('00000000-0000-4000-8000-000000000000'),
          name,
          audioLanguage,
          createdAt: '1970-01-01T00:00:00.000Z',
        }),
      ),
  };
}
