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
class Voe extends models_1.VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'voe';
        this.sources = [];
        this.domains = ['voe.sx'];
        this.extract = (videoUrl) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                function decryptF7(p8) {
                    try {
                        const vF = rot13(p8);
                        const vF2 = replacePatterns(vF);
                        const vF3 = removeUnderscores(vF2);
                        const vF4 = base64Decode(vF3);
                        const vF5 = charShift(vF4, 3);
                        const vF6 = reverse(vF5);
                        const vAtob = base64Decode(vF6);
                        return JSON.parse(vAtob);
                    }
                    catch (e) {
                        console.error('Decryption error:', e);
                        return {};
                    }
                }
                function rot13(input) {
                    return input.replace(/[a-zA-Z]/g, (c) => {
                        const base = c <= 'Z' ? 65 : 97;
                        return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
                    });
                }
                function replacePatterns(input) {
                    const patterns = ['@$', '^^', '~@', '%?', '*~', '!!', '#&'];
                    let result = input;
                    for (const pattern of patterns) {
                        const regex = new RegExp(pattern.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1'), 'g');
                        result = result.replace(regex, '_');
                    }
                    return result;
                }
                function removeUnderscores(input) {
                    return input.replace(/_/g, '');
                }
                function charShift(input, shift) {
                    return [...input].map((c) => String.fromCharCode(c.charCodeAt(0) - shift)).join('');
                }
                function reverse(input) {
                    return input.split('').reverse().join('');
                }
                function base64Decode(input) {
                    try {
                        return Buffer.from(input, 'base64').toString('utf-8');
                    }
                    catch (e) {
                        console.error('Base64 decode failed:', e);
                        return '';
                    }
                }
                const res = yield axios_1.default.get(videoUrl.href);
                const $ = (0, cheerio_1.load)(res.data);
                const scriptContent = $('script').html();
                const pageUrl = scriptContent
                    ? ((_b = (_a = scriptContent.match(/window\.location\.href\s*=\s*'(https:\/\/[^']+)';/)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : '')
                    : '';
                const { data } = yield axios_1.default.get(pageUrl);
                const $$ = (0, cheerio_1.load)(data);
                const encodedString = ((_c = $$('script[type="application/json"]').html()) === null || _c === void 0 ? void 0 : _c.trim()) || '';
                const jsonData = decryptF7(encodedString);
                let url = jsonData.source;
                let siteName = jsonData.site_name;
                let subtitles = jsonData.captions.map((sub) => ({
                    lang: sub.label,
                    url: `https://${siteName}${sub.file}`,
                }));
                this.sources.push({
                    url: url,
                    quality: 'default',
                    isM3U8: url.includes('.m3u8'),
                });
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
exports.default = Voe;
//# sourceMappingURL=voe.js.map