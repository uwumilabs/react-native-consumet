"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AsuraScans = void 0;
const models_1 = require("../../models");
const create_provider_context_1 = require("../../utils/create-provider-context");
const media_status_1 = require("../common/media-status");
const shared_1 = require("./shared");
/** The JSON API behind asurascans.com (the site's own pages call it). */
const API_URL = 'https://api.asurascans.com/api';
const PAGE_SIZE = 20;
/**
 * AsuraScans (asurascans.com, formerly asuracomic.net). Ids are the site's series slug
 * (`omniscient-readers-viewpoint`) and `<slug>/chapter/<number>` for chapters.
 */
class AsuraScans extends models_1.MangaParser {
  ctx;
  name = 'AsuraScans';
  baseUrl = 'https://asurascans.com';
  logo = 'https://asurascans.com/images/logo.webp';
  classPath = 'MANGA.AsuraScans';
  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor() {
    let ctx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : (0, create_provider_context_1.createProviderContext)();
    super();
    this.ctx = ctx;
  }
  /** @param page page number (default: 1), 20 results per page */
  search = (() => {
    var _this = this;
    return async function (query) {
      let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      const currentPage = Math.max(1, Math.floor(page) || 1);
      const offset = (currentPage - 1) * PAGE_SIZE;
      const {
        data,
        meta
      } = await _this.api(`/series?search=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${offset}`);
      const results = (data ?? []).map(series => _this.toResult(series));
      return {
        currentPage,
        hasNextPage: meta?.has_more ?? (typeof meta?.total === 'number' && offset + results.length < meta.total),
        results
      };
    };
  })();
  /** @param mangaId series slug from `search` (`series/<slug>-<hash>` ids from asuracomic.net work too) */
  fetchMangaInfo = async mangaId => {
    const slug = encodeURIComponent(mangaId.replace(/^\/?(?:series|comics)\//, '').replace(/\/+$/, ''));
    const [detail, list] = await Promise.all([this.api(`/series/${slug}`), this.api(`/series/${slug}/chapters`)]);
    // A 200 without the JSON the API normally sends (a challenge or error page) has no series.
    const series = detail?.series;
    if (!series?.slug) throw new Error(`AsuraScans: the API sent no series for "${mangaId}"`);
    const seriesUrl = this.absolute(series.public_url);
    const genres = (series.genres ?? []).map(genre => genre.name?.trim()).filter(Boolean);
    const authors = names(series.author);
    const artists = names(series.artist);
    // The API lists newest first; early-access chapters can't be read until they unlock.
    const chapters = (list?.data ?? []).filter(chapter => Number.isFinite(chapter.number) && !isLocked(chapter)).map(chapter => {
      const result = {
        id: `${series.slug}/chapter/${chapter.number}`,
        title: (0, shared_1.chapterTitle)(chapter.title, chapter.number, ''),
        chapterNumber: chapter.number
      };
      const releaseDate = isoDate(chapter.published_at);
      if (releaseDate) result.releaseDate = releaseDate;
      if (seriesUrl) result.url = `${seriesUrl}/chapter/${chapter.number}`;
      return result;
    });
    const info = this.toResult(series);
    if (genres.length > 0) info.genres = genres;
    if (authors) info.authors = authors;
    if (artists) info.artists = artists;
    const recommendations = (detail.recommended_series ?? []).map(item => this.toResult(item));
    if (recommendations.length > 0) info.recommendations = recommendations;
    info.chapters = (0, shared_1.finishChapters)(chapters);
    return info;
  };
  /** @param chapterId chapter id from `fetchMangaInfo` (`<slug>/chapter/<number>`) */
  fetchChapterPages = async chapterId => {
    const match = /^\/?(?:(?:series|comics)\/)?([^/]+)\/chapters?\/([^/?#]+)\/?$/.exec(chapterId);
    if (!match) throw new Error(`AsuraScans: invalid chapter id "${chapterId}"`);
    const [, slug, number] = match;
    const read = await this.api(`/series/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(number)}`);
    const data = read?.data;
    if (!data) throw new Error(`AsuraScans: the API sent no chapter for "${chapterId}"`);
    if (data.access_gate) throw new Error(`AsuraScans: chapter needs ${data.access_gate} on the site`);
    if (data.is_locked) {
      const until = data.unlock_time ? ` until ${data.unlock_time}` : '';
      throw new Error(`AsuraScans: chapter is in early access${until}`);
    }
    const pages = (data.chapter?.pages ?? []).filter(page => page?.url);
    if (pages.length === 0) throw new Error('AsuraScans: chapter has no pages');
    return pages.map((page, index) => ({
      page: index + 1,
      img: this.absolute(page.url)
    }));
  };
  /** GET a path of the JSON API; failures carry the API's own error message. */
  async api(path) {
    try {
      const {
        data
      } = await this.ctx.axios.get(`${API_URL}${path}`, {
        headers: {
          Accept: 'application/json'
        }
      });
      return data;
    } catch (err) {
      const response = err.response;
      const reason = typeof response?.data?.error === 'string' ? response.data.error : err.message;
      throw new Error(`AsuraScans: ${reason}${response?.status ? ` (${response.status})` : ''}`);
    }
  }
  /** The fields search, info and recommendations share. */
  toResult(series) {
    const result = {
      id: series.slug,
      title: series.title.trim()
    };
    const altTitles = (series.alt_titles ?? []).map(title => title?.trim()).filter(Boolean);
    if (altTitles.length > 0) result.altTitles = altTitles;
    const image = this.absolute(series.cover ?? series.cover_url);
    if (image) result.image = image;
    const url = this.absolute(series.public_url);
    if (url) result.url = url;
    const description = (0, shared_1.plainText)(series.description);
    if (description) result.description = description;
    const status = (0, media_status_1.toMediaStatus)(series.status, models_1.MediaStatus);
    if (status) result.status = status;
    // Site extras: manga / manhwa / manhua, the 0-10 user rating, the newest chapter's number.
    if (series.type) result.type = series.type;
    if (series.rating) result.rating = Math.round(series.rating * 100) / 100;
    const latestChapter = series.latest_chapters?.[0]?.number;
    if (typeof latestChapter === 'number') result.latestChapter = latestChapter;
    return result;
  }
  absolute(url) {
    return (0, shared_1.absoluteUrl)(url, this.baseUrl);
  }
}
exports.AsuraScans = AsuraScans;
/** Early-access chapters stay locked until `early_access_until`, as the site's chapter list shows. */
const isLocked = chapter => chapter.early_access_until ? Date.parse(chapter.early_access_until) > Date.now() : chapter.is_premium === true;
/** `Ahn Soseol/ Sunghyun` or `Fit, Geonjin` → separate names; undefined when there are none. */
const names = value => {
  const list = (value ?? '').split(/[/,]/).map(name => name.trim()).filter(Boolean);
  return list.length > 0 ? list : undefined;
};
/** The API's timestamps; its zero date (`0001-01-01`) means none. */
const isoDate = value => value?.startsWith('0001-') ? undefined : (0, shared_1.toIsoDate)(value);
//# sourceMappingURL=asurascans.js.map