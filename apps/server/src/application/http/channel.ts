import { Hono } from 'hono';
import { renderChannelList } from '../../domain/channel/channel-list.ts';
import type { Lineup } from '../../domain/channel/lineup.ts';
import { livePlaylist, renderLivePlaylist } from '../../domain/channel/live-playlist.ts';
import type { Clock } from '../../infrastructure/shared/clock.ts';

export interface ChannelOptions {
  readonly lineup: Lineup;
  readonly start: Date;
  readonly clock: Clock;
  readonly mediaDir: string;
}

/** Mounted at /tv. /media/* is serveStatic over mediaDir with Content-Type forced to video/mp2t. */
export function createChannelRoutes({ lineup, start, clock }: ChannelOptions) {
  return new Hono()
    .get('/superthree.m3u', (c) =>
      c.body(renderChannelList(c.req.header('host') ?? ''), 200, { 'Content-Type': 'audio/x-mpegurl' }),
    )
    .get('/live.m3u8', (c) => {
      const playlist = livePlaylist(lineup, start, clock.now());
      return playlist === undefined
        ? c.json({ error: 'Channel has not started yet' }, 503)
        : c.body(renderLivePlaylist(playlist), 200, {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Cache-Control': 'no-cache',
          });
    })
    .get('/media/*', (c) => c.notFound());
}
