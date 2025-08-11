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
const cheerio_1 = require("cheerio");
const models_1 = require("../models");
const utils_1 = require("../utils");
/**
 * work in progress
 */
class Filemoon extends models_1.VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'Filemoon';
        this.sources = [];
        this.host = 'https://filemoon.sx';
        this.extract = (videoUrl) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const options = {
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cookie': 'file_id=40342338; aff=23788; ref_url=https%3A%2F%2Fbf0skv.org%2Fe%2Fm0507zf4xqor; lang=1',
                    'Priority': 'u=0, i',
                    'Referer': videoUrl.origin,
                    'Origin': videoUrl.href,
                    'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'iframe',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'cross-site',
                    'User-Agent': utils_1.USER_AGENT,
                    'Access-Control-Allow-Origin': '*',
                },
            };
            const { data } = yield axios_1.default.get(videoUrl.href, options);
            const $ = (0, cheerio_1.load)(data);
            try {
                const { data } = yield axios_1.default.get($('iframe').attr('src'), options);
                const unpackedData = eval(/(eval)(\(f.*?)(\n<\/script>)/m.exec(data.replace(/\n/g, ' '))[2].replace('eval', ''));
                const links = (_a = unpackedData.match(new RegExp('sources:\\[\\{file:"(.*?)"'))) !== null && _a !== void 0 ? _a : [];
                const m3u8Link = links[1];
                this.sources.unshift({
                    url: m3u8Link,
                    quality: 'auto',
                    isM3U8: true,
                });
            }
            catch (err) {
                //console.log(err);
            }
            return this.sources;
        });
    }
}
exports.default = Filemoon;
//# sourceMappingURL=filemoon.js.map