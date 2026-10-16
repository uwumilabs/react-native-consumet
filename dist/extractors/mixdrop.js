"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MixDrop = void 0;
const models_1 = require("../models");
const extension_utils_1 = require("../utils/extension-utils");
class MixDrop extends models_1.VideoExtractor {
  ctx;
  serverName = 'MixDrop';
  sources = [];
  /** @param ctx extractor context; requests go through its axios (default: the library's) */
  constructor() {
    let ctx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : extension_utils_1.defaultExtractorContext;
    super();
    this.ctx = ctx;
  }
  extract = async videoUrl => {
    try {
      const {
        data
      } = await this.ctx.axios.get(videoUrl.href);
      const formated = eval(/(eval)(\(f.*?)(\n<\/script>)/m.exec(data.replace(/\n/g, ' '))[2].replace('eval', ''));
      const [poster, source] = formated.match(/poster="([^"]+)"|wurl="([^"]+)"/g).map(x => x.split(`="`)[1].replace(/"/g, '')).map(x => x.startsWith('http') ? x : `https:${x}`);
      this.sources.push({
        url: source,
        isM3U8: source.includes('.m3u8'),
        poster: poster
      });
      return this.sources;
    } catch (err) {
      throw new Error(err.message);
    }
  };
}
exports.MixDrop = MixDrop;
//# sourceMappingURL=mixdrop.js.map