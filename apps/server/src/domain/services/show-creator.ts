import type { AudioLanguage } from '@superthree/domain/show/audio-language';
import { createShow, type Show } from '@superthree/domain/show/show';
import { ShowId } from '@superthree/domain/show/show-id';
import type { ShowName } from '@superthree/domain/show/show-name';
import { Result } from 'better-result';
import type { ShowRepository } from '../../infrastructure/repositories/sqlite-show-repository.ts';
import type { Clock } from '../../infrastructure/shared/clock.ts';
import type { IdGenerator } from '../../infrastructure/shared/id-generator.ts';
import type { Transactor } from '../../infrastructure/shared/transactor.ts';
import { ShowNameTaken, type CreateShowError } from '../show/errors.ts';
import { showCreated } from '../show/show-created.ts';

export interface ShowCreator {
  /** Fails if another show has the name ignoring case; stores the show and ShowCreated atomically. */
  create(name: ShowName, audioLanguage: AudioLanguage): Promise<Result<Show, CreateShowError>>;
}

export function createShowCreator(
  shows: ShowRepository,
  transactor: Transactor,
  clock: Clock,
  ids: IdGenerator,
): ShowCreator {
  return {
    create: (name, audioLanguage) =>
      Result.gen(async function* () {
        yield* Result.await(ensureNameAvailable(shows, name));
        const show = createShow(ShowId.parse(ids.next()), name, audioLanguage, clock.now());
        await transactor.run(async (scope) => {
          await scope.shows.insert(show);
          await scope.events.publish(showCreated(show, clock.now()));
        });
        return Result.ok(show);
      }),
  };
}

async function ensureNameAvailable(shows: ShowRepository, name: ShowName): Promise<Result<void, ShowNameTaken>> {
  return (await shows.findByName(name)) === undefined
    ? Result.ok(undefined)
    : Result.err(new ShowNameTaken({ name, message: `A show named ${name} already exists` }));
}
