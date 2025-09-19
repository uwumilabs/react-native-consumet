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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVidsrcSourcesAndServers = getVidsrcSourcesAndServers;
exports.get111MoviesSourcesAndServers = get111MoviesSourcesAndServers;
exports.getMultiServers = getMultiServers;
exports.getMultiSources = getMultiSources;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = require("cheerio");
const url_polyfill_1 = require("../../../utils/url-polyfill");
const crypto_js_1 = __importDefault(require("crypto-js"));
function getVidsrcSourcesAndServers(id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const parts = id.split('$');
        const [tmdbId, type, episode, season] = parts;
        const baseURL = 'https://vidsrc.xyz/embed/';
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36',
            'Referer': 'https://vidsrc.xyz/',
        };
        const servers = [];
        const sources = [];
        const url = type === 'tv'
            ? `${baseURL}tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
            : `${baseURL}movie?tmdb=${tmdbId}`;
        try {
            // Step 1: Fetch embed iframe
            const { data: html1 } = yield axios_1.default.get(url, { headers });
            const match1 = (_a = html1.match(/src="(.*?)"/)) === null || _a === void 0 ? void 0 : _a[1];
            if (!match1)
                throw new Error('No source iframe found');
            const allUrlRCP = [];
            // Construct the RCP URL
            const urlRCP = match1.startsWith('http')
                ? match1
                : match1.startsWith('/embed')
                    ? baseURL.split('/embed')[0] + match1
                    : 'https:' + match1;
            const $ = (0, cheerio_1.load)(html1);
            $('.serversList .server').each((i, el) => {
                const name = $(el).text().trim();
                const hash = $(el).attr('data-hash');
                allUrlRCP.push({ name, url: `${urlRCP.split('rcp')[0]}rcp/${hash}` });
            });
            // Step 2: Fetch all URLs from allUrlRCP and process them
            yield Promise.all(allUrlRCP.map((_a) => __awaiter(this, [_a], void 0, function* ({ name, url: rcpUrl }) {
                var _b, _c;
                try {
                    // console.log(`Fetching RCP for ${name} from ${rcpUrl}`);
                    const { data: html2 } = yield axios_1.default.get(rcpUrl, {
                        headers: Object.assign(Object.assign({}, headers), { Referer: url }),
                    });
                    // console.log(`Found RCP for ${name}: ${html2}`);
                    const match2 = (_b = html2.match(/src.*['"](\/(?:src|pro)rcp.*?)['"]/)) === null || _b === void 0 ? void 0 : _b[1];
                    if (!match2)
                        return;
                    const urlPRORCP = rcpUrl.split('rcp')[0] + match2;
                    // Step 3: Fetch M3U8 file URL
                    // console.log(`Fetching M3U8 for ${name} from ${urlPRORCP}`);
                    const { data: html3 } = yield axios_1.default.get(urlPRORCP, {
                        headers: Object.assign(Object.assign({}, headers), { Referer: rcpUrl }),
                    });
                    const match3 = (_c = html3.match(/file:\s*['"]([^'"]+\.m3u8)['"]/)) === null || _c === void 0 ? void 0 : _c[1];
                    // console.log(`Found M3U8 for ${name}: ${match3}`);
                    if (match3) {
                        servers.push({
                            name: name,
                            url: match3,
                        });
                        sources.push({
                            url: match3,
                            isM3U8: match3.includes('.m3u8'),
                            quality: 'default',
                            name: name,
                        });
                    }
                }
                catch (error) {
                    // Silently continue on error for individual servers
                    return;
                }
            })));
            return {
                servers,
                sources,
                headers: { Referer: urlRCP.split('rcp')[0] },
            };
        }
        catch (error) {
            throw new Error(`Failed to fetch Vidsrc stream: ${error.message}`);
        }
    });
}
function get111MoviesSourcesAndServers(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const parts = id.split('$');
        const [tmdbId, type, episode, season] = parts;
        const baseUrl = 'https://111movies.com';
        const userAgent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';
        const defaultDomain = (() => {
            const u = new url_polyfill_1.URL(baseUrl);
            return `${u.protocol}//${u.host}/`;
        })();
        const headers = {
            'Referer': defaultDomain,
            'User-Agent': userAgent,
            // 'Content-Type': 'image/gif',
            'X-Requested-With': 'XMLHttpRequest',
        };
        function customEncode(input) {
            const src = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
            const dst = 'BdNqfj2X1RalybZHxP50e8UGz4Tv6mg3QS-7JnAWIsiKrCpFktVM9D_chuYOoEwL';
            // Normal base64 url-safe
            let b64 = crypto_js_1.default.enc.Base64.stringify(crypto_js_1.default.enc.Utf8.parse(input));
            b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/[=]+$/, '');
            // Translate characters
            let result = '';
            for (const ch of b64) {
                const idx = src.indexOf(ch);
                result += idx >= 0 ? dst[idx] : ch;
            }
            return result;
        }
        let url;
        if (type === 'tv') {
            url = `${baseUrl}/tv/${tmdbId}/${season}/${episode}`;
        }
        else {
            url = `${baseUrl}/movie/${tmdbId}`;
        }
        const res = yield axios_1.default.get(url, { headers });
        const html = res.data;
        // Extract raw data
        const match = html.match(/\{\"data\":\"(.*?)\"/);
        if (!match) {
            console.error('No data found!');
            throw new Error('No data found in the response');
        }
        const rawData = match[1];
        // AES CBC encrypt
        const keyHex = '912660f3d9f3f35cee36396d31ed73366ab53c22c70710ce029697d17762997e';
        const ivHex = 'f91f2863783814f51c56f341d6ce1677';
        const aesKey = crypto_js_1.default.enc.Hex.parse(keyHex);
        const aesIv = crypto_js_1.default.enc.Hex.parse(ivHex);
        const padded = crypto_js_1.default.enc.Utf8.parse(rawData);
        const encrypted = crypto_js_1.default.AES.encrypt(padded, aesKey, {
            iv: aesIv,
            mode: crypto_js_1.default.mode.CBC,
            padding: crypto_js_1.default.pad.Pkcs7,
        });
        // Python used .hex(), CryptoJS AES output is base64 → convert to hex
        // AES ciphertext in hex (same as Python's .hex())
        const aesEncryptedHex = encrypted.ciphertext.toString(crypto_js_1.default.enc.Hex);
        // XOR key as a Uint8Array instead of Buffer
        const xorKey = new Uint8Array([0xbe, 0x43, 0x0a]);
        let xorResult = '';
        for (let i = 0; i < aesEncryptedHex.length; i++) {
            const charCode = aesEncryptedHex.charCodeAt(i);
            xorResult += String.fromCharCode(charCode ^ xorKey[i % xorKey.length]);
        }
        // Encode final
        const encodedFinal = customEncode(xorResult);
        // API call
        const staticPath = 'to/1000003134441812/c945be05/2f30b6e198562e7015537bb71a738ff8245942a7/y/2c20617150078ad280239d1cc3a8b6ee9331acef9b0bdc6b742435597c38edb4/c8ddbffe-3efb-53e1-b883-3b6ce90ba310';
        const apiServers = `https://111movies.com/${staticPath}/${encodedFinal}/sr`;
        const { data: serversData } = yield axios_1.default.post(apiServers, {}, { headers });
        // const servers = serverRes.data;
        if (!Array.isArray(serversData) || serversData.length === 0) {
            console.error('No servers found!');
            throw new Error('No servers found in the response');
        }
        const servers = serversData.map((s) => ({
            name: s.name,
            url: `https://111movies.com/${staticPath}/${s.data}`,
        }));
        const sources = [];
        let subtitles = [];
        // console.log(subtitles);
        for (const server of servers) {
            try {
                const { data: streamData } = yield axios_1.default.post(server.url, {}, { headers });
                if (streamData.tracks && streamData.tracks.length > 0) {
                    const newSubs = streamData.tracks.map((sub) => ({
                        url: sub.file,
                        lang: sub.label,
                    }));
                    const allSubs = [...subtitles, ...newSubs];
                    const uniqueSubs = allSubs.filter((sub, index, self) => index === self.findIndex((s) => s.lang === sub.lang));
                    subtitles = uniqueSubs;
                }
                sources.push({
                    url: streamData.url,
                    isM3U8: streamData.url.includes('.m3u8'),
                    quality: 'default',
                    name: server.name,
                });
            }
            catch (err) {
                // ignore bad ones
            }
        }
        return {
            servers,
            sources,
            subtitles,
        };
    });
}
function getMultiServers(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const servers = [];
            const [{ servers: oneoneoneServers }, { servers: vidsrcServers }] = yield Promise.all([
                get111MoviesSourcesAndServers(id),
                getVidsrcSourcesAndServers(id),
            ]);
            servers.push(...oneoneoneServers, ...vidsrcServers);
            return servers;
        }
        catch (error) {
            throw new Error(`Failed to fetch Multistream servers: ${error.message}`);
        }
    });
}
function getMultiSources(id, server) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const [_b, _c] = yield Promise.all([
                get111MoviesSourcesAndServers(id),
                getVidsrcSourcesAndServers(id),
            ]), { servers: _ } = _b, oneoneoneSources = __rest(_b, ["servers"]), { servers: __ } = _c, vidsrcSources = __rest(_c, ["servers"]);
            const allSources = Object.assign(Object.assign(Object.assign({}, oneoneoneSources), vidsrcSources), { sources: [...(oneoneoneSources.sources || []), ...(vidsrcSources.sources || [])], subtitles: [...(oneoneoneSources.subtitles || []), ...(vidsrcSources.subtitles || [])] });
            const matchedSources = ((_a = allSources.sources) === null || _a === void 0 ? void 0 : _a.filter((source) => source.name === server)) || [];
            if (matchedSources.length === 0) {
                throw new Error(`No sources found for server: ${server}`);
            }
            return {
                sources: matchedSources,
                subtitles: allSources.subtitles || [],
            };
        }
        catch (error) {
            throw new Error(`Failed to fetch MultiSources: ${error.message}`);
        }
    });
}
//# sourceMappingURL=utils.js.map