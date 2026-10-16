"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StreamLare = void 0;
const cheerio_1 = require("cheerio");
const models_1 = require("../models");
const extension_utils_1 = require("../utils/extension-utils");
class StreamLare extends models_1.VideoExtractor {
  ctx;
  serverName = 'StreamLare';
  sources = [];
  host = 'https://streamlare.com';
  regex = new RegExp('/[ve]/([^?#&/]+)');
  USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36';
  /** @param ctx extractor context; requests go through its axios (default: the library's) */
  constructor() {
    let ctx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : extension_utils_1.defaultExtractorContext;
    super();
    this.ctx = ctx;
  }
  async extract(videoUrl) {
    let userAgent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.USER_AGENT.toString();
    const res = await this.ctx.axios.get(videoUrl.href);
    const $ = (0, cheerio_1.load)(res.data);
    const CSRF_TOKEN = $('head > meta:nth-child(3)').attr('content')?.toString();
    const videoId = videoUrl.href.match(this.regex)[1];
    if (videoId === undefined) {
      throw new Error('Video id not matched!');
    }
    const POST = await this.ctx.axios.post(this.host + '/api/video/stream/get', {
      id: videoId
    }, {
      headers: {
        'User-Agent': userAgent
      }
    });
    const POST_RES = POST.data;
    const result = {
      headers: {
        'User-Agent': userAgent
      },
      status: POST_RES.status,
      message: POST_RES.message,
      type: POST_RES.type,
      token: POST_RES.token,
      sources: POST_RES.result
    };
    if (POST_RES.status === 'error') {
      throw new Error('Request Failed! Error: ' + POST_RES.message);
    }
    return result;
  }
}
exports.StreamLare = StreamLare;
//# sourceMappingURL=streamlare.js.map