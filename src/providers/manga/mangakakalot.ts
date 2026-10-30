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
import { parseChapterNumber, parseVolumeNumber, sortChaptersForReading } from '../../utils/manga';

/** One chapter as the site's chapter-list API (`/api/manga/<slug>/chapters`) returns it. */
interface ChapterRow {
  chapter_name?: string;
  chapter_slug?: string;
  chapter_num?: number | string | null;
  updated_at?: string;
  view?: number;
}

// The chapter-list API pages through a title's chapters, newest first. The site's own page asks
// for 50 at a time; 500 keeps long series to a few requests (Cloudflare blocks `limit=1000`).
const CHAPTERS_PER_REQUEST = 500;
const MAX_CHAPTER_REQUESTS = 40;
/** Titles per search page, in both the HTML and the JSON form. */
const SEARCH_PAGE_SIZE = 20;

/**
 * The search word the site's own search box sends: punctuation and spaces become `_`, which the
 * site reads as a space (`Re:Zero` → `re_zero`).
 */
const searchWord = (query: string): string =>
  query
    .toLowerCase()
    .replace(/[\s!-/:-@[-`{-~]+/g, '_')
    .replace(/^_+|_+$/g, '');

/** `2024-11-03T11:37:28.000000Z` (the API's microseconds) → `2024-11-03T11:37:28.000Z`. */
const toIsoDate = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?Z$/.exec(value.trim());
  if (match) return `${match[1]}.${(match[2] ?? '').padEnd(3, '0').slice(0, 3)}Z`;
  const time = Date.parse(value);
  return Number.isNaN(time) ? value : new Date(time).toISOString();
};

export class MangaKakalot extends MangaParser {
  override readonly name = 'MangaKakalot';
  // mangakakalot.com is gone; mangakakalot.gg redirects here, and manganato.gg is the same site
  // (same titles, ids and image hosts) under another name.
  protected override baseUrl = 'https://www.kakamanga.com';
  protected override logo = 'https://www.kakamanga.com/images/svg/logo-kkl.svg';
  protected override classPath = 'MANGA.MangaKakalot';

  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor(private readonly ctx: ProviderContext = createProviderContext()) {
    super();
  }

  /**
   * Covers and pages are on 2xstorage.com, which answers 403 unless the Referer is the site's
   * origin (exactly `https://www.kakamanga.com/`; a page URL is refused too).
   */
  private imageHeaders = (): Record<string, string> => ({ Referer: `${this.baseUrl}/` });

  private absoluteUrl = (url: string | undefined): string | undefined => {
    const value = url?.trim();
    if (!value) return undefined;
    if (value.startsWith('//')) return `https:${value}`;
    if (value.startsWith('/')) return `${this.baseUrl}${value}`;
    return /^https?:\/\//.test(value) ? value : undefined;
  };

  /** The title's slug (its id) in `https://www.kakamanga.com/manga/<slug>`. */
  private slugFromUrl = (url: string | undefined): string | undefined => /\/manga\/([^/?#]+)/.exec(url ?? '')?.[1];

  /**
   * @param query Search query
   * @param page Page number (default: 1)
   */
  override search = async (query: string, page: number = 1): Promise<ISearch<IMangaResult>> => {
    // /search/story/<word> is behind a Cloudflare challenge. The search box's endpoint serves the
    // same results page, and JSON to requests sent with X-Requested-With (the search box's own).
    // Cloudflare caches whichever it answered first for a URL, so either can come back.
    const { data } = await this.ctx.axios.get(
      `${this.baseUrl}/home/search/json?searchword=${encodeURIComponent(searchWord(query))}&page=${page}`
    );
    const json = typeof data === 'string' && /^\s*\[/.test(data) ? JSON.parse(data) : data;
    if (Array.isArray(json)) return this.searchFromJson(json, page);

    const $ = load(data);
    const results: IMangaResult[] = [];
    $('.panel_story_list .story_item').each((_, el) => {
      const link = $(el).find('.story_name a').first();
      const result = this.searchResult(link.attr('href'), link.text(), $(el).find('img').first().attr('src'));
      if (result) results.push(result);
    });

    const next = $('.panel_page_number .group_page a')
      .filter((_, el) => $(el).text().trim().toLowerCase() === 'next')
      .first();
    return {
      currentPage: Number($('.panel_page_number .page_select').first().text().trim()) || page,
      hasNextPage: next.attr('href') !== undefined && !next.hasClass('page_disabled'),
      results,
    };
  };

  /** The JSON form of a search page: `[{ name, url, thumb, slug, ... }]`, with no pagination. */
  private searchFromJson = (items: any[], page: number): ISearch<IMangaResult> => {
    const results = items
      .map((item) =>
        this.searchResult(
          typeof item?.url === 'string' ? item.url : `/manga/${item?.slug}`,
          load(String(item?.name ?? ''), null, false)
            .root()
            .text(),
          item?.thumb
        )
      )
      .filter((result): result is IMangaResult => result !== undefined);
    // Pages hold SEARCH_PAGE_SIZE titles, so a full page is taken to have a next one.
    return { currentPage: page, hasNextPage: items.length >= SEARCH_PAGE_SIZE, results };
  };

  private searchResult = (href: unknown, name: string, cover: unknown): IMangaResult | undefined => {
    const url = this.absoluteUrl(typeof href === 'string' ? href : undefined);
    const id = this.slugFromUrl(url);
    const title = name.replace(/\s+/g, ' ').trim();
    if (!url || !id || !title) return undefined;
    const result: IMangaResult = { id, title, url };
    const image = this.absoluteUrl(typeof cover === 'string' ? cover : undefined);
    if (image) Object.assign(result, { image, headerForImage: this.imageHeaders() });
    return result;
  };

  /** @param mangaId the title's slug, e.g. `tomodachi-game` (from search results) */
  override fetchMangaInfo = async (mangaId: string): Promise<IMangaInfo> => {
    const [{ data }, chapters] = await Promise.all([
      this.ctx.axios.get(`${this.baseUrl}/manga/${mangaId}`),
      this.fetchChapters(mangaId),
    ]);
    const $ = load(data);

    const title = $('.manga-info-text h1').first().text().trim();
    const info: IMangaInfo = { id: mangaId, title, url: `${this.baseUrl}/manga/${mangaId}` };

    // `Alternative : A; B`, which can repeat the title itself.
    const altTitles = $('.manga-info-text h2.story-alternative')
      .first()
      .text()
      .replace(/^\s*Alternative\s*:/i, '')
      .split(';')
      .map((alt) => alt.replace(/\s+/g, ' ').trim())
      .filter((alt, i, all) => alt && alt !== title && all.indexOf(alt) === i);
    if (altTitles.length) info.altTitles = altTitles;

    const image = this.absoluteUrl($('.manga-info-pic img').first().attr('src'));
    if (image) Object.assign(info, { image, headerForImage: this.imageHeaders() });

    const description = this.description($);
    if (description) info.description = description;

    // `Author(s) : A, B`, `Status : Ongoing`, `View : 41,148,877`, ...
    const fields: Record<string, string> = {};
    $('.manga-info-text > li:not(:has(h1))').each((_, el) => {
      const match = /^([^:]+?)\s*:\s*(.*)$/.exec($(el).text().replace(/\s+/g, ' ').trim());
      if (match) fields[match[1]!.toLowerCase()] = match[2]!.trim();
    });

    const authors = (fields['author(s)'] ?? '')
      .split(',')
      .map((author) => author.trim())
      .filter((author) => author && author.toLowerCase() !== 'unknown');
    if (authors.length) info.authors = authors;

    const status = (fields.status ?? '').toLowerCase();
    if (status === 'ongoing') info.status = MediaStatus.ONGOING;
    else if (status === 'completed') info.status = MediaStatus.COMPLETED;

    const genres = $('.manga-info-text li.genres a')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);
    if (genres.length) info.genres = genres;

    const views = parseInt((fields.view ?? '').replace(/,/g, ''), 10);
    if (Number.isFinite(views)) info.views = views;

    info.chapters = chapters;
    return info;
  };

  /** @param chapterId `<title slug>/<chapter slug>`, e.g. `tomodachi-game/chapter-127-5` */
  override fetchChapterPages = async (chapterId: string): Promise<IMangaChapterPage[]> => {
    const { data } = await this.ctx.axios.get(`${this.baseUrl}/manga/${chapterId}`);
    const $ = load(data);

    return $('.container-chapter-reader img')
      .map((_, el) => this.absoluteUrl($(el).attr('src') ?? $(el).attr('data-src')))
      .get()
      .filter((img): img is string => Boolean(img))
      .map((img, i): IMangaChapterPage => ({ img, page: i + 1, headerForImage: this.imageHeaders() }));
  };

  /**
   * The synopsis under the `<title> summary:` heading, as plain text. Some titles store it as
   * escaped HTML (`&amp;quot;`, `&lt;br&gt;`), so its text is read as HTML once more: whitespace
   * collapses as a browser would and `<br>` breaks lines.
   */
  private description = ($: CheerioAPI): string | undefined => {
    const box = $('#contentBox').first().clone();
    box.find('h2').remove();
    box.find('br').replaceWith('&lt;br&gt;');
    const html = box
      .text()
      .replace(/\s+/g, ' ')
      .replace(/<br\s*\/?>/gi, '\n');
    const text = load(html, null, false)
      .root()
      .text()
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return text || undefined;
  };

  /** Every chapter of a title from the chapter-list API, in reading order. */
  private fetchChapters = async (mangaId: string): Promise<IMangaChapter[]> => {
    const rows: ChapterRow[] = [];
    for (let request = 0; request < MAX_CHAPTER_REQUESTS; request++) {
      const { data } = await this.ctx.axios.get(
        `${this.baseUrl}/api/manga/${mangaId}/chapters?limit=${CHAPTERS_PER_REQUEST}&offset=${rows.length}`
      );
      const body = typeof data === 'string' ? JSON.parse(data) : data;
      const page: ChapterRow[] | undefined = body?.data?.chapters;
      if (!body?.success || !Array.isArray(page)) {
        throw new Error(`MangaKakalot: no chapter list for '${mangaId}' (${body?.message ?? 'unexpected response'})`);
      }
      rows.push(...page);
      if (!body.data.pagination?.has_more || page.length === 0) break;
    }

    // A chapter published while paging shifts the offsets, so a row can come twice.
    const seen = new Set<string>();
    const chapters: IMangaChapter[] = [];
    for (const row of rows) {
      const chapter = this.toChapter(mangaId, row);
      if (!chapter || seen.has(chapter.id)) continue;
      seen.add(chapter.id);
      chapters.push(chapter);
    }
    return sortChaptersForReading(chapters.reverse());
  };

  private toChapter = (mangaId: string, row: ChapterRow): IMangaChapter | undefined => {
    const slug = row.chapter_slug?.trim();
    if (!slug) return undefined;
    const label = row.chapter_name?.replace(/\s+/g, ' ').trim() ?? '';
    const apiNumber = row.chapter_num === null || row.chapter_num === '' ? NaN : Number(row.chapter_num);
    const chapterNumber = parseChapterNumber(label) ?? (Number.isFinite(apiNumber) ? apiNumber : undefined);

    const chapter: IMangaChapter = {
      id: `${mangaId}/${slug}`,
      title: label || (chapterNumber !== undefined ? `Chapter ${chapterNumber}` : slug),
    };
    if (chapterNumber !== undefined) chapter.chapterNumber = chapterNumber;
    const volumeNumber = parseVolumeNumber(label);
    if (volumeNumber !== undefined) chapter.volumeNumber = volumeNumber;
    const releaseDate = toIsoDate(row.updated_at);
    if (releaseDate) chapter.releaseDate = releaseDate;
    if (typeof row.view === 'number') chapter.views = row.view;
    chapter.url = `${this.baseUrl}/manga/${mangaId}/${slug}`;
    return chapter;
  };
}
