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
exports.MegaPlay = MegaPlay;
const MEGA_KEY_STR = 'i?LMTAx0Q6,:}50U';
const MEGA_IV_STR = "W0;27ToaUpl_P%'c";
/** Matches the encrypted segment token inside a URL: `/segment/<base64url-token>` */
const SEGMENT_RE = /\/segment\/([A-Za-z0-9_-]+)/;
/**
 * MegaPlay extractor factory that relies on the shared extractor context
 * @param ctx ExtractorContext containing axios, load, CryptoJS, USER_AGENT, PolyURL
 * @returns Object with extract method implementing IVideoExtractor interface
 */
function MegaPlay(ctx) {
    const serverName = 'MegaPlay';
    const sources = [];
    const client = ctx.axios;
    const load = ctx.load;
    const CryptoJS = ctx.CryptoJS;
    const userAgent = ctx.USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
    function megaPlayDecrypt(encB64Url) {
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
    function resolveSegmentUrl(raw) {
        const m = raw.match(SEGMENT_RE);
        if (!m || !m[1])
            return raw;
        try {
            const decrypted = megaPlayDecrypt(m[1]);
            return decrypted || raw;
        }
        catch (_a) {
            return raw;
        }
    }
    function extractStreamUrl(data) {
        var _a, _b, _c, _d;
        if (!data || typeof data !== 'object')
            return null;
        // ── Case 1: encrypted payload  { enc: "base64url…" } ──────────────────
        if (typeof data.enc === 'string' && data.enc.length > 0) {
            try {
                const plain = megaPlayDecrypt(data.enc);
                if (plain) {
                    // Decrypted value might be JSON: { sources: [{ file: "..." }] }
                    try {
                        const parsed = JSON.parse(plain);
                        const url = (typeof ((_a = parsed === null || parsed === void 0 ? void 0 : parsed.sources) === null || _a === void 0 ? void 0 : _a.file) === 'string' ? parsed.sources.file : null) ||
                            (Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.sources) && ((_b = parsed.sources[0]) === null || _b === void 0 ? void 0 : _b.file) ? String(parsed.sources[0].file) : null) ||
                            (typeof (parsed === null || parsed === void 0 ? void 0 : parsed.file) === 'string' ? parsed.file : null);
                        if (url)
                            return resolveSegmentUrl(url);
                    }
                    catch (_e) {
                        // not JSON — fall through and treat as raw URL
                    }
                    if (/^https?:\/\//i.test(plain) || plain.includes('.m3u8')) {
                        return plain.trim();
                    }
                }
            }
            catch (_f) {
                // decrypt failed — fall through to plain sources
            }
        }
        // ── Case 2: plain / segment-token sources ──────────────────────────────
        const rawUrl = (typeof ((_c = data === null || data === void 0 ? void 0 : data.sources) === null || _c === void 0 ? void 0 : _c.file) === 'string' ? data.sources.file : null) ||
            (Array.isArray(data === null || data === void 0 ? void 0 : data.sources) && ((_d = data.sources[0]) === null || _d === void 0 ? void 0 : _d.file) ? String(data.sources[0].file) : null);
        if (rawUrl)
            return resolveSegmentUrl(rawUrl);
        return null;
    }
    const extract = (videoUrl, referer) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        const embedHref = typeof videoUrl === 'string' ? videoUrl : videoUrl.href;
        const urlObj = typeof videoUrl === 'object' && videoUrl.origin ? videoUrl : new (ctx.PolyURL || URL)(embedHref);
        const origin = urlObj.origin || 'https://megaplay.buzz';
        const pageReferer = referer || embedHref;
        // ── Collect cookies across requests so the video player can send them ────
        const cookieJar = [];
        const parseCookies = (headers) => {
            const raw = headers === null || headers === void 0 ? void 0 : headers['set-cookie'];
            if (!raw)
                return [];
            const arr = Array.isArray(raw) ? raw : [raw];
            // Keep only the name=value part (strip path/domain/etc.)
            return arr.map((c) => { var _a; return (_a = c.split(';')[0]) !== null && _a !== void 0 ? _a : ''; }).filter(Boolean);
        };
        const pageRes = yield client.get(embedHref, {
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
        const sParam = (_a = urlObj.searchParams) === null || _a === void 0 ? void 0 : _a.get('s');
        const sQuery = sParam ? `&s=${encodeURIComponent(sParam)}` : '';
        const cookieHeader = () => cookieJar.join('; ');
        const ajaxHeaders = () => (Object.assign({ 'X-Requested-With': 'XMLHttpRequest', 'Referer': `${origin}/`, 'Origin': origin, 'User-Agent': userAgent, 'Accept': 'application/json, text/javascript, */*; q=0.01' }, (cookieJar.length ? { Cookie: cookieHeader() } : {})));
        const fetchJson = (url) => __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield client.get(url, { headers: ajaxHeaders() });
                cookieJar.push(...parseCookies(res.headers));
                const data = res.data;
                return typeof data === 'string' ? JSON.parse(data) : data;
            }
            catch (_a) {
                return null;
            }
        });
        const [defSourcesJson, newSourcesJson] = yield Promise.all([
            fetchJson(`${origin}/stream/getSources?id=${mediaId}${sQuery}`),
            fetchJson(`${origin}/stream/getSourcesNew?id=${mediaId}${sQuery}`),
        ]);
        const streamUrl = extractStreamUrl(defSourcesJson) || extractStreamUrl(newSourcesJson);
        if (!streamUrl) {
            throw new Error('[MegaPlay] No video stream URL found from /getSources or /getSourcesNew');
        }
        const cleanStreamUrl = streamUrl.replace(/\\/g, '').trim();
        const isM3U8 = cleanStreamUrl.includes('.m3u8');
        const extractedSources = [];
        const defaultSource = { url: cleanStreamUrl, isM3U8, quality: 'auto' };
        if (isM3U8) {
            try {
                const { data: m3u8Data } = yield client.get(cleanStreamUrl, {
                    headers: { 'Referer': `${origin}/`, 'User-Agent': userAgent },
                });
                if (typeof m3u8Data === 'string' && m3u8Data.includes('#EXT-X-STREAM-INF')) {
                    const lines = m3u8Data.split('\n');
                    const streamBasePath = cleanStreamUrl.substring(0, cleanStreamUrl.lastIndexOf('/'));
                    const streamOrigin = new (ctx.PolyURL || URL)(cleanStreamUrl).origin;
                    for (let i = 0; i < lines.length; i++) {
                        const line = (_b = lines[i]) === null || _b === void 0 ? void 0 : _b.trim();
                        if (line === null || line === void 0 ? void 0 : line.startsWith('#EXT-X-STREAM-INF')) {
                            const resMatch = line.match(/RESOLUTION=\d+x(\d+)/);
                            const quality = resMatch ? `${resMatch[1]}p` : `quality_${extractedSources.length + 1}`;
                            const next = (_c = lines[i + 1]) === null || _c === void 0 ? void 0 : _c.trim();
                            if (next && !next.startsWith('#')) {
                                const variantUrl = next.startsWith('http://') || next.startsWith('https://')
                                    ? next
                                    : next.startsWith('/')
                                        ? `${streamOrigin}${next}`
                                        : `${streamBasePath}/${next}`;
                                extractedSources.push({ url: variantUrl, isM3U8: true, quality });
                            }
                        }
                    }
                }
            }
            catch (_h) {
                // variants fetch failed — defaultSource will be used
            }
        }
        const finalSources = extractedSources.length > 0 ? [...extractedSources, defaultSource] : [defaultSource];
        const tracks = (_e = (_d = defSourcesJson === null || defSourcesJson === void 0 ? void 0 : defSourcesJson.tracks) !== null && _d !== void 0 ? _d : newSourcesJson === null || newSourcesJson === void 0 ? void 0 : newSourcesJson.tracks) !== null && _e !== void 0 ? _e : [];
        const subtitles = [];
        if (Array.isArray(tracks)) {
            for (const track of tracks) {
                if (track === null || track === void 0 ? void 0 : track.file) {
                    subtitles.push({
                        url: String(track.file).replace(/\\/g, ''),
                        lang: track.label || track.kind || 'English',
                    });
                }
            }
        }
        const intro = (_f = defSourcesJson === null || defSourcesJson === void 0 ? void 0 : defSourcesJson.intro) !== null && _f !== void 0 ? _f : newSourcesJson === null || newSourcesJson === void 0 ? void 0 : newSourcesJson.intro;
        const outro = (_g = defSourcesJson === null || defSourcesJson === void 0 ? void 0 : defSourcesJson.outro) !== null && _g !== void 0 ? _g : newSourcesJson === null || newSourcesJson === void 0 ? void 0 : newSourcesJson.outro;
        // Build player headers — these must be sent with every HLS request.
        // The CDN (fetch.nexabloom.top) is IP-bound: the URL is generated for the
        // requesting IP, so extraction and playback must share the same IP.
        const playerHeaders = {
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
    });
    return { serverName, sources, extract };
}
exports.default = MegaPlay;
//# sourceMappingURL=megaplay.js.map