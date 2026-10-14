import type { AudioLanguage } from '@superthree/domain/show/audio-language';
import { createShow, type Show } from '@superthree/domain/show/show';
import { ShowId } from '@superthree/domain/show/show-id';
import type { ShowName } from '@superthree/domain/show/show-name';
import { Result } from 'better-result';
import type { ShowRepository } from '../../infrastructure/repositories/sqlite-show-repository.ts';
import type { Clock } from '../../infrastructure/shared/clock.ts';
import type { IdGenerator } from '../../infrastructure/shared/id-generator.ts';
import type { Transactor } from '../../infrastructure/shared/transactor.ts';
import type { CreateShowError } from '../show/errors.ts';
import { showCreated } from '../show/show-created.ts';

export interface ShowCreator {
  /** Fails if another show has the name ignoring case; stores the show and ShowCreated atomically. */
  create(name: ShowName, audioLanguage: AudioLanguage): Promise<Result<Show, CreateShowError>>;
}

export function createShowCreator(
  _shows: ShowRepository,
  transactor: Transactor,
  clock: Clock,
  ids: IdGenerator,
): ShowCreator {
  return {
    create: async (name, audioLanguage) => {
      const show = createShow(ShowId.parse(ids.next()), name, audioLanguage, clock.now());
      await transactor.run(async ({ shows, events }) => {
        await shows.insert(show);
        await events.publish(showCreated(show, clock.now()));
      });
      return Result.ok(show);
    },
  };
}
