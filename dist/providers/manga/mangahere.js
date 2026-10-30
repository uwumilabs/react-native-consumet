"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MangaHere = void 0;
const cheerio_1 = require("cheerio");
const models_1 = require("../../models");
const create_provider_context_1 = require("../../utils/create-provider-context");
const manga_1 = require("../../utils/manga");
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MINUTE = 60 * 1000;
const UNITS = {
  second: 1000,
  sec: 1000,
  minute: MINUTE,
  min: MINUTE,
  hour: 60 * MINUTE,
  day: 24 * 60 * MINUTE,
  week: 7 * 24 * 60 * MINUTE
};
// How many chapterfun.ashx requests run at once while collecting a chapter's page images.
const PAGE_REQUESTS_AT_ONCE = 4;
/** Undoes a JavaScript string literal's backslash escapes (`\'` → `'`). */
const unescapeJs = text => text.replace(/\\(.)/g, (_, char) => char === 'n' ? '\n' : char === 'r' ? '\r' : char === 't' ? '\t' : char);
/**
 * Runs Dean Edwards' packer (`eval(function(p,a,c,k,e,d){...}('payload',a,c,'k|e|y|s'.split('|'),0,{}))`)
 * in reverse without evaluating any code: every word of the payload is looked up in the keyword list.
 * Undefined when `source` holds no packed script.
 */
function unpackPackedScript(source) {
  const match = /\}\s*\(\s*'((?:[^'\\]|\\[\s\S])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:[^'\\]|\\[\s\S])*)'\.split\(\s*'\|'\s*\)/.exec(source);
  if (!match) return undefined;
  const radix = Number(match[2]);
  const count = Number(match[3]);
  const keywords = unescapeJs(match[4]).split('|');
  const encode = value => {
    const rest = value % radix;
    return (value < radix ? '' : encode(Math.floor(value / radix))) + (rest > 35 ? String.fromCharCode(rest + 29) : rest.toString(36));
  };
  const words = new Map();
  for (let index = 0; index < count; index++) words.set(encode(index), keywords[index] || encode(index));
  return unescapeJs(match[1]).replace(/\b\w+\b/g, word => words.get(word) ?? word);
}
/** The strings inside a JavaScript array literal's quotes (`'a','b'` or `"a","b"`). */
const quotedStrings = (list, quote) => (list.match(quote === "'" ? /'[^']*'/g : /"[^"]*"/g) ?? []).map(item => item.slice(1, -1));
/**
 * MangaHere's chapter dates as ISO 8601: `Oct 24,2024` → `2024-10-24`, `7 hour ago` → that hour's
 * timestamp, `Today`/`Yesterday` → that date. Other text is returned as the site wrote it.
 */
function parseMangaHereDate(text) {
  let now = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Date.now();
  const value = (text ?? '').trim();
  if (!value) return undefined;
  const calendar = /^([a-z]{3})[a-z]*\.?\s*(\d{1,2})\s*,\s*(\d{4})$/i.exec(value);
  if (calendar) {
    const month = MONTHS.indexOf(calendar[1].toLowerCase());
    const date = new Date(Date.UTC(Number(calendar[3]), month, Number(calendar[2])));
    if (month >= 0 && date.getUTCDate() === Number(calendar[2])) return date.toISOString().slice(0, 10);
    return value;
  }
  const relative = /^(\d+)\s*(second|sec|minute|min|hour|day|week)s?\s+ago$/i.exec(value);
  if (relative) {
    // Rounded down to the unit, so the date doesn't change on every fetch.
    const unit = UNITS[relative[2].toLowerCase()];
    return new Date(Math.floor((now - Number(relative[1]) * unit) / unit) * unit).toISOString();
  }
  if (/^today$/i.test(value)) return new Date(now).toISOString().slice(0, 10);
  if (/^yesterday$/i.test(value)) return new Date(now - UNITS.day).toISOString().slice(0, 10);
  return value;
}
const parseStatus = text => {
  switch (text.trim().toLowerCase()) {
    case 'ongoing':
      return models_1.MediaStatus.ONGOING;
    case 'completed':
      return models_1.MediaStatus.COMPLETED;
    default:
      return undefined;
  }
};
class MangaHere extends models_1.MangaParser {
  ctx;
  name = 'MangaHere';
  baseUrl = 'https://www.mangahere.cc';
  logo = 'https://i.pinimg.com/564x/51/08/62/51086247ed16ff8abae2df0bb06448e4.jpg';
  classPath = 'MANGA.MangaHere';
  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor() {
    let ctx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : (0, create_provider_context_1.createProviderContext)();
    super();
    this.ctx = ctx;
  }
  /** Covers and page images are refused (403) without a MangaHere Referer. */
  get imageHeaders() {
    return {
      Referer: `${this.baseUrl}/`
    };
  }
  /**
   * GET with the cookie that opens titles marked adult. withCredentials: false keeps React Native's
   * native cookie jar from replacing that Cookie header on Android.
   */
  request = (() => {
    var _this = this;
    return async function (url) {
      let headers = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      const {
        data
      } = await _this.ctx.axios.get(url, {
        headers: {
          ...headers,
          Cookie: 'isAdult=1'
        },
        withCredentials: false
      });
      return typeof data === 'string' ? data : String(data ?? '');
    };
  })();
  absoluteUrl = url => {
    const value = url?.trim();
    if (!value) return undefined;
    if (value.startsWith('//')) return `https:${value}`;
    if (value.startsWith('/')) return `${this.baseUrl}${value}`;
    return /^https?:\/\//.test(value) ? value : undefined;
  };
  fetchMangaInfo = async mangaId => {
    try {
      const url = `${this.baseUrl}/manga/${mangaId}/`;
      const $ = (0, cheerio_1.load)(await this.request(url));
      const title = $('span.detail-info-right-title-font').first().text().trim();
      // Unknown ids redirect to the search page, which has no title.
      if (!title) throw new Error(`MangaHere has no manga '${mangaId}'`);
      const mangaInfo = {
        id: mangaId,
        title,
        url
      };
      const description = $('div.detail-info-right > p.fullcontent').text().trim();
      if (description) mangaInfo.description = description;
      const image = this.absoluteUrl($('div.detail-info-cover > img').attr('src'));
      if (image) {
        mangaInfo.image = image;
        mangaInfo.headerForImage = this.imageHeaders;
      }
      const genres = $('p.detail-info-right-tag-list > a').map((_, el) => ($(el).attr('title') || $(el).text()).trim()).get().filter(Boolean);
      if (genres.length) mangaInfo.genres = genres;
      const status = parseStatus($('span.detail-info-right-title-tip').text());
      if (status) mangaInfo.status = status;
      const rating = parseFloat($('span.detail-info-right-title-star span.item-score').text());
      if (Number.isFinite(rating)) mangaInfo.rating = rating;
      const authors = $('p.detail-info-right-say > a').map((_, el) => ($(el).attr('title') || $(el).text()).trim()).get().filter(Boolean);
      if (authors.length) mangaInfo.authors = authors;
      // The site lists the newest chapter first.
      const seen = new Set();
      const chapters = [];
      $('ul.detail-main-list > li > a').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        const id = /\/manga\/(.+?)\/(?:\d+\.html)?$/.exec(href)?.[1];
        if (!id || seen.has(id)) return;
        seen.add(id);
        const label = $(el).find('p.title3').text().trim();
        const chapterNumber = (0, manga_1.parseChapterNumber)(label) ?? numberIn(/\/c(\d+(?:\.\d+)?)$/, id);
        const volumeNumber = (0, manga_1.parseVolumeNumber)(label) ?? numberIn(/\/v(\d+(?:\.\d+)?)\//, id);
        const chapter = {
          id,
          title: label || (chapterNumber !== undefined ? `Chapter ${chapterNumber}` : id.split('/').pop())
        };
        if (chapterNumber !== undefined) chapter.chapterNumber = chapterNumber;
        if (volumeNumber !== undefined) chapter.volumeNumber = volumeNumber;
        const releaseDate = parseMangaHereDate($(el).find('p.title2').text());
        if (releaseDate) chapter.releaseDate = releaseDate;
        const chapterUrl = this.absoluteUrl(href);
        if (chapterUrl) chapter.url = chapterUrl;
        chapters.push(chapter);
      });
      mangaInfo.chapters = (0, manga_1.sortChaptersForReading)(chapters.reverse());
      return mangaInfo;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  fetchChapterPages = async chapterId => {
    const url = `${this.baseUrl}/manga/${chapterId}/1.html`;
    try {
      const html = await this.request(url);
      const $ = (0, cheerio_1.load)(html);
      const notice = $('p.detail-block-content').text().trim();
      if (/Dear user|blocked/.test(notice)) throw new Error(notice);
      const scripts = $('script').map((_, el) => $(el).html() ?? '').get().filter(script => script.includes('eval(function(p,a,c,k,e,d)')).map(script => unpackPackedScript(script) ?? '');
      // The long-strip (webtoon) reader lists every image in one packed script.
      const strip = scripts.map(script => /newImgs\s*=\s*\[([^\]]*)\]/.exec(script)?.[1]).find(Boolean);
      const images = strip !== undefined ? quotedStrings(strip, "'") : await this.fetchReaderImages(url, $, html, scripts);
      const pages = images.map(img => this.absoluteUrl(img));
      if (pages.length === 0 || pages.some(img => !img)) throw new Error(`MangaHere found no pages for '${chapterId}'`);
      return pages.map((img, index) => ({
        page: index + 1,
        img: img,
        headerForImage: this.imageHeaders
      }));
    } catch (err) {
      throw new Error(err.message);
    }
  };
  /**
   * The page-by-page reader loads each image from chapterfun.ashx, whose packed answer names the
   * image of the page asked for and of the page after it; so every other page is asked for, then any
   * page still missing on its own.
   */
  fetchReaderImages = async (chapterUrl, $, html, scripts) => {
    const chapterId = /var\s+chapterid\s*=\s*(\d+)/.exec(html)?.[1];
    // imagecount, else the highest page the pager links to.
    const pageCount = Number(/var\s+imagecount\s*=\s*(\d+)/.exec(html)?.[1]) || Math.max(0, ...$('.pager-list-left a[data-page]').map((_, el) => Number($(el).attr('data-page')) || 0).get());
    if (!chapterId || !pageCount) return [];
    // guidkey=''+'4'+'2'+...; the site also answers with an empty key, which is the fallback.
    const keyScript = scripts.map(script => /guidkey\s*=\s*([^;]*);/.exec(script)?.[1]).find(Boolean);
    const key = keyScript ? quotedStrings(keyScript, "'").join('') : '';
    const pageBase = chapterUrl.slice(0, chapterUrl.lastIndexOf('/'));
    const images = new Array(pageCount).fill(undefined);
    let failure;
    const fetchFrom = async page => {
      try {
        const found = await this.fetchChapterFun(`${pageBase}/chapterfun.ashx?cid=${chapterId}&page=${page}`, chapterUrl, key);
        found.slice(0, 2).forEach((img, offset) => {
          const index = page - 1 + offset;
          if (index < pageCount && !images[index]) images[index] = img;
        });
      } catch (err) {
        // The page is asked for again on its own; the error is thrown if it stays missing.
        failure = err;
      }
    };
    const missingPages = () => images.map((img, index) => img ? 0 : index + 1).filter(page => page > 0);
    const everyOther = [];
    for (let page = 1; page <= pageCount; page += 2) everyOther.push(page);
    await inBatches(everyOther, PAGE_REQUESTS_AT_ONCE, fetchFrom);
    await inBatches(missingPages(), PAGE_REQUESTS_AT_ONCE, fetchFrom);
    const lost = missingPages();
    if (lost.length) {
      if (failure) throw failure;
      throw new Error(`MangaHere returned no image for page ${lost.join(', ')} of ${chapterUrl}`);
    }
    return images;
  };
  /** The image URLs one chapterfun.ashx answer names, retried (with an empty key) when it is empty. */
  fetchChapterFun = async (url, chapterUrl, key) => {
    let sKey = key;
    for (let attempt = 1; attempt <= 3; attempt++) {
      let text = '';
      try {
        text = await this.request(`${url}&key=${sKey}`, {
          'Referer': chapterUrl,
          'X-Requested-With': 'XMLHttpRequest'
        });
      } catch (err) {
        if (attempt === 3) throw err;
        continue;
      }
      const script = unpackPackedScript(text) ?? text;
      const pix = /var\s+pix\s*=\s*"([^"]*)"/.exec(script)?.[1] ?? '';
      const list = /var\s+pvalue\s*=\s*\[([^\]]*)\]/.exec(script)?.[1];
      // The first file is joined to a literal base (the same as pix so far), the others to pix.
      const firstBase = /pvalue\[i\]\s*=\s*"([^"]*)"\s*\+\s*pvalue\[i\]/.exec(script)?.[1] ?? pix;
      const files = list ? quotedStrings(list, '"') : [];
      if (files.length) return files.map((file, index) => `${index === 0 ? firstBase : pix}${file}`);
      sKey = '';
    }
    return [];
  };
  search = (() => {
    var _this2 = this;
    return async function (query) {
      let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      const searchRes = {
        currentPage: page,
        results: []
      };
      try {
        const $ = (0, cheerio_1.load)(await _this2.request(`${_this2.baseUrl}/search?title=${encodeURIComponent(query)}&page=${page}`));
        // The last pager link is `>`; it goes nowhere (javascript:void(0)) on the last page.
        const next = $('div.pager-list-left > a').last();
        searchRes.hasNextPage = next.text().trim() === '>' && /^\//.test(next.attr('href') ?? '');
        $('ul.manga-list-4-list > li').each((_, el) => {
          const link = $(el).find('p.manga-list-4-item-title > a').first();
          const id = /\/manga\/([^/]+)/.exec(link.attr('href') ?? $(el).find('a').first().attr('href') ?? '')?.[1];
          const title = (link.text() || link.attr('title') || '').trim();
          if (!id || !title) return;
          const result = {
            id,
            title,
            url: `${_this2.baseUrl}/manga/${id}/`
          };
          const image = _this2.absoluteUrl($(el).find('img.manga-list-4-cover').attr('src'));
          if (image) {
            result.image = image;
            result.headerForImage = _this2.imageHeaders;
          }
          // The tips are the author, the latest chapter and then the synopsis.
          const description = $(el).find('p.manga-list-4-item-tip').filter((_index, tip) => !/^(Author|Latest Chapter)\s*:/i.test($(tip).text().trim())).last().text().trim();
          if (description) result.description = description;
          const status = parseStatus($(el).find('p.manga-list-4-show-tag-list-2 > a').text());
          if (status) result.status = status;
          searchRes.results.push(result);
        });
        return searchRes;
      } catch (err) {
        throw new Error(err.message);
      }
    };
  })();
}
exports.MangaHere = MangaHere;
const numberIn = (pattern, text) => {
  const digits = pattern.exec(text)?.[1];
  return digits === undefined ? undefined : Number(digits);
};
/** Runs `task` over `items`, `size` at a time. */
async function inBatches(items, size, task) {
  for (let start = 0; start < items.length; start += size) {
    await Promise.all(items.slice(start, start + size).map(item => task(item)));
  }
}
//# sourceMappingURL=mangahere.js.map