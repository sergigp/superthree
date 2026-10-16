import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Clip } from '../../domain/channel/lineup.ts';

export interface VodPlaylistReader {
  /** Throws if the clip's index.m3u8 is missing or unparseable. */
  read(clipId: string): Promise<Clip>;
}

/** Reads `<mediaDir>/<clipId>/index.m3u8` as ffmpeg writes it: `#EXTINF:<seconds>,` followed by a file name. */
export function createFsVodPlaylistReader(mediaDir: string): VodPlaylistReader {
  return {
    read: async (clipId) => {
      const playlist = await readFile(join(mediaDir, clipId, 'index.m3u8'), 'utf8');
      return { id: clipId, chunkDurationsMs: parseChunkDurationsMs(clipId, playlist) };
    },
  };
}

function parseChunkDurationsMs(clipId: string, playlist: string): number[] {
  const durationsMs = playlist
    .split('\n')
    .filter((line) => line.startsWith('#EXTINF:'))
    .map((line) => Math.round(Number.parseFloat(line.slice('#EXTINF:'.length)) * 1000));
  if (durationsMs.length === 0 || durationsMs.some((durationMs) => !Number.isFinite(durationMs) || durationMs <= 0)) {
    throw new Error(`Unparseable VOD playlist for clip ${clipId}`);
  }
  return durationsMs;
}
