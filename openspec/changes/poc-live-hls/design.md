## Files

All under `apps/server/src/`; reuses `infrastructure/shared/clock.ts` (`Clock`, `systemClock`, `fixedClock`).

- `domain/channel/lineup.ts` — `Clip`, `Lineup`, `Chunk`; pure timeline math (`chunkAt`, `publishedCount`) and the two hardcoded lineups.
- `domain/channel/live-playlist.ts` — `LivePlaylist`; pure `livePlaylist(lineup, start, now)` and `renderLivePlaylist`.
- `domain/channel/live-playlist.test.ts` — fast-check properties on the pure core.
- `domain/channel/channel-list.ts` — pure `renderChannelList(host)`.
- `application/http/channel.ts` — Hono sub-router: `/superthree.m3u`, `/live.m3u8`, static `/media/*`.
- `application/http/channel.test.ts` — acceptance tests through `createApp(..., { channel })` + `app.request`, `fixedClock`, lineups built in the test, temp media dir for chunks.
- `application/http/app.ts` — `AppOptions.channel?`; mounts `/tv` + `/tv/*` 404 guard before the SPA fallback.
- `application/http/app.test.ts` — one test for `/tv` precedence over the SPA.
- `infrastructure/client/fs-vod-playlist-reader.ts` — `VodPlaylistReader` port + fs impl: parses ffmpeg's `index.m3u8` into a `Clip`. Only `main.ts` uses it.
- `infrastructure/client/fs-vod-playlist-reader.test.ts` — against a temp-dir fixture.
- `config.ts` — adds `MEDIA_DIR`, `POC_START`, `POC_LINEUP`.
- `main.ts` — when `MEDIA_DIR` is set: read the 3 clips, build the lineup, pass `channel` to `createApp`; `serve` binds `0.0.0.0`.

## Types & Signatures

```ts
// domain/channel/lineup.ts
export interface Clip {
  readonly id: string;                         // also the media dir name: 'ep-a' | 'ep-b' | 'card'
  readonly chunkDurationsMs: readonly number[]; // non-empty, each 1..6000
}
export interface Lineup {
  readonly once: readonly Clip[];
  readonly loop: readonly Clip[];               // [] = finite lineup (ends after `once`)
}
export interface Chunk {
  readonly position: number;      // channel position = media sequence number
  readonly clipId: string;
  readonly chunkIndex: number;    // index inside the clip's chunk list
  readonly occurrence: number;    // 0-based count of clip airings (A=0, B=1, card#1=2, ...)
  readonly isClipStart: boolean;  // chunkIndex === 0
  readonly startMs: number;       // offset from channel start
  readonly durationMs: number;
  readonly uri: string;           // relative to the playlist: `media/${clipId}/seg_${pad4(chunkIndex)}.ts`
}
export function defaultLineup(a: Clip, b: Clip, card: Clip): Lineup; // { once: [a, b], loop: [card] }
export function endingLineup(a: Clip, b: Clip): Lineup;              // { once: [a, b], loop: [] }
/** Chunk at a position; undefined past the end of a finite lineup. Closed form: prefix sums over `once`, modulo over `loop`. */
export function chunkAt(lineup: Lineup, position: number): Chunk | undefined;
/** Number of chunks whose end <= elapsedMs (capped at total for a finite lineup; 0 when elapsedMs < 0). */
export function publishedCount(lineup: Lineup, elapsedMs: number): number;

// domain/channel/live-playlist.ts
export const WINDOW_SIZE = 6;
export const TARGET_DURATION_S = 6;
export interface LivePlaylist {
  readonly mediaSequence: number;          // chunks[0].position
  readonly discontinuitySequence: number;  // window start W: W === 0 ? 0 : chunkAt(W - 1).occurrence
  readonly chunks: readonly Chunk[];       // 1..WINDOW_SIZE, consecutive positions
  readonly ended: boolean;                 // finite lineup fully published
  readonly start: Date;                    // for PROGRAM-DATE-TIME
}
/** undefined until the first chunk is published (incl. before start). */
export function livePlaylist(lineup: Lineup, start: Date, now: Date): LivePlaylist | undefined;
/** EXTINF as (ms/1000).toFixed(3); DISCONTINUITY before isClipStart && position > 0; PROGRAM-DATE-TIME on first chunk and after each DISCONTINUITY; ENDLIST iff ended. */
export function renderLivePlaylist(playlist: LivePlaylist): string;

// domain/channel/channel-list.ts
/** One `#EXTINF:-1` entry named Superthree -> `http://${host}/tv/live.m3u8`. */
export function renderChannelList(host: string): string;

// application/http/channel.ts
export interface ChannelOptions {
  readonly lineup: Lineup;
  readonly start: Date;
  readonly clock: Clock;
  readonly mediaDir: string;
}
/** Mounted at /tv. /media/* is serveStatic over mediaDir with Content-Type forced to video/mp2t. */
export function createChannelRoutes(options: ChannelOptions): Hono;

// application/http/app.ts
export interface AppOptions {
  webDist?: string;
  channel?: ChannelOptions;   // new
}

// infrastructure/client/fs-vod-playlist-reader.ts
export interface VodPlaylistReader {
  read(clipId: string): Promise<Clip>;     // throws if missing/unparseable
}
export function createFsVodPlaylistReader(mediaDir: string): VodPlaylistReader;

// config.ts — added fields
MEDIA_DIR: z.string().optional(),
POC_START: z.iso.datetime().default('2026-10-16T00:00:00Z').transform((s) => new Date(s)),
POC_LINEUP: z.enum(['loop', 'ends']).default('loop'),
```

## Call Stack

Boot — `main.ts`:
1. `loadConfig(process.env)`
2. if `MEDIA_DIR`: `createFsVodPlaylistReader(MEDIA_DIR).read('ep-a' | 'ep-b' | 'card')` → 3 `Clip`s
3. `POC_LINEUP === 'ends' ? endingLineup(a, b) : defaultLineup(a, b, card)`
4. `createApp(services, logger, { webDist, channel: { lineup, start: POC_START, clock: systemClock, mediaDir: MEDIA_DIR } })`
5. `serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' })`

`createApp` order: logger → `/api/health`, `/api/shows` → onError, notFound → `/api/*` 404 → **if `channel`: `.route('/tv', createChannelRoutes(channel))`** → **`/tv/*` 404** → SPA `serveStatic` + `GET /*` fallback.

`GET /tv/superthree.m3u`:
route → `renderChannelList(c.req.header('host'))` → `200 audio/x-mpegurl`

`GET /tv/live.m3u8`:
route → `clock.now()` → `livePlaylist(lineup, start, now)`
  → `publishedCount(lineup, now - start)` = n; `n === 0` → `undefined`
  → `W = max(0, n - WINDOW_SIZE)`; `chunks = [W, n).map(p => chunkAt(lineup, p))`
  → `discontinuitySequence = W === 0 ? 0 : chunkAt(lineup, W - 1).occurrence`
  → `ended = loop.length === 0 && n === total chunks`
→ `undefined` → `503 { error }`; else `renderLivePlaylist(playlist)` → `200 application/vnd.apple.mpegurl`, `Cache-Control: no-cache`

`GET /tv/media/<clip>/<file>.ts`:
`serveStatic({ root: mediaDir, rewriteRequestPath: strip '/tv/media' })` → found → `200 video/mp2t`; not found / traversal → falls through to `/tv/*` 404.

## Test Plan

### 1. Acceptance — `application/http/channel.test.ts`

App built with `createApp` over an unmigrated database (no show route is called), `fixedClock`, synthetic lineups built in the test (e.g. A = [6000, 6000, 2040], B = [6000, 2040], card = [6000, 6000]), temp media dir with a fake `card/seg_0001.ts`. Assert status + headers + whole body text.

1. `it('should serve the channel list')` — `Host: 192.168.1.10:8080` → 200, `audio/x-mpegurl`, exact M3U with `http://192.168.1.10:8080/tv/live.m3u8`.
2. `it('should serve the live playlist')` — now = start + 12 s → 200, `application/vnd.apple.mpegurl`, `no-cache`, exact text: positions 0–1, `MEDIA-SEQUENCE:0`, `DISCONTINUITY-SEQUENCE:0`, PDT on first chunk, no ENDLIST.
3. `it('should slide the window to the last 6 published chunks')` — exact text for a now with > 6 published chunks.
4. `it('should mark the start of the next clip')` — window spanning A → B: `DISCONTINUITY` + PDT before B's first chunk, A's last chunk as `#EXTINF:2.040,`.
5. `it('should loop the card')` — window spanning card → card: discontinuity on the repeat, `DISCONTINUITY-SEQUENCE` counts tags before the window.
6. `it('should end the broadcast')` — ending lineup, now far past the end → B's last chunks + `#EXT-X-ENDLIST`.
7. `it('should fail to serve the playlist before the first chunk is published')` — now = start − 1 s and start + 3 s → 503.
8. `it('should serve a chunk')` — `/tv/media/card/seg_0001.ts` → 200, `video/mp2t`, exact bytes.
9. `it('should fail to serve a chunk that does not exist')` — missing file and `..%2F` traversal → 404.

`application/http/app.test.ts`:

10. `it('should route channel paths ahead of the web app')` — with `webDist` and `channel`: `/tv/live.m3u8` → playlist; `/tv/nope` → 404; without `channel`: `/tv/live.m3u8` → 404.

### 1b. Properties — `domain/channel/live-playlist.test.ts` (fast-check)

Arbitraries: lineup (`once` 1–3 clips, `loop` 0–3 clips, each clip 1–20 chunks of 1..6000 ms), start, two elapsed times t1 ≤ t2 (0 to several loop periods).

11. `it('should map each position to the same chunk in every playlist')` — positions shared by playlists at t1, t2 have equal `uri`, `durationMs`, `isClipStart`, `startMs` and effective discontinuity number (`discontinuitySequence` + clip starts before it in the window).
12. `it('should never move sequence numbers backwards')` — t1 ≤ t2 ⇒ `mediaSequence` and `discontinuitySequence` non-decreasing.
13. `it('should list consecutive positions up to the window size')` — positions consecutive, length = min(6, n), `mediaSequence = chunks[0].position`.
14. `it('should follow the clock')` — last chunk end ≤ elapsed; next chunk (if any) end > elapsed; `ended` iff finite and all published.
15. `it('should agree with a naive expansion of the lineup')` — `chunkAt(p)` equals iterating `once` then `loop` repeated, chunk by chunk, for p < N.
16. `it('should keep every chunk within the target duration')` — `round(durationMs / 1000) <= 6` for every rendered EXTINF.

### 2. Infrastructure — `infrastructure/client/fs-vod-playlist-reader.test.ts`

Temp dir with an ffmpeg-style `index.m3u8`:

17. `it('should read chunk durations from a VOD playlist')` — `['6.000000', '2.040000']` → `{ id, chunkDurationsMs: [6000, 2040] }`.
