import { type ExtractorContext, type ISource } from '../models';
import { ENC_DEC_API } from '../providers/common/enc-dec';
import type { PolyURL } from '../utils/url-polyfill';
import { toUrl } from './url';

/**
 * FlixCloud, ReAnime's player. enc-dec.app decrypts its tokens and streams:
 *  1. Fetch the embed page; extract the inline SSR data object.
 *  2. POST data to enc-dec.app/api/dec-flixcloud?type=token  → {token, context}
 *  3. GET  flixcloud.cc/api/m3u8/{token}                     → encrypted blob
 *  4. POST {context, stream_response} to enc-dec.app/api/dec-flixcloud?type=stream
 *          → {stream: encryptedM3u8Url, context: {w_payload, …}}
 *  5. Return enc-dec.app/api/parse-flixcloud?url=…&w_payload=… as the HLS source: enc-dec.app
 *     fetches and decrypts the manifest and serves it plain, and the player's native HLS
 *     decrypts the segments through the #EXT-X-KEY lines in it.
 */
export function FlixCloud(ctx: ExtractorContext) {
  const { axios, USER_AGENT, PolyURL } = ctx;

  // The SSR page embeds a JS object literal (unquoted keys, single-quoted strings), converted to
  // JSON so it parses without eval or json5.
  const js2json = (raw: string): string =>
    raw
      .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
      .replace(/,(\s*[}\]])/g, '$1');

  const extract = async (videoUrl: string | PolyURL, referer?: string): Promise<ISource> => {
    const url = toUrl(PolyURL, videoUrl);
    const embedUrl = url.href;
    const origin = url.origin;

    const { data: html } = await axios.get<string>(embedUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Referer': referer ?? `${origin}/`, 'Accept': 'text/html' },
    });

    const objMatch = html.match(/type:\s*"data",\s*data:\s*(\{[\s\S]*?\})\s*,\s*uses:/);
    if (!objMatch) throw new Error('[FlixCloud] Inline data object not found in embed page');

    let dataObj: Record<string, any>;
    try {
      dataObj = JSON.parse(js2json(objMatch[1]!));
    } catch (e) {
      throw new Error(`[FlixCloud] Failed to parse inline data object: ${e}`);
    }

    // The token API is sent the data without its subtitles.
    const { subtitles: rawSubs, ...payloadData } = dataObj;

    const tokenResp = await axios.post<{ status: number; result?: { token: string; context: any }; error?: string }>(
      `${ENC_DEC_API}/dec-flixcloud?type=token`,
      { data: payloadData },
      { headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT } }
    );
    if (tokenResp.data.status !== 200 || !tokenResp.data.result) {
      throw new Error(`[FlixCloud] Token API error: ${tokenResp.data.error ?? 'unknown'}`);
    }
    const { token, context } = tokenResp.data.result;

    const { data: streamData } = await axios.get<Record<string, string>>(`${origin}/api/m3u8/${token}`, {
      headers: { 'Referer': embedUrl, 'User-Agent': USER_AGENT },
    });

    const decResp = await axios.post<{
      status: number;
      result?: { stream: string; context: { w_payload: string; [k: string]: any } };
      error?: string;
    }>(
      `${ENC_DEC_API}/dec-flixcloud?type=stream`,
      { data: { context, stream_response: streamData } },
      { headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT } }
    );
    if (decResp.data.status !== 200 || !decResp.data.result?.stream) {
      throw new Error(`[FlixCloud] Stream API error: ${decResp.data.error ?? 'unknown'}`);
    }

    const { stream: encryptedM3u8Url, context: streamContext } = decResp.data.result;
    const wPayload = streamContext?.w_payload;
    if (!wPayload) throw new Error('[FlixCloud] w_payload missing from stream context — cannot build parse URL');

    const parseUrl =
      `${ENC_DEC_API}/parse-flixcloud` +
      `?url=${encodeURIComponent(encryptedM3u8Url)}` +
      `&w_payload=${encodeURIComponent(wPayload)}`;

    const subtitles: Array<{ url: string; lang: string }> = [];
    if (Array.isArray(rawSubs)) {
      for (const s of rawSubs) {
        if (s?.url && s?.language) subtitles.push({ url: s.url, lang: s.language });
      }
    }

    // The intro and outro chapters are only in the raw HTML.
    const introM = html.match(/intro_chapter:\{start:(\d+),end:(\d+)/);
    const outroM = html.match(/outro_chapter:\{start:(\d+),end:(\d+)/);

    return {
      sources: [{ url: parseUrl, isM3U8: true, quality: 'auto' }],
      subtitles,
      headers: { Referer: `${origin}/` },
      ...(introM ? { intro: { start: +introM[1]!, end: +introM[2]! } } : {}),
      ...(outroM ? { outro: { start: +outroM[1]!, end: +outroM[2]! } } : {}),
    };
  };

  return { extract };
}
