"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toUrl = toUrl;
/** Extractors take the embed URL as a string or as a URL object; this is it as a URL object. */
function toUrl(URLClass, url) {
    return typeof url === 'string' ? new URLClass(url) : url;
}
//# sourceMappingURL=url.js.map