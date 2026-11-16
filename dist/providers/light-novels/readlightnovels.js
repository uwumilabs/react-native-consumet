"use strict";

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ReadLightNovels = void 0;
const cheerio_1 = require("cheerio");
const form_data_1 = __importDefault(require("form-data"));
const models_1 = require("../../models");
const create_provider_context_1 = require("../../utils/create-provider-context");
const media_status_1 = require("../common/media-status");
class ReadLightNovels extends models_1.LightNovelParser {
  ctx;
  name = 'Read Light Novels';
  baseUrl = 'https://readlightnovels.net';
  logo = 'https://i.imgur.com/RDPjbc6.png';
  classPath = 'LIGHT_NOVELS.ReadLightNovels';
  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor() {
    let ctx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : (0, create_provider_context_1.createProviderContext)();
    super();
    this.ctx = ctx;
  }
  /**
   * @param lightNovelUrl light novel URL or id
   * @param chapterPage one page of the chapter list, counting from 1 (default: every page)
   */
  fetchLightNovelInfo = async (lightNovelUrl, chapterPage) => {
    if (!lightNovelUrl.startsWith(this.baseUrl)) {
      lightNovelUrl = `${this.baseUrl}/${lightNovelUrl}.html`;
    }
    const lightNovelInfo = {
      id: lightNovelUrl.split('/')?.pop()?.replace('.html', ''),
      title: '',
      url: lightNovelUrl
    };
    const page = await this.ctx.axios.get(lightNovelUrl, {
      headers: {
        Referer: lightNovelUrl
      }
    });
    const $ = (0, cheerio_1.load)(page.data);
    const novelId = parseInt($('#id_post').val());
    lightNovelInfo.title = $('div.col-xs-12.col-sm-8.col-md-8.desc > h3').text();
    lightNovelInfo.image = $('div.col-xs-12.col-sm-4.col-md-4.info-holder > div.books > div > img').attr('src');
    lightNovelInfo.author = $('div.col-xs-12.col-sm-4.col-md-4.info-holder > div.info > div:nth-child(1) > a').text();
    lightNovelInfo.genres = $(' div.col-xs-12.col-sm-4.col-md-4.info-holder > div.info > div:nth-child(2) > a').map((i, el) => $(el).text()).get();
    lightNovelInfo.rating = parseFloat($('div.col-xs-12.col-sm-8.col-md-8.desc > div.rate > div.small > em > strong:nth-child(1) > span').text());
    lightNovelInfo.views = parseInt($('div.col-xs-12.col-sm-4.col-md-4.info-holder > div.info > div:nth-child(4) > span').text());
    lightNovelInfo.description = $('div.col-xs-12.col-sm-8.col-md-8.desc > div.desc-text > hr').eq(0).nextUntil('hr').text();
    const pages = Math.max(...$('#pagination > ul > li').map((i, el) => parseInt($(el).find('a').attr('data-page'))).get().filter(x => !isNaN(x)));
    lightNovelInfo.status = (0, media_status_1.toMediaStatus)($('div.col-xs-12.col-sm-4.col-md-4.info-holder > div.info > div:nth-child(3) > span').text(), models_1.MediaStatus);
    lightNovelInfo.pages = pages;
    // Pages count from 1; anything else (the -1 this once took for "every page" too) lists them all.
    lightNovelInfo.chapters = chapterPage !== undefined && chapterPage >= 1 ? await this.fetchChapters(novelId, chapterPage, lightNovelUrl) : await this.fetchAllChapters(novelId, pages, lightNovelUrl);
    return lightNovelInfo;
  };
  fetchChapters = async (novelId, chapterPage, referer) => {
    const chapters = [];
    const bodyFormData = new form_data_1.default();
    bodyFormData.append('action', 'tw_ajax');
    bodyFormData.append('type', 'pagination');
    bodyFormData.append('page', chapterPage);
    bodyFormData.append('id', novelId);
    const page = await this.ctx.axios({
      method: 'post',
      url: `${this.baseUrl}/wp-admin/admin-ajax.php`,
      data: bodyFormData,
      headers: {
        'referer': referer,
        'content-type': 'multipart/form-data',
        'origin': this.baseUrl,
        'user-agent': this.ctx.USER_AGENT
      }
    });
    const $ = (0, cheerio_1.load)(page.data.list_chap);
    for (const chapter of $('ul.list-chapter > li')) {
      const subId = $(chapter).find('a').attr('href').split('/')?.pop().replace('.html', '');
      const id = $(chapter).find('a').attr('href').split('/')[3];
      chapters.push({
        id: `${id}/${subId}`,
        title: $(chapter).find('a > span').text().trim(),
        url: $(chapter).find('a').attr('href')
      });
    }
    return chapters;
  };
  fetchAllChapters = async (novelId, pages, referer) => {
    const chapters = [];
    for (const pageNumber of Array.from({
      length: pages
    }, (_, i) => i + 1)) {
      const chaptersPage = await this.fetchChapters(novelId, pageNumber, referer);
      chapters.push(...chaptersPage);
    }
    return chapters;
  };
  /** @param chapterId chapter id or URL */
  fetchChapterContent = async chapterId => {
    if (!chapterId.startsWith(this.baseUrl)) {
      chapterId = `${this.baseUrl}/${chapterId}.html`;
    }
    const contents = {
      novelTitle: '',
      chapterTitle: '',
      text: ''
    };
    const page = await this.ctx.axios.get(chapterId);
    const $ = (0, cheerio_1.load)(page.data);
    contents.novelTitle = $('.truyen-title').text();
    contents.chapterTitle = $('.chapter-title').text();
    for (const line of $('div.chapter-content > p')) {
      if ($(line).text() !== '﻿') {
        contents.text += `${$(line).text()}\n`;
      }
    }
    return contents;
  };
  search = async query => {
    const result = {
      results: []
    };
    const res = await this.ctx.axios.post(`${this.baseUrl}/?s=${encodeURIComponent(query)}`);
    const $ = (0, cheerio_1.load)(res.data);
    $('div.col-xs-12.col-sm-12.col-md-9.col-truyen-main > div:nth-child(1) > div > div:nth-child(2) > div.col-md-3.col-sm-6.col-xs-6.home-truyendecu').each((i, el) => {
      result.results.push({
        id: $(el).find('a').attr('href')?.split('/')[3].replace('.html', ''),
        title: $(el).find('a > div > h3').text(),
        url: $(el).find('a').attr('href'),
        image: $(el).find('a > img').attr('src')
      });
    });
    return result;
  };
}
exports.ReadLightNovels = ReadLightNovels;
//# sourceMappingURL=readlightnovels.js.map