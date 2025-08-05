"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../models");
const NativeConsumet_1 = require("../NativeConsumet");
class Luffy extends models_1.VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'luffy';
        this.sources = [];
        this.host = 'https://animeowl.me';
        this.extract = async (videoUrl) => {
            try {
                const { data: server } = await axios.get(videoUrl.href);
                const jwtRegex = /([A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+)/;
                const { data: script } = await axios.get(`${this.host}/players/${videoUrl.href.split('/').pop()}.v2.js`);
                const c = await (0, NativeConsumet_1.deobfuscateScript)(script);
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
exports.default = Luffy;
//# sourceMappingURL=luffy.js.map