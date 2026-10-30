"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FlameScans = void 0;
const cheerio_1 = require("cheerio");
const models_1 = require("../../models");
const create_provider_context_1 = require("../../utils/create-provider-context");
const manga_1 = require("../../utils/manga");
/** Covers and chapter pages; the CDN serves them without a Referer. */
const IMAGE_CDN = 'https://cdn.flamecomics.xyz/uploads/images/series';
const STATUS = {
  'ongoing': models_1.MediaStatus.ONGOING,
  'completed': models_1.MediaStatus.COMPLETED,
  'hiatus': models_1.MediaStatus.HIATUS,
  'dropped': models_1.MediaStatus.CANCELLED,
  'cancelled': models_1.MediaStatus.CANCELLED,
  'coming soon': models_1.MediaStatus.NOT_YET_AIRED
};
/** Lower-case words without punctuation, so `returners magic` finds "A Returner's Magic". */
const searchable = text => text.toLowerCase().replace(/['`\u2018\u2019]/g, '').replace(/[^a-z0-9\u00c0-\u1fff\u2070-\uffff]+/g, ' ').trim();
/** Plain text of the site's HTML descriptions (paragraphs become blank-line separated). */
const plainText = html => {
  if (!html) return undefined;
  const $ = (0, cheerio_1.load)(html);
  $('br').replaceWith('\n');
  $('p').after('\n\n');
  const text = $.root().text().replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return text || undefined;
};
/** The non-empty strings of a list, trimmed and without repeats. */
const strings = values => Array.isArray(values) ? [...new Set(values.filter(v => typeof v === 'string').map(v => v.trim()))].filter(Boolean) : [];
const parseJson = data => {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
};
const isoDate = unixSeconds => typeof unixSeconds === 'number' && unixSeconds > 0 ? new Date(unixSeconds * 1000).toISOString() : undefined;
/**
 * Flame Comics (https://flamecomics.xyz), the scanlation group formerly at flamescans.org. The site
 * is a Next.js app: every page's data comes as JSON from `/_next/data/<buildId>/<page>.json`.
 */
class FlameScans extends models_1.MangaParser {
  ctx;
  name = 'FlameComics';
  baseUrl = 'https://flamecomics.xyz';
  logo = 'https://flamecomics.xyz/og-default.png';
  classPath = 'MANGA.FlameScans';
  buildIdRequest;
  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor() {
    let ctx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : (0, create_provider_context_1.createProviderContext)();
    super();
    this.ctx = ctx;
  }
  /**
   * The site has no search endpoint: its browse page lists every series, and this keeps the ones
   * whose title has every word of the query. All matches come on page 1.
   *
   * @param query Search query
   * @param page Page number (default 1)
   */
  search = (() => {
    var _this = this;
    return async function (query) {
      let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      const {
        series = []
      } = await _this.nextData('browse');
      const words = searchable(query).split(' ').filter(Boolean);
      const results = page > 1 ? [] : series.filter(entry => typeof entry.series_id === 'number' && entry.title?.trim()).filter(entry => words.every(word => searchable(entry.title).includes(word))).map(entry => _this.toResult(entry));
      return {
        currentPage: page,
        hasNextPage: false,
        results
      };
    };
  })();
  /** @param mangaId series id from `search` (`"101"`) */
  fetchMangaInfo = async mangaId => {
    const id = String(mangaId).trim();
    if (!/^\d+$/.test(id)) throw new Error(`FlameComics: invalid series id '${mangaId}' (expected a number like '101')`);
    const {
      series,
      chapters = []
    } = await this.nextData(`series/${id}`);
    if (!series?.title) throw new Error(`FlameComics: series ${id} not found`);
    const info = this.toResult({
      ...series,
      series_id: series.series_id ?? Number(id)
    });
    const title = info.title;
    const altTitles = strings(series.altTitles).filter(alt => alt.toLowerCase() !== title.toLowerCase());
    if (altTitles.length) info.altTitles = altTitles;
    for (const [field, values] of [['genres', series.tags], ['authors', series.author], ['artists', series.artist]]) {
      const list = strings(values);
      if (list.length) info[field] = list;
    }
    // The site lists the newest chapter first.
    info.chapters = (0, manga_1.sortChaptersForReading)(chapters.map(chapter => this.toChapter(chapter, id)).reverse());
    return info;
  };
  /** @param chapterId chapter id from `fetchMangaInfo` (`"101/327c2f17ef9cacd3"`: series id / chapter token) */
  fetchChapterPages = async chapterId => {
    const match = /^(\d+)\/([A-Za-z0-9]+)$/.exec(String(chapterId).trim());
    if (!match) throw new Error(`FlameComics: invalid chapter id '${chapterId}' (expected '<seriesId>/<token>')`);
    const seriesId = match[1];
    const token = match[2];
    const {
      chapter
    } = await this.nextData(`series/${seriesId}/${token}`);
    if (!chapter) throw new Error(`FlameComics: chapter ${chapterId} not found`);
    // `images` is keyed by position ("0", "1", ...); the site adds the chapter's edit time to bust caches.
    const version = chapter.edit_time ? `?${chapter.edit_time}` : '';
    return Object.entries(chapter.images ?? {}).sort((_ref, _ref2) => {
      let [a] = _ref;
      let [b] = _ref2;
      return Number(a) - Number(b);
    }).map(_ref3 => {
      let [, image] = _ref3;
      return image?.name;
    }).filter(name => typeof name === 'string' && name.length > 0).map((name, i) => ({
      img: `${IMAGE_CDN}/${seriesId}/${token}/${encodeURIComponent(name)}${version}`,
      page: i + 1
    }));
  };
  toResult(series) {
    const id = String(series.series_id);
    const result = {
      id,
      title: series.title.trim(),
      url: `${this.baseUrl}/series/${id}`
    };
    // The site adds the series' edit time to cover URLs to bust caches.
    if (series.cover) {
      const version = series.last_edit ? `?${series.last_edit}` : '';
      result.image = `${IMAGE_CDN}/${id}/${encodeURIComponent(series.cover)}${version}`;
    }
    const description = plainText(series.description);
    if (description) result.description = description;
    const status = series.status?.trim();
    if (status) result.status = STATUS[status.toLowerCase()] ?? models_1.MediaStatus.UNKNOWN;
    if (typeof series.year === 'number' && series.year > 0) result.releaseDate = series.year;
    return result;
  }
  toChapter(chapter, seriesId) {
    const id = `${chapter.series_id ?? seriesId}/${chapter.token}`;
    const chapterNumber = (0, manga_1.parseChapterNumber)(chapter.chapter);
    // Labelled like the site: "Chapter 151 - Season 4 Start", or "Chapter 152" when it has no name.
    const label = `Chapter ${chapterNumber ?? chapter.chapter ?? ''}`.trim();
    const name = chapter.title?.trim();
    const result = {
      id,
      title: name ? `${label} - ${name}` : label
    };
    if (chapterNumber !== undefined) result.chapterNumber = chapterNumber;
    const releaseDate = isoDate(chapter.release_date);
    if (releaseDate) result.releaseDate = releaseDate;
    result.url = `${this.baseUrl}/series/${id}`;
    return result;
  }
  /** `pageProps` of a site page (`browse`, `series/101`), from its Next.js data route. */
  async nextData(path) {
    let retried = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    const buildIdRequest = this.buildId();
    const buildId = await buildIdRequest;
    const {
      status,
      data
    } = await this.ctx.axios.get(`${this.baseUrl}/_next/data/${buildId}/${path}.json`, {
      validateStatus: code => code >= 200 && code < 300 || code === 404
    });
    const json = parseJson(data);
    if (status === 404) {
      // A missing page answers `{ notFound: true }`. Otherwise a deploy replaced the build id, and every
      // data route of the old one answers 404: look the id up again, once.
      if (json?.notFound || retried) throw new Error(`FlameComics: /${path} not found`);
      if (this.buildIdRequest === buildIdRequest) this.buildIdRequest = undefined;
      return this.nextData(path, true);
    }
    if (!json?.pageProps) throw new Error(`FlameComics: no page data for /${path}`);
    return json.pageProps;
  }
  /** The site's current Next.js build id, from the home page (looked up once, then reused). */
  buildId() {
    if (!this.buildIdRequest) {
      this.buildIdRequest = this.ctx.axios.get(`${this.baseUrl}/`).then(_ref4 => {
        let {
          data
        } = _ref4;
        const buildId = /"buildId"\s*:\s*"([^"]+)"/.exec(String(data))?.[1];
        if (!buildId) throw new Error('FlameComics: no Next.js build id on the home page');
        return buildId;
      }).catch(err => {
        // Look it up again next time.
        this.buildIdRequest = undefined;
        throw err;
      });
    }
    return this.buildIdRequest;
  }
}
exports.FlameScans = FlameScans;
//# sourceMappingURL=flamescans.js.map