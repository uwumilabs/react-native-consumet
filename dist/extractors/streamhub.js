"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StreamHub = void 0;
const models_1 = require("../models");
const extension_utils_1 = require("../utils/extension-utils");
class StreamHub extends models_1.VideoExtractor {
  ctx;
  serverName = 'StreamHub';
  sources = [];
  /** @param ctx extractor context; requests go through its axios (default: the library's) */
  constructor() {
    let ctx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : extension_utils_1.defaultExtractorContext;
    super();
    this.ctx = ctx;
  }
  extract = async videoUrl => {
    try {
      const result = {
        sources: [],
        subtitles: []
      };
      const {
        data
      } = await this.ctx.axios.get(videoUrl.href).catch(() => {
        throw new Error('Video not found');
      });
      const unpackedData = eval(/(eval)(\(f.*?)(\n<\/script>)/m.exec(data.replace(/\n/g, ' '))[2].replace('eval', ''));
      const links = unpackedData.match(new RegExp('sources:\\[\\{src:"(.*?)"')) ?? [];
      const m3u8Content = await this.ctx.axios.get(links[1], {
        headers: {
          Referer: links[1]
        }
      });
      result.sources.push({
        quality: 'auto',
        url: links[1],
        isM3U8: links[1].includes('.m3u8')
      });
      if (m3u8Content.data.includes('EXTM3U')) {
        const videoList = m3u8Content.data.split('#EXT-X-STREAM-INF:');
        for (const video of videoList ?? []) {
          if (!video.includes('m3u8')) continue;
          const url = video.split('\n')[1];
          const quality = video.split('RESOLUTION=')[1].split(',')[0].split('x')[1];
          result.sources.push({
            url: url,
            quality: `${quality}p`,
            isM3U8: url.includes('.m3u8')
          });
        }
      }
      return result;
    } catch (err) {
      throw new Error(err.message);
    }
  };
}
exports.StreamHub = StreamHub;
//# sourceMappingURL=streamhub.js.map