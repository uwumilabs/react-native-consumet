"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const models_1 = require("../models");
class Mp4Player extends models_1.VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'mp4player';
        this.sources = [];
        this.domains = ['mp4player.site'];
        this.extract = async (videoUrl) => {
            try {
                const result = {
                    sources: [],
                    subtitles: [],
                };
                const response = await axios_1.default.get(videoUrl.href);
                const data = response.data.match(new RegExp('(?<=sniff\\()(.*)(?=\\))'))[0]?.replace(/\"/g, '')?.split(',');
                const link = `https://${videoUrl.host}/m3u8/${data[1]}/${data[2]}/master.txt?s=1&cache=${data[7]}`;
                //const thumbnails = response.data.match(new RegExp('(?<=file":")(.*)(?=","kind)'))[0]?.replace(/\\/g, '');
                const m3u8Content = await axios_1.default.get(link, {
                    headers: {
                        accept: '*/*',
                        referer: videoUrl.href,
                    },
                });
                if (m3u8Content.data.includes('EXTM3U')) {
                    const videoList = m3u8Content.data.split('#EXT-X-STREAM-INF:');
                    for (const video of videoList ?? []) {
                        if (video.includes('BANDWIDTH')) {
                            const url = video.split('\n')[1];
                            const quality = video.split('RESOLUTION=')[1].split('\n')[0].split('x')[1];
                            result.sources.push({
                                url: url,
                                quality: `${quality}`,
                                isM3U8: url.includes('.m3u8'),
                            });
                        }
                    }
                }
                return result;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
    }
}
exports.default = Mp4Player;
//# sourceMappingURL=mp4player.js.map