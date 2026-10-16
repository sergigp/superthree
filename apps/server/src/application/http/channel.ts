import { Hono } from 'hono';
import type { Lineup } from '../../domain/channel/lineup.ts';
import type { Clock } from '../../infrastructure/shared/clock.ts';

export interface ChannelOptions {
  readonly lineup: Lineup;
  readonly start: Date;
  readonly clock: Clock;
  readonly mediaDir: string;
}

/** Mounted at /tv. /media/* is serveStatic over mediaDir with Content-Type forced to video/mp2t. */
export function createChannelRoutes(_options: ChannelOptions) {
  return new Hono()
    .get('/superthree.m3u', (c) => c.notFound())
    .get('/live.m3u8', (c) => c.notFound())
    .get('/media/*', (c) => c.notFound());
}
