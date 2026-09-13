import { type ExtractorContext, type IVideoExtractor } from '../models';
/**
 * FlixCloud extractor — uses enc-dec.app as the decryption relay.
 *
 * Pipeline:
 *  1. Fetch the embed page; extract the inline SSR data object.
 *  2. POST data to enc-dec.app/api/dec-flixcloud?type=token  → {token, context}
 *  3. GET  flixcloud.cc/api/m3u8/{token}                     → encrypted blob
 *  4. POST {context, stream_response} to enc-dec.app/api/dec-flixcloud?type=stream
 *          → {stream: encryptedM3u8Url, context: {w_payload, …}}
 *  5. GET  enc-dec.app/api/parse-flixcloud?url=…&w_payload=… → decrypted m3u8 text
 *     Return this URL as the HLS source — the player fetches it; enc-dec.app serves
 *     the plain manifest and the player's native HLS handles segment decryption via
 *     the #EXT-X-KEY lines embedded in the manifest.
 */
export declare function FlixCloud(ctx: ExtractorContext): IVideoExtractor;
export default FlixCloud;
//# sourceMappingURL=flixcloud.d.ts.map