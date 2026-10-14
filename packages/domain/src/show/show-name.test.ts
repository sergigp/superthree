import { expect, it } from 'vitest';
import { ShowName } from './show-name.ts';

it('should trim a valid name', () => {
  expect(ShowName.safeParse('  Bluey ')).toEqual({ success: true, data: 'Bluey' });
});
