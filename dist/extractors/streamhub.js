import { VideoExtractor } from '../models';
class StreamHub extends VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'StreamHub';
        this.sources = [];
        this.extract = async (videoUrl) => {
            try {
                const result = {
                    sources: [],
                    subtitles: [],
                };
                const { data } = await this.client.get(videoUrl.href).catch(() => {
                    throw new Error('Video not found');
                });
                const unpackedData = eval(/(eval)(\(f.*?)(\n<\/script>)/s.exec(data)[2].replace('eval', ''));
                const links = unpackedData.match(new RegExp('sources:\\[\\{src:"(.*?)"')) ?? [];
                const m3u8Content = await this.client.get(links[1], {
                    headers: {
                        Referer: links[1],
                    },
                });
                result.sources.push({
                    quality: 'auto',
                    url: links[1],
                    isM3U8: links[1].includes('.m3u8'),
                });
                if (m3u8Content.data.includes('EXTM3U')) {
                    const videoList = m3u8Content.data.split('#EXT-X-STREAM-INF:');
                    for (const video of videoList ?? []) {
                        if (!video.includes('m3u8'))
                            continue;
                        const url = video.split('\n')[1];
                        const quality = video.split('RESOLUTION=')[1].split(',')[0].split('x')[1];
                        result.sources.push({
                            url: url,
                            quality: `${quality}p`,
                            isM3U8: url.includes('.m3u8'),
                        });
                    }
                }
                return result;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
    }
}
export default StreamHub;
//# sourceMappingURL=streamhub.js.map