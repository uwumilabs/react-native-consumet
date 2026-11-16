"use strict";

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultExtractorContext = exports.defaultAxios = void 0;
exports.createExtractorContext = createExtractorContext;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = require("cheerio");
const crypto_js_1 = __importDefault(require("crypto-js"));
const NativeConsumet_1 = require("../NativeConsumet");
const constants_1 = require("./constants");
const url_polyfill_1 = require("./url-polyfill");
/** The HTTP client contexts use unless the app passes its own: a 15 s timeout and browser-like headers. */
exports.defaultAxios = axios_1.default.create({
  timeout: 15000,
  headers: {
    'User-Agent': constants_1.USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});
function createExtractorContext() {
  let config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return {
    axios: config.axios || exports.defaultAxios,
    load: config.load || cheerio_1.load,
    CryptoJS: crypto_js_1.default,
    USER_AGENT: config.userAgent || constants_1.USER_AGENT,
    PolyURL: url_polyfill_1.PolyURL,
    PolyURLSearchParams: url_polyfill_1.PolyURLSearchParams,
    NativeConsumet: NativeConsumet_1.nativeMethods
  };
}
/** `createExtractorContext()`: the library's axios, cheerio and user agent. */
exports.defaultExtractorContext = createExtractorContext();
exports.default = createExtractorContext;
//# sourceMappingURL=create-extractor-context.js.map