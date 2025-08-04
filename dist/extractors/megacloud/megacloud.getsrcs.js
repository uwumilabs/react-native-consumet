import CryptoJS from 'crypto-js';
import { USER_AGENT } from '../../utils/utils';
import axios from 'axios';
import { load } from 'cheerio';
/**
 * Thanks to https://github.com/yogesh-hacker for the original implementation.
 */
export async function getSources(embed_url, site) {
    const regex = /\/([^\/?]+)(?=\?)/;
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
        'User-Agent': USER_AGENT,
    };
    try {
        const { data: keyData } = await axios.get('https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json');
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
        embedRes = await axios.get(embed_url.href, { headers });
        const $ = load(embedRes.data);
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
    const { data: encryptedResData } = await axios.get(`${embed_url.origin}${basePath}/getSources?id=${fileId}&_k=${nonce}`, {
        headers,
    });
    // console.log(
    //   `🔗 Encrypted response:`,
    //   encryptedResData,
    //   `${embed_url.origin}${basePath}/getSources?id=${xrax}&_k=${nonce}`
    // );
    const encrypted = encryptedResData.encrypted;
    const sources = encryptedResData.sources;
    let videoUrl = '';
    if (encrypted) {
        const decodeUrl = 'https://script.google.com/macros/s/AKfycbx-yHTwupis_JD0lNzoOnxYcEYeXmJZrg7JeMxYnEZnLBy5V0--UxEvP-y9txHyy1TX9Q/exec';
        const params = new URLSearchParams({
            encrypted_data: sources,
            nonce: nonce,
            secret: key[getKeyType],
        });
        const decodeRes = await axios.get(`${decodeUrl}?${params.toString()}`);
        videoUrl = decodeRes.data.match(/"file":"(.*?)"/)?.[1]?.replace(/\\\//g, '/') || '';
        // console.log(`🔗 Video URL: ${videoUrl}`, decodeRes.data.match(/"file":"(.*?)"/));
    }
    else {
        videoUrl = sources[0]?.file;
        // console.log(`🔗 Video URL: ${videoUrl}`, sources);
    }
    return {
        sources: videoUrl,
        tracks: encryptedResData.tracks,
        intro: encryptedResData?.intro,
        outro: encryptedResData?.outro,
    };
}
//# sourceMappingURL=megacloud.getsrcs.js.map