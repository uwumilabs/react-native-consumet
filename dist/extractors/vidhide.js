"use strict";
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
    const extract = async (videoUrl) => {
        try {
            const { data } = await axios
                .get(videoUrl.href, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Referer': videoUrl.origin,
                },
            })
                .catch(() => {
                throw new Error('Video not found');
            });
            const packedScript = /(eval)(\(f.*?)(\n<\/script>)/m.exec(data.replace(/\n/g, ' '))?.[2]?.replace('eval', '');
            if (!packedScript)
                throw new Error('No packed script found');
            const unpackedData = await NativeConsumet.deobfuscateScript(packedScript);
            if (!unpackedData)
                throw new Error('Failed to deobfuscate script');
            const links = unpackedData.match(/https?:\/\/[^"]+?\.m3u8[^"]*/g) ?? [];
            const m3u8Link = links[0];
            if (!m3u8Link)
                throw new Error('No m3u8 link found');
            const m3u8Content = await axios.get(m3u8Link, {
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
                for (const video of videoList ?? []) {
                    if (!video.includes('m3u8'))
                        continue;
                    const url = video.split('\n')[1];
                    const quality = video.split('RESOLUTION=')[1]?.split(',')[0].split('x')[1];
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
    };
    return {
        serverName,
        sources,
        extract,
    };
}
exports.default = VidHide;
//# sourceMappingURL=vidhide.js.map