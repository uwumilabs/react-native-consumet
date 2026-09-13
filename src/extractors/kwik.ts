import { type ExtractorContext, type IVideo, type ISource, type IVideoExtractor } from '../models';
import type { PolyURL } from '../utils/url-polyfill';

/**
 * Kwik extractor function
 * @param ctx ExtractorContext containing axios, load, USER_AGENT
 * @returns Object with extract method implementing IVideoExtractor interface
 */
export function Kwik(ctx: ExtractorContext): IVideoExtractor {
  const serverName = 'kwik';
  const sources: IVideo[] = [];
  const { load, USER_AGENT, NativeConsumet } = ctx;

  const ua =
    USER_AGENT ||
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36';

  function unpackPacked(packed: string): string | null {
    const re =
      /\beval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)\s*\{[\s\S]+?\}\s*\(\s*'([\s\S]+?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]+?)'\s*\.split\s*\(\s*'(.+?)'\s*\)/;

    const m = packed.match(re);
    if (!m) return null;

    const encoded = m[1]!;
    const base = parseInt(m[2]!, 10);
    const count = parseInt(m[3]!, 10);
    const words = m[4]!.split(m[5]!);

    function decode(n: number): string {
      const prefix = n < base ? '' : decode(Math.floor(n / base));
      const rem = n % base;
      return prefix + (rem > 35 ? String.fromCharCode(rem + 29) : rem.toString(36));
    }

    let result = encoded;
    for (let i = count - 1; i >= 0; i--) {
      const word = words[i];
      if (word) result = result.replace(new RegExp(`\\b${decode(i)}\\b`, 'g'), word);
    }

    return result;
  }

  // @ts-ignore
  const extract = async (videoUrl: PolyURL, referer = 'https://animepahe.ru/'): Promise<ISource> => {
    const kwikUrl = typeof videoUrl === 'string' ? videoUrl : (videoUrl as any).href;
    const kwikHost = kwikUrl.match(/^https?:\/\/([^/]+)/)?.[1] ?? 'kwik.cx';

    const { html } = await NativeConsumet.makeGetRequestWithWebView(kwikUrl, {
      'Referer': referer,
      'User-Agent': ua,
    });

    const $ = load(html);
    let packedScript: string | null = null;

    $('script').each((_, el) => {
      const text = $(el).html() ?? '';
      if (text.includes('eval(function(p,a,c,k,e,')) {
        packedScript = text;
        return false;
      }
    });

    if (!packedScript) {
      const m = html.match(/eval\(function\(p,a,c,k,e,[dr]\)[\s\S]+?\.split\(['"]\|['"]\)[\s\S]+?\)/);
      packedScript = m?.[0] ?? null;
    }

    if (!packedScript) throw new Error('[Kwik] No packed script found');

    const unpacked = unpackPacked(packedScript);
    if (!unpacked) throw new Error('[Kwik] Failed to unpack script');

    const sourceMatch =
      unpacked.match(/const\s+source\s*=\s*'([^']+)'/) ||
      unpacked.match(/const\s+source\s*=\s*"([^"]+)"/) ||
      unpacked.match(/['"]?(https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);

    if (!sourceMatch?.[1]) throw new Error('[Kwik] No source URL found');

    const m3u8 = sourceMatch[1];

    return {
      sources: [{ url: m3u8, isM3U8: m3u8.includes('.m3u8') }],
      headers: { Referer: `https://${kwikHost}/` },
    };
  };

  return { serverName, sources, extract };
}

export default Kwik;
