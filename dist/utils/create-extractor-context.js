"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExtractorContext = createExtractorContext;
const cheerio_1 = require("cheerio");
const extension_utils_1 = require("./extension-utils");
const megacloud_getsrcs_1 = require("../extractors/megacloud/megacloud.getsrcs");
/**
 * Create extractor context for context-aware extractors
 */
function createExtractorContext(config = {}) {
    return {
        axios: config.axios || extension_utils_1.defaultAxios,
        load: config.load || cheerio_1.load,
        USER_AGENT: config.userAgent ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        sharedUtils: { getSources: megacloud_getsrcs_1.getSources },
    };
}
//# sourceMappingURL=create-extractor-context.js.map