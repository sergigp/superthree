import { randomUUID } from 'node:crypto';

/** Generates UUIDs. */
export interface IdGenerator {
  next(): string;
}

export const randomIds: IdGenerator = { next: () => randomUUID() };

export function sequentialIds(): IdGenerator {
  let counter = 0;
  return {
    next: () => {
      counter += 1;
      return `00000000-0000-4000-8000-${counter.toString().padStart(12, '0')}`;
    },
  };
}
