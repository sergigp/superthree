import type { Chunk, Lineup } from './lineup.ts';

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
export function livePlaylist(_lineup: Lineup, _start: Date, _now: Date): LivePlaylist | undefined {
  return undefined;
}

export function renderLivePlaylist(_playlist: LivePlaylist): string {
  return '';
}
