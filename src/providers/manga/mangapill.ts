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
import { parseChapterNumber, sortChaptersForReading } from '../../utils/manga';

// The status labels MangaPill uses (its search filter lists the same five).
const STATUSES: Record<string, MediaStatus> = {
  'publishing': MediaStatus.ONGOING,
  'finished': MediaStatus.COMPLETED,
  'on hiatus': MediaStatus.HIATUS,
  'discontinued': MediaStatus.CANCELLED,
  'not yet published': MediaStatus.NOT_YET_AIRED,
};

const toStatus = (text: string): MediaStatus | undefined =>
  text ? (STATUSES[text.toLowerCase()] ?? MediaStatus.UNKNOWN) : undefined;

const toYear = (text: string): number | undefined => (/^\d{4}$/.test(text) ? Number(text) : undefined);

/** Plain text: whitespace within a line collapses to one space, paragraph breaks stay. */
const cleanText = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** Copies only the fields that have a value, so missing ones are left out rather than `undefined`. */
const defined = <T extends object>(fields: T): T =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as T;

export class MangaPill extends MangaParser {
  override readonly name = 'MangaPill';
  protected override baseUrl = 'https://mangapill.com';
  protected override logo =
    'https://scontent-man2-1.xx.fbcdn.net/v/t39.30808-6/300819578_399903675586699_2357525969702348451_n.png?_nc_cat=100&ccb=1-7&_nc_sid=09cbfe&_nc_ohc=Md2cQ4wRNWwAX-_U0fz&_nc_ht=scontent-man2-1.xx&oh=00_AfCJjAYDk9bsndz8uyNG-GdFIYcPvdIzbHnetHGzf1pVSw&oe=63BDD131';
  protected override classPath = 'MANGA.MangaPill';

  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor(private readonly ctx: ProviderContext = createProviderContext()) {
    super();
  }

  /**
   * @param query Search query
   * @param page Page number (default: `1`); the site lists 50 titles a page
   */
  override search = async (query: string, page: number = 1): Promise<ISearch<IMangaResult>> => {
    try {
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
          const status = badges.find((badge) => STATUSES[badge.toLowerCase()]);
          const image = this.absoluteUrl(card.find('a img').attr('data-src') ?? card.find('a img').attr('src'));

          return defined({
            id,
            title,
            altTitles: altTitle && altTitle !== title ? [altTitle] : undefined,
            image,
            headerForImage: image ? this.imageHeaders() : undefined,
            url: `${this.baseUrl}/manga/${id}`,
            status: status ? toStatus(status) : undefined,
            releaseDate: badges.map(toYear).find((year) => year !== undefined),
          });
        })
        .get()
        .filter((result): result is IMangaResult => result !== undefined);

      const hasNextPage =
        $('a[href^="/search"]').filter((_, a) => $(a).text().trim().toLowerCase() === 'next').length > 0;

      return { currentPage: page, hasNextPage, results };
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * @param mangaId Manga id from the search results (e.g. `2/one-piece`)
   */
  override fetchMangaInfo = async (mangaId: string): Promise<IMangaInfo> => {
    try {
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
      const image = this.absoluteUrl(cover.attr('data-src') ?? cover.attr('src'));
      const description = cleanText(header.find('p.text--secondary').first().text());
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
        headerForImage: image ? this.imageHeaders() : undefined,
        description: description || undefined,
        status: toStatus(detail('Status')),
        releaseDate: toYear(detail('Year')),
        url: `${this.baseUrl}/manga/${mangaId}`,
        genres: genres.length ? genres : undefined,
        chapters: this.parseChapters($),
      });
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * @param chapterId Chapter id from the manga info (e.g. `2-11069000/one-piece-chapter-1069`)
   */
  override fetchChapterPages = async (chapterId: string): Promise<IMangaChapterPage[]> => {
    try {
      const { data } = await this.ctx.axios.get(`${this.baseUrl}/chapters/${chapterId}`);
      const $ = load(data);

      return $('chapter-page')
        .map((_, el) => {
          const img = $(el).find('img').first();
          return this.absoluteUrl(img.attr('data-src') ?? img.attr('src'));
        })
        .get()
        .filter((img): img is string => Boolean(img))
        .map((img, i): IMangaChapterPage => ({ img, page: i + 1, headerForImage: this.imageHeaders() }));
    } catch (err) {
      throw new Error((err as Error).message);
    }
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
          title: label || (chapterNumber !== undefined ? `Chapter ${chapterNumber}` : id),
          chapterNumber,
          url: `${this.baseUrl}/chapters/${id}`,
        });
      })
      .get()
      .filter((chapter): chapter is IMangaChapter => chapter !== undefined);

    return sortChaptersForReading(chapters.reverse());
  }

  /** The image CDN answers 403 to requests without a MangaPill Referer, covers and pages alike. */
  private imageHeaders(): Record<string, string> {
    return { Referer: `${this.baseUrl}/` };
  }

  /** `/manga/2/one-piece` → `2/one-piece`. */
  private mangaId(href: string | undefined): string | undefined {
    return href?.split('/manga/')[1] || undefined;
  }

  /** Image URLs are absolute today; resolve site-relative ones anyway (Hermes' global URL is incomplete). */
  private absoluteUrl(url: string | undefined): string | undefined {
    const value = url?.trim();
    if (!value) return undefined;
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('//')) return `https:${value}`;
    return `${this.baseUrl}/${value.replace(/^\/+/, '')}`;
  }
}
