"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlixCloud = FlixCloud;
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
function FlixCloud(ctx) {
    const serverName = 'FlixCloud';
    const sources = [];
    const { axios } = ctx;
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
    const ENC_DEC_API = 'https://enc-dec.app/api';
    // ── JS-object → JSON ───────────────────────────────────────────────────────
    // The SSR page embeds a JS object literal (unquoted keys, single-quoted strings).
    // Convert it to valid JSON so we can JSON.parse without eval/json5.
    const js2json = (raw) => raw
        // Quote unquoted identifier keys  {foo: → {"foo":
        .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
        // Single-quoted string values → double-quoted
        .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
        // Trailing commas before } or ]
        .replace(/,(\s*[}\]])/g, '$1');
    // ── extract ────────────────────────────────────────────────────────────────
    // @ts-ignore – PolyURL accepted as-is
    const extract = (videoUrl, referer) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const embedUrl = typeof videoUrl === 'string' ? videoUrl : videoUrl.href;
        const origin = (_b = (_a = embedUrl.match(/^https?:\/\/[^/]+/)) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : 'https://flixcloud.cc';
        // ── Step 1: fetch embed page ───────────────────────────────────────────
        const { data: html } = yield axios.get(embedUrl, {
            headers: { 'User-Agent': UA, 'Referer': referer !== null && referer !== void 0 ? referer : `${origin}/`, 'Accept': 'text/html' },
        });
        // ── Step 2: extract inline data object ────────────────────────────────
        // Pattern: type: "data", data: { … }, uses:
        const objMatch = html.match(/type:\s*"data",\s*data:\s*(\{[\s\S]*?\})\s*,\s*uses:/);
        if (!objMatch)
            throw new Error('[FlixCloud] Inline data object not found in embed page');
        let dataObj;
        try {
            dataObj = JSON.parse(js2json(objMatch[1]));
        }
        catch (e) {
            throw new Error(`[FlixCloud] Failed to parse inline data object: ${e}`);
        }
        // Separate subtitles so we don't send them to the token API
        const { subtitles: rawSubs } = dataObj, payloadData = __rest(dataObj, ["subtitles"]);
        // ── Step 3: resolve stream token via enc-dec.app ───────────────────────
        const tokenResp = yield axios.post(`${ENC_DEC_API}/dec-flixcloud?type=token`, { data: payloadData }, { headers: { 'Content-Type': 'application/json', 'User-Agent': UA } });
        if (tokenResp.data.status !== 200 || !tokenResp.data.result) {
            throw new Error(`[FlixCloud] Token API error: ${(_c = tokenResp.data.error) !== null && _c !== void 0 ? _c : 'unknown'}`);
        }
        const { token, context } = tokenResp.data.result;
        // ── Step 4: fetch encrypted stream from FlixCloud ─────────────────────
        const { data: streamData } = yield axios.get(`${origin}/api/m3u8/${token}`, {
            headers: { 'Referer': embedUrl, 'User-Agent': UA },
        });
        // ── Step 5: decrypt via enc-dec.app ───────────────────────────────────
        const decResp = yield axios.post(`${ENC_DEC_API}/dec-flixcloud?type=stream`, { data: { context, stream_response: streamData } }, { headers: { 'Content-Type': 'application/json', 'User-Agent': UA } });
        if (decResp.data.status !== 200 || !((_d = decResp.data.result) === null || _d === void 0 ? void 0 : _d.stream)) {
            throw new Error(`[FlixCloud] Stream API error: ${(_e = decResp.data.error) !== null && _e !== void 0 ? _e : 'unknown'}`);
        }
        const { stream: encryptedM3u8Url, context: streamContext } = decResp.data.result;
        const wPayload = streamContext === null || streamContext === void 0 ? void 0 : streamContext.w_payload;
        if (!wPayload) {
            throw new Error('[FlixCloud] w_payload missing from stream context — cannot build parse URL');
        }
        // ── Step 6: build parse-flixcloud URL ─────────────────────────────────
        // enc-dec.app fetches + decrypts the manifest and returns a plain m3u8.
        // The player hits this URL directly; enc-dec.app acts as a transparent proxy.
        const parseUrl = `${ENC_DEC_API}/parse-flixcloud` +
            `?url=${encodeURIComponent(encryptedM3u8Url)}` +
            `&w_payload=${encodeURIComponent(wPayload)}`;
        // ── Subtitles ──────────────────────────────────────────────────────────
        const subtitles = [];
        if (Array.isArray(rawSubs)) {
            for (const s of rawSubs) {
                if ((s === null || s === void 0 ? void 0 : s.url) && (s === null || s === void 0 ? void 0 : s.language))
                    subtitles.push({ url: s.url, lang: s.language });
            }
        }
        // ── Intro / outro chapters (still in the raw HTML) ────────────────────
        const introM = html.match(/intro_chapter:\{start:(\d+),end:(\d+)/);
        const outroM = html.match(/outro_chapter:\{start:(\d+),end:(\d+)/);
        return Object.assign(Object.assign({ sources: [{ url: parseUrl, isM3U8: true, quality: 'auto' }], subtitles, headers: { Referer: `${origin}/` } }, (introM ? { intro: { start: +introM[1], end: +introM[2] } } : {})), (outroM ? { outro: { start: +outroM[1], end: +outroM[2] } } : {}));
    });
    return { serverName, sources, extract };
}
exports.default = FlixCloud;
//# sourceMappingURL=flixcloud.js.map