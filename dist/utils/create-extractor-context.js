"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExtractorContext = createExtractorContext;
const cheerio_1 = require("cheerio");
const extension_utils_1 = require("./extension-utils");
const url_polyfill_1 = require("./url-polyfill");
const NativeConsumet_1 = require("../NativeConsumet");
/**
 * Create extractor context for context-aware extractors
 */
function createExtractorContext(config = {}) {
    return {
        axios: config.axios || extension_utils_1.defaultAxios,
        load: config.load || cheerio_1.load,
        USER_AGENT: config.userAgent ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        PolyURL: url_polyfill_1.PolyURL,
        PolyURLSearchParams: url_polyfill_1.PolyURLSearchParams,
        NativeConsumet: {
            getDdosGuardCookiesWithWebView: NativeConsumet_1.getDdosGuardCookiesWithWebView,
            makeGetRequestWithWebView: NativeConsumet_1.makeGetRequestWithWebView,
            multiply: NativeConsumet_1.multiply,
            bypassDdosGuard: NativeConsumet_1.bypassDdosGuard,
            deobfuscateScript: NativeConsumet_1.deobfuscateScript,
        },
    };
}
exports.default = createExtractorContext;
//# sourceMappingURL=create-extractor-context.js.map