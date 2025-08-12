"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultStaticExtractors = exports.defaultExtractorContext = exports.defaultAxios = void 0;
const axios_1 = __importDefault(require("axios"));
// Import extractors for fallback compatibility
const extractors_1 = require("../extractors");
const cheerio_1 = require("cheerio");
const utils_1 = require("./utils");
const url_polyfill_1 = require("./url-polyfill");
// Default axios instance with optimized settings for scraping
exports.defaultAxios = axios_1.default.create({
    timeout: 15000,
    headers: {
        'User-Agent': utils_1.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
    },
});
// Create extractor context for passing to context-aware extractors
exports.defaultExtractorContext = {
    axios: exports.defaultAxios,
    load: cheerio_1.load,
    USER_AGENT: utils_1.USER_AGENT,
    URL: url_polyfill_1.PolyURL,
    URLSearchParams: url_polyfill_1.PolyURLSearchParams,
};
// Default static extractors (for backward compatibility)
exports.defaultStaticExtractors = {
    AsianLoad: extractors_1.AsianLoad,
    Filemoon: extractors_1.Filemoon,
    GogoCDN: extractors_1.GogoCDN,
    Kwik: extractors_1.Kwik,
    MixDrop: extractors_1.MixDrop,
    Mp4Player: extractors_1.Mp4Player,
    Mp4Upload: extractors_1.Mp4Upload,
    RapidCloud: extractors_1.RapidCloud,
    MegaCloud: (ctx) => (0, extractors_1.MegaCloud)(ctx || exports.defaultExtractorContext),
    StreamHub: extractors_1.StreamHub,
    StreamLare: extractors_1.StreamLare,
    StreamSB: extractors_1.StreamSB,
    StreamTape: extractors_1.StreamTape,
    StreamWish: extractors_1.StreamWish,
    VidMoly: extractors_1.VidMoly,
    VizCloud: extractors_1.VizCloud,
    VidHide: extractors_1.VidHide,
    Voe: extractors_1.Voe,
    MegaUp: extractors_1.MegaUp,
};
//# sourceMappingURL=extension-utils.js.map