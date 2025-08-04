import { VideoExtractor } from '../models';
class VizCloud extends VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'VizCloud';
        this.sources = [];
        this.host = 'https://vidstream.pro';
        this.keys = {
            cipher: '',
            encrypt: '',
            main: '',
            operations: new Map(),
            pre: [],
            post: [],
        };
        this.extract = async (videoUrl, vizCloudHelper, apiKey) => {
            const vizID = videoUrl.href.split('/');
            let url;
            if (!vizID.length) {
                throw new Error('Video not found');
            }
            else {
                url = `${vizCloudHelper}/vizcloud?query=${encodeURIComponent(vizID.pop() ?? '')}&apikey=${apiKey}`;
            }
            const { data } = await this.client.get(url);
            if (!data.data?.media)
                throw new Error('Video not found');
            this.sources = [
                ...this.sources,
                ...data.data.media.sources.map((source) => ({
                    url: source.file,
                    quality: 'auto',
                    isM3U8: source.file?.includes('.m3u8'),
                })),
            ];
            const main = this.sources[this.sources.length - 1].url;
            const req = await this.client({
                method: 'get',
                url: main,
                headers: { referer: 'https://9anime.to' },
            });
            const resolutions = req.data.match(/(RESOLUTION=)(.*)(\s*?)(\s*.*)/g);
            resolutions?.forEach((res) => {
                const index = main.lastIndexOf('/');
                const quality = res.split('\n')[0]?.split('x')[1].split(',')[0];
                const url = main.slice(0, index);
                this.sources.push({
                    url: url + '/' + res.split('\n')[1],
                    isM3U8: (url + res.split('\n')[1]).includes('.m3u8'),
                    quality: quality + 'p',
                });
            });
            return this.sources;
        };
    }
}
export default VizCloud;
//# sourceMappingURL=vizcloud.js.map