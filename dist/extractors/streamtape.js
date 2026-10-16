"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StreamTape = void 0;
const cheerio_1 = require("cheerio");
const models_1 = require("../models");
const extension_utils_1 = require("../utils/extension-utils");
class StreamTape extends models_1.VideoExtractor {
  ctx;
  serverName = 'StreamTape';
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
      } = await this.ctx.axios.get(videoUrl.href).catch(() => {
        throw new Error('Video not found');
      });
      const $ = (0, cheerio_1.load)(data);
      let [fh, sh] = $.html()?.match(/robotlink'\).innerHTML = (.*)'/)[1].split("+ ('");
      sh = sh?.substring(3);
      fh = fh?.replace(/\'/g, '');
      const url = `https:${fh}${sh}`;
      this.sources.push({
        url: url,
        isM3U8: url.includes('.m3u8')
      });
      return this.sources;
    } catch (err) {
      throw new Error(err.message);
    }
  };
}
exports.StreamTape = StreamTape;
//# sourceMappingURL=streamtape.js.map