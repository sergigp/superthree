import type { Clip } from '../../domain/channel/lineup.ts';

export interface VodPlaylistReader {
  /** Throws if the clip's index.m3u8 is missing or unparseable. */
  read(clipId: string): Promise<Clip>;
}

export function createFsVodPlaylistReader(_mediaDir: string): VodPlaylistReader {
  return {
    read: async (clipId) => ({ id: clipId, chunkDurationsMs: [] }),
  };
}
