import { serveStatic } from '@hono/node-server/serve-static';
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

/** Mounted at /tv. /media/* is serveStatic over mediaDir (`.ts` served as video/mp2t); misses fall through to the app's /tv/* 404. */
export function createChannelRoutes({ lineup, start, clock, mediaDir }: ChannelOptions) {
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
    .get('/media/*', serveStatic({ root: mediaDir, rewriteRequestPath: (path) => path.replace(/^\/tv\/media/, '') }));
}
