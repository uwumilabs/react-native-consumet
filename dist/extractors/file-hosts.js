"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qualityIn = qualityIn;
exports.finalUrl = finalUrl;
/** The video quality a file host's title, heading or URL names (`1080p`; `4K` is `2160p`), or undefined. */
function qualityIn(text) {
    const label = text.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i)?.[1]?.toLowerCase();
    return label === '4k' ? '2160p' : label;
}
/**
 * The URL a request ended at after following redirects: React Native's XHR reports it as
 * `request.responseURL`, Node's adapter as `request.res.responseUrl`. `fallback` when neither does.
 */
function finalUrl(response, fallback) {
    return response.request?.responseURL || response.request?.res?.responseUrl || fallback;
}
//# sourceMappingURL=file-hosts.js.map