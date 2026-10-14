import { expect, it } from 'vitest';
import { ShowName } from './show-name.ts';

it('should trim a valid name', () => {
  expect(ShowName.safeParse('  Bluey ')).toEqual({ success: true, data: 'Bluey' });
});

it('should accept a name of 100 characters', () => {
  const name = 'a'.repeat(100);
  expect(ShowName.safeParse(name)).toEqual({ success: true, data: name });
});
