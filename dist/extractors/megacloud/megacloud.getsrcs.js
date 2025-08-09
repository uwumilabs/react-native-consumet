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
exports.getSources = getSources;
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("../../utils/utils");
const cheerio_1 = require("cheerio");
/**
 * Thanks to https://github.com/yogesh-hacker for the original implementation.
 */
function getSources(embed_url, site, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        // Use context if provided, otherwise fall back to direct imports for backward compatibility
        const axiosInstance = (ctx === null || ctx === void 0 ? void 0 : ctx.axios) || axios_1.default;
        const loadFunc = (ctx === null || ctx === void 0 ? void 0 : ctx.load) || cheerio_1.load;
        const USER_AGENT_VAL = (ctx === null || ctx === void 0 ? void 0 : ctx.USER_AGENT) || utils_1.USER_AGENT;
        const regex = /\/([^/?]+)(?=\?)/;
        const xrax = (_a = embed_url.toString().match(regex)) === null || _a === void 0 ? void 0 : _a[1];
        const basePath = embed_url.pathname.split('/').slice(0, 4).join('/');
        const url = `${embed_url.origin}${basePath}/getSources?id=${xrax}}`;
        const getKeyType = url.includes('mega') ? 'mega' : url.includes('videostr') ? 'vidstr' : 'rabbit';
        // console.log(`🔗 Fetching sources from: ${url} with key type: ${getKeyType}`);
        //gets the base64 encoded string from the URL and key in parallel
        let key;
        const headers = {
            'Accept': '*/*',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': site,
            'User-Agent': USER_AGENT_VAL,
        };
        try {
            const { data: keyData } = yield axiosInstance.get('https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json');
            key = keyData;
        }
        catch (err) {
            console.error('❌ Error fetching key:', err);
            return;
        }
        // console.log(`🔗 Fetched data: ${key[getKeyType]}`);
        let videoTag;
        let embedRes;
        try {
            embedRes = yield axiosInstance.get(embed_url.href, { headers });
            const $ = loadFunc(embedRes.data);
            videoTag = $('#megacloud-player');
        }
        catch (error) {
            console.error('❌ Error fetching embed URL:', error);
            return;
        }
        if (!videoTag.length) {
            console.error('❌ Looks like URL expired!');
            return;
        }
        const rawText = embedRes.data;
        let nonceMatch = rawText.match(/\b[a-zA-Z0-9]{48}\b/);
        if (!nonceMatch) {
            const altMatch = rawText.match(/\b([a-zA-Z0-9]{16})\b.*?\b([a-zA-Z0-9]{16})\b.*?\b([a-zA-Z0-9]{16})\b/);
            if (altMatch)
                nonceMatch = [altMatch.slice(1).join('')];
        }
        const nonce = nonceMatch === null || nonceMatch === void 0 ? void 0 : nonceMatch[0];
        if (!nonce)
            return console.error('❌ Nonce not found!');
        const fileId = videoTag.attr('data-id');
        const { data: encryptedResData } = yield axiosInstance.get(`${embed_url.origin}${basePath}/getSources?id=${fileId}&_k=${nonce}`, {
            headers,
        });
        // console.log(
        //   `🔗 Encrypted response:`,
        //   encryptedResData,
        //   `${embed_url.origin}${basePath}/getSources?id=${xrax}&_k=${nonce}`
        // );
        const encrypted = encryptedResData.encrypted;
        const sources = encryptedResData.sources;
        let videoSrc = [];
        if (encrypted) {
            const decodeUrl = 'https://script.google.com/macros/s/AKfycbxHbYHbrGMXYD2-bC-C43D3njIbU-wGiYQuJL61H4vyy6YVXkybMNNEPJNPPuZrD1gRVA/exec';
            const params = new URLSearchParams({
                encrypted_data: sources,
                nonce: nonce,
                secret: key[getKeyType],
            });
            const decodeRes = yield axiosInstance.get(`${decodeUrl}?${params.toString()}`);
            videoSrc = JSON.parse((_b = decodeRes.data.replace(/\n/g, ' ').match(/\[.*?\]/)) === null || _b === void 0 ? void 0 : _b[0]);
            // console.log(`🔗 Video URL: ${videoUrl}`, decodeRes.data.match(/"file":"(.*?)"/));
        }
        else {
            videoSrc = sources;
        }
        return {
            sources: videoSrc,
            tracks: encryptedResData.tracks,
            intro: encryptedResData === null || encryptedResData === void 0 ? void 0 : encryptedResData.intro,
            outro: encryptedResData === null || encryptedResData === void 0 ? void 0 : encryptedResData.outro,
        };
    });
}
//# sourceMappingURL=megacloud.getsrcs.js.map