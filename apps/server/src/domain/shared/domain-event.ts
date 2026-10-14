import { z } from 'zod';
import { ShowCreated } from '../show/show-created.ts';

export const DomainEvent = z.discriminatedUnion('type', [ShowCreated]);
export type DomainEvent = z.infer<typeof DomainEvent>;
