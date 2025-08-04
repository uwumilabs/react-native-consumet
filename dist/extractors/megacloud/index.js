import { VideoExtractor } from '../../models';
import { getSources } from './megacloud.getsrcs';
class MegaCloud extends VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'MegaCloud';
        this.sources = [];
    }
    async extract(embedIframeURL, referer = 'https://hianime.to') {
        try {
            const extractedData = {
                subtitles: [],
                intro: {
                    start: 0,
                    end: 0,
                },
                outro: {
                    start: 0,
                    end: 0,
                },
                sources: [],
            };
            const resp = await getSources(embedIframeURL, referer);
            if (!resp)
                return extractedData;
            if (Array.isArray(resp.sources)) {
                extractedData.sources = resp.sources.map((s) => ({
                    url: s.file,
                    isM3U8: s.type === 'hls',
                    type: s.type,
                }));
            }
            else {
                extractedData.sources = [
                    {
                        url: resp.sources,
                        isM3U8: resp.sources.includes('.m3u8'),
                    },
                ];
            }
            extractedData.intro = resp.intro ? resp.intro : extractedData.intro;
            extractedData.outro = resp.outro ? resp.outro : extractedData.outro;
            extractedData.subtitles = resp.tracks.map((track) => ({
                url: track.file,
                lang: track.label ? track.label : track.kind,
            }));
            return {
                intro: extractedData.intro,
                outro: extractedData.outro,
                sources: extractedData.sources,
                subtitles: extractedData.subtitles,
            };
        }
        catch (err) {
            throw err;
        }
    }
}
export default MegaCloud;
//# sourceMappingURL=index.js.map