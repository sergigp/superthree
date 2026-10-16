export interface Clip {
  readonly id: string;
  readonly chunkDurationsMs: readonly number[];
}

export interface Lineup {
  readonly once: readonly Clip[];
  readonly loop: readonly Clip[];
}

export interface Chunk {
  readonly position: number;
  readonly clipId: string;
  readonly chunkIndex: number;
  readonly occurrence: number;
  readonly isClipStart: boolean;
  readonly startMs: number;
  readonly durationMs: number;
  readonly uri: string;
}

export function defaultLineup(a: Clip, b: Clip, card: Clip): Lineup {
  return { once: [a, b], loop: [card] };
}

export function endingLineup(a: Clip, b: Clip): Lineup {
  return { once: [a, b], loop: [] };
}

/** Chunk at a position; undefined past the end of a finite lineup. */
export function chunkAt(_lineup: Lineup, _position: number): Chunk | undefined {
  return undefined;
}

/** Number of chunks whose end <= elapsedMs (capped at total for a finite lineup; 0 when elapsedMs < 0). */
export function publishedCount(_lineup: Lineup, _elapsedMs: number): number {
  return 0;
}
