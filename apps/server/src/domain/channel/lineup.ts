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

/** Chunk at a position; undefined past the end of a finite lineup. Closed form: prefix sums over `once`, modulo over `loop`. */
export function chunkAt(lineup: Lineup, position: number): Chunk | undefined {
  const once = expand(lineup.once);
  if (position < once.length) {
    return once[position];
  }
  const period = expand(lineup.loop);
  const offset = position - once.length;
  const chunk = period[offset % period.length];
  if (chunk === undefined) {
    return undefined;
  }
  const repeat = Math.floor(offset / period.length);
  return {
    ...chunk,
    position,
    occurrence: lineup.once.length + repeat * lineup.loop.length + chunk.occurrence,
    startMs: endMs(once) + repeat * endMs(period) + chunk.startMs,
  };
}

/** Number of chunks whose end <= elapsedMs (capped at total for a finite lineup; 0 when elapsedMs < 0). */
export function publishedCount(lineup: Lineup, elapsedMs: number): number {
  const once = expand(lineup.once);
  const period = expand(lineup.loop);
  if (elapsedMs < endMs(once) || period.length === 0) {
    return countEndedBy(once, elapsedMs);
  }
  const loopElapsedMs = elapsedMs - endMs(once);
  const repeats = Math.floor(loopElapsedMs / endMs(period));
  return once.length + repeats * period.length + countEndedBy(period, loopElapsedMs - repeats * endMs(period));
}

/** Lays clips back to back from position 0, occurrence 0 and offset 0. */
function expand(clips: readonly Clip[]): readonly Chunk[] {
  return clips.reduce<readonly Chunk[]>(
    (chunks, clip, occurrence) => [...chunks, ...clipChunks(clip, occurrence, chunks.length, endMs(chunks))],
    [],
  );
}

function clipChunks(clip: Clip, occurrence: number, firstPosition: number, clipStartMs: number): readonly Chunk[] {
  return clip.chunkDurationsMs.map((durationMs, chunkIndex) => ({
    position: firstPosition + chunkIndex,
    clipId: clip.id,
    chunkIndex,
    occurrence,
    isClipStart: chunkIndex === 0,
    startMs: clipStartMs + sum(clip.chunkDurationsMs.slice(0, chunkIndex)),
    durationMs,
    uri: `media/${clip.id}/seg_${String(chunkIndex).padStart(4, '0')}.ts`,
  }));
}

function countEndedBy(chunks: readonly Chunk[], elapsedMs: number): number {
  return chunks.filter((chunk) => chunk.startMs + chunk.durationMs <= elapsedMs).length;
}

function endMs(chunks: readonly Chunk[]): number {
  const last = chunks.at(-1);
  return last === undefined ? 0 : last.startMs + last.durationMs;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
