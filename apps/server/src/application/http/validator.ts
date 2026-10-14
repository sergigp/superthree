import { zValidator } from '@hono/zod-validator';
import type { z } from 'zod';

/** Zod validator whose failure response is `400 { error }`, the API's failure body. */
export function validate<T extends 'json' | 'param', S extends z.ZodType>(target: T, schema: S) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: toErrorMessage(result.error.issues) }, 400);
    }
    return undefined;
  });
}

function toErrorMessage(issues: readonly z.core.$ZodIssue[]): string {
  return issues
    .map((issue) => (issue.path.length === 0 ? issue.message : `${issue.path.map(String).join('.')}: ${issue.message}`))
    .join('; ');
}
