## Why

Superthree's core bet is that an IPTV app on the Apple TV will play a live HLS playlist computed purely from the clock, and get through the seams between videos (where timestamps reset) without freezing or desyncing. POC 1 validates that protocol on the Mac before any scheduling, storage or UI work builds on it. It is built inside the existing server architecture so the protocol work carries over to the real playout instead of being thrown away.

## What Changes

- New `channel` slice in the existing server: pure playout functions in `domain/channel/`, a Hono `channel` sub-router mounted at `/tv` in the existing app (same process, same port 8080, listening on `0.0.0.0`), registered before the SPA fallback with a `/tv/*` 404 guard.
- Hardcoded lineup: episode A once, episode B once, then the 30 s test card on loop forever, from a fixed start time (`POC_START` overrides it with a literal ISO timestamp).
- Variant `POC_LINEUP=ends`: A then B, then the playlist freezes on its final window with `#EXT-X-ENDLIST`.
- Chunk durations come from parsing each clip's ffmpeg VOD `index.m3u8` at boot (real durations, including the short last chunk).
- `GET /tv/superthree.m3u`: one-channel IPTV list pointing to an absolute `/tv/live.m3u8` URL built from the request's `Host` header.
- `GET /tv/live.m3u8`: computed on each request by a pure function `(lineup, start, now) -> playlist` (sliding window of the last 6 published chunks, media/discontinuity sequence numbers, discontinuity at every clip start, program date-time). Returns 503 until the first chunk is published.
- `GET /tv/media/<clip>/seg_NNNN.ts`: chunk files served statically from `MEDIA_DIR`.
- The channel is opt-in: mounted only when `MEDIA_DIR` is set; otherwise the app behaves exactly as today.

### Shortcuts (to list in the PR description)

- Lineup, clip ids (`ep-a`, `ep-b`, `card`) and start time are hardcoded; the only overrides are the `POC_START` and `POC_LINEUP` env vars.
- Media lives in a local, gitignored `sample/` pointed to by `MEDIA_DIR`; the channel is simply not mounted when it is unset. Temporary: media storage will move with real ingest.
- The end-to-end check depends on `sample/`; unit tests do not.
- No link to `Show` or SQLite: the lineup is built in `main.ts`, not from a stored schedule.
- No master playlist (no `CODECS`/`RESOLUTION`/bandwidth variants); IPTV apps open the media playlist directly.
- No caching headers on chunks, no CORS.
- Assumes a monotonic wall clock: a backwards NTP step could move `MEDIA-SEQUENCE` backwards.
- 503 before the first chunk instead of a pre-show card.
- The VOD `index.m3u8` parser handles only what ffmpeg emits (`#EXTINF:<seconds>,` followed by a file name).
- Every playlist poll and chunk request is logged at info level by the existing request logger (~20 lines/min per TV).

## Capabilities

### New Capabilities
- `poc-live-channel`: the clock-driven live HLS channel: lineup, live playlist rules, channel list, chunk serving, start time and end variant.

### Modified Capabilities

## Impact

- New code in `apps/server/src/domain/channel/`, `application/http/channel.ts`, `infrastructure/client/`; changes to `application/http/app.ts`, `config.ts`, `main.ts`. Existing routes and tests keep their behaviour.
- New env vars:
  - `MEDIA_DIR`: directory holding one sub-directory per clip (`ep-a`, `ep-b`, `card`), each with ffmpeg's `index.m3u8` and `seg_NNNN.ts` files. Unset = channel not mounted.
  - `POC_START`: the instant the channel went on air (literal ISO-8601, default `2026-10-16T00:00:00Z`). Everything aired is computed from `now - POC_START`; set it a few minutes before a seam to test that seam without waiting. Must be a literal, never computed at launch, or a restart moves the channel.
  - `POC_LINEUP`: which hardcoded lineup airs. `loop` (default): A, B, then the card forever. `ends`: A, B, then the broadcast ends with `#EXT-X-ENDLIST`.
- No new dependencies (Vitest and fast-check are already root dev dependencies; static serving uses `@hono/node-server`'s `serveStatic`, already used for the SPA).
- Manual verification needs `sample/` on the Mac, ffmpeg, and optionally Apple's `mediastreamvalidator`.
