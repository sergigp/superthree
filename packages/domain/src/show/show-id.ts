import { z } from 'zod';

export const ShowId = z.uuid().brand('ShowId');
export type ShowId = z.infer<typeof ShowId>;
