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
exports.VidHide = VidHide;
/**
 * VidHide extractor function
 * @param ctx ExtractorContext containing axios, load, USER_AGENT
 * @returns Object with extract method implementing IVideoExtractor interface
 */
function VidHide(ctx) {
    const serverName = 'VidHide';
    const sources = [];
    const { axios, USER_AGENT, NativeConsumet } = ctx;
    const extract = (videoUrl) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const { data } = yield axios
                .get(videoUrl.href, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Referer': videoUrl.origin,
                },
            })
                .catch(() => {
                throw new Error('Video not found');
            });
            const packedScript = (_b = (_a = /(eval)(\(f.*?)(\n<\/script>)/m.exec(data.replace(/\n/g, ' '))) === null || _a === void 0 ? void 0 : _a[2]) === null || _b === void 0 ? void 0 : _b.replace('eval', '');
            if (!packedScript)
                throw new Error('No packed script found');
            const unpackedData = yield NativeConsumet.deobfuscateScript(packedScript);
            if (!unpackedData)
                throw new Error('Failed to deobfuscate script');
            const links = (_c = unpackedData.match(/https?:\/\/[^"]+?\.m3u8[^"]*/g)) !== null && _c !== void 0 ? _c : [];
            const m3u8Link = links[0];
            if (!m3u8Link)
                throw new Error('No m3u8 link found');
            const m3u8Content = yield axios.get(m3u8Link, {
                headers: {
                    'Referer': m3u8Link,
                    'User-Agent': USER_AGENT,
                },
            });
            const videoSources = [
                {
                    quality: 'auto',
                    url: m3u8Link,
                    isM3U8: m3u8Link.includes('.m3u8'),
                },
            ];
            if (m3u8Content.data.includes('EXTM3U')) {
                const pathWithoutMaster = m3u8Link.split('/master.m3u8')[0];
                const videoList = m3u8Content.data.split('#EXT-X-STREAM-INF:');
                for (const video of videoList !== null && videoList !== void 0 ? videoList : []) {
                    if (!video.includes('m3u8'))
                        continue;
                    const url = video.split('\n')[1];
                    const quality = (_d = video.split('RESOLUTION=')[1]) === null || _d === void 0 ? void 0 : _d.split(',')[0].split('x')[1];
                    videoSources.push({
                        url: `${pathWithoutMaster}/${url}`,
                        quality: `${quality}p`,
                        isM3U8: url.includes('.m3u8'),
                    });
                }
            }
            return {
                sources: videoSources,
                subtitles: [],
            };
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    return {
        serverName,
        sources,
        extract,
    };
}
exports.default = VidHide;
//# sourceMappingURL=vidhide.js.map