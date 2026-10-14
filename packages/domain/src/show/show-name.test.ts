import { expect, it } from 'vitest';
import { ShowName } from './show-name.ts';

it('should trim a valid name', () => {
  expect(ShowName.safeParse('  Bluey ')).toEqual({ success: true, data: 'Bluey' });
});

it('should accept a name of 100 characters', () => {
  const name = 'a'.repeat(100);
  expect(ShowName.safeParse(name)).toEqual({ success: true, data: name });
});

it('should reject a blank name', () => {
  expect(failureMessages('')).toEqual(['Too small: expected string to have >=1 characters']);
  expect(failureMessages('   ')).toEqual(['Too small: expected string to have >=1 characters']);
});

function failureMessages(input: string): string[] | undefined {
  return ShowName.safeParse(input).error?.issues.map((issue) => issue.message);
}
