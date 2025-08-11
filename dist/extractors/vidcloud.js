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
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("../utils");
const megacloud_getsrcs_1 = require("./megacloud/megacloud.getsrcs");
function VidCloud(ctx) {
    const serverName = 'VidCloud';
    let sources = [];
    const extract = (videoUrl_1, ...args_1) => __awaiter(this, [videoUrl_1, ...args_1], void 0, function* (videoUrl, referer = 'https://flixhq.to/') {
        const result = {
            sources: [],
            subtitles: [],
        };
        try {
            // Use context axios if available, otherwise fall back to direct import
            const axiosInstance = (ctx === null || ctx === void 0 ? void 0 : ctx.axios) || axios_1.default;
            const USER_AGENT_VAL = (ctx === null || ctx === void 0 ? void 0 : ctx.USER_AGENT) || utils_1.USER_AGENT;
            const options = {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': videoUrl.href,
                    'User-Agent': USER_AGENT_VAL,
                },
            };
            const resp = yield (0, megacloud_getsrcs_1.getSources)(videoUrl, referer, ctx);
            if (!resp) {
                throw new Error('Failed to get sources from getSources function');
            }
            const resSources = resp.sources;
            sources = resSources.map((s) => ({
                url: s.file,
                isM3U8: s.file.includes('.m3u8') || s.file.endsWith('m3u8'),
            }));
            result.sources.push(...sources);
            result.sources = [];
            sources = [];
            for (const source of resSources) {
                const { data } = yield axiosInstance.get(source.file, options);
                const urls = data
                    .split('\n')
                    .filter((line) => line.includes('.m3u8') || line.endsWith('m3u8'));
                const qualities = data.split('\n').filter((line) => line.includes('RESOLUTION='));
                const TdArray = qualities.map((s, i) => {
                    const f1 = s.split('x')[1];
                    const f2 = urls[i];
                    return [f1, f2];
                });
                for (const [f1, f2] of TdArray) {
                    sources.push({
                        url: f2,
                        quality: f1,
                        isM3U8: f2.includes('.m3u8') || f2.endsWith('m3u8'),
                    });
                }
                result.sources.push(...sources);
            }
            result.sources.push({
                url: resSources[0].file,
                isM3U8: resSources[0].file.includes('.m3u8') || resSources[0].file.endsWith('m3u8'),
                quality: 'auto',
            });
            result.subtitles = resp.tracks.map((s) => ({
                url: s.file,
                lang: s.label ? s.label : 'Default (maybe)',
            }));
            return result;
        }
        catch (err) {
            throw err;
        }
    });
    return {
        serverName,
        sources,
        extract,
    };
}
exports.default = VidCloud;
//# sourceMappingURL=vidcloud.js.map