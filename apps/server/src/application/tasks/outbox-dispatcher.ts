import type { Logger } from 'pino';
import type { DomainEvent } from '../../domain/shared/domain-event.ts';
import type { Clock } from '../../infrastructure/shared/clock.ts';
import type { OutboxRepository } from '../../infrastructure/shared/outbox-repository.ts';

export type EventHandlers = {
  [K in DomainEvent['type']]: (event: Extract<DomainEvent, { type: K }>) => Promise<void>;
};

export interface OutboxDispatcher {
  /** Dispatches pending events in id order; a throwing handler leaves its event pending and stops the batch. */
  dispatchPending(): Promise<void>;
  start(intervalMs: number): void;
  /** Waits for an in-flight batch. */
  stop(): Promise<void>;
}

export function createOutboxDispatcher(
  _outbox: OutboxRepository,
  _handlers: EventHandlers,
  _clock: Clock,
  _logger: Logger,
): OutboxDispatcher {
  let timer: NodeJS.Timeout | undefined;
  let inFlight: Promise<void> = Promise.resolve();
  const dispatchPending = (): Promise<void> => Promise.resolve();
  return {
    dispatchPending,
    start: (intervalMs) => {
      timer = setInterval(() => {
        inFlight = inFlight.then(dispatchPending);
      }, intervalMs);
    },
    stop: () => {
      clearInterval(timer);
      return inFlight;
    },
  };
}
