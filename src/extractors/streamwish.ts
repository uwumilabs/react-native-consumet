import { type ExtractorContext, type ISource, type ISubtitle } from '../models';
import type { PolyURL } from '../utils/url-polyfill';
import { hlsVariants } from './hls';
import { unpackScripts } from './packer';
import { toUrl } from './url';

const M3U8_URL = /https?:\/\/[^"]+?\.m3u8[^"]*/;

export function StreamWish(ctx: ExtractorContext) {
  const { axios, USER_AGENT, PolyURL } = ctx;

  const extract = async (videoUrl: string | PolyURL, referer?: string): Promise<ISource> => {
    const url = toUrl(PolyURL, videoUrl);
    const options = {
      headers: {
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': '*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
        'Priority': 'u=0, i',
        'Origin': url.origin,
        'Referer': referer ?? url.origin,
        'Sec-Ch-Ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': 'Windows',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': USER_AGENT,
      },
    };
    const { data } = await axios.get(url.href, options);

    // Adapted from Zenda-Cross (https://github.com/Zenda-Cross/vega-app/blob/main/src/lib/providers/multi/multiGetStream.ts).
    // Thank you to Zenda-Cross for the original implementation.
    const player = unpackScripts(data).find((code) => M3U8_URL.test(code));
    const link = player?.match(M3U8_URL)?.[0];
    if (!player || !link) throw new Error('[StreamWish] No m3u8 link found');

    const subtitleMatches = player.match(/{file:"([^"]+)",(label:"([^"]+)",)?kind:"(thumbnails|captions)"/g) ?? [];
    const subtitles: ISubtitle[] = subtitleMatches.map((sub) => {
      const lang = sub.match(/label:"([^"]+)"/)?.[1] ?? '';
      const file = sub.match(/file:"([^"]+)"/)?.[1] ?? '';
      const kind = sub.match(/kind:"([^"]+)"/)?.[1] ?? '';
      return kind.includes('thumbnail') ? { lang: kind, url: `https://streamwish.com${file}` } : { lang, url: file };
    });

    const master = new PolyURL(link);
    master.searchParams.set('i', '0.4');
    const { data: playlist } = await axios.get(master.href, options);

    return {
      sources: [{ quality: 'default', url: master.href, isM3U8: true }, ...hlsVariants(playlist, master.href)],
      subtitles,
    };
  };

  return { extract };
}
