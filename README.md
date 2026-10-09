# Superthree

<img width="335" height="314" alt="image" src="https://github.com/user-attachments/assets/cd18b296-d3a2-443a-ad5a-9c259654c76b" />

A self-hosted, broadcast-style TV channel for kids.

A parent builds the schedule; the child just turns on the TV and watches whatever is on. No menus, no thumbnails, no "one more episode" — like a real channel, but with content you picked.

## How it works

1. **Ingest** — Episodes from the video library are pre-segmented into HLS with ffmpeg. The library has mixed formats, so everything is normalised once at ingest; there is no live transcoding.
2. **Schedule** — A web UI lets the parent build the rundown (what plays and when). The schedule is stored in SQLite.
3. **Playout** — From the schedule, the server generates an M3U playlist that any IPTV client can consume. In my setup that is an IPTV app on an Apple TV.

```
 Video library ──► Ingest (ffmpeg → HLS) ──► HLS segments ─┐
                                                          ├──► M3U ──► IPTV client (Apple TV)
 Web UI ──► Schedule (SQLite) ────────────────────────────┘
```

Everything runs in a single Docker container on a Synology NAS, next to the video files.

## Tech stack

- **TypeScript on Node.js**, with a minimalist functional style: `Result`/`Option` types and a thin HTTP layer that understands them. Libraries over frameworks.
- **SQLite** for the schedule and for domain events (outbox pattern)
- **Zod 4** for validation
- **better-result** for typed error handling
- **pino** for logging
- **ffmpeg** for HLS segmentation (CPU by default, Intel Quick Sync optional)
- **Docker** for deployment

## Status

Early stage, built as a proof of concept in phases:

1. One hand-segmented episode served from a Mac to the Apple TV
2. The same, served from a Docker container on the NAS
3. Ingest running inside the container
