import { type Chunk, chunkAt, type Lineup, publishedCount } from './lineup.ts';

export const WINDOW_SIZE = 6;
export const TARGET_DURATION_S = 6;

export interface LivePlaylist {
  readonly mediaSequence: number;
  readonly discontinuitySequence: number;
  readonly chunks: readonly Chunk[];
  readonly ended: boolean;
  readonly start: Date;
}

/** undefined until the first chunk is published (incl. before start). */
export function livePlaylist(lineup: Lineup, start: Date, now: Date): LivePlaylist | undefined {
  const count = publishedCount(lineup, now.getTime() - start.getTime());
  const chunks = Array.from({ length: count }, (_, position) => chunkAt(lineup, position)).filter(
    (chunk) => chunk !== undefined,
  );
  return { mediaSequence: chunks[0]?.position ?? 0, discontinuitySequence: 0, chunks, ended: false, start };
}

/** EXTINF as (ms/1000).toFixed(3); PROGRAM-DATE-TIME on the first chunk. */
export function renderLivePlaylist(playlist: LivePlaylist): string {
  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-TARGETDURATION:${TARGET_DURATION_S}`,
    '#EXT-X-INDEPENDENT-SEGMENTS',
    `#EXT-X-MEDIA-SEQUENCE:${playlist.mediaSequence}`,
    `#EXT-X-DISCONTINUITY-SEQUENCE:${playlist.discontinuitySequence}`,
    ...playlist.chunks.flatMap((chunk, index) => chunkLines(chunk, index, playlist.start)),
  ];
  return `${lines.join('\n')}\n`;
}

function chunkLines(chunk: Chunk, index: number, start: Date): string[] {
  return [
    ...(index === 0 ? [`#EXT-X-PROGRAM-DATE-TIME:${programDateTime(chunk, start)}`] : []),
    `#EXTINF:${(chunk.durationMs / 1000).toFixed(3)},`,
    chunk.uri,
  ];
}

function programDateTime(chunk: Chunk, start: Date): string {
  return new Date(start.getTime() + chunk.startMs).toISOString();
}
