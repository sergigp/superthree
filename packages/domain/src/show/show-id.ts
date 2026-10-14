import { z } from 'zod';

export const ShowId = z.string().brand('ShowId');
export type ShowId = z.infer<typeof ShowId>;
