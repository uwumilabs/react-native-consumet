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
exports.MegaCloud = MegaCloud;
/**
 * MegaCloud extractor function
 * @param ctx ExtractorContext containing axios, load, USER_AGENT
 * @returns Object with extract method implementing IVideoExtractor interface
 */
function MegaCloud(ctx) {
    const serverName = 'MegaCloud';
    const sources = [];
    const { axios, load, USER_AGENT, PolyURL } = ctx;
    /**
     * Thanks to https://github.com/yogesh-hacker for the original implementation.
     */
    function getSources(embed_url, site) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const regex = /\/([^/?]+)(?=\?)/;
            const xrax = (_a = embed_url.toString().match(regex)) === null || _a === void 0 ? void 0 : _a[1];
            const basePath = embed_url.pathname.split('/').slice(0, 4).join('/');
            const url = `${embed_url.origin}${basePath}/getSources?id=${xrax}`;
            // console.log(`🔗 Fetching sources from: ${url}`);
            const headers = {
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': site,
                'User-Agent': USER_AGENT,
            };
            let videoTag;
            let embedRes;
            try {
                embedRes = yield (axios === null || axios === void 0 ? void 0 : axios.get(embed_url.href, { headers }));
                const $ = load(embedRes.data);
                videoTag = $('[id$="-player"]');
            }
            catch (error) {
                console.error('❌ Error fetching embed URL:', error);
                return;
            }
            if (!videoTag.length) {
                console.error('❌ Looks like URL expired!');
                return;
            }
            const rawText = embedRes.data;
            let nonceMatch = rawText.match(/\b[a-zA-Z0-9]{48}\b/);
            if (!nonceMatch) {
                const altMatch = rawText.match(/\b([a-zA-Z0-9]{16})\b[\s\S]*?\b([a-zA-Z0-9]{16})\b[\s\S]*?\b([a-zA-Z0-9]{16})\b/);
                if (altMatch)
                    nonceMatch = [altMatch.slice(1).join('')];
            }
            const nonce = nonceMatch === null || nonceMatch === void 0 ? void 0 : nonceMatch[0];
            if (!nonce)
                return console.error('❌ Nonce not found!');
            const fileId = videoTag.attr('data-id');
            const { data: encryptedResData } = yield axios.get(`${embed_url.origin}${basePath}/getSources?id=${fileId}&_k=${nonce}`, {
                headers,
            });
            const sources = encryptedResData.sources;
            let videoSrc = [];
            if (encryptedResData.encrypted) {
                console.warn('❌ API returned encrypted sources which we are no longer decrypting. Returning empty array.');
            }
            else {
                videoSrc = sources;
            }
            return {
                sources: videoSrc,
                tracks: encryptedResData.tracks,
                intro: encryptedResData === null || encryptedResData === void 0 ? void 0 : encryptedResData.intro,
                outro: encryptedResData === null || encryptedResData === void 0 ? void 0 : encryptedResData.outro,
            };
        });
    }
    // @ts-ignore
    const extract = (embedIframeURL_1, ...args_1) => __awaiter(this, [embedIframeURL_1, ...args_1], void 0, function* (embedIframeURL, referer = 'https://himovies.sx') {
        var _a, _b, _c, _d;
        const extractedData = {
            subtitles: [],
            intro: { start: 0, end: 0 },
            outro: { start: 0, end: 0 },
            sources: [],
        };
        try {
            const resp = yield getSources(embedIframeURL, referer);
            if (!resp)
                return extractedData;
            if (Array.isArray(resp.sources)) {
                // Process each source to extract quality information
                for (const s of resp.sources) {
                    const isM3U8 = s.type === 'hls';
                    // Add the main source with "auto" quality
                    extractedData.sources.push({
                        url: s.file,
                        isM3U8,
                        quality: 'auto',
                    });
                    // If it's an M3U8 file, fetch and parse quality variants
                    if (isM3U8) {
                        try {
                            const m3u8Response = yield fetch(s.file, {
                                headers: {
                                    'Referer': referer,
                                    'User-Agent': USER_AGENT || 'Mozilla/5.0',
                                },
                            });
                            const m3u8Content = yield m3u8Response.text();
                            if (m3u8Content.includes('EXTM3U')) {
                                const pathWithoutMaster = s.file.split('/master.m3u8')[0] || s.file.split('/index.m3u8')[0];
                                const videoList = m3u8Content.split('#EXT-X-STREAM-INF:');
                                for (const video of videoList !== null && videoList !== void 0 ? videoList : []) {
                                    if (!video.includes('m3u8'))
                                        continue;
                                    const url = video.split('\n')[1].trim();
                                    // Extract quality from RESOLUTION=WIDTHxHEIGHT
                                    const resolutionMatch = video.match(/RESOLUTION=(\d+)x(\d+)/);
                                    const quality = resolutionMatch ? resolutionMatch[2] : null;
                                    // Check if URL is absolute or relative
                                    const isAbsoluteUrl = url.startsWith('http://') || url.startsWith('https://');
                                    const finalUrl = isAbsoluteUrl ? url : `${pathWithoutMaster}/${url}`;
                                    extractedData.sources.push({
                                        url: finalUrl,
                                        quality: quality ? `${quality}p` : 'auto',
                                        isM3U8: url.includes('.m3u8'),
                                    });
                                }
                            }
                        }
                        catch (error) {
                            // If fetching M3U8 fails, just use the auto quality
                            console.warn('[MegaCloud] Failed to fetch M3U8 variants:', error);
                        }
                    }
                    else {
                        // For non-M3U8 sources, keep as is
                        extractedData.sources[extractedData.sources.length - 1] = {
                            url: s.file,
                            isM3U8: false,
                            quality: 'default',
                        };
                    }
                }
            }
            extractedData.intro = (_a = resp.intro) !== null && _a !== void 0 ? _a : extractedData.intro;
            extractedData.outro = (_b = resp.outro) !== null && _b !== void 0 ? _b : extractedData.outro;
            extractedData.subtitles =
                (_d = (_c = resp.tracks) === null || _c === void 0 ? void 0 : _c.map((track) => ({
                    url: track.file,
                    lang: track.label || track.kind,
                }))) !== null && _d !== void 0 ? _d : [];
            // console.log(`[MegaCloud] Extracted ${extractedData.sources.length} source(s)`);
            return extractedData;
        }
        catch (err) {
            // console.error('[MegaCloud] Extraction error', err);
            throw err;
        }
    });
    return {
        serverName,
        sources,
        extract,
    };
}
//# sourceMappingURL=megacloud.js.map