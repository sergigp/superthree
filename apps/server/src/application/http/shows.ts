import { AudioLanguage } from '@superthree/domain/show/audio-language';
import type { Show } from '@superthree/domain/show/show';
import { ShowId } from '@superthree/domain/show/show-id';
import { ShowName } from '@superthree/domain/show/show-name';
import { matchError } from 'better-result';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ShowCreator } from '../../domain/services/show-creator.ts';
import type { ShowDeleter } from '../../domain/services/show-deleter.ts';
import type { ShowFinder } from '../../domain/services/show-finder.ts';
import type { ShowUpdater } from '../../domain/services/show-updater.ts';
import type { ShowPatch } from '../../domain/show/show-patch.ts';
import { validate } from './validator.ts';

const ShowIdParam = z.object({ id: ShowId });
const CreateShowRequest = z.object({ name: ShowName, audioLanguage: AudioLanguage });
const UpdateShowRequest = z
  .object({ name: ShowName.optional(), audioLanguage: AudioLanguage.optional() })
  .refine((patch) => patch.name !== undefined || patch.audioLanguage !== undefined, 'Patch must change name or audioLanguage');

export interface ShowResponse {
  id: string;
  name: string;
  audioLanguage: AudioLanguage;
  createdAt: string;
}

export interface ShowServices {
  finder: ShowFinder;
  creator: ShowCreator;
  updater: ShowUpdater;
  deleter: ShowDeleter;
}

export function createShowRoutes(services: ShowServices) {
  return new Hono()
    .get('/', async (c) => c.json((await services.finder.list()).map(toShowResponse), 200))
    .get('/:id', validate('param', ShowIdParam), async (c) => {
      const result = await services.finder.get(c.req.valid('param').id);
      return result.isOk()
        ? c.json(toShowResponse(result.value), 200)
        : matchError(result.error, { ShowNotFound: (e) => c.json({ error: e.message }, 404) });
    })
    .post('/', validate('json', CreateShowRequest), async (c) => {
      const { name, audioLanguage } = c.req.valid('json');
      const result = await services.creator.create(name, audioLanguage);
      return result.isOk()
        ? c.json(toShowResponse(result.value), 201)
        : matchError(result.error, { ShowNameTaken: (e) => c.json({ error: e.message }, 409) });
    })
    .patch('/:id', validate('param', ShowIdParam), validate('json', UpdateShowRequest), async (c) => {
      const result = await services.updater.update(c.req.valid('param').id, toShowPatch(c.req.valid('json')));
      return result.isOk()
        ? c.json(toShowResponse(result.value), 200)
        : matchError(result.error, {
            ShowNotFound: (e) => c.json({ error: e.message }, 404),
            ShowNameTaken: (e) => c.json({ error: e.message }, 409),
          });
    })
    .delete('/:id', validate('param', ShowIdParam), async (c) => {
      const result = await services.deleter.delete(c.req.valid('param').id);
      return result.isOk()
        ? c.body(null, 204)
        : matchError(result.error, { ShowNotFound: (e) => c.json({ error: e.message }, 404) });
    });
}

function toShowResponse(show: Show): ShowResponse {
  return { id: show.id, name: show.name, audioLanguage: show.audioLanguage, createdAt: show.createdAt };
}

function toShowPatch({ name, audioLanguage }: z.infer<typeof UpdateShowRequest>): ShowPatch {
  if (name !== undefined) {
    return audioLanguage !== undefined ? { name, audioLanguage } : { name };
  }
  if (audioLanguage !== undefined) {
    return { audioLanguage };
  }
  throw new Error('UpdateShowRequest let an empty patch through');
}
