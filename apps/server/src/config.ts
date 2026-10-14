import { z } from 'zod';

export const Config = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  DATA_DIR: z.string().default('./data'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  WEB_DIST: z.string().optional(),
  NODE_ENV: z.string().optional(),
});
export type Config = z.infer<typeof Config>;

/** Throws on invalid env. */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  return Config.parse(env);
}
