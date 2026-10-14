import { z } from 'zod';

export const ShowName = z.string().trim().min(1).brand('ShowName');
export type ShowName = z.infer<typeof ShowName>;
