"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ComicK = void 0;
const models_1 = require("../../models");
const create_provider_context_1 = require("../../utils/create-provider-context");
class ComicK extends models_1.MangaParser {
  ctx;
  name = 'ComicK';
  baseUrl = 'https://comick.app';
  logo = 'https://th.bing.com/th/id/OIP.fw4WrmAoA2PmKitiyMzUIgAAAA?pid=ImgDet&rs=1';
  classPath = 'MANGA.ComicK';
  apiUrl = 'https://api.comick.io';
  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor() {
    let ctx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : (0, create_provider_context_1.createProviderContext)();
    super();
    this.ctx = ctx;
  }
  /** GETs a path of the ComicK API through the context axios */
  apiGet = path => this.ctx.axios.get(path, {
    baseURL: this.apiUrl,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });
  /**
   * @description Fetches info about the manga
   * @param mangaId Comic slug
   * @returns Promise<IMangaInfo>
   */
  fetchMangaInfo = async mangaId => {
    try {
      const req = await this.apiGet(`/comic/${mangaId}`);
      const data = req.data.comic;
      const links = Object.values(data.links ?? []).filter(link => link !== null);
      const mangaInfo = {
        id: data.hid,
        title: data.title,
        altTitles: data.md_titles ? data.md_titles.map(title => title.title) : [],
        description: data.desc,
        genres: data.md_comic_md_genres?.map(genre => genre.md_genres.name),
        status: data.status ?? 0 === 0 ? models_1.MediaStatus.ONGOING : models_1.MediaStatus.COMPLETED,
        image: `https://meo.comick.pictures${data.md_covers ? data.md_covers[0].b2key : ''}`,
        malId: data.links?.mal,
        links: links,
        chapters: []
      };
      const allChapters = await this.fetchAllChapters(mangaId, 1);
      for (const chapter of allChapters) {
        mangaInfo.chapters?.push({
          id: chapter.hid,
          title: chapter.title ?? chapter.chap,
          chapterNumber: chapter.chap,
          volumeNumber: chapter.vol,
          releaseDate: chapter.created_at
        });
      }
      return mangaInfo;
    } catch (err) {
      if (err.code === 'ERR_BAD_REQUEST') throw new Error(`[${this.name}] Bad request. Make sure you have entered a valid query.`);
      throw new Error(err.message);
    }
  };
  /**
   *
   * @param chapterId Chapter ID (HID)
   * @returns Promise<IMangaChapterPage[]>
   */
  fetchChapterPages = async chapterId => {
    try {
      const {
        data
      } = await this.apiGet(`/chapter/${chapterId}`);
      const pages = [];
      data.chapter.md_images.map((image, index) => {
        pages.push({
          img: `https://meo.comick.pictures/${image.b2key}?width=${image.w}`,
          page: index
        });
      });
      return pages;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  /**
   * @param query search query
   * @param page page number (default: 1)
   * @param limit limit of results to return (default: 20) (max: 100) (min: 1)
   */
  search = (() => {
    var _this = this;
    return async function (query) {
      let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      let limit = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 20;
      if (page < 1) throw new Error('Page number must be greater than 1');
      if (limit > 300) throw new Error('Limit must be less than or equal to 300');
      if (limit * (page - 1) >= 10000) throw new Error('not enough results');
      try {
        const req = await _this.apiGet(`/v1.0/search?q=${encodeURIComponent(query)}&limit=${limit}&page=${page}`);
        const results = {
          currentPage: page,
          results: []
        };
        const data = await req.data;
        for (const manga of data) {
          let cover = manga.md_covers ? manga.md_covers[0] : null;
          if (cover && cover.b2key !== undefined) {
            cover = `https://meo.comick.pictures${cover.b2key}`;
          }
          results.results.push({
            id: manga.slug,
            title: manga.title ?? manga.slug,
            altTitles: manga.md_titles ? manga.md_titles.map(title => title.title) : [],
            image: cover
          });
        }
        return results;
      } catch (err) {
        throw new Error(err.message);
      }
    };
  })();
  fetchAllChapters = async (mangaId, page) => {
    if (page <= 0) {
      page = 1;
    }
    const comicId = await this.getComicId(mangaId);
    const req = await this.apiGet(`/comic/${comicId}/chapters?page=${page}`);
    return req.data.chapters;
  };
  /**
   * @description Fetches the comic HID from the slug
   * @param id Comic slug
   * @returns Promise<string> empty if not found
   */
  async getComicId(id) {
    const req = await this.apiGet(`/comic/${id}`);
    const data = req.data.comic;
    return data ? data.hid : '';
  }
}
exports.ComicK = ComicK;
//# sourceMappingURL=comick.js.map