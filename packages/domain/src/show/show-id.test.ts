import { expect, it } from 'vitest';
import { ShowId } from './show-id.ts';

it('should accept a uuid', () => {
  const id = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';
  expect(ShowId.safeParse(id)).toEqual({ success: true, data: id });
});
