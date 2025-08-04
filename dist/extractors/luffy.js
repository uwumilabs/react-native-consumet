import { VideoExtractor } from '../models';
import { deobfuscateScript } from '../NativeConsumet';
class Luffy extends VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'luffy';
        this.sources = [];
        this.host = 'https://animeowl.me';
        this.extract = async (videoUrl) => {
            try {
                const { data: server } = await this.client.get(videoUrl.href);
                const jwtRegex = /([A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+)/;
                const { data: script } = await this.client.get(`${this.host}/players/${videoUrl.href.split('/').pop()}.v2.js`);
                const c = await deobfuscateScript(script);
                const jwt = c ? jwtRegex.exec(c)[0] : '';
                server.luffy?.map((item) => {
                    this.sources.push({
                        quality: item.url.match(/[?&]resolution=([^&]+)/)?.[1],
                        url: item.url + jwt,
                        isM3U8: item.url.includes('.m3u8'),
                    });
                });
                return this.sources ?? [];
            }
            catch (err) {
                console.log(err);
                throw new Error(err.message);
            }
        };
    }
}
export default Luffy;
//# sourceMappingURL=luffy.js.map