import { z } from 'zod';

export const Config = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  DATA_DIR: z.string().default('./data'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  WEB_DIST: z.string().optional(),
  NODE_ENV: z.string().optional(),
  MEDIA_DIR: z.string().optional(),
  POC_START: z.iso
    .datetime()
    .default('2026-10-16T00:00:00Z')
    .transform((s) => new Date(s)),
  POC_LINEUP: z.enum(['loop', 'ends']).default('loop'),
});
export type Config = z.infer<typeof Config>;

/** Throws on invalid env. */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  return Config.parse(env);
}
