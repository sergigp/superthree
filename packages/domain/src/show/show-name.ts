import { z } from 'zod';

export const ShowName = z.string().brand('ShowName');
export type ShowName = z.infer<typeof ShowName>;
