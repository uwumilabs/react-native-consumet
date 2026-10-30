import { load } from 'cheerio';

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

/** Covers and chapter pages; the CDN serves them without a Referer. */
const IMAGE_CDN = 'https://cdn.flamecomics.xyz/uploads/images/series';

/** A series as the site's browse and series pages describe it. */
interface FlameSeries {
  series_id?: number;
  /** Set (instead of `series_id`) on the web novels the browse page also lists. */
  novel_id?: number | null;
  title?: string;
  altTitles?: string[];
  /** HTML on the series page, plain text on the browse page. */
  description?: string | null;
  tags?: string[];
  author?: string[];
  artist?: string[];
  year?: number | null;
  status?: string;
  cover?: string;
  last_edit?: number;
}

interface FlameChapter {
  series_id?: number;
  /** `"12.00"`, `"10.50"` */
  chapter?: string;
  /** The chapter's name; null or empty when it has none. */
  title?: string | null;
  token: string;
  release_date?: number | null;
}

interface FlameReaderChapter {
  edit_time?: number;
  images?: Record<string, { name?: string }> | { name?: string }[];
}

const STATUS: Record<string, MediaStatus> = {
  'ongoing': MediaStatus.ONGOING,
  'completed': MediaStatus.COMPLETED,
  'hiatus': MediaStatus.HIATUS,
  'dropped': MediaStatus.CANCELLED,
  'cancelled': MediaStatus.CANCELLED,
  'coming soon': MediaStatus.NOT_YET_AIRED,
};

/** Lower-case words without punctuation, so `returners magic` finds "A Returner's Magic". */
const searchable = (text: string) =>
  text
    .toLowerCase()
    .replace(/['`\u2018\u2019]/g, '')
    .replace(/[^a-z0-9\u00c0-\u1fff\u2070-\uffff]+/g, ' ')
    .trim();

/** Plain text of the site's HTML descriptions (paragraphs become blank-line separated). */
const plainText = (html: string | null | undefined): string | undefined => {
  if (!html) return undefined;
  const $ = load(html);
  $('br').replaceWith('\n');
  $('p').after('\n\n');
  const text = $.root()
    .text()
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || undefined;
};

/** The non-empty strings of a list, trimmed and without repeats. */
const strings = (values: unknown): string[] =>
  Array.isArray(values)
    ? [...new Set(values.filter((v): v is string => typeof v === 'string').map((v) => v.trim()))].filter(Boolean)
    : [];

const parseJson = (data: unknown): any => {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
};

const isoDate = (unixSeconds: number | null | undefined): string | undefined =>
  typeof unixSeconds === 'number' && unixSeconds > 0 ? new Date(unixSeconds * 1000).toISOString() : undefined;

/**
 * Flame Comics (https://flamecomics.xyz), the scanlation group formerly at flamescans.org. The site
 * is a Next.js app: every page's data comes as JSON from `/_next/data/<buildId>/<page>.json`.
 */
export class FlameScans extends MangaParser {
  override readonly name = 'FlameComics';
  protected override baseUrl = 'https://flamecomics.xyz';
  protected override logo = 'https://flamecomics.xyz/og-default.png';
  protected override classPath = 'MANGA.FlameScans';

  private buildIdRequest?: Promise<string>;

  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor(private readonly ctx: ProviderContext = createProviderContext()) {
    super();
  }

  /**
   * The site has no search endpoint: its browse page lists every series, and this keeps the ones
   * whose title has every word of the query. All matches come on page 1.
   *
   * @param query Search query
   * @param page Page number (default 1)
   */
  override search = async (query: string, page: number = 1): Promise<ISearch<IMangaResult>> => {
    const { series = [] } = await this.nextData<{ series?: FlameSeries[] }>('browse');
    const words = searchable(query).split(' ').filter(Boolean);
    const results =
      page > 1
        ? []
        : series
            .filter((entry) => typeof entry.series_id === 'number' && entry.title?.trim())
            .filter((entry) => words.every((word) => searchable(entry.title!).includes(word)))
            .map((entry) => this.toResult(entry));
    return { currentPage: page, hasNextPage: false, results };
  };

  /** @param mangaId series id from `search` (`"101"`) */
  override fetchMangaInfo = async (mangaId: string): Promise<IMangaInfo> => {
    const id = String(mangaId).trim();
    if (!/^\d+$/.test(id))
      throw new Error(`FlameComics: invalid series id '${mangaId}' (expected a number like '101')`);

    const { series, chapters = [] } = await this.nextData<{ series?: FlameSeries; chapters?: FlameChapter[] }>(
      `series/${id}`
    );
    if (!series?.title) throw new Error(`FlameComics: series ${id} not found`);

    const info: IMangaInfo = this.toResult({ ...series, series_id: series.series_id ?? Number(id) });
    const title = info.title as string;
    const altTitles = strings(series.altTitles).filter((alt) => alt.toLowerCase() !== title.toLowerCase());
    if (altTitles.length) info.altTitles = altTitles;
    for (const [field, values] of [
      ['genres', series.tags],
      ['authors', series.author],
      ['artists', series.artist],
    ] as const) {
      const list = strings(values);
      if (list.length) info[field] = list;
    }
    // The site lists the newest chapter first.
    info.chapters = sortChaptersForReading(chapters.map((chapter) => this.toChapter(chapter, id)).reverse());
    return info;
  };

  /** @param chapterId chapter id from `fetchMangaInfo` (`"101/327c2f17ef9cacd3"`: series id / chapter token) */
  override fetchChapterPages = async (chapterId: string): Promise<IMangaChapterPage[]> => {
    const match = /^(\d+)\/([A-Za-z0-9]+)$/.exec(String(chapterId).trim());
    if (!match) throw new Error(`FlameComics: invalid chapter id '${chapterId}' (expected '<seriesId>/<token>')`);
    const seriesId = match[1]!;
    const token = match[2]!;

    const { chapter } = await this.nextData<{ chapter?: FlameReaderChapter }>(`series/${seriesId}/${token}`);
    if (!chapter) throw new Error(`FlameComics: chapter ${chapterId} not found`);

    // `images` is keyed by position ("0", "1", ...); the site adds the chapter's edit time to bust caches.
    const version = chapter.edit_time ? `?${chapter.edit_time}` : '';
    return Object.entries(chapter.images ?? {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, image]) => image?.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0)
      .map((name, i) => ({
        img: `${IMAGE_CDN}/${seriesId}/${token}/${encodeURIComponent(name)}${version}`,
        page: i + 1,
      }));
  };

  private toResult(series: FlameSeries): IMangaResult {
    const id = String(series.series_id);
    const result: IMangaResult = { id, title: series.title!.trim(), url: `${this.baseUrl}/series/${id}` };
    // The site adds the series' edit time to cover URLs to bust caches.
    if (series.cover) {
      const version = series.last_edit ? `?${series.last_edit}` : '';
      result.image = `${IMAGE_CDN}/${id}/${encodeURIComponent(series.cover)}${version}`;
    }
    const description = plainText(series.description);
    if (description) result.description = description;
    const status = series.status?.trim();
    if (status) result.status = STATUS[status.toLowerCase()] ?? MediaStatus.UNKNOWN;
    if (typeof series.year === 'number' && series.year > 0) result.releaseDate = series.year;
    return result;
  }

  private toChapter(chapter: FlameChapter, seriesId: string): IMangaChapter {
    const id = `${chapter.series_id ?? seriesId}/${chapter.token}`;
    const chapterNumber = parseChapterNumber(chapter.chapter);
    // Labelled like the site: "Chapter 151 - Season 4 Start", or "Chapter 152" when it has no name.
    const label = `Chapter ${chapterNumber ?? chapter.chapter ?? ''}`.trim();
    const name = chapter.title?.trim();
    const result: IMangaChapter = { id, title: name ? `${label} - ${name}` : label };
    if (chapterNumber !== undefined) result.chapterNumber = chapterNumber;
    const releaseDate = isoDate(chapter.release_date);
    if (releaseDate) result.releaseDate = releaseDate;
    result.url = `${this.baseUrl}/series/${id}`;
    return result;
  }

  /** `pageProps` of a site page (`browse`, `series/101`), from its Next.js data route. */
  private async nextData<T>(path: string, retried = false): Promise<T> {
    const buildIdRequest = this.buildId();
    const buildId = await buildIdRequest;
    const { status, data } = await this.ctx.axios.get(`${this.baseUrl}/_next/data/${buildId}/${path}.json`, {
      validateStatus: (code: number) => (code >= 200 && code < 300) || code === 404,
    });
    const json = parseJson(data);
    if (status === 404) {
      // A missing page answers `{ notFound: true }`. Otherwise a deploy replaced the build id, and every
      // data route of the old one answers 404: look the id up again, once.
      if (json?.notFound || retried) throw new Error(`FlameComics: /${path} not found`);
      if (this.buildIdRequest === buildIdRequest) this.buildIdRequest = undefined;
      return this.nextData<T>(path, true);
    }
    if (!json?.pageProps) throw new Error(`FlameComics: no page data for /${path}`);
    return json.pageProps as T;
  }

  /** The site's current Next.js build id, from the home page (looked up once, then reused). */
  private buildId(): Promise<string> {
    if (!this.buildIdRequest) {
      this.buildIdRequest = this.ctx.axios
        .get(`${this.baseUrl}/`)
        .then(({ data }) => {
          const buildId = /"buildId"\s*:\s*"([^"]+)"/.exec(String(data))?.[1];
          if (!buildId) throw new Error('FlameComics: no Next.js build id on the home page');
          return buildId;
        })
        .catch((err) => {
          // Look it up again next time.
          this.buildIdRequest = undefined;
          throw err;
        });
    }
    return this.buildIdRequest;
  }
}
