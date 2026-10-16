import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, it } from 'vitest';
import { createFsVodPlaylistReader } from './fs-vod-playlist-reader.ts';

const mediaDir = mkdtempSync(join(tmpdir(), 'superthree-media-'));

afterAll(() => rmSync(mediaDir, { recursive: true, force: true }));

it('should read chunk durations from a VOD playlist', async () => {
  mkdirSync(join(mediaDir, 'ep-a'));
  writeFileSync(
    join(mediaDir, 'ep-a', 'index.m3u8'),
    [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-TARGETDURATION:6',
      '#EXT-X-MEDIA-SEQUENCE:0',
      '#EXT-X-PLAYLIST-TYPE:VOD',
      '#EXTINF:6.000000,',
      'seg_0000.ts',
      '#EXTINF:2.040000,',
      'seg_0001.ts',
      '#EXT-X-ENDLIST',
      '',
    ].join('\n'),
  );
  const reader = createFsVodPlaylistReader(mediaDir);

  const clip = await reader.read('ep-a');

  expect(clip).toEqual({ id: 'ep-a', chunkDurationsMs: [6000, 2040] });
});
