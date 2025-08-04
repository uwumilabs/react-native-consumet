import { load } from 'cheerio';
import { VideoExtractor } from '../models';
class StreamTape extends VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'StreamTape';
        this.sources = [];
        this.extract = async (videoUrl) => {
            try {
                const { data } = await this.client.get(videoUrl.href).catch(() => {
                    throw new Error('Video not found');
                });
                const $ = load(data);
                let [fh, sh] = $.html()
                    ?.match(/robotlink'\).innerHTML = (.*)'/)[1]
                    .split("+ ('");
                sh = sh?.substring(3);
                fh = fh?.replace(/\'/g, '');
                const url = `https:${fh}${sh}`;
                this.sources.push({
                    url: url,
                    isM3U8: url.includes('.m3u8'),
                });
                return this.sources;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
    }
}
export default StreamTape;
//# sourceMappingURL=streamtape.js.map