## 1. Walking skeleton

- [x] 1.1 Create every file, type and signature from design.md (## Files, ## Types & Signatures), wired end to end: config fields added; `main.ts` reads the clips and passes `channel` to `createApp` when `MEDIA_DIR` is set and binds `0.0.0.0`; `createApp` mounts `/tv` and the `/tv/*` guard before the SPA fallback. Bodies return trivial values (`chunkAt` → `undefined`, `publishedCount` → `0`, `livePlaylist` → `undefined`, renderers → `''`, reader → `{ id, chunkDurationsMs: [] }`, channel routes → `404`). Verify: `pnpm typecheck` succeeds and `pnpm test` passes with no new tests.

## 2. Behaviour (TDD)

- [x] 2.1 `should serve the channel list` — `/tv/superthree.m3u` returns the one-channel M3U pointing to `http://<Host>/tv/live.m3u8`. Verify: test passes.
- [x] 2.2 `should serve the live playlist` — just after start, exact playlist text with positions 0–1, headers, PDT, no ENDLIST. Verify: test passes.
- [x] 2.3 `should slide the window to the last 6 published chunks` — window and `MEDIA-SEQUENCE` follow the clock. Verify: test passes.
- [x] 2.4 `should mark the start of the next clip` — DISCONTINUITY + PDT at A → B, real 2.040 s EXTINF. Verify: test passes.
- [x] 2.5 `should loop the card` — card repeats with a discontinuity each loop and correct `DISCONTINUITY-SEQUENCE`. Verify: test passes.
- [x] 2.6 `should end the broadcast` — ending lineup freezes on B's last chunks with `#EXT-X-ENDLIST`. Verify: test passes.
- [x] 2.7 `should fail to serve the playlist before the first chunk is published` — 503 before start and during the first chunk. Verify: test passes.
- [x] 2.8 `should serve a chunk` — `/tv/media/...` as `video/mp2t` with exact bytes. Verify: test passes.
- [x] 2.9 `should fail to serve a chunk that does not exist` — missing file and traversal → 404. Verify: test passes.
- [x] 2.10 `should route channel paths ahead of the web app` — `/tv/*` never falls to the SPA; no `channel` → 404. Verify: test passes.
- [x] 2.11 `should map each position to the same chunk in every playlist` — fast-check stability property. Verify: test passes.
- [x] 2.12 `should never move sequence numbers backwards` — fast-check monotonicity property. Verify: test passes.
- [x] 2.13 `should list consecutive positions up to the window size` — fast-check window shape property. Verify: test passes.
- [x] 2.14 `should follow the clock` — fast-check live-edge and `ended` property. Verify: test passes.
- [x] 2.15 `should agree with a naive expansion of the lineup` — fast-check oracle property for `chunkAt`. Verify: test passes.
- [x] 2.16 `should keep every chunk within the target duration` — fast-check EXTINF ≤ TARGETDURATION property. Verify: test passes.

## 3. Infrastructure adapters (TDD)

- [ ] 3.1 VOD playlist reader: `should read chunk durations from a VOD playlist` — parses ffmpeg `index.m3u8` into ms durations. Verify: test passes.

## 4. Verification

- [ ] 4.1 End-to-end on the Mac, seam A → B: run `MEDIA_DIR=./sample POC_START=<literal ISO placing the seam ~30 s ahead> scripts/run-local.sh`, then `ffmpeg -v error -i http://127.0.0.1:8080/tv/live.m3u8 -t 120 -f null -`. Verify: no ffmpeg errors; server log shows `ep-b` chunks requested.
- [ ] 4.2 End-to-end on the Mac, seam B → card and one card loop: same with `POC_START` placing the B → card seam ~30 s ahead, `-t 120`. Verify: no ffmpeg errors; at least two card loops requested. Optionally run `mediastreamvalidator` against `/tv/live.m3u8` with no errors.
- [ ] 4.3 Write the PR description listing the shortcuts from proposal.md and the manual Apple TV checklist (plays in the IPTV app and Safari, re-entry lands on the clock, clean seams, 1 h without stalls under `caffeinate -i`, restart keeps the place, `POC_LINEUP=ends` behaviour). Verify: PR description contains both lists.
