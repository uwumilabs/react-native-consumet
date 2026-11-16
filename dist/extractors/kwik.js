"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kwik = Kwik;
const packer_1 = require("./packer");
const url_1 = require("./url");
/** Kwik, AnimePahe's player. Its embed page is loaded through the NativeConsumet WebView. */
function Kwik(ctx) {
    const { NativeConsumet, PolyURL } = ctx;
    /** The stream URL in a Kwik embed page; the page packs several scripts, only one has it. */
    function findSource(scripts) {
        for (const code of scripts) {
            const source = code.match(/const\s+source\s*=\s*'([^']+)'/) ||
                code.match(/const\s+source\s*=\s*"([^"]+)"/) ||
                code.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
            if (source?.[1])
                return source[1];
        }
        return null;
    }
    /** @param referer the page the player is embedded in (the AnimePahe site) */
    const extract = async (videoUrl, referer) => {
        const url = (0, url_1.toUrl)(PolyURL, videoUrl);
        // No User-Agent: the WebView's own keeps a Cloudflare clearance valid (see AnimePahe).
        const { html } = await NativeConsumet.makeGetRequestWithWebView(url.href, { Referer: referer });
        const scripts = (0, packer_1.unpackScripts)(html);
        const m3u8 = findSource(scripts);
        if (!m3u8)
            throw new Error(scripts.length ? '[Kwik] No source URL found' : '[Kwik] No packed script found');
        return {
            sources: [{ url: m3u8, isM3U8: m3u8.includes('.m3u8') }],
            headers: { Referer: `${url.origin}/` },
        };
    };
    return { extract };
}
//# sourceMappingURL=kwik.js.map