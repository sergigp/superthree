import { AudioLanguage } from '@superthree/domain/show/audio-language';
import type { Show } from '@superthree/domain/show/show';
import { ShowId } from '@superthree/domain/show/show-id';
import { ShowName } from '@superthree/domain/show/show-name';
import { z } from 'zod';

export const ShowCreated = z.object({
  type: z.literal('ShowCreated'),
  showId: ShowId,
  name: ShowName,
  audioLanguage: AudioLanguage,
  occurredAt: z.iso.datetime(),
});
export type ShowCreated = z.infer<typeof ShowCreated>;

export function showCreated(show: Show, occurredAt: Date): ShowCreated {
  return {
    type: 'ShowCreated',
    showId: show.id,
    name: show.name,
    audioLanguage: show.audioLanguage,
    occurredAt: occurredAt.toISOString(),
  };
}
