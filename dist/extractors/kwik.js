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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kwik = Kwik;
/**
 * Kwik extractor function
 * @param ctx ExtractorContext containing axios, load, USER_AGENT
 * @returns Object with extract method implementing IVideoExtractor interface
 */
function Kwik(ctx) {
    const serverName = 'kwik';
    const sources = [];
    const { load, USER_AGENT, NativeConsumet } = ctx;
    const ua = USER_AGENT ||
        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36';
    function unpackPacked(packed) {
        const re = /\beval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)\s*\{[\s\S]+?\}\s*\(\s*'([\s\S]+?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]+?)'\s*\.split\s*\(\s*'(.+?)'\s*\)/;
        const m = packed.match(re);
        if (!m)
            return null;
        const encoded = m[1];
        const base = parseInt(m[2], 10);
        const count = parseInt(m[3], 10);
        const words = m[4].split(m[5]);
        function decode(n) {
            const prefix = n < base ? '' : decode(Math.floor(n / base));
            const rem = n % base;
            return prefix + (rem > 35 ? String.fromCharCode(rem + 29) : rem.toString(36));
        }
        let result = encoded;
        for (let i = count - 1; i >= 0; i--) {
            const word = words[i];
            if (word)
                result = result.replace(new RegExp(`\\b${decode(i)}\\b`, 'g'), word);
        }
        return result;
    }
    // @ts-ignore
    const extract = (videoUrl_1, ...args_1) => __awaiter(this, [videoUrl_1, ...args_1], void 0, function* (videoUrl, referer = 'https://animepahe.ru/') {
        var _a, _b, _c;
        const kwikUrl = typeof videoUrl === 'string' ? videoUrl : videoUrl.href;
        const kwikHost = (_b = (_a = kwikUrl.match(/^https?:\/\/([^/]+)/)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : 'kwik.cx';
        const { html } = yield NativeConsumet.makeGetRequestWithWebView(kwikUrl, {
            'Referer': referer,
            'User-Agent': ua,
        });
        const $ = load(html);
        let packedScript = null;
        $('script').each((_, el) => {
            var _a;
            const text = (_a = $(el).html()) !== null && _a !== void 0 ? _a : '';
            if (text.includes('eval(function(p,a,c,k,e,')) {
                packedScript = text;
                return false;
            }
        });
        if (!packedScript) {
            const m = html.match(/eval\(function\(p,a,c,k,e,[dr]\)[\s\S]+?\.split\(['"]\|['"]\)[\s\S]+?\)/);
            packedScript = (_c = m === null || m === void 0 ? void 0 : m[0]) !== null && _c !== void 0 ? _c : null;
        }
        if (!packedScript)
            throw new Error('[Kwik] No packed script found');
        const unpacked = unpackPacked(packedScript);
        if (!unpacked)
            throw new Error('[Kwik] Failed to unpack script');
        const sourceMatch = unpacked.match(/const\s+source\s*=\s*'([^']+)'/) ||
            unpacked.match(/const\s+source\s*=\s*"([^"]+)"/) ||
            unpacked.match(/['"]?(https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
        if (!(sourceMatch === null || sourceMatch === void 0 ? void 0 : sourceMatch[1]))
            throw new Error('[Kwik] No source URL found');
        const m3u8 = sourceMatch[1];
        return {
            sources: [{ url: m3u8, isM3U8: m3u8.includes('.m3u8') }],
            headers: { Referer: `https://${kwikHost}/` },
        };
    });
    return { serverName, sources, extract };
}
exports.default = Kwik;
//# sourceMappingURL=kwik.js.map