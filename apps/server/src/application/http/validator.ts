import { zValidator } from '@hono/zod-validator';
import type { z } from 'zod';

export function validate<T extends 'json' | 'param', S extends z.ZodType>(target: T, schema: S) {
  return zValidator(target, schema);
}
