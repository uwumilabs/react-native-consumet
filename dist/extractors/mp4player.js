"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Mp4Player = void 0;
const models_1 = require("../models");
const extension_utils_1 = require("../utils/extension-utils");
class Mp4Player extends models_1.VideoExtractor {
  ctx;
  serverName = 'mp4player';
  sources = [];
  domains = ['mp4player.site'];
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
      const response = await this.ctx.axios.get(videoUrl.href);
      const data = response.data.match(new RegExp('(?<=sniff\\()(.*)(?=\\))'))[0]?.replace(/\"/g, '')?.split(',');
      const link = `https://${videoUrl.host}/m3u8/${data[1]}/${data[2]}/master.txt?s=1&cache=${data[7]}`;
      //const thumbnails = response.data.match(new RegExp('(?<=file":")(.*)(?=","kind)'))[0]?.replace(/\\/g, '');
      const m3u8Content = await this.ctx.axios.get(link, {
        headers: {
          accept: '*/*',
          referer: videoUrl.href
        }
      });
      if (m3u8Content.data.includes('EXTM3U')) {
        const videoList = m3u8Content.data.split('#EXT-X-STREAM-INF:');
        for (const video of videoList ?? []) {
          if (video.includes('BANDWIDTH')) {
            const url = video.split('\n')[1];
            const quality = video.split('RESOLUTION=')[1].split('\n')[0].split('x')[1];
            result.sources.push({
              url: url,
              quality: `${quality}`,
              isM3U8: url.includes('.m3u8')
            });
          }
        }
      }
      return result;
    } catch (err) {
      throw new Error(err.message);
    }
  };
}
exports.Mp4Player = Mp4Player;
//# sourceMappingURL=mp4player.js.map