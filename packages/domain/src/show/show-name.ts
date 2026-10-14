import { z } from 'zod';

export const ShowName = z.string().trim().brand('ShowName');
export type ShowName = z.infer<typeof ShowName>;
