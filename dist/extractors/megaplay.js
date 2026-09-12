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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MegaPlay = MegaPlay;
const axios_1 = __importDefault(require("axios"));
/**
 * MegaPlay extractor factory that relies on the shared extractor context
 * @param ctx ExtractorContext containing axios, load, USER_AGENT, PolyURL
 * @returns Object with extract method implementing IVideoExtractor interface
 */
function MegaPlay(ctx) {
    var _a;
    const serverName = 'MegaPlay';
    const sources = [];
    const client = (_a = ctx.axios) !== null && _a !== void 0 ? _a : axios_1.default;
    const load = ctx.load;
    const userAgent = ctx.USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
    const extract = (videoUrl, referer) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            const embedHref = typeof videoUrl === 'string' ? videoUrl : videoUrl.href;
            const urlObj = typeof videoUrl === 'object' && videoUrl.origin ? videoUrl : new (ctx.PolyURL || URL)(embedHref);
            const origin = urlObj.origin || 'https://megaplay.buzz';
            const pageReferer = referer || embedHref;
            const pageHeaders = {
                'User-Agent': userAgent,
                'Referer': pageReferer,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            };
            const { data: html } = yield client.get(embedHref, { headers: pageHeaders });
            const $ = load(html);
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
            const ajaxHeaders = {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `${origin}/`,
                'User-Agent': userAgent,
                'Accept': 'application/json, text/javascript, */*; q=0.01',
            };
            let defSourcesJson = null;
            let defStreamUrl = null;
            try {
                const { data: resData } = yield client.get(`${origin}/stream/getSources?id=${mediaId}${sQuery}`, {
                    headers: ajaxHeaders,
                });
                defSourcesJson = typeof resData === 'string' ? JSON.parse(resData) : resData;
                defStreamUrl =
                    ((_b = defSourcesJson === null || defSourcesJson === void 0 ? void 0 : defSourcesJson.sources) === null || _b === void 0 ? void 0 : _b.file) ||
                        (Array.isArray(defSourcesJson === null || defSourcesJson === void 0 ? void 0 : defSourcesJson.sources) ? (_c = defSourcesJson.sources[0]) === null || _c === void 0 ? void 0 : _c.file : null);
            }
            catch (_h) {
                // Fallback to getSourcesNew
            }
            let newSourcesJson = null;
            let newStreamUrl = null;
            try {
                const { data: newResData } = yield client.get(`${origin}/stream/getSourcesNew?id=${mediaId}${sQuery}`, {
                    headers: ajaxHeaders,
                });
                newSourcesJson = typeof newResData === 'string' ? JSON.parse(newResData) : newResData;
                newStreamUrl =
                    ((_d = newSourcesJson === null || newSourcesJson === void 0 ? void 0 : newSourcesJson.sources) === null || _d === void 0 ? void 0 : _d.file) ||
                        (Array.isArray(newSourcesJson === null || newSourcesJson === void 0 ? void 0 : newSourcesJson.sources) ? (_e = newSourcesJson.sources[0]) === null || _e === void 0 ? void 0 : _e.file : null);
            }
            catch (_j) {
                // Ignore if defStreamUrl succeeded
            }
            const streamUrl = defStreamUrl || newStreamUrl;
            if (!streamUrl) {
                throw new Error('[MegaPlay] No video stream URL found from /getSources or /getSourcesNew');
            }
            const cleanStreamUrl = String(streamUrl).replace(/\\/g, '');
            const isM3U8 = cleanStreamUrl.includes('.m3u8');
            const extractedSources = [];
            const defaultSource = {
                url: cleanStreamUrl,
                isM3U8,
                quality: 'auto',
            };
            if (isM3U8) {
                try {
                    const { data: m3u8Data } = yield client.get(cleanStreamUrl, {
                        headers: {
                            'Referer': `${origin}/`,
                            'User-Agent': userAgent,
                        },
                    });
                    if (typeof m3u8Data === 'string' && m3u8Data.includes('#EXT-X-STREAM-INF')) {
                        const lines = m3u8Data.split('\n');
                        const streamBasePath = cleanStreamUrl.substring(0, cleanStreamUrl.lastIndexOf('/'));
                        const streamOrigin = new (ctx.PolyURL || URL)(cleanStreamUrl).origin;
                        for (let i = 0; i < lines.length; i++) {
                            const line = (_f = lines[i]) === null || _f === void 0 ? void 0 : _f.trim();
                            if (line && line.startsWith('#EXT-X-STREAM-INF')) {
                                const resolutionMatch = line.match(/RESOLUTION=\d+x(\d+)/);
                                const quality = resolutionMatch ? `${resolutionMatch[1]}p` : `quality_${extractedSources.length + 1}`;
                                const nextLine = (_g = lines[i + 1]) === null || _g === void 0 ? void 0 : _g.trim();
                                if (nextLine && !nextLine.startsWith('#')) {
                                    const variantUrl = nextLine.startsWith('http://') || nextLine.startsWith('https://')
                                        ? nextLine
                                        : nextLine.startsWith('/')
                                            ? `${streamOrigin}${nextLine}`
                                            : `${streamBasePath}/${nextLine}`;
                                    extractedSources.push({
                                        url: variantUrl,
                                        isM3U8: true,
                                        quality,
                                    });
                                }
                            }
                        }
                    }
                }
                catch (_k) {
                    // If fetching variants fails, defaultSource will be returned
                }
            }
            const finalSources = extractedSources.length > 0 ? [...extractedSources, defaultSource] : [defaultSource];
            const tracks = (defSourcesJson === null || defSourcesJson === void 0 ? void 0 : defSourcesJson.tracks) || (newSourcesJson === null || newSourcesJson === void 0 ? void 0 : newSourcesJson.tracks) || [];
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
            const intro = (defSourcesJson === null || defSourcesJson === void 0 ? void 0 : defSourcesJson.intro) || (newSourcesJson === null || newSourcesJson === void 0 ? void 0 : newSourcesJson.intro);
            const outro = (defSourcesJson === null || defSourcesJson === void 0 ? void 0 : defSourcesJson.outro) || (newSourcesJson === null || newSourcesJson === void 0 ? void 0 : newSourcesJson.outro);
            return {
                sources: finalSources,
                subtitles,
                headers: {
                    Referer: `${origin}/`,
                },
                intro: intro ? { start: intro.start, end: intro.end } : undefined,
                outro: outro ? { start: outro.start, end: outro.end } : undefined,
                embedURL: embedHref,
            };
        }
        catch (error) {
            throw new Error(error.message);
        }
    });
    return {
        serverName,
        sources,
        extract,
    };
}
exports.default = MegaPlay;
//# sourceMappingURL=megaplay.js.map