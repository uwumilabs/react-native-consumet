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
// @ts-nocheck
const axios_1 = __importDefault(require("axios"));
const models_1 = require("../models");
const constants_1 = require("../utils/constants");
class StreamWish extends models_1.VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'streamwish';
        this.sources = [];
        this.extract = (videoUrl, referer) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                const options = {
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Accept-Encoding': '*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'max-age=0',
                        'Priority': 'u=0, i',
                        'Origin': videoUrl.origin,
                        'Referer': referer !== null && referer !== void 0 ? referer : videoUrl.origin,
                        'Sec-Ch-Ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
                        'Sec-Ch-Ua-Mobile': '?0',
                        'Sec-Ch-Ua-Platform': 'Windows',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Upgrade-Insecure-Requests': '1',
                        'User-Agent': constants_1.USER_AGENT,
                    },
                };
                const { data } = yield axios_1.default.get(videoUrl.href, options);
                // Code adapted from Zenda-Cross (https://github.com/Zenda-Cross/vega-app/blob/main/src/lib/providers/multi/multiGetStream.ts)
                // Thank you to Zenda-Cross for the original implementation.
                const functionRegex = /eval\(function\((.*?)\)\{.*?return p\}.*?\('(.*?)'\.split/;
                const match = functionRegex.exec(data);
                let p = '';
                if (match) {
                    const params = (_a = match[1]) === null || _a === void 0 ? void 0 : _a.split(',').map((param) => param.trim());
                    const encodedString = match[0];
                    p = (_c = (_b = encodedString.split("',36,")) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.trim();
                    const a = 36;
                    let c = (_d = encodedString.split("',36,")[1]) === null || _d === void 0 ? void 0 : _d.slice(2).split('|').length;
                    const k = (_e = encodedString.split("',36,")[1]) === null || _e === void 0 ? void 0 : _e.slice(2).split('|');
                    while (c--) {
                        if (k[c]) {
                            const regex = new RegExp('\\b' + c.toString(a) + '\\b', 'g');
                            p = p.replace(regex, k[c]);
                        }
                    }
                    // console.log('Decoded String:', p);
                }
                else {
                    //console.log('No match found');
                }
                let link = p.match(/https?:\/\/[^"]+?\.m3u8[^"]*/)[0];
                // console.log('Decoded Links:', link);
                const subtitleMatches = (_f = p === null || p === void 0 ? void 0 : p.match(/{file:"([^"]+)",(label:"([^"]+)",)?kind:"(thumbnails|captions)"/g)) !== null && _f !== void 0 ? _f : [];
                // console.log(subtitleMatches, 'subtitleMatches');
                const subtitles = subtitleMatches.map((sub) => {
                    var _a, _b, _c, _d, _e, _f;
                    const lang = (_b = (_a = sub === null || sub === void 0 ? void 0 : sub.match(/label:"([^"]+)"/)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : '';
                    const url = (_d = (_c = sub === null || sub === void 0 ? void 0 : sub.match(/file:"([^"]+)"/)) === null || _c === void 0 ? void 0 : _c[1]) !== null && _d !== void 0 ? _d : '';
                    const kind = (_f = (_e = sub === null || sub === void 0 ? void 0 : sub.match(/kind:"([^"]+)"/)) === null || _e === void 0 ? void 0 : _e[1]) !== null && _f !== void 0 ? _f : '';
                    if (kind.includes('thumbnail')) {
                        return {
                            lang: kind,
                            url: `https://streamwish.com${url}`,
                        };
                    }
                    return {
                        lang: lang,
                        url: url,
                    };
                });
                if (link.includes('hls2"')) {
                    link = link.replace('hls2"', '').replace(new RegExp('"', 'g'), '');
                }
                const linkParser = new URL(link);
                linkParser.searchParams.set('i', '0.4');
                this.sources.push({
                    quality: 'default',
                    url: linkParser.href,
                    isM3U8: link.includes('.m3u8'),
                });
                try {
                    const m3u8Content = yield axios_1.default.get(this.sources[0].url, options);
                    if (m3u8Content.data.includes('EXTM3U')) {
                        const videoList = m3u8Content.data.split('#EXT-X-STREAM-INF:');
                        for (const video of videoList !== null && videoList !== void 0 ? videoList : []) {
                            if (!video.includes('m3u8'))
                                continue;
                            const url = link.split('master.m3u8')[0] + video.split('\n')[1];
                            const quality = video.split('RESOLUTION=')[1].split(',')[0].split('x')[1];
                            this.sources.push({
                                url: url,
                                quality: `${quality}p`,
                                isM3U8: url.includes('.m3u8'),
                            });
                        }
                    }
                }
                catch (e) { }
                return {
                    sources: this.sources,
                    subtitles: subtitles,
                };
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
    }
}
exports.default = StreamWish;
//# sourceMappingURL=streamwish.js.map