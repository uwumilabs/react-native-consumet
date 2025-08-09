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
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterValidM3U8 = exports.getHashFromImage = exports.substringBeforeLast = exports.substringAfterLast = exports.substringBefore = exports.substringAfter = exports.calculateStringSimilarity = exports.isJson = exports.getDays = exports.capitalizeFirstLetter = exports.range = exports.genElement = exports.formatTitle = exports.floorID = exports.splitAuthor = exports.ANIFY_URL = exports.days = exports.USER_AGENT = void 0;
exports.convertDuration = convertDuration;
exports.findSimilarTitles = findSimilarTitles;
exports.cleanTitle = cleanTitle;
exports.removeSpecialChars = removeSpecialChars;
exports.transformSpecificVariations = transformSpecificVariations;
exports.sanitizeTitle = sanitizeTitle;
exports.stringSearch = stringSearch;
const string_similarity_1 = require("string-similarity");
// import sharp from 'sharp';
const cheerio_1 = require("cheerio");
// import * as blurhash from 'blurhash';
exports.USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36';
exports.days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
exports.ANIFY_URL = 'https://anify.eltik.cc';
const splitAuthor = (authors) => {
    const res = [];
    let eater = '';
    for (let i = 0; i < authors.length; i++) {
        if (authors[i] === ' ' && (authors[i - 1] === ',' || authors[i - 1] === ';')) {
            continue;
        }
        if (authors[i] === ',' || authors[i] === ';') {
            res.push(eater.trim());
            eater = '';
            continue;
        }
        eater += authors[i];
    }
    res.push(eater);
    return res;
};
exports.splitAuthor = splitAuthor;
const floorID = (id) => {
    let imp = '';
    for (let i = 0; i < (id === null || id === void 0 ? void 0 : id.length) - 3; i++) {
        imp += id[i];
    }
    const idV = parseInt(imp);
    return idV * 1000;
};
exports.floorID = floorID;
const formatTitle = (title) => {
    const result = title.replace(/[0-9]/g, '');
    return result.trim();
};
exports.formatTitle = formatTitle;
const genElement = (s, e) => {
    if (s === '')
        return;
    const $ = (0, cheerio_1.load)(e);
    let i = 0;
    let str = '';
    let el = $();
    for (; i < s.length; i++) {
        if (s[i] === ' ') {
            el = $(str);
            str = '';
            i++;
            break;
        }
        str += s[i];
    }
    for (; i < s.length; i++) {
        if (s[i] === ' ') {
            el = $(el).children(str);
            str = '';
            continue;
        }
        str += s[i];
    }
    el = $(el).children(str);
    return el;
};
exports.genElement = genElement;
const range = ({ from = 0, to = 0, step = 1, length = Math.ceil((to - from) / step) }) => Array.from({ length }, (_, i) => from + i * step);
exports.range = range;
const capitalizeFirstLetter = (s) => (s === null || s === void 0 ? void 0 : s.charAt(0).toUpperCase()) + s.slice(1);
exports.capitalizeFirstLetter = capitalizeFirstLetter;
const getDays = (day1, day2) => {
    const day1Index = exports.days.indexOf((0, exports.capitalizeFirstLetter)(day1)) - 1;
    const day2Index = exports.days.indexOf((0, exports.capitalizeFirstLetter)(day2)) - 1;
    const now = new Date();
    const day1Date = new Date();
    const day2Date = new Date();
    day1Date.setDate(now.getDate() + ((day1Index + 7 - now.getDay()) % 7));
    day2Date.setDate(now.getDate() + ((day2Index + 7 - now.getDay()) % 7));
    day1Date.setHours(0, 0, 0, 0);
    day2Date.setHours(0, 0, 0, 0);
    return [day1Date.getTime() / 1000, day2Date.getTime() / 1000];
};
exports.getDays = getDays;
const isJson = (str) => {
    try {
        JSON.parse(str);
    }
    catch (e) {
        return false;
    }
    return true;
};
exports.isJson = isJson;
function convertDuration(milliseconds) {
    let seconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    seconds = seconds % 60;
    minutes = minutes % 60;
    return `PT${hours}H${minutes}M${seconds}S`;
}
const calculateStringSimilarity = (first, second) => {
    first = first.replace(/\s+/g, '');
    second = second.replace(/\s+/g, '');
    if (first === second)
        return 1; // identical or empty
    if (first.length < 2 || second.length < 2)
        return 0; // if either is a 0-letter or 1-letter string
    const firstBigrams = new Map();
    for (let i = 0; i < first.length - 1; i++) {
        const bigram = first.substring(i, i + 2);
        const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) + 1 : 1;
        firstBigrams.set(bigram, count);
    }
    let intersectionSize = 0;
    for (let i = 0; i < second.length - 1; i++) {
        const bigram = second.substring(i, i + 2);
        const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) : 0;
        if (count > 0) {
            firstBigrams.set(bigram, count - 1);
            intersectionSize++;
        }
    }
    return (2.0 * intersectionSize) / (first.length + second.length - 2);
};
exports.calculateStringSimilarity = calculateStringSimilarity;
const substringAfter = (str, toFind) => {
    const index = str.indexOf(toFind);
    return index === -1 ? '' : str.substring(index + toFind.length);
};
exports.substringAfter = substringAfter;
const substringBefore = (str, toFind) => {
    const index = str.indexOf(toFind);
    return index === -1 ? '' : str.substring(0, index);
};
exports.substringBefore = substringBefore;
const substringAfterLast = (str, toFind) => {
    const index = str.lastIndexOf(toFind);
    return index === -1 ? '' : str.substring(index + toFind.length);
};
exports.substringAfterLast = substringAfterLast;
const substringBeforeLast = (str, toFind) => {
    const index = str.lastIndexOf(toFind);
    return index === -1 ? '' : str.substring(0, index);
};
exports.substringBeforeLast = substringBeforeLast;
// const generateHash = async (url: string) => {
//   let returnedBuffer;
//   const response = await fetch(url);
//   const arrayBuffer = await response.arrayBuffer();
//   returnedBuffer = Buffer.from(arrayBuffer);
//   // const { info, data } = await sharp(returnedBuffer).ensureAlpha().raw().toBuffer({
//   //   resolveWithObject: true,
//   // });
//   return blurhash.encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3);
// };
const getHashFromImage = (url) => {
    if ((url === null || url === void 0 ? void 0 : url.length) === 0) {
        return '';
    }
    else {
        // let hash!: string;
        // generateHash(url).then(hashKey => (hash = hashKey));
        return 'hash';
    }
};
exports.getHashFromImage = getHashFromImage;
// Function to find similar titles
function findSimilarTitles(inputTitle, titles) {
    const results = [];
    titles === null || titles === void 0 ? void 0 : titles.forEach((titleObj) => {
        var _a, _b;
        const title = cleanTitle(((_b = (_a = titleObj === null || titleObj === void 0 ? void 0 : titleObj.title) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === null || _b === void 0 ? void 0 : _b.replace(/\([^\)]*\)/g, '').trim()) || '');
        // Calculate similarity score between inputTitle and title
        const similarity = (0, string_similarity_1.compareTwoStrings)(cleanTitle((inputTitle === null || inputTitle === void 0 ? void 0 : inputTitle.toLowerCase()) || ''), title);
        if (similarity > 0.6) {
            results.push(Object.assign(Object.assign({}, titleObj), { similarity }));
        }
    });
    const isSubAvailable = results.some((result) => result.episodes && result.episodes.sub > 0);
    // If episodes.sub is available, sort the results
    if (isSubAvailable) {
        return results.sort((a, b) => {
            var _a, _b;
            // First sort by similarity in descending order
            if (b.similarity !== a.similarity) {
                return b.similarity - a.similarity;
            }
            // If similarity is the same, sort by episodes.sub in descending order
            return (((_a = b.episodes) === null || _a === void 0 ? void 0 : _a.sub) || 0) - (((_b = a.episodes) === null || _b === void 0 ? void 0 : _b.sub) || 0);
        });
    }
    // If episodes.sub is not available, return the original list
    return results.sort((a, b) => b.similarity - a.similarity);
}
// Function to convert Roman numerals to Arabic numbers
function romanToArabic(roman) {
    const romanMap = {
        i: 1,
        v: 5,
        x: 10,
        l: 50,
        c: 100,
        d: 500,
        m: 1000,
    };
    roman = roman.toLowerCase();
    let result = 0;
    for (let i = 0; i < roman.length; i++) {
        const current = romanMap[roman[i]];
        const next = romanMap[roman[i + 1]];
        if (next && current < next) {
            result += next - current;
            i++;
        }
        else {
            result += current;
        }
    }
    return result;
}
function cleanTitle(title) {
    if (!title)
        return '';
    return transformSpecificVariations(removeSpecialChars(title
        .replace(/[^A-Za-z0-9!@#$%^&*() ]/gim, ' ')
        .replace(/(th|rd|nd|st) (Season|season)/gim, '')
        .replace(/\([^\(]*\)$/gim, '')
        .replace(/season/g, '')
        .replace(/\b(IX|IV|V?I{0,3})\b/gi, (match) => romanToArabic(match).toString())
        .replace(/  /g, ' ')
        .replace(/"/g, '')
        .trimEnd()));
}
function removeSpecialChars(title) {
    if (!title)
        return '';
    return title
        .replace(/[^A-Za-z0-9!@#$%^&*()\-= ]/gim, ' ')
        .replace(/[^A-Za-z0-9\-= ]/gim, '')
        .replace(/  /g, ' ');
}
function transformSpecificVariations(title) {
    if (!title)
        return '';
    return title.replace(/yuu/g, 'yu').replace(/ ou/g, ' oh');
}
function sanitizeTitle(title) {
    let resTitle = title.replace(/ *(\(dub\)|\(sub\)|\(uncensored\)|\(uncut\)|\(subbed\)|\(dubbed\))/i, '');
    resTitle = resTitle.replace(/ *\([^)]+audio\)/i, '');
    resTitle = resTitle.replace(/ BD( |$)/i, '');
    resTitle = resTitle.replace(/\(TV\)/g, '');
    resTitle = resTitle.trim();
    resTitle = resTitle.substring(0, 99); // truncate
    return resTitle;
}
function stringSearch(string, pattern) {
    let count = 0;
    string = string.toLowerCase();
    pattern = pattern.toLowerCase();
    string = string.replace(/[^a-zA-Z0-9 -]/g, '');
    pattern = pattern.replace(/[^a-zA-Z0-9 -]/g, '');
    for (let i = 0; i < string.length; i++) {
        for (let j = 0; j < pattern.length; j++) {
            if (pattern[j] !== string[i + j])
                break;
            if (j === pattern.length - 1)
                count++;
        }
    }
    return count;
}
const filterValidM3U8 = (m3u8Links_1, ...args_1) => __awaiter(void 0, [m3u8Links_1, ...args_1], void 0, function* (m3u8Links, options = {}) {
    const { timeout = 10000, headers = {}, indicators = ['#EXT', '#EXTINF', '#EXT-X-', '#EXTM3U'], concurrency = 10, } = options;
    const validLinks = [];
    let index = 0;
    const next = () => __awaiter(void 0, void 0, void 0, function* () {
        while (index < m3u8Links.length) {
            const currentIndex = index++;
            const url = m3u8Links[currentIndex];
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                const response = yield fetch(url, {
                    headers: Object.assign({ 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, headers),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    // console.warn(`❌ HTTP error (${response.status}) for ${url}`);
                    continue;
                }
                // Optional shortcut: skip non-M3U8 content types
                const contentType = response.headers.get('content-type');
                if (contentType && !contentType.includes('application/vnd.apple.mpegurl') && !contentType.includes('mpegurl')) {
                    // console.info(`⚠️ Skipping non-M3U8 type: ${url}`);
                    continue;
                }
                const content = yield response.text();
                if (indicators.some((ind) => content.includes(ind))) {
                    validLinks.push(url);
                }
                else {
                    // console.info(`⚠️ No M3U8 indicators found in: ${url}`);
                }
            }
            catch (err) {
                clearTimeout(timeoutId);
                const reason = err.name === 'AbortError' ? 'timeout' : err.message;
                // console.warn(`⚠️ Failed to validate M3U8 (${url}): ${reason}`);
            }
        }
    });
    // Run N concurrent validators
    yield Promise.all(Array.from({ length: concurrency }, () => next()));
    return validLinks;
});
exports.filterValidM3U8 = filterValidM3U8;
//# sourceMappingURL=utils.js.map