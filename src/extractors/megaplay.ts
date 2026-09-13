import { type ExtractorContext, type ISource, type IVideo, type IVideoExtractor, type ISubtitle } from '../models';
import type { PolyURL } from '../utils/url-polyfill';

const MEGA_KEY_STR = 'i?LMTAx0Q6,:}50U';
const MEGA_IV_STR = "W0;27ToaUpl_P%'c";

/** Matches the encrypted segment token inside a URL: `/segment/<base64url-token>` */
const SEGMENT_RE = /\/segment\/([A-Za-z0-9_-]+)/;

/**
 * MegaPlay extractor factory that relies on the shared extractor context
 * @param ctx ExtractorContext containing axios, load, CryptoJS, USER_AGENT, PolyURL
 * @returns Object with extract method implementing IVideoExtractor interface
 */
export function MegaPlay(ctx: ExtractorContext): IVideoExtractor {
  const serverName = 'MegaPlay';
  const sources: IVideo[] = [];
  const client = ctx.axios;
  const load = ctx.load;
  const CryptoJS = ctx.CryptoJS;
  const userAgent =
    ctx.USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

  function megaPlayDecrypt(encB64Url: string): string {
    // base64url → base64 (with padding)
    const b64 = encB64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);

    // AES-256 key: 16-char string + 16 null bytes (Latin1 = 1 byte per char for ASCII)
    const key = CryptoJS.enc.Latin1.parse(MEGA_KEY_STR + '\0'.repeat(16));

    // IV: raw bytes of the 16-char IV string
    const iv = CryptoJS.enc.Latin1.parse(MEGA_IV_STR);

    const ciphertext = CryptoJS.enc.Base64.parse(padded);
    const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  function resolveSegmentUrl(raw: string): string {
    const m = raw.match(SEGMENT_RE);
    if (!m || !m[1]) return raw;
    try {
      const decrypted = megaPlayDecrypt(m[1]);
      return decrypted || raw;
    } catch {
      return raw;
    }
  }

  function extractStreamUrl(data: any): string | null {
    if (!data || typeof data !== 'object') return null;

    // ── Case 1: encrypted payload  { enc: "base64url…" } ──────────────────
    if (typeof data.enc === 'string' && data.enc.length > 0) {
      try {
        const plain = megaPlayDecrypt(data.enc);
        if (plain) {
          // Decrypted value might be JSON: { sources: [{ file: "..." }] }
          try {
            const parsed = JSON.parse(plain);
            const url =
              (typeof parsed?.sources?.file === 'string' ? parsed.sources.file : null) ||
              (Array.isArray(parsed?.sources) && parsed.sources[0]?.file ? String(parsed.sources[0].file) : null) ||
              (typeof parsed?.file === 'string' ? parsed.file : null);
            if (url) return resolveSegmentUrl(url);
          } catch {
            // not JSON — fall through and treat as raw URL
          }
          if (/^https?:\/\//i.test(plain) || plain.includes('.m3u8')) {
            return plain.trim();
          }
        }
      } catch {
        // decrypt failed — fall through to plain sources
      }
    }

    // ── Case 2: plain / segment-token sources ──────────────────────────────
    const rawUrl: string | null =
      (typeof data?.sources?.file === 'string' ? data.sources.file : null) ||
      (Array.isArray(data?.sources) && data.sources[0]?.file ? String(data.sources[0].file) : null);

    if (rawUrl) return resolveSegmentUrl(rawUrl);

    return null;
  }

  const extract = async (videoUrl: PolyURL, referer?: string): Promise<ISource> => {
    const embedHref = typeof videoUrl === 'string' ? videoUrl : videoUrl.href;
    const urlObj = typeof videoUrl === 'object' && videoUrl.origin ? videoUrl : new (ctx.PolyURL || URL)(embedHref);
    const origin = urlObj.origin || 'https://megaplay.buzz';
    const pageReferer = referer || embedHref;

    // ── Collect cookies across requests so the video player can send them ────
    const cookieJar: string[] = [];

    const parseCookies = (headers: any): string[] => {
      const raw = headers?.['set-cookie'];
      if (!raw) return [];
      const arr = Array.isArray(raw) ? raw : [raw];
      // Keep only the name=value part (strip path/domain/etc.)
      return arr.map((c: string) => c.split(';')[0] ?? '').filter(Boolean);
    };

    const pageRes = await client.get(embedHref, {
      headers: {
        'User-Agent': userAgent,
        'Referer': pageReferer,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    cookieJar.push(...parseCookies(pageRes.headers));

    const $ = load(pageRes.data);
    const playerDiv = $('#megaplay-player');

    if (!playerDiv.length) {
      throw new Error('[MegaPlay] Could not find player element (#megaplay-player)');
    }

    const mediaId = playerDiv.attr('data-id');
    if (!mediaId) {
      throw new Error('[MegaPlay] Could not find data-id on player element');
    }

    const sParam = urlObj.searchParams?.get('s');
    const sQuery = sParam ? `&s=${encodeURIComponent(sParam)}` : '';

    const cookieHeader = () => cookieJar.join('; ');

    const ajaxHeaders = (): Record<string, string> => ({
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `${origin}/`,
      'Origin': origin,
      'User-Agent': userAgent,
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      ...(cookieJar.length ? { Cookie: cookieHeader() } : {}),
    });

    const fetchJson = async (url: string): Promise<any | null> => {
      try {
        const res = await client.get(url, { headers: ajaxHeaders() });
        cookieJar.push(...parseCookies(res.headers));
        const data = res.data;
        return typeof data === 'string' ? JSON.parse(data) : data;
      } catch {
        return null;
      }
    };

    const [defSourcesJson, newSourcesJson] = await Promise.all([
      fetchJson(`${origin}/stream/getSources?id=${mediaId}${sQuery}`),
      fetchJson(`${origin}/stream/getSourcesNew?id=${mediaId}${sQuery}`),
    ]);

    const streamUrl = extractStreamUrl(defSourcesJson) || extractStreamUrl(newSourcesJson);

    if (!streamUrl) {
      throw new Error('[MegaPlay] No video stream URL found from /getSources or /getSourcesNew');
    }

    const cleanStreamUrl = streamUrl.replace(/\\/g, '').trim();
    const isM3U8 = cleanStreamUrl.includes('.m3u8');

    const extractedSources: IVideo[] = [];
    const defaultSource: IVideo = { url: cleanStreamUrl, isM3U8, quality: 'auto' };

    if (isM3U8) {
      try {
        const { data: m3u8Data } = await client.get(cleanStreamUrl, {
          headers: { 'Referer': `${origin}/`, 'User-Agent': userAgent },
        });

        if (typeof m3u8Data === 'string' && m3u8Data.includes('#EXT-X-STREAM-INF')) {
          const lines = m3u8Data.split('\n');
          const streamBasePath = cleanStreamUrl.substring(0, cleanStreamUrl.lastIndexOf('/'));
          const streamOrigin = new (ctx.PolyURL || URL)(cleanStreamUrl).origin;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]?.trim();
            if (line?.startsWith('#EXT-X-STREAM-INF')) {
              const resMatch = line.match(/RESOLUTION=\d+x(\d+)/);
              const quality = resMatch ? `${resMatch[1]}p` : `quality_${extractedSources.length + 1}`;
              const next = lines[i + 1]?.trim();
              if (next && !next.startsWith('#')) {
                const variantUrl =
                  next.startsWith('http://') || next.startsWith('https://')
                    ? next
                    : next.startsWith('/')
                      ? `${streamOrigin}${next}`
                      : `${streamBasePath}/${next}`;
                extractedSources.push({ url: variantUrl, isM3U8: true, quality });
              }
            }
          }
        }
      } catch {
        // variants fetch failed — defaultSource will be used
      }
    }

    const finalSources = extractedSources.length > 0 ? [...extractedSources, defaultSource] : [defaultSource];

    const tracks = defSourcesJson?.tracks ?? newSourcesJson?.tracks ?? [];
    const subtitles: ISubtitle[] = [];
    if (Array.isArray(tracks)) {
      for (const track of tracks) {
        if (track?.file) {
          subtitles.push({
            url: String(track.file).replace(/\\/g, ''),
            lang: track.label || track.kind || 'English',
          });
        }
      }
    }

    const intro = defSourcesJson?.intro ?? newSourcesJson?.intro;
    const outro = defSourcesJson?.outro ?? newSourcesJson?.outro;

    // Build player headers — these must be sent with every HLS request.
    // The CDN (fetch.nexabloom.top) is IP-bound: the URL is generated for the
    // requesting IP, so extraction and playback must share the same IP.
    const playerHeaders: Record<string, string> = {
      'Referer': `${origin}/`,
      'Origin': origin,
      'User-Agent': userAgent,
    };
    if (cookieJar.length) {
      playerHeaders.Cookie = cookieHeader();
    }

    return {
      sources: finalSources,
      subtitles,
      headers: playerHeaders,
      intro: intro ? { start: intro.start, end: intro.end } : undefined,
      outro: outro ? { start: outro.start, end: outro.end } : undefined,
      embedURL: embedHref,
    };
  };

  return { serverName, sources, extract };
}

export default MegaPlay;
