import { z } from 'zod';

export const AudioLanguage = z.enum(['ca', 'es', 'en']);
export type AudioLanguage = z.infer<typeof AudioLanguage>;
