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
    const extract = (embedIframeURL_1, ...args_1) => __awaiter(this, [embedIframeURL_1, ...args_1], void 0, function* (embedIframeURL, referer = 'https://hianime.to') {
        var _a, _b, _c, _d, _e;
        const extractedData = {
            subtitles: [],
            intro: { start: 0, end: 0 },
            outro: { start: 0, end: 0 },
            sources: [],
        };
        try {
            const resp = yield ((_a = ctx.sharedUtils) === null || _a === void 0 ? void 0 : _a.getSources(embedIframeURL, referer, ctx));
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
            extractedData.intro = (_b = resp.intro) !== null && _b !== void 0 ? _b : extractedData.intro;
            extractedData.outro = (_c = resp.outro) !== null && _c !== void 0 ? _c : extractedData.outro;
            extractedData.subtitles =
                (_e = (_d = resp.tracks) === null || _d === void 0 ? void 0 : _d.map((track) => ({
                    url: track.file,
                    lang: track.label || track.kind,
                }))) !== null && _e !== void 0 ? _e : [];
            console.log(`[MegaCloud] Extracted ${extractedData.sources.length} source(s)`);
            return extractedData;
        }
        catch (err) {
            console.error('[MegaCloud] Extraction error', err);
            throw err;
        }
    });
    return {
        serverName,
        sources,
        extract,
    };
}
//# sourceMappingURL=index.js.map