import type { AudioLanguage } from '@superthree/domain/show/audio-language';
import type { ShowName } from '@superthree/domain/show/show-name';

export type ShowPatch =
  | { readonly name: ShowName; readonly audioLanguage?: AudioLanguage }
  | { readonly name?: ShowName; readonly audioLanguage: AudioLanguage };
