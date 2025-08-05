"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_js_1 = __importDefault(require("crypto-js"));
const models_1 = require("../models");
const cheerio_1 = require("cheerio");
// Copied form https://github.com/JorrinKievit/restreamer/blob/main/src/main/extractors/smashystream.ts/smashystream.ts
// Thanks Jorrin Kievit
class SmashyStream extends models_1.VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'SmashyStream';
        this.sources = [];
        this.host = 'https://embed.smashystream.com';
        this.extract = async (videoUrl) => {
            try {
                const result = [];
                const { data } = await axios.get(videoUrl.href);
                const $ = (0, cheerio_1.load)(data);
                const sourceUrls = $('.dropdown-menu a[data-id]')
                    .map((_, el) => $(el).attr('data-id'))
                    .get()
                    .filter((it) => it !== '_default');
                await Promise.all(sourceUrls.map(async (sourceUrl) => {
                    if (sourceUrl.includes('/ffix')) {
                        const data = await this.extractSmashyFfix(sourceUrl);
                        result.push({
                            source: 'FFix',
                            data: data,
                        });
                    }
                    if (sourceUrl.includes('/watchx')) {
                        const data = await this.extractSmashyWatchX(sourceUrl);
                        result.push({
                            source: 'WatchX',
                            data: data,
                        });
                    }
                    if (sourceUrl.includes('/nflim')) {
                        const data = await this.extractSmashyNFlim(sourceUrl);
                        result.push({
                            source: 'NFilm',
                            data: data,
                        });
                    }
                    if (sourceUrl.includes('/fx')) {
                        const data = await this.extractSmashyFX(sourceUrl);
                        result.push({
                            source: 'FX',
                            data: data,
                        });
                    }
                    if (sourceUrl.includes('/cf')) {
                        const data = await this.extractSmashyCF(sourceUrl);
                        result.push({
                            source: 'CF',
                            data: data,
                        });
                    }
                    if (sourceUrl.includes('eemovie')) {
                        const data = await this.extractSmashyEEMovie(sourceUrl);
                        result.push({
                            source: 'EEMovie',
                            data: data,
                        });
                    }
                    return undefined;
                }));
                const ffixResult = result.find((a) => a.source === 'FFix');
                if (!ffixResult) {
                    throw new Error('FFix source not found');
                }
                return ffixResult.data;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
    }
    async extractSmashyFfix(url) {
        try {
            const result = {
                sources: [],
                subtitles: [],
            };
            const res = await axios.get(url, {
                headers: {
                    referer: url,
                },
            });
            const config = JSON.parse(res.data.match(/var\s+config\s*=\s*({.*?});/)[1]);
            const files = config.file
                .match(/\[([^\]]+)\](https?:\/\/\S+?)(?=,\[|$)/g)
                .map((entry) => {
                const [, quality, link] = entry.match(/\[([^\]]+)\](https?:\/\/\S+?)(?=,\[|$)/);
                return { quality, link: link.replace(',', '') };
            });
            const vttArray = config.subtitle
                .match(/\[([^\]]+)\](https?:\/\/\S+?)(?=,\[|$)/g)
                .map((entry) => {
                const [, language, link] = entry.match(/\[([^\]]+)\](https?:\/\/\S+?)(?=,\[|$)/);
                return { language, link: link.replace(',', '') };
            });
            files.map((source) => {
                result.sources.push({
                    url: source.link,
                    quality: source.quality,
                    isM3U8: source.link.includes('.m3u8'),
                });
            });
            vttArray.map((subtitle) => {
                result.subtitles.push({
                    url: subtitle.link,
                    lang: subtitle.language,
                });
            });
            return result;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    async extractSmashyWatchX(url) {
        try {
            const result = {
                sources: [],
                subtitles: [],
            };
            const key = '4VqE3#N7zt&HEP^a';
            const res = await axios.get(url, {
                headers: {
                    referer: url,
                },
            });
            const regex = /MasterJS\s*=\s*'([^']*)'/;
            const regexMatch = regex.exec(res.data);
            if (!regexMatch || !regexMatch[1]) {
                throw new Error('Failed to extract MasterJS data');
            }
            const base64EncryptedData = regexMatch[1];
            const base64DecryptedData = JSON.parse(Buffer.from(base64EncryptedData, 'base64').toString('utf8'));
            const derivedKey = crypto_js_1.default.PBKDF2(key, crypto_js_1.default.enc.Hex.parse(base64DecryptedData.salt), {
                keySize: 32 / 4,
                iterations: base64DecryptedData.iterations,
                hasher: crypto_js_1.default.algo.SHA512,
            });
            const decipher = crypto_js_1.default.AES.decrypt(base64DecryptedData.ciphertext, derivedKey, {
                iv: crypto_js_1.default.enc.Hex.parse(base64DecryptedData.iv),
                mode: crypto_js_1.default.mode.CBC,
                padding: crypto_js_1.default.pad.Pkcs7,
            });
            const decrypted = decipher.toString(crypto_js_1.default.enc.Utf8);
            const sources = JSON.parse(decrypted.match(/sources: ([^\]]*\])/)[1]);
            const tracks = JSON.parse(decrypted.match(/tracks: ([^]*?\}\])/)[1]);
            const subtitles = tracks.filter((it) => it.kind === 'captions');
            sources.map((source) => {
                result.sources.push({
                    url: source.file,
                    quality: source.label,
                    isM3U8: source.file.includes('.m3u8'),
                });
            });
            subtitles.map((subtitle) => {
                result.subtitles.push({
                    url: subtitle.file,
                    lang: subtitle.label,
                });
            });
            return result;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    async extractSmashyNFlim(url) {
        try {
            const result = {
                sources: [],
                subtitles: [],
            };
            const res = await axios.get(url, {
                headers: {
                    referer: url,
                },
            });
            const configData = res.data.match(/var\s+config\s*=\s*({.*?});/);
            const config = JSON.parse(configData?.length > 0 ? configData[1] : null);
            const files = config?.file
                .match(/\[([^\]]+)\](https?:\/\/\S+?)(?=,\[|$)/g)
                .map((entry) => {
                const [, quality, link] = entry.match(/\[([^\]]+)\](https?:\/\/\S+?)(?=,\[|$)/);
                return { quality, link: link.replace(',', '') };
            });
            const vttArray = config?.subtitle
                .match(/\[([^\]]+)\](https?:\/\/\S+?)(?=,\[|$)/g)
                .map((entry) => {
                const [, language, link] = entry.match(/\[([^\]]+)\](https?:\/\/\S+?)(?=,\[|$)/);
                return { language, link: link.replace(',', '') };
            });
            let validFiles = files;
            if (files) {
                await Promise.all(files?.map(async (source) => {
                    await axios
                        .head(source.link)
                        .then((res) => console.log(res.status))
                        .catch((err) => {
                        if (err.response.status.status !== 200) {
                            validFiles = validFiles.filter((obj) => obj.link !== source.link);
                        }
                    });
                }));
            }
            if (validFiles) {
                validFiles?.map((source) => {
                    result.sources.push({
                        url: source.link,
                        quality: source.quality,
                        isM3U8: source.link.includes('.m3u8'),
                    });
                });
                if (vttArray) {
                    vttArray?.map((subtitle) => {
                        result.subtitles.push({
                            url: subtitle.link,
                            lang: subtitle.language,
                        });
                    });
                }
            }
            return result;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    async extractSmashyFX(url) {
        try {
            const result = {
                sources: [],
                subtitles: [],
            };
            const res = await axios.get(url, {
                headers: {
                    referer: url,
                },
            });
            const file = res.data.match(/file:\s*"([^"]+)"/)[1];
            result.sources.push({
                url: file,
                isM3U8: file.includes('.m3u8'),
            });
            return result;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    async extractSmashyCF(url) {
        try {
            const result = {
                sources: [],
                subtitles: [],
            };
            const res = await axios.get(url, {
                headers: {
                    referer: url,
                },
            });
            const file = res.data.match(/file:\s*"([^"]+)"/)[1];
            const fileRes = await axios.head(file);
            if (fileRes.status !== 200 || fileRes.data.includes('404')) {
                return result;
            }
            else {
                result.sources.push({
                    url: file,
                    isM3U8: file.includes('.m3u8'),
                });
            }
            return result;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    async extractSmashyEEMovie(url) {
        try {
            const result = {
                sources: [],
                subtitles: [],
            };
            const res = await axios.get(url, {
                headers: {
                    referer: url,
                },
            });
            const file = res.data.match(/file:\s*"([^"]+)"/)[1];
            result.sources.push({
                url: file,
                isM3U8: file.includes('.m3u8'),
            });
            return result;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
}
exports.default = SmashyStream;
//# sourceMappingURL=smashystream.js.map