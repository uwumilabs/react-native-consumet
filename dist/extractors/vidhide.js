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
const models_1 = require("../models");
class VidHide extends models_1.VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'VidHide';
        this.sources = [];
        this.extract = (videoUrl) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const result = {
                    sources: [],
                    subtitles: [],
                };
                const { data } = yield axios_1.default.get(videoUrl.href).catch(() => {
                    throw new Error('Video not found');
                });
                const unpackedData = eval(/(eval)(\(f.*?)(\n<\/script>)/m.exec(data.replace(/\n/g, ' '))[2].replace('eval', ''));
                const links = (_a = unpackedData.match(/https?:\/\/[^"]+?\.m3u8[^"]*/g)) !== null && _a !== void 0 ? _a : [];
                const m3u8Link = links[0];
                const m3u8Content = yield axios_1.default.get(m3u8Link, {
                    headers: {
                        Referer: m3u8Link,
                    },
                });
                result.sources.push({
                    quality: 'auto',
                    url: m3u8Link,
                    isM3U8: m3u8Link.includes('.m3u8'),
                });
                if (m3u8Content.data.includes('EXTM3U')) {
                    const pathWithoutMaster = m3u8Link.split('/master.m3u8')[0];
                    const videoList = m3u8Content.data.split('#EXT-X-STREAM-INF:');
                    for (const video of videoList !== null && videoList !== void 0 ? videoList : []) {
                        if (!video.includes('m3u8'))
                            continue;
                        const url = video.split('\n')[1];
                        const quality = (_b = video.split('RESOLUTION=')[1]) === null || _b === void 0 ? void 0 : _b.split(',')[0].split('x')[1];
                        result.sources.push({
                            url: `${pathWithoutMaster}/${url}`,
                            quality: `${quality}p`,
                            isM3U8: url.includes('.m3u8'),
                        });
                    }
                }
                return result.sources;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
    }
}
exports.default = VidHide;
//# sourceMappingURL=vidhide.js.map