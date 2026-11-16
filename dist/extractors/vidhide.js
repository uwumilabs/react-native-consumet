"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VidHide = VidHide;
const hls_1 = require("./hls");
const url_1 = require("./url");
function VidHide(ctx) {
    const { axios, USER_AGENT, NativeConsumet, PolyURL } = ctx;
    const extract = async (videoUrl) => {
        const url = (0, url_1.toUrl)(PolyURL, videoUrl);
        const { data } = await axios.get(url.href, {
            headers: { 'User-Agent': USER_AGENT, 'Referer': url.origin },
        });
        // The packed `eval(function(p,a,c,k,e,d)...)` call can span lines; capture its argument up to </script>.
        const packedScript = /eval(\(f.*?)\s*<\/script>/s.exec(data)?.[1];
        if (!packedScript)
            throw new Error('No packed script found');
        const unpackedData = await NativeConsumet.deobfuscateScript(packedScript);
        if (!unpackedData)
            throw new Error('Failed to deobfuscate script');
        const m3u8Link = unpackedData.match(/https?:\/\/[^"]+?\.m3u8[^"]*/)?.[0];
        if (!m3u8Link)
            throw new Error('No m3u8 link found');
        const { data: master } = await axios.get(m3u8Link, {
            headers: { 'Referer': m3u8Link, 'User-Agent': USER_AGENT },
        });
        return {
            sources: [{ quality: 'auto', url: m3u8Link, isM3U8: true }, ...(0, hls_1.hlsVariants)(master, m3u8Link)],
            subtitles: [],
        };
    };
    return { extract };
}
//# sourceMappingURL=vidhide.js.map