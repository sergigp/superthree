import { expect, it } from 'vitest';
import { AudioLanguage } from './audio-language.ts';

it('should accept supported languages', () => {
  expect(['ca', 'es', 'en'].map((language) => AudioLanguage.safeParse(language))).toEqual([
    { success: true, data: 'ca' },
    { success: true, data: 'es' },
    { success: true, data: 'en' },
  ]);
});

it('should reject an unsupported language', () => {
  expect(AudioLanguage.safeParse('fr').error?.issues.map((issue) => issue.message)).toEqual([
    'Invalid option: expected one of "ca"|"es"|"en"',
  ]);
});
