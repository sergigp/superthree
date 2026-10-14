import { z } from 'zod';
import { AudioLanguage } from './audio-language.ts';
import { ShowId } from './show-id.ts';
import { ShowName } from './show-name.ts';

export const Show = z
  .object({
    id: ShowId,
    name: ShowName,
    audioLanguage: AudioLanguage,
    createdAt: z.iso.datetime(),
  })
  .readonly();
export type Show = z.infer<typeof Show>;

export function createShow(id: ShowId, name: ShowName, audioLanguage: AudioLanguage, createdAt: Date): Show {
  return { id, name, audioLanguage, createdAt: createdAt.toISOString() };
}

export function withName(show: Show, name: ShowName): Show {
  return { ...show, name };
}

export function withAudioLanguage(show: Show, audioLanguage: AudioLanguage): Show {
  return { ...show, audioLanguage };
}
