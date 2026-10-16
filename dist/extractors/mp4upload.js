"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Mp4Upload = void 0;
const models_1 = require("../models");
const extension_utils_1 = require("../utils/extension-utils");
class Mp4Upload extends models_1.VideoExtractor {
  ctx;
  serverName = 'mp4upload';
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
      const playerSrc = data.replace(/\n/g, ' ').match(/player\.src\(\s*{\s*type:\s*"[^"]+",\s*src:\s*"([^"]+)"\s*}\s*\);/);
      const streamUrl = playerSrc[1];
      if (!streamUrl) throw new Error('Stream url not found');
      this.sources.push({
        quality: 'auto',
        url: streamUrl,
        isM3U8: streamUrl.includes('.m3u8')
      });
      return this.sources;
    } catch (err) {
      throw new Error(err.message);
    }
  };
}
exports.Mp4Upload = Mp4Upload;
//# sourceMappingURL=mp4upload.js.map