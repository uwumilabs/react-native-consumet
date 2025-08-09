"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
// @ts-nocheck
const models_1 = require("../models");
const utils_1 = require("../utils");
const megacloud_getsrcs_1 = require("./megacloud/megacloud.getsrcs");
class VidCloud extends models_1.VideoExtractor {
    constructor(ctx) {
        super();
        this.serverName = 'VidCloud';
        this.sources = [];
        this.extract = async (videoUrl, referer = 'https://flixhq.to/') => {
            const result = {
                sources: [],
                subtitles: [],
            };
            try {
                // Use context axios if available, otherwise fall back to direct import
                const axiosInstance = this.ctx?.axios || axios_1.default;
                const USER_AGENT_VAL = this.ctx?.USER_AGENT || utils_1.USER_AGENT;
                const options = {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Referer': videoUrl.href,
                        'User-Agent': USER_AGENT_VAL,
                    },
                };
                const resp = await (0, megacloud_getsrcs_1.getSources)(videoUrl, referer, this.ctx);
                if (!resp) {
                    throw new Error('Failed to get sources from getSources function');
                }
                const sources = resp.sources;
                this.sources = sources.map((s) => ({
                    url: s.file,
                    isM3U8: s.file.includes('.m3u8') || s.file.endsWith('m3u8'),
                }));
                result.sources.push(...this.sources);
                result.sources = [];
                this.sources = [];
                for (const source of sources) {
                    const { data } = await axiosInstance.get(source.file, options);
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
                        this.sources.push({
                            url: f2,
                            quality: f1,
                            isM3U8: f2.includes('.m3u8') || f2.endsWith('m3u8'),
                        });
                    }
                    result.sources.push(...this.sources);
                }
                result.sources.push({
                    url: sources[0].file,
                    isM3U8: sources[0].file.includes('.m3u8') || sources[0].file.endsWith('m3u8'),
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
        };
        this.ctx = ctx;
    }
}
exports.default = VidCloud;
//# sourceMappingURL=vidcloud.js.map