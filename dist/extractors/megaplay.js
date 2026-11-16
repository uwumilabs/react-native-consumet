"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MegaPlay = MegaPlay;
const hls_1 = require("./hls");
const url_1 = require("./url");
const MEGA_KEY_STR = 'i?LMTAx0Q6,:}50U';
const MEGA_IV_STR = "W0;27ToaUpl_P%'c";
/** Matches the encrypted segment token inside a URL: `/segment/<base64url-token>` */
const SEGMENT_RE = /\/segment\/([A-Za-z0-9_-]+)/;
/** MegaPlay, AniKoto's player. */
function MegaPlay(ctx) {
    const { axios, load, CryptoJS, USER_AGENT, PolyURL } = ctx;
    function megaPlayDecrypt(encB64Url) {
        const b64 = encB64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        // AES-256 key: the 16-character string and 16 null bytes (Latin1 = 1 byte per char for ASCII)
        const key = CryptoJS.enc.Latin1.parse(MEGA_KEY_STR + '\0'.repeat(16));
        const iv = CryptoJS.enc.Latin1.parse(MEGA_IV_STR);
        const ciphertext = CryptoJS.enc.Base64.parse(padded);
        const decrypted = CryptoJS.AES.decrypt(CryptoJS.lib.CipherParams.create({ ciphertext }), key, {
            iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
    }
    /** `raw` with its segment token decrypted into the URL it stands for; tokens that don't decrypt are left as they are. */
    function resolveSegmentUrl(raw) {
        const token = raw.match(SEGMENT_RE)?.[1];
        if (!token)
            return raw;
        try {
            return megaPlayDecrypt(token) || raw;
        }
        catch {
            return raw;
        }
    }
    const fileOf = (sources) => (typeof sources?.file === 'string' ? sources.file : null) ||
        (Array.isArray(sources) && sources[0]?.file ? String(sources[0].file) : null);
    /**
     * The stream URL in a getSources answer, which comes in one of two forms: `{ enc }`, encrypted
     * JSON (`{ sources }`) or an encrypted bare URL, or a plain `{ sources: { file } }` /
     * `{ sources: [{ file }] }`.
     */
    function extractStreamUrl(data) {
        if (!data || typeof data !== 'object')
            return null;
        if (typeof data.enc === 'string' && data.enc.length > 0) {
            let plain = '';
            try {
                plain = megaPlayDecrypt(data.enc);
            }
            catch {
                // Not encrypted with this key: the answer's plain sources are tried below.
            }
            if (plain) {
                let parsed;
                try {
                    parsed = JSON.parse(plain);
                }
                catch {
                    // A bare URL rather than JSON.
                }
                const url = fileOf(parsed?.sources) || (typeof parsed?.file === 'string' ? parsed.file : null);
                if (url)
                    return resolveSegmentUrl(url);
                if (/^https?:\/\//i.test(plain) || plain.includes('.m3u8'))
                    return plain.trim();
            }
        }
        const rawUrl = fileOf(data.sources);
        return rawUrl ? resolveSegmentUrl(rawUrl) : null;
    }
    const extract = async (videoUrl, referer) => {
        const embedUrl = (0, url_1.toUrl)(PolyURL, videoUrl);
        const embedHref = embedUrl.href;
        const origin = embedUrl.origin;
        // Cookies set along the way; the player has to send them too.
        const cookieJar = [];
        const parseCookies = (headers) => {
            const raw = headers?.['set-cookie'];
            if (!raw)
                return [];
            return (Array.isArray(raw) ? raw : [raw]).map((c) => c.split(';')[0] ?? '').filter(Boolean);
        };
        const pageRes = await axios.get(embedHref, {
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': referer || embedHref,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });
        cookieJar.push(...parseCookies(pageRes.headers));
        const playerDiv = load(pageRes.data)('#megaplay-player');
        if (!playerDiv.length)
            throw new Error('[MegaPlay] Could not find player element (#megaplay-player)');
        const mediaId = playerDiv.attr('data-id');
        if (!mediaId)
            throw new Error('[MegaPlay] Could not find data-id on player element');
        const sParam = embedUrl.searchParams.get('s');
        const sQuery = sParam ? `&s=${encodeURIComponent(sParam)}` : '';
        const cookieHeader = () => cookieJar.join('; ');
        const fetchJson = async (url) => {
            try {
                const res = await axios.get(url, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Referer': `${origin}/`,
                        'Origin': origin,
                        'User-Agent': USER_AGENT,
                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                        ...(cookieJar.length ? { Cookie: cookieHeader() } : {}),
                    },
                });
                cookieJar.push(...parseCookies(res.headers));
                return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            }
            catch {
                // A stream answers on one of the two endpoints; the other one is tried too.
                return null;
            }
        };
        const [defSourcesJson, newSourcesJson] = await Promise.all([
            fetchJson(`${origin}/stream/getSources?id=${mediaId}${sQuery}`),
            fetchJson(`${origin}/stream/getSourcesNew?id=${mediaId}${sQuery}`),
        ]);
        const streamUrl = extractStreamUrl(defSourcesJson) || extractStreamUrl(newSourcesJson);
        if (!streamUrl)
            throw new Error('[MegaPlay] No video stream URL found from /getSources or /getSourcesNew');
        const cleanStreamUrl = streamUrl.replace(/\\/g, '').trim();
        const isM3U8 = cleanStreamUrl.includes('.m3u8');
        const master = { url: cleanStreamUrl, isM3U8, quality: 'auto' };
        const variants = isM3U8
            ? (0, hls_1.hlsVariants)((await axios.get(cleanStreamUrl, { headers: { 'Referer': `${origin}/`, 'User-Agent': USER_AGENT } })).data, cleanStreamUrl)
            : [];
        const tracks = defSourcesJson?.tracks ?? newSourcesJson?.tracks ?? [];
        const subtitles = [];
        if (Array.isArray(tracks)) {
            for (const track of tracks) {
                if (track?.file) {
                    subtitles.push({ url: String(track.file).replace(/\\/g, ''), lang: track.label || track.kind || 'English' });
                }
            }
        }
        const intro = defSourcesJson?.intro ?? newSourcesJson?.intro;
        const outro = defSourcesJson?.outro ?? newSourcesJson?.outro;
        // The player sends these with every HLS request. The CDN (fetch.nexabloom.top) is IP-bound: the
        // URL is generated for the requesting IP, so extraction and playback must share the same IP.
        const playerHeaders = {
            'Referer': `${origin}/`,
            'Origin': origin,
            'User-Agent': USER_AGENT,
        };
        if (cookieJar.length)
            playerHeaders.Cookie = cookieHeader();
        return {
            sources: [...variants, master],
            subtitles,
            headers: playerHeaders,
            intro: intro ? { start: intro.start, end: intro.end } : undefined,
            outro: outro ? { start: outro.start, end: outro.end } : undefined,
            embedURL: embedHref,
        };
    };
    return { extract };
}
//# sourceMappingURL=megaplay.js.map