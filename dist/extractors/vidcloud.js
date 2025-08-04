// @ts-nocheck
import { VideoExtractor } from '../models';
import { USER_AGENT } from '../utils';
import { getSources } from './megacloud/megacloud.getsrcs';
class VidCloud extends VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'VidCloud';
        this.sources = [];
        this.extract = async (videoUrl, _, referer = 'https://flixhq.to/') => {
            const result = {
                sources: [],
                subtitles: [],
            };
            try {
                const options = {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Referer': videoUrl.href,
                        'User-Agent': USER_AGENT,
                    },
                };
                const resp = await getSources(videoUrl, referer);
                if (!resp) {
                    throw new Error('Failed to get sources from getSources function');
                }
                if (Array.isArray(resp.sources)) {
                    for (const source of resp.sources) {
                        const { data } = await this.client.get(source.file, options);
                        const urls = data
                            .split('\n')
                            .filter((line) => line.includes('.m3u8') || line.endsWith('m3u8'));
                        const qualities = data.split('\n').filter((line) => line.includes('RESOLUTION='));
                        const TdArray = qualities.map((s, i) => {
                            const f1 = s.split('x')[1];
                            const f2 = urls[i];
                            return [f1, f2];
                        });
                        for (const [f1, f2] of TdArray) {
                            this.sources.push({
                                url: f2,
                                quality: f1,
                                isM3U8: f2.includes('.m3u8') || f2.endsWith('m3u8'),
                            });
                        }
                        result.sources.push(...this.sources);
                    }
                }
                if (resp.sources && typeof resp.sources === 'string') {
                    result.sources.push({
                        url: resp.sources,
                        isM3U8: resp.sources.includes('.m3u8') || resp.sources.endsWith('m3u8'),
                        quality: 'auto',
                    });
                }
                if (resp.tracks && Array.isArray(resp.tracks)) {
                    result.subtitles = resp.tracks.map((s) => ({
                        url: s.file,
                        lang: s.label ? s.label : 'Default (maybe)',
                    }));
                }
                return result;
            }
            catch (err) {
                throw err;
            }
        };
    }
}
export default VidCloud;
//# sourceMappingURL=vidcloud.js.map