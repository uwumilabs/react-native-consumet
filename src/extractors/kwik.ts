import { type ExtractorContext, type IVideo, type ISource, type IVideoExtractor } from '../models';
import type { PolyURL } from '../utils/url-polyfill';

/**
 * Kwik extractor function
 * @param ctx ExtractorContext; the embed page is loaded through its NativeConsumet WebView
 * @returns Object with extract method implementing IVideoExtractor interface
 */
export function Kwik(ctx: ExtractorContext): IVideoExtractor {
  const serverName = 'kwik';
  const sources: IVideo[] = [];
  const { NativeConsumet } = ctx;

  // One eval(function(p,a,c,k,e,d){...}('payload',base,count,'words'.split('|'))) block.
  const PACKED =
    /\beval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)\s*\{[\s\S]+?\}\s*\(\s*'([\s\S]+?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]+?)'\s*\.split\s*\(\s*'(.+?)'\s*\)/;

  /** The code of one packed block. */
  function unpackPacked(m: RegExpMatchArray): string {
    // The payload is the source of a single-quoted string: undo its escapes (\' and \\).
    const encoded = m[1]!.replace(/\\(['"\\])/g, '$1');
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

  /** The stream URL in a Kwik embed page; the page packs several scripts, only one has it. */
  function findSource(html: string): string | null {
    const packed = new RegExp(PACKED.source, 'g');
    let block: RegExpExecArray | null;
    while ((block = packed.exec(html))) {
      const code = unpackPacked(block);
      const source =
        code.match(/const\s+source\s*=\s*'([^']+)'/) ||
        code.match(/const\s+source\s*=\s*"([^"]+)"/) ||
        code.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
      if (source?.[1]) return source[1];
    }
    return null;
  }

  // @ts-ignore
  const extract = async (videoUrl: PolyURL, referer = 'https://animepahe.ru/'): Promise<ISource> => {
    const kwikUrl = typeof videoUrl === 'string' ? videoUrl : (videoUrl as any).href;
    const kwikHost = kwikUrl.match(/^https?:\/\/([^/]+)/)?.[1] ?? 'kwik.cx';

    // No User-Agent: the WebView's own keeps a Cloudflare clearance valid (see AnimePahe).
    const { html } = await NativeConsumet.makeGetRequestWithWebView(kwikUrl, {
      Referer: referer,
    });

    const m3u8 = findSource(html);
    if (!m3u8) {
      const packed = html.includes('eval(function(p,a,c,k,e,');
      throw new Error(packed ? '[Kwik] No source URL found' : '[Kwik] No packed script found');
    }

    return {
      sources: [{ url: m3u8, isM3U8: m3u8.includes('.m3u8') }],
      headers: { Referer: `https://${kwikHost}/` },
    };
  };

  return { serverName, sources, extract };
}
