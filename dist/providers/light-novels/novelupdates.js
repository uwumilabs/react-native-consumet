"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NovelUpdates = void 0;
const cheerio_1 = require("cheerio");
const models_1 = require("../../models");
const create_provider_context_1 = require("../../utils/create-provider-context");
const media_status_1 = require("../common/media-status");
class NovelUpdates extends models_1.LightNovelParser {
  ctx;
  name = 'NovelUpdates';
  baseUrl = 'https://www.novelupdates.com';
  proxyURL = 'http://translate.google.com/translate?sl=ja&tl=en&u=';
  logo = 'https://www.novelupdates.com/appicon.png';
  classPath = 'LIGHT_NOVELS.NovelUpdates';
  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor() {
    let ctx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : (0, create_provider_context_1.createProviderContext)();
    super();
    this.ctx = ctx;
  }
  /** Requests a page as text through the context axios. */
  requestText = (() => {
    var _this = this;
    return async function (url) {
      let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      const {
        data
      } = await _this.ctx.axios.request({
        url,
        ...config,
        responseType: 'text'
      });
      return data;
    };
  })();
  /**
   * @param lightNovelUrl light novel URL or id
   * @param _chapterPage ignored: NovelUpdates lists every chapter in one request. Kept so existing calls compile.
   */
  fetchLightNovelInfo = async (lightNovelUrl, _chapterPage) => {
    if (!lightNovelUrl.startsWith(this.baseUrl)) {
      lightNovelUrl = `${this.baseUrl}/series/${lightNovelUrl}`;
    }
    const lightNovelInfo = {
      id: lightNovelUrl.split('/')?.pop(),
      title: '',
      url: lightNovelUrl
    };
    const page = await this.requestText(`${this.proxyURL}${encodeURIComponent(lightNovelUrl)}`, {
      headers: {
        Referer: lightNovelUrl
      }
    });
    const $ = (0, cheerio_1.load)(page);
    if ($('title').html() === 'Just a moment...' || $('title').html() === 'Attention Required! | Cloudflare') {
      throw new Error('NovelUpdates: Cloudflare blocked the request');
    }
    lightNovelInfo.title = $('div.seriestitlenu').text()?.trim();
    lightNovelInfo.image = $('div.seriesimg img').attr('src');
    lightNovelInfo.author = $('div#showauthors a').text();
    lightNovelInfo.genres = $('div#seriesgenre a').map((i, el) => $(el).text()).get();
    lightNovelInfo.description = $('div#editdescription').text()?.trim();
    lightNovelInfo.status = (0, media_status_1.toMediaStatus)($('div#editstatus').text(), models_1.MediaStatus);
    const postId = $('input#mypostid').attr('value');
    lightNovelInfo.chapters = await this.fetchChapters(postId);
    // The average vote out of 5, doubled to a 10-point scale.
    lightNovelInfo.rating = Number($('h5.seriesother span.uvotes').text()?.split(' /')[0]?.substring(1) ?? 0) * 2;
    return lightNovelInfo;
  };
  fetchChapters = async postId => {
    const chapters = [];
    const chapterData = (await this.requestText(`${this.baseUrl}/wp-admin/admin-ajax.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': '_ga=;'
      },
      data: `action=nd_getchapters&mypostid=${postId}&mypostid2=0`
    })).substring(1);
    const $ = (0, cheerio_1.load)(chapterData);
    $('li.sp_li_chp a[data-id]').each((index, el) => {
      const id = $(el).attr('data-id');
      const title = $(el).find('span').text();
      chapters.push({
        id: id,
        title: title,
        url: `${this.baseUrl}/extnu/${id}`
      });
    });
    return chapters;
  };
  /** @param chapterId chapter id or URL */
  fetchChapterContent = async chapterId => {
    if (!chapterId.startsWith(this.baseUrl)) {
      chapterId = `${this.baseUrl}/extnu/${chapterId}`;
    }
    const contents = {
      novelTitle: '',
      chapterTitle: '',
      text: ''
    };
    const data = await this.requestText(`${this.proxyURL}${encodeURIComponent(chapterId)}`);
    const $ = (0, cheerio_1.load)(data);
    contents.novelTitle = $('title').text();
    contents.chapterTitle = $('title').text();
    contents.text = data;
    return contents;
  };
  search = async query => {
    const result = {
      results: []
    };
    const res = await this.requestText(`${this.proxyURL}${encodeURIComponent(`${this.baseUrl}/series-finder/?sf=1&sh=${encodeURIComponent(query)}`)}`, {
      headers: {
        Referer: this.baseUrl
      }
    });
    const $ = (0, cheerio_1.load)(res);
    $('div.search_main_box_nu').each((i, el) => {
      result.results.push({
        id: $(el).find('div.search_body_nu div.search_title a').attr('href')?.split('/series/')[1].split('/')[0],
        title: $(el).find('div.search_body_nu div.search_title a').text(),
        url: $(el).find('div.search_body_nu div.search_title a').attr('href'),
        image: $(el).find('div.search_img_nu img').attr('src')
      });
    });
    return result;
  };
}
exports.NovelUpdates = NovelUpdates;
//# sourceMappingURL=novelupdates.js.map