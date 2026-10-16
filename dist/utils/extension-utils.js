"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultExtractors = exports.defaultExtractorContext = exports.defaultAxios = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_js_1 = __importDefault(require("crypto-js"));
// Import extractors for fallback compatibility
const extractors_1 = require("../extractors");
const cheerio_1 = require("cheerio");
const utils_1 = require("./utils");
const url_polyfill_1 = require("./url-polyfill");
const NativeConsumet_1 = require("../NativeConsumet");
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
    CryptoJS: crypto_js_1.default,
    USER_AGENT: utils_1.USER_AGENT,
    PolyURL: url_polyfill_1.PolyURL,
    PolyURLSearchParams: url_polyfill_1.PolyURLSearchParams,
    NativeConsumet: {
        getDdosGuardCookiesWithWebView: NativeConsumet_1.getDdosGuardCookiesWithWebView,
        makeGetRequestWithWebView: NativeConsumet_1.makeGetRequestWithWebView,
        makePostRequestWithWebView: NativeConsumet_1.makePostRequestWithWebView,
        makePostRequest: NativeConsumet_1.makePostRequest,
        bypassDdosGuard: NativeConsumet_1.bypassDdosGuard,
        deobfuscateScript: NativeConsumet_1.deobfuscateScript,
    },
};
// Default static extractors (for backward compatibility). The class-based extractors default to
// defaultExtractorContext, so they import this module while it imports them. Getters read each class
// when it's used, after both modules have loaded, whichever of them loaded first.
exports.defaultExtractors = {
    get AsianLoad() {
        return extractors_1.AsianLoad;
    },
    get Filemoon() {
        return extractors_1.Filemoon;
    },
    get GogoCDN() {
        return extractors_1.GogoCDN;
    },
    Kwik: (ctx) => (0, extractors_1.Kwik)(ctx || exports.defaultExtractorContext),
    get MixDrop() {
        return extractors_1.MixDrop;
    },
    get Mp4Player() {
        return extractors_1.Mp4Player;
    },
    get Mp4Upload() {
        return extractors_1.Mp4Upload;
    },
    get RapidCloud() {
        return extractors_1.RapidCloud;
    },
    MegaCloud: (ctx) => (0, extractors_1.MegaCloud)(ctx || exports.defaultExtractorContext),
    get StreamHub() {
        return extractors_1.StreamHub;
    },
    get StreamLare() {
        return extractors_1.StreamLare;
    },
    get StreamSB() {
        return extractors_1.StreamSB;
    },
    get StreamTape() {
        return extractors_1.StreamTape;
    },
    StreamWish: (ctx) => (0, extractors_1.StreamWish)(ctx || exports.defaultExtractorContext),
    get VidMoly() {
        return extractors_1.VidMoly;
    },
    get VizCloud() {
        return extractors_1.VizCloud;
    },
    VidHide: (ctx) => (0, extractors_1.VidHide)(ctx || exports.defaultExtractorContext),
    get Voe() {
        return extractors_1.Voe;
    },
    MegaUp: (ctx) => (0, extractors_1.MegaUp)(ctx || exports.defaultExtractorContext),
    MegaPlay: (ctx) => (0, extractors_1.MegaPlay)(ctx || exports.defaultExtractorContext),
    GDFlix: (ctx) => (0, extractors_1.GDFlix)(ctx || exports.defaultExtractorContext),
    Gofile: (ctx) => (0, extractors_1.Gofile)(ctx || exports.defaultExtractorContext),
    HubCloud: (ctx) => (0, extractors_1.HubCloud)(ctx || exports.defaultExtractorContext),
    FlixCloud: (ctx) => (0, extractors_1.FlixCloud)(ctx || exports.defaultExtractorContext),
};
//# sourceMappingURL=extension-utils.js.map