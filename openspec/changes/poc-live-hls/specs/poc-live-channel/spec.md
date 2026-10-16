## Purpose

A proof-of-concept live TV channel whose HLS playlist is derived only from the clock and a hardcoded lineup, used to validate that tvOS IPTV apps play it and cross the seams between videos cleanly.

## ADDED Requirements

### Requirement: Channel list
The system SHALL respond to `GET /tv/superthree.m3u` with an extended M3U containing exactly one channel named `Superthree` whose URL is the absolute `http://<host>/tv/live.m3u8`, where `<host>` is the request's `Host` header.

#### Scenario: App fetches the channel list
- **WHEN** a client requests `/tv/superthree.m3u` with `Host: 192.168.1.10:8080`
- **THEN** the system responds `200` with an `#EXTM3U` body containing one `#EXTINF:-1` entry named `Superthree` and the URL `http://192.168.1.10:8080/tv/live.m3u8`

### Requirement: Lineup timeline
The channel SHALL air its lineup back to back from the start time: in the default lineup, episode A once, then episode B once, then the test card repeated forever. Each chunk SHALL occupy exactly its real duration on the timeline, taken from the clip's source playlist, including a shorter final chunk. Channel positions SHALL number every aired chunk consecutively from 0 at the start time.

#### Scenario: Short last chunk keeps real duration
- **WHEN** episode A's last chunk lasts 2.040 s
- **THEN** episode B's first chunk starts on the timeline exactly 2.040 s after A's last chunk starts

#### Scenario: Card loops forever
- **WHEN** the clock is any time after the end of episode B
- **THEN** the chunk at that time belongs to a repeat of the test card

### Requirement: Live playlist
The system SHALL respond to `GET /tv/live.m3u8` with a media playlist computed from the current time only, with no stored state, served as `application/vnd.apple.mpegurl` with `Cache-Control: no-cache`. It SHALL contain `#EXT-X-VERSION:3`, `#EXT-X-TARGETDURATION:6`, `#EXT-X-INDEPENDENT-SEGMENTS`, and the last 6 published chunks (fewer if fewer have been published). A chunk is published once its end on the timeline is at or before the current time. Each chunk SHALL carry its real duration in `#EXTINF` with millisecond precision.

#### Scenario: Window of the last 6 chunks
- **WHEN** 10 chunks have been published
- **THEN** the playlist lists positions 4 to 9 in order

#### Scenario: Just after the start time
- **WHEN** only 2 chunks have been published
- **THEN** the playlist lists positions 0 and 1 with `#EXT-X-MEDIA-SEQUENCE:0`

#### Scenario: No end tag while looping
- **WHEN** the default lineup is airing
- **THEN** the playlist never contains `#EXT-X-ENDLIST`

### Requirement: Sequence numbers
`#EXT-X-MEDIA-SEQUENCE` SHALL be the channel position of the first chunk in the window and SHALL never decrease as time advances. `#EXT-X-DISCONTINUITY` SHALL precede the first chunk of every lineup clip, including each repeat of the card, except position 0. `#EXT-X-DISCONTINUITY-SEQUENCE` SHALL equal the number of discontinuity tags on positions before the window.

#### Scenario: Position is stable across playlists
- **WHEN** a position appears in the playlists returned at two different times
- **THEN** it has the same URI, the same duration, the same discontinuity tag, and the same discontinuity sequence number in both

#### Scenario: Window starts on an clip boundary
- **WHEN** the first chunk in the window is the first chunk of episode B
- **THEN** that chunk is preceded by `#EXT-X-DISCONTINUITY` and `#EXT-X-DISCONTINUITY-SEQUENCE` is `0`

### Requirement: Program date-time
The playlist SHALL tag the first chunk of the window and every chunk after a discontinuity with `#EXT-X-PROGRAM-DATE-TIME` set to that chunk's wall-clock start (UTC, millisecond precision).

#### Scenario: Wall clock of the window
- **WHEN** the first chunk in the window starts 12.000 s after a start time of `2026-10-16T18:00:00.000Z`
- **THEN** it is tagged `#EXT-X-PROGRAM-DATE-TIME:2026-10-16T18:00:12.000Z`

### Requirement: Start time
The start time SHALL be a constant, overridable only by a literal ISO-8601 timestamp in `POC_START`, so restarting the server never moves the channel. Until the first chunk is published (before the start time plus the first chunk's duration), `GET /tv/live.m3u8` SHALL respond `503`.

#### Scenario: Restart keeps the place
- **WHEN** the server restarts with the same configuration
- **THEN** a playlist requested at time T is identical to the one it would have served at T before the restart

#### Scenario: Before the start time
- **WHEN** `/tv/live.m3u8` is requested before the start time
- **THEN** the system responds `503`

#### Scenario: During the first chunk
- **WHEN** `/tv/live.m3u8` is requested 3 s after the start time and the first chunk lasts 6 s
- **THEN** the system responds `503`

### Requirement: End variant
With `POC_LINEUP=ends`, the lineup SHALL be episode A then episode B with no card. Once B's last chunk is published, the playlist SHALL stay frozen on its final 6 chunks and end with `#EXT-X-ENDLIST`.

#### Scenario: After the broadcast ends
- **WHEN** `POC_LINEUP=ends` and the clock is past the end of episode B
- **THEN** the playlist lists B's last 6 chunks followed by `#EXT-X-ENDLIST`, whatever the time

### Requirement: Chunk serving
The system SHALL serve `GET /tv/media/<clip>/<file>.ts` from the media directory as `video/mp2t`, and respond `404` when the file does not exist, without ever reading outside the media directory.

#### Scenario: Existing chunk
- **WHEN** a client requests `/tv/media/card/seg_0002.ts`
- **THEN** the system responds `200` with `Content-Type: video/mp2t` and the file's bytes

#### Scenario: Missing chunk
- **WHEN** a client requests `/tv/media/card/seg_9999.ts`
- **THEN** the system responds `404`

#### Scenario: Path traversal
- **WHEN** a client requests `/tv/media/..%2F..%2Fpackage.json`
- **THEN** the system responds `404`

### Requirement: Channel namespace
All channel routes SHALL live under `/tv` and take precedence over the web app: an unknown `/tv/*` path SHALL respond `404` and never the web app's page. The channel SHALL be available only when a media directory is configured; without one, every `/tv/*` path SHALL respond `404` and the rest of the app SHALL behave as before.

#### Scenario: Channel alongside the web app
- **WHEN** the web app is served and a client requests `/tv/live.m3u8`
- **THEN** the system responds with the live playlist, not the web app's page

#### Scenario: Unknown channel path
- **WHEN** a client requests `/tv/nope`
- **THEN** the system responds `404`

#### Scenario: No media directory
- **WHEN** no media directory is configured and a client requests `/tv/live.m3u8`
- **THEN** the system responds `404`
