import { type ExtractorContext, type ISource } from '../models';
import type { PolyURL } from '../utils/url-polyfill';
import { M3U8_URL, hlsVariants } from './hls';
import { unpackScripts } from './packer';
import { toUrl } from './url';

export function VidHide(ctx: ExtractorContext) {
  const { axios, USER_AGENT, PolyURL } = ctx;

  const extract = async (videoUrl: string | PolyURL): Promise<ISource> => {
    const url = toUrl(PolyURL, videoUrl);
    const { data } = await axios.get(url.href, {
      headers: { 'User-Agent': USER_AGENT, 'Referer': url.origin },
    });

    // The player setup is packed with Dean Edwards' packer.
    const scripts = unpackScripts(data);
    if (!scripts.length) throw new Error('No packed script found');
    const m3u8Link = scripts.map((code) => code.match(M3U8_URL)?.[0]).find(Boolean);
    if (!m3u8Link) throw new Error('No m3u8 link found');

    const { data: master } = await axios.get(m3u8Link, {
      headers: { 'Referer': m3u8Link, 'User-Agent': USER_AGENT },
    });

    return {
      sources: [{ quality: 'auto', url: m3u8Link, isM3U8: true }, ...hlsVariants(master, m3u8Link)],
      subtitles: [],
    };
  };

  return { extract };
}
