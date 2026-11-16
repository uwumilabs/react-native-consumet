import { type ExtractorContext, type IVideo, type ISource } from '../models';
import type { PolyURL } from '../utils/url-polyfill';
import { hlsVariants } from './hls';
import { toUrl } from './url';

/**
 * MegaCloud, the player of HiAnime and HiMovies.
 * Thanks to https://github.com/yogesh-hacker for the original implementation.
 */
export function MegaCloud(ctx: ExtractorContext) {
  const { axios, load, USER_AGENT, PolyURL } = ctx;

  /** The key getSources wants: one 48-character token in the embed page, or three 16-character ones joined. */
  function findNonce(embedPage: string): string | undefined {
    const whole = embedPage.match(/\b[a-zA-Z0-9]{48}\b/)?.[0];
    if (whole) return whole;
    const parts = embedPage.match(/\b([a-zA-Z0-9]{16})\b[\s\S]*?\b([a-zA-Z0-9]{16})\b[\s\S]*?\b([a-zA-Z0-9]{16})\b/);
    return parts?.slice(1).join('');
  }

  /** @param referer the site that embeds the player */
  const extract = async (videoUrl: string | PolyURL, referer: string): Promise<ISource> => {
    const embedUrl = toUrl(PolyURL, videoUrl);
    const headers = {
      'Accept': '*/*',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': referer,
      'User-Agent': USER_AGENT,
    };

    const { data: embedPage } = await axios.get(embedUrl.href, { headers });
    const player = load(embedPage)('[id$="-player"]');
    if (!player.length) throw new Error('[MegaCloud] The embed page has no player; the URL may have expired');
    const nonce = findNonce(embedPage);
    if (!nonce) throw new Error('[MegaCloud] Nonce not found');

    const basePath = embedUrl.pathname.split('/').slice(0, 4).join('/');
    const { data } = await axios.get(
      `${embedUrl.origin}${basePath}/getSources?id=${player.attr('data-id')}&_k=${nonce}`,
      { headers }
    );
    if (data.encrypted) throw new Error('[MegaCloud] The sources are encrypted, which this extractor does not decrypt');

    const sources: IVideo[] = [];
    for (const source of Array.isArray(data.sources) ? data.sources : []) {
      if (source.type !== 'hls') {
        sources.push({ url: source.file, isM3U8: false, quality: 'default' });
        continue;
      }
      sources.push({ url: source.file, isM3U8: true, quality: 'auto' });
      const { data: master } = await axios.get(source.file, {
        headers: { 'Referer': referer, 'User-Agent': USER_AGENT },
      });
      sources.push(...hlsVariants(master, source.file));
    }

    return {
      sources,
      // The stream plays inside the embed page, so a player sends that page as the Referer.
      headers: { Referer: embedUrl.href },
      subtitles:
        data.tracks?.map((track: { file: string; label?: string; kind: string }) => ({
          url: track.file,
          lang: track.label || track.kind,
        })) ?? [],
      intro: data.intro ?? { start: 0, end: 0 },
      outro: data.outro ?? { start: 0, end: 0 },
    };
  };

  return { extract };
}
