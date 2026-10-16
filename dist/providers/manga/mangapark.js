"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Mangapark = void 0;
const cheerio_1 = require("cheerio");
const models_1 = require("../../models");
const create_provider_context_1 = require("../../utils/create-provider-context");
class Mangapark extends models_1.MangaParser {
  ctx;
  name = 'Mangapark';
  baseUrl = 'https://v2.mangapark.net';
  logo = 'https://raw.githubusercontent.com/tachiyomiorg/tachiyomi-extensions/repo/icon/tachiyomi-en.mangapark-v1.3.23.png';
  classPath = 'MANGA.Mangapark';
  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor() {
    let ctx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : (0, create_provider_context_1.createProviderContext)();
    super();
    this.ctx = ctx;
  }
  fetchMangaInfo = (() => {
    var _this = this;
    return async function (mangaId) {
      const mangaInfo = {
        id: mangaId,
        title: ''
      };
      const url = `${_this.baseUrl}/manga/${mangaId}`;
      try {
        const {
          data
        } = await _this.ctx.axios.get(url);
        const $ = (0, cheerio_1.load)(data);
        mangaInfo.title = $('div.pb-1.mb-2.line-b-f.hd h2 a').text();
        mangaInfo.image = $('img.w-100').attr('src');
        mangaInfo.description = $('.limit-html.summary').text();
        mangaInfo.chapters = $('.py-1.item').get().map(chapter => ({
          /*
          See below: if inside of [], removed; if inside of {}, chapterId.
          [https://v2.mangapark.net/manga/] {bungou-stray-dogs/i2573185} [/c87/1]
          */
          id: `${mangaId}/` + $(chapter).find('a.ml-1.visited.ch').attr('href').split(`/manga/${mangaId}/`).toString().replace(',', '').split('/')[0],
          // Get ch.xyz + chapter title, trim l/t whitespace on latter, concatenate.
          title: $(chapter).find('.ml-1.visited.ch').text() + $(chapter).find('div.d-none.d-md-flex.align-items-center.ml-0.ml-md-1.txt').text().trim(),
          // Get 'x time ago' and remove l/t whitespace.
          releaseDate: $(chapter).find('span.time').text().trim()
        }));
        return mangaInfo;
      } catch (err) {
        throw new Error(err.message);
      }
    };
  })();
  fetchChapterPages = (() => {
    var _this2 = this;
    return async function (chapterId) {
      const regex = /var _load_pages = \[(.*)\]/gm;
      // Fetches manga with all pages; no /cx/y after.
      const url = `${_this2.baseUrl}/manga/${chapterId}`;
      try {
        const {
          data
        } = await _this2.ctx.axios.get(url);
        const varLoadPages = data.match(regex)[0];
        const loadPagesJson = JSON.parse(varLoadPages.replace('var _load_pages = ', ''));
        const pages = loadPagesJson.map(page => {
          return {
            page: page.n,
            img: page.u
          };
        });
        return pages;
      } catch (err) {
        throw new Error(err.message);
      }
    };
  })();
  search = (() => {
    var _this3 = this;
    return async function (query) {
      let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      const url = `${_this3.baseUrl}/search?q=${query}&page=${page}`;
      try {
        const {
          data
        } = await _this3.ctx.axios.get(url);
        const $ = (0, cheerio_1.load)(data);
        const results = $('.item').get().map(item => {
          const cover = $(item).find('.cover');
          return {
            id: `${cover.attr('href')?.replace('/manga/', '')}`,
            title: `${cover.attr('title')}`,
            image: `${$(cover).find('img').attr('src')}}`
          };
        });
        return {
          results: results
        };
      } catch (err) {
        throw new Error(err.message);
      }
    };
  })();
}
exports.Mangapark = Mangapark;
//# sourceMappingURL=mangapark.js.map