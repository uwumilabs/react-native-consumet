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
    const { axios, load, USER_AGENT, PolyURL } = ctx;
    const host = 'https://animepahe.ru/';
    // @ts-ignore
    const extract = (videoUrl, ...args) => __awaiter(this, void 0, void 0, function* () {
        const extractedData = {
            subtitles: [],
            intro: { start: 0, end: 0 },
            outro: { start: 0, end: 0 },
            sources: [],
        };
        try {
            const response = yield fetch(`${videoUrl.href}`, {
                headers: { Referer: host },
            });
            const data = yield response.text();
            const source = eval(/(eval)(\(f.*?)(\n<\/script>)/m.exec(data.replace(/\n/g, ' '))[2].replace('eval', '')).match(/https.*?m3u8/);
            extractedData.sources.push({
                url: source[0],
                isM3U8: source[0].includes('.m3u8'),
            });
            return extractedData;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    return {
        serverName,
        sources,
        extract,
    };
}
//# sourceMappingURL=kwik.js.map