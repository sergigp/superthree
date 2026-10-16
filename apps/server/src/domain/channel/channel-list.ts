/** One `#EXTINF:-1` entry named Superthree -> `http://${host}/tv/live.m3u8`. */
export function renderChannelList(host: string): string {
  return `#EXTM3U\n#EXTINF:-1,Superthree\nhttp://${host}/tv/live.m3u8\n`;
}
