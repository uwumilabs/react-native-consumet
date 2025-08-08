"use strict";
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
async function getSources(embed_url, site, ctx) {
    // Use context if provided, otherwise fall back to direct imports for backward compatibility
    const axiosInstance = ctx?.axios || axios_1.default;
    const loadFunc = ctx?.load || cheerio_1.load;
    const USER_AGENT_VAL = ctx?.USER_AGENT || utils_1.USER_AGENT;
    const regex = /\/([^/?]+)(?=\?)/;
    const xrax = embed_url.toString().match(regex)?.[1];
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
        const { data: keyData } = await axiosInstance.get('https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json');
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
        embedRes = await axiosInstance.get(embed_url.href, { headers });
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
    const nonce = nonceMatch?.[0];
    if (!nonce)
        return console.error('❌ Nonce not found!');
    const fileId = videoTag.attr('data-id');
    const { data: encryptedResData } = await axiosInstance.get(`${embed_url.origin}${basePath}/getSources?id=${fileId}&_k=${nonce}`, {
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
        const decodeRes = await axiosInstance.get(`${decodeUrl}?${params.toString()}`);
        videoSrc = JSON.parse(decodeRes.data.match(/\[.*?\]/s)?.[0]);
        // console.log(`🔗 Video URL: ${videoUrl}`, decodeRes.data.match(/"file":"(.*?)"/));
    }
    else {
        videoSrc = sources;
    }
    return {
        sources: videoSrc,
        tracks: encryptedResData.tracks,
        intro: encryptedResData?.intro,
        outro: encryptedResData?.outro,
    };
}
//# sourceMappingURL=megacloud.getsrcs.js.map