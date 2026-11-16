import { load, type CheerioAPI } from 'cheerio';

import {
  MangaParser,
  MediaStatus,
  type ISearch,
  type IMangaInfo,
  type IMangaResult,
  type IMangaChapterPage,
  type IMangaChapter,
  type ProviderContext,
} from '../../models';
import { createProviderContext } from '../../utils/create-provider-context';
import { parseChapterNumber } from '../../utils/manga';
import { toMediaStatus } from '../common/media-status';
import { absoluteUrl, chapterTitle, finishChapters, plainText, refererHeaders } from './shared';

const toYear = (text: string): number | undefined => (/^\d{4}$/.test(text) ? Number(text) : undefined);

/** Copies only the fields that have a value, so missing ones are left out rather than `undefined`. */
const defined = <T extends object>(fields: T): T =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as T;

export class MangaPill extends MangaParser {
  override readonly name = 'MangaPill';
  // The image CDN answers 403 to requests without a MangaPill Referer (refererHeaders), covers and
  // pages alike. Image URLs are absolute today; site-relative ones are resolved anyway.
  protected override baseUrl = 'https://mangapill.com';
  protected override logo = 'https://mangapill.com/static/favicon/apple-touch-icon.png';
  protected override classPath = 'MANGA.MangaPill';

  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor(private readonly ctx: ProviderContext = createProviderContext()) {
    super();
  }

  /** @param page page number (default: `1`); the site lists 50 titles a page */
  override search = async (query: string, page: number = 1): Promise<ISearch<IMangaResult>> => {
    const pageQuery = page > 1 ? `&page=${page}` : '';
    const { data } = await this.ctx.axios.get(`${this.baseUrl}/search?q=${encodeURIComponent(query)}${pageQuery}`);
    const $ = load(data);

    const results = $('div.container div.my-3.justify-end > div')
      .map((_, el): IMangaResult | undefined => {
        const card = $(el);
        const link = card.find('div.flex-col > a[href^="/manga/"]').first();
        const id = this.mangaId(link.attr('href') ?? card.find('a[href^="/manga/"]').attr('href'));
        const title = link.children('div').first().text().trim();
        if (!id || !title) return undefined;

        const altTitle = link.children('div').eq(1).text().trim();
        // Type, year and status badges ("manga", "1997", "publishing").
        const badges = card
          .find('div.flex-col > div.flex-wrap')
          .first()
          .children('div')
          .map((__, badge) => $(badge).text().trim())
          .get();
        const status = badges
          .map((badge) => toMediaStatus(badge))
          .find((badge) => badge && badge !== MediaStatus.UNKNOWN);
        const image = absoluteUrl(card.find('a img').attr('data-src') ?? card.find('a img').attr('src'), this.baseUrl);

        return defined({
          id,
          title,
          altTitles: altTitle && altTitle !== title ? [altTitle] : undefined,
          image,
          headerForImage: image ? refererHeaders(this.baseUrl) : undefined,
          url: `${this.baseUrl}/manga/${id}`,
          status,
          releaseDate: badges.map(toYear).find((year) => year !== undefined),
        });
      })
      .get()
      .filter((result): result is IMangaResult => result !== undefined);

    const hasNextPage =
      $('a[href^="/search"]').filter((_, a) => $(a).text().trim().toLowerCase() === 'next').length > 0;

    return { currentPage: page, hasNextPage, results };
  };

  /**
   * @param mangaId Manga id from the search results (e.g. `2/one-piece`)
   */
  override fetchMangaInfo = async (mangaId: string): Promise<IMangaInfo> => {
    const { data } = await this.ctx.axios.get(`${this.baseUrl}/manga/${mangaId}`);
    const $ = load(data);
    // The cover and the details beside it: title, alt title, synopsis, type/status/year, genres.
    const header = $('div.container div.my-3')
      .filter((_, el) => $(el).find('h1').length > 0)
      .first();
    // The value under a label of the details grid ("Type", "Status", "Year").
    const detail = (label: string) =>
      header
        .find('label')
        .filter((_, el) => $(el).text().trim() === label)
        .first()
        .next('div')
        .text()
        .trim();

    const heading = header.find('h1').first();
    const title = heading.text().trim();
    const altTitle = heading.nextAll('div').first().text().trim();
    const cover = header.find('img').first();
    const image = absoluteUrl(cover.attr('data-src') ?? cover.attr('src'), this.baseUrl);
    // The synopsis keeps its line breaks in the markup, which the page shows.
    const description = plainText(header.find('p.text--secondary').first().html());
    const genres = header
      .find('a[href*="genre="]')
      .map((_, a) => $(a).text().trim())
      .get()
      .filter(Boolean);

    return defined({
      id: mangaId,
      title,
      altTitles: altTitle && altTitle !== title ? [altTitle] : undefined,
      image,
      headerForImage: image ? refererHeaders(this.baseUrl) : undefined,
      description,
      status: toMediaStatus(detail('Status')),
      releaseDate: toYear(detail('Year')),
      url: `${this.baseUrl}/manga/${mangaId}`,
      genres: genres.length ? genres : undefined,
      chapters: this.parseChapters($),
    });
  };

  /**
   * @param chapterId Chapter id from the manga info (e.g. `2-11069000/one-piece-chapter-1069`)
   */
  override fetchChapterPages = async (chapterId: string): Promise<IMangaChapterPage[]> => {
    const { data } = await this.ctx.axios.get(`${this.baseUrl}/chapters/${chapterId}`);
    const $ = load(data);

    return $('chapter-page')
      .map((_, el) => {
        const img = $(el).find('img').first();
        return absoluteUrl(img.attr('data-src') ?? img.attr('src'), this.baseUrl);
      })
      .get()
      .filter((img): img is string => Boolean(img))
      .map((img, i): IMangaChapterPage => ({ img, page: i + 1, headerForImage: refererHeaders(this.baseUrl) }));
  };

  /** The site lists chapters newest first; they are returned first chapter first. */
  private parseChapters($: CheerioAPI): IMangaChapter[] {
    const chapters = $('div#chapters a[href^="/chapters/"]')
      .map((_, el): IMangaChapter | undefined => {
        const id = $(el).attr('href')!.split('/chapters/')[1];
        if (!id) return undefined;
        const label = $(el).text().replace(/\s+/g, ' ').trim();
        // The label is "Chapter 1053.4"; the slug ("one-piece-chapter-1053.4") names it too.
        const chapterNumber = parseChapterNumber(label) ?? parseChapterNumber(id.split('/')[1]);
        return defined({
          id,
          title: chapterTitle(label, chapterNumber, id),
          chapterNumber,
          url: `${this.baseUrl}/chapters/${id}`,
        });
      })
      .get()
      .filter((chapter): chapter is IMangaChapter => chapter !== undefined);

    return finishChapters(chapters);
  }

  /** `/manga/2/one-piece` → `2/one-piece`. */
  private mangaId(href: string | undefined): string | undefined {
    return href?.split('/manga/')[1] || undefined;
  }
}
