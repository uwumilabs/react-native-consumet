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
 * @param ctx ExtractorContext containing axios, load, USER_AGENT, and logger
 * @returns Object with extract method implementing IVideoExtractor interface
 */
function MegaCloud(ctx) {
    const serverName = 'MegaCloud';
    const sources = [];
    const { axios, load, USER_AGENT, URL } = ctx;
    /**
     * Thanks to https://github.com/yogesh-hacker for the original implementation.
     */
    function getSources(embed_url, site) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const regex = /\/([^/?]+)(?=\?)/;
            const xrax = (_a = embed_url.toString().match(regex)) === null || _a === void 0 ? void 0 : _a[1];
            const basePath = embed_url.pathname.split('/').slice(0, 4).join('/');
            const url = `${embed_url.origin}${basePath}/getSources?id=${xrax}}`;
            const getKeyType = url.includes('mega') ? 'mega' : url.includes('videostr') ? 'vidstr' : 'rabbit';
            // console.log(`🔗 Fetching sources from: ${url} with key type: ${getKeyType}`);
            //gets the base64 encoded string from the URL and key in parallel
            let key;
            const headers = {
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': site,
                'User-Agent': USER_AGENT,
            };
            try {
                const { data: keyData } = yield axios.get('https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json');
                key = keyData;
            }
            catch (err) {
                console.error('❌ Error fetching key:', err);
                return;
            }
            // console.log(`🔗 Fetched data: ${key[getKeyType]}`);
            let videoTag;
            let embedRes;
            try {
                embedRes = yield axios.get(embed_url.href, { headers });
                const $ = load(embedRes.data);
                videoTag = $('#megacloud-player');
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
                const altMatch = rawText.match(/\b([a-zA-Z0-9]{16})\b.*?\b([a-zA-Z0-9]{16})\b.*?\b([a-zA-Z0-9]{16})\b/);
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
            // console.log(
            //   `🔗 Encrypted response:`,
            //   encryptedResData,
            //   `${embed_url.origin}${basePath}/getSources?id=${xrax}&_k=${nonce}`
            // );
            const encrypted = encryptedResData.encrypted;
            const sources = encryptedResData.sources;
            let videoSrc = [];
            if (encrypted) {
                const decodeUrl = 'https://script.google.com/macros/s/AKfycbxHbYHbrGMXYD2-bC-C43D3njIbU-wGiYQuJL61H4vyy6YVXkybMNNEPJNPPuZrD1gRVA/exec';
                const params = new URLSearchParams({
                    encrypted_data: sources,
                    nonce: nonce,
                    secret: key[getKeyType],
                });
                const decodeRes = yield axios.get(`${decodeUrl}?${params.toString()}`);
                videoSrc = JSON.parse((_b = decodeRes.data.replace(/\n/g, ' ').match(/\[.*?\]/)) === null || _b === void 0 ? void 0 : _b[0]);
                // console.log(`🔗 Video URL: ${videoUrl}`, decodeRes.data.match(/"file":"(.*?)"/));
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
    const extract = (embedIframeURL_1, ...args_1) => __awaiter(this, [embedIframeURL_1, ...args_1], void 0, function* (embedIframeURL, referer = 'https://hianime.to') {
        var _a, _b, _c, _d;
        const extractedData = {
            subtitles: [],
            intro: { start: 0, end: 0 },
            outro: { start: 0, end: 0 },
            sources: [],
        };
        // console.log(ctx);
        try {
            const resp = yield getSources(embedIframeURL, referer);
            if (!resp)
                return extractedData;
            if (Array.isArray(resp.sources)) {
                extractedData.sources = resp.sources.map((s) => ({
                    url: s.file,
                    isM3U8: s.type === 'hls',
                    type: s.type,
                }));
            }
            extractedData.intro = resp.intro ? resp.intro : extractedData.intro;
            extractedData.outro = resp.outro ? resp.outro : extractedData.outro;
            extractedData.subtitles = resp.tracks.map((track) => ({
                url: track.file,
                lang: track.label ? track.label : track.kind,
            }));
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