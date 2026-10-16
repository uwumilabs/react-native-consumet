"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VizCloud = void 0;
const models_1 = require("../models");
const extension_utils_1 = require("../utils/extension-utils");
class VizCloud extends models_1.VideoExtractor {
  ctx;
  serverName = 'VizCloud';
  sources = [];
  host = 'https://vidstream.pro';
  keys = {
    cipher: '',
    encrypt: '',
    main: '',
    operations: new Map(),
    pre: [],
    post: []
  };
  /** @param ctx extractor context; requests go through its axios (default: the library's) */
  constructor() {
    let ctx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : extension_utils_1.defaultExtractorContext;
    super();
    this.ctx = ctx;
  }
  extract = async (videoUrl, vizCloudHelper, apiKey) => {
    const vizID = videoUrl.href.split('/');
    let url;
    if (!vizID.length) {
      throw new Error('Video not found');
    } else {
      url = `${vizCloudHelper}/vizcloud?query=${encodeURIComponent(vizID.pop() ?? '')}&apikey=${apiKey}`;
    }
    const {
      data
    } = await this.ctx.axios.get(url);
    if (!data.data?.media) throw new Error('Video not found');
    this.sources = [...this.sources, ...data.data.media.sources.map(source => ({
      url: source.file,
      quality: 'auto',
      isM3U8: source.file?.includes('.m3u8')
    }))];
    const main = this.sources[this.sources.length - 1].url;
    const req = await this.ctx.axios({
      method: 'get',
      url: main,
      headers: {
        referer: 'https://9anime.to'
      }
    });
    const resolutions = req.data.match(/(RESOLUTION=)(.*)(\s*?)(\s*.*)/g);
    resolutions?.forEach(res => {
      const index = main.lastIndexOf('/');
      const quality = res.split('\n')[0]?.split('x')[1].split(',')[0];
      const url = main.slice(0, index);
      this.sources.push({
        url: url + '/' + res.split('\n')[1],
        isM3U8: (url + res.split('\n')[1]).includes('.m3u8'),
        quality: quality + 'p'
      });
    });
    return this.sources;
  };
}
exports.VizCloud = VizCloud;
//# sourceMappingURL=vizcloud.js.map