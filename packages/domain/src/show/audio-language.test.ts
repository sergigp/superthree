import { expect, it } from 'vitest';
import { AudioLanguage } from './audio-language.ts';

it('should accept supported languages', () => {
  expect(['ca', 'es', 'en'].map((language) => AudioLanguage.safeParse(language))).toEqual([
    { success: true, data: 'ca' },
    { success: true, data: 'es' },
    { success: true, data: 'en' },
  ]);
});
