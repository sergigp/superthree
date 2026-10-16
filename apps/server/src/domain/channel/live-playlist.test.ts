import fc from 'fast-check';
import { expect, it } from 'vitest';
import { type Chunk, chunkAt, type Clip, type Lineup, publishedCount } from './lineup.ts';
import { type LivePlaylist, livePlaylist, WINDOW_SIZE } from './live-playlist.ts';

it('should map each position to the same chunk in every playlist', () => {
  fc.assert(
    fc.property(scenario(), ({ lineup, start, t1, t2 }) => {
      const first = livePlaylist(lineup, start, at(start, t1));
      const second = livePlaylist(lineup, start, at(start, t2));

      const shared = (first?.chunks ?? []).filter((chunk) => second?.chunks.some((other) => other.position === chunk.position));
      expect(shared.map((chunk) => stableView(second, chunk.position))).toEqual(
        shared.map((chunk) => stableView(first, chunk.position)),
      );
    }),
    { numRuns: 1000 },
  );
});

it('should never move sequence numbers backwards', () => {
  fc.assert(
    fc.property(scenario(), ({ lineup, start, t1, t2 }) => {
      const first = livePlaylist(lineup, start, at(start, t1));
      const second = livePlaylist(lineup, start, at(start, t2));

      expect(first === undefined || isNotBehind(second, first)).toBe(true);
    }),
  );
});

it('should list consecutive positions up to the window size', () => {
  fc.assert(
    fc.property(scenario(), ({ lineup, start, t1 }) => {
      const playlist = livePlaylist(lineup, start, at(start, t1));

      const count = publishedCount(lineup, t1);
      const length = Math.min(WINDOW_SIZE, count);
      const positions = Array.from({ length }, (_, index) => count - length + index);
      expect(
        playlist && { mediaSequence: playlist.mediaSequence, positions: playlist.chunks.map((chunk) => chunk.position) },
      ).toEqual(count === 0 ? undefined : { mediaSequence: positions[0], positions });
    }),
  );
});

it('should follow the clock', () => {
  fc.assert(
    fc.property(
      scenario().filter(({ lineup, start, t1 }) => livePlaylist(lineup, start, at(start, t1)) !== undefined),
      ({ lineup, start, t1 }) => {
        const playlist = livePlaylist(lineup, start, at(start, t1));

        const last = playlist?.chunks.at(-1);
        const next = last && chunkAt(lineup, last.position + 1);
        const totalChunks = lineup.once.flatMap((clip) => clip.chunkDurationsMs).length;
        expect({
          lastIsPublished: last !== undefined && endOf(last) <= t1,
          nextIsUnpublished: next === undefined || endOf(next) > t1,
          ended: playlist?.ended,
        }).toEqual({
          lastIsPublished: true,
          nextIsUnpublished: true,
          ended: lineup.loop.length === 0 && last?.position === totalChunks - 1,
        });
      },
    ),
  );
});

it('should agree with a naive expansion of the lineup', () => {
  fc.assert(
    fc.property(lineupArbitrary(), (lineup) => {
      const expected = naiveExpansion(lineup, 3);

      const positions = Array.from({ length: expected.length }, (_, position) => position);
      expect({
        chunks: positions.map((position) => chunkAt(lineup, position)),
        pastFiniteEnd: lineup.loop.length === 0 ? chunkAt(lineup, expected.length) : undefined,
      }).toEqual({ chunks: expected, pastFiniteEnd: undefined });
    }),
  );
});

interface Scenario {
  readonly lineup: Lineup;
  readonly start: Date;
  readonly t1: number;
  readonly t2: number;
}

/** A lineup, a start and two elapsed times t1 <= t2 spanning the `once` part and a few loop periods. */
function scenario(): fc.Arbitrary<Scenario> {
  return lineupArbitrary().chain((lineup) => {
    const horizonMs = totalMs(lineup.once) + 3 * totalMs(lineup.loop) + 10_000;
    return fc
      .record({
        lineup: fc.constant(lineup),
        start: fc.date({ min: new Date('2000-01-01T00:00:00.000Z'), max: new Date('2100-01-01T00:00:00.000Z'), noInvalidDate: true }),
        t1: fc.integer({ min: -10_000, max: horizonMs }),
        // Mostly close enough for the two windows to share positions.
        deltaMs: fc.oneof(fc.integer({ min: 0, max: 40_000 }), fc.integer({ min: 0, max: horizonMs })),
      })
      .map(({ deltaMs, ...rest }) => ({ ...rest, t2: rest.t1 + deltaMs }));
  });
}

function lineupArbitrary(): fc.Arbitrary<Lineup> {
  return fc.record({
    once: fc.array(clipArbitrary(), { minLength: 1, maxLength: 3 }),
    loop: fc.array(clipArbitrary(), { minLength: 0, maxLength: 3 }),
  });
}

function clipArbitrary(): fc.Arbitrary<Clip> {
  return fc.record({
    id: fc.constantFrom('ep-a', 'ep-b', 'card'),
    chunkDurationsMs: fc.array(fc.integer({ min: 1, max: 6000 }), { minLength: 1, maxLength: 20 }),
  });
}

function totalMs(clips: readonly Clip[]): number {
  return clips.flatMap((clip) => clip.chunkDurationsMs).reduce((total, durationMs) => total + durationMs, 0);
}

function at(start: Date, elapsedMs: number): Date {
  return new Date(start.getTime() + elapsedMs);
}

/** What a player must see identically for a position: its media, timing and effective discontinuity number. */
function stableView(playlist: LivePlaylist | undefined, position: number) {
  const chunks = playlist?.chunks ?? [];
  const index = chunks.findIndex((chunk) => chunk.position === position);
  const chunk = chunks[index];
  return {
    uri: chunk?.uri,
    durationMs: chunk?.durationMs,
    isClipStart: chunk?.isClipStart,
    startMs: chunk?.startMs,
    discontinuity: (playlist?.discontinuitySequence ?? 0) + chunks.slice(0, index + 1).filter(hasDiscontinuity).length,
  };
}

/** Airs `once`, then `loop` the given number of times, chunk by chunk. */
function naiveExpansion(lineup: Lineup, loops: number): Chunk[] {
  const clips = [...lineup.once, ...Array.from({ length: loops }, () => lineup.loop).flat()];
  const chunks: Chunk[] = [];
  let startMs = 0;
  clips.forEach((clip, occurrence) => {
    clip.chunkDurationsMs.forEach((durationMs, chunkIndex) => {
      chunks.push({
        position: chunks.length,
        clipId: clip.id,
        chunkIndex,
        occurrence,
        isClipStart: chunkIndex === 0,
        startMs,
        durationMs,
        uri: `media/${clip.id}/seg_${String(chunkIndex).padStart(4, '0')}.ts`,
      });
      startMs += durationMs;
    });
  });
  return chunks;
}

function isNotBehind(later: LivePlaylist | undefined, earlier: LivePlaylist): boolean {
  return (
    later !== undefined &&
    later.mediaSequence >= earlier.mediaSequence &&
    later.discontinuitySequence >= earlier.discontinuitySequence
  );
}

function endOf(chunk: Chunk): number {
  return chunk.startMs + chunk.durationMs;
}

function hasDiscontinuity(chunk: Chunk): boolean {
  return chunk.isClipStart && chunk.position > 0;
}
