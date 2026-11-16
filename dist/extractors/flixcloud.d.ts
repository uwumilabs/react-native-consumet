import { type ExtractorContext, type ISource } from '../models';
import type { PolyURL } from '../utils/url-polyfill';
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
export declare function FlixCloud(ctx: ExtractorContext): {
    extract: (videoUrl: string | PolyURL, referer?: string) => Promise<ISource>;
};
//# sourceMappingURL=flixcloud.d.ts.map