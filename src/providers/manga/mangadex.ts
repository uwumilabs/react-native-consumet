import type { AxiosError } from 'axios';

import {
  type IMangaChapter,
  type IMangaChapterPage,
  type IMangaInfo,
  type IMangaResult,
  type ISearch,
  MangaParser,
  MediaStatus,
  type ProviderContext,
} from '../../models';
import { createProviderContext } from '../../utils/create-provider-context';
import { parseChapterNumber, sortChaptersForReading } from '../../utils/manga';

/** Text in several languages, keyed by language code (`en`, `ja-ro`, `pt-br`, ...). */
type Localized = Record<string, string | null | undefined>;

interface Relationship {
  id: string;
  type: string;
  attributes?: Record<string, any>;
}

interface MangaEntity {
  id: string;
  attributes: {
    title?: Localized;
    altTitles?: Localized[];
    description?: Localized;
    status?: string | null;
    year?: number | null;
    contentRating?: string;
    lastVolume?: string | null;
    lastChapter?: string | null;
    chapterNumbersResetOnNewVolume?: boolean;
    links?: Record<string, string> | null;
    tags?: { attributes: { group: string; name: Localized } }[];
  };
  relationships?: Relationship[];
}

interface ChapterEntity {
  id: string;
  attributes: {
    volume?: string | null;
    chapter?: string | null;
    title?: string | null;
    translatedLanguage?: string;
    pages?: number;
    publishAt?: string;
    readableAt?: string;
  };
  relationships?: Relationship[];
}

const STATUSES: Record<string, MediaStatus> = {
  ongoing: MediaStatus.ONGOING,
  completed: MediaStatus.COMPLETED,
  hiatus: MediaStatus.HIATUS,
  cancelled: MediaStatus.CANCELLED,
};

/** Chapters per feed request (the API's maximum). */
const FEED_PAGE_SIZE = 500;
/** MangaDex refuses list requests whose offset + limit is past this. */
const MAX_RESULT_WINDOW = 10000;
/** The feed only lists chapters of titles with these ratings; an id the caller already has is any of them. */
const ALL_CONTENT_RATINGS = ['safe', 'suggestive', 'erotica', 'pornographic'];

/** A query string from `[key, value]` pairs; keys such as `includes[]` are sent as they are. */
const queryString = (params: [string, string | number][]) =>
  params.map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&');

/** A number from MangaDex's numeric strings (`"12"`, `"10.5"`); undefined for empty or other text. */
const toNumber = (text: string | null | undefined): number | undefined => {
  if (typeof text !== 'string' || text.trim() === '') return undefined;
  const value = Number(text.trim());
  return Number.isFinite(value) ? value : undefined;
};

/** The non-empty texts of a localized map, as `[language, text]` pairs. */
const entries = (map: Localized | null | undefined): [string, string][] =>
  Object.entries(map ?? {}).flatMap(([lang, text]) =>
    typeof text === 'string' && text.trim() ? [[lang, text.trim()] as [string, string]] : []
  );

/**
 * The display title (English: the main title when it is English, else the first English alt title;
 * otherwise the main title) and every other title, without repeats.
 */
const pickTitles = (main: Localized | undefined, alts: Localized[] | undefined) => {
  const mainTitles = entries(main);
  const altTitleList = (alts ?? []).flatMap((alt) => entries(alt));
  const chosen =
    mainTitles.find(([lang]) => lang === 'en') ??
    altTitleList.find(([lang]) => lang === 'en') ??
    mainTitles[0] ??
    altTitleList[0];
  const title = chosen ? chosen[1] : '';
  const altTitles: string[] = [];
  for (const [, text] of [...mainTitles, ...altTitleList]) {
    if (text !== title && !altTitles.includes(text)) altTitles.push(text);
  }
  return { title, altTitles };
};

/** MangaDex descriptions are Markdown; this keeps the text and drops the markup. */
const markdownToText = (markdown: string): string =>
  markdown
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images
    .replace(/\[([^\]]+)\]\(([^()]|\([^)]*\))*\)/g, '$1') // links: keep the text
    .replace(/\[\/?(?:b|i|u|s|spoiler|url)(?:=[^\]]*)?\]/gi, '') // BBCode tags
    .replace(/<\/?[a-z][^>]*>/gi, '') // HTML tags
    .replace(/^ {0,3}([-*_])(?: *\1){2,} *$/gm, '') // horizontal rules
    .replace(/^ {0,3}#{1,6} +/gm, '') // headings
    .replace(/^ {0,3}> ?/gm, '') // block quotes
    .replace(/^( *)[*+] +/gm, '$1- ') // list bullets
    .replace(/(\*\*|__)(?=\S)([^\n]*?\S)\1/g, '$2') // bold
    .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\w)/g, '$1$2') // *italic*
    .replace(/(^|[^\w])_(?=\S)([^_\n]*?\S)_(?!\w)/g, '$1$2') // _italic_
    .replace(/~~([^\n]+?)~~/g, '$1') // strikethrough
    .replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, '$1') // escaped characters
    .replace(/[ \t]+$/gm, '') // trailing spaces (Markdown line breaks)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export class MangaDex extends MangaParser {
  override readonly name = 'MangaDex';
  protected override baseUrl = 'https://mangadex.org';
  protected override logo = 'https://pbs.twimg.com/profile_images/1391016345714757632/xbt_jW78_400x400.jpg';
  protected override classPath = 'MANGA.MangaDex';

  private readonly apiUrl = 'https://api.mangadex.org';
  private readonly uploadsUrl = 'https://uploads.mangadex.org';

  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor(private readonly ctx: ProviderContext = createProviderContext()) {
    super();
  }

  /**
   * @param mangaId manga id (a UUID, from a search result)
   * @param lang language of the chapters to list, as MangaDex codes it (default: `en`; e.g. `pt-br`, `es-la`)
   */
  override fetchMangaInfo = async (mangaId: string, lang: string = 'en'): Promise<IMangaInfo> => {
    try {
      const [{ data }, chapters] = await Promise.all([
        this.ctx.axios.get(
          `${this.apiUrl}/manga/${encodeURIComponent(mangaId)}?${queryString([
            ['includes[]', 'cover_art'],
            ['includes[]', 'author'],
            ['includes[]', 'artist'],
          ])}`
        ),
        this.fetchChapters(mangaId, lang),
      ]);
      const manga: MangaEntity = data.data;
      const { attributes } = manga;

      const info: IMangaInfo = this.toResult(manga, false);
      const authors = this.relatedNames(manga, 'author');
      if (authors.length > 0) info.authors = authors;
      const artists = this.relatedNames(manga, 'artist');
      if (artists.length > 0) info.artists = artists;
      const genres = this.tagNames(manga, 'genre');
      if (genres.length > 0) info.genres = genres;
      const themes = this.tagNames(manga, 'theme');
      if (themes.length > 0) info.themes = themes;
      const malId = attributes.links?.mal;
      if (malId) info.malId = toNumber(malId) ?? malId;
      // Titles whose chapter numbers restart each volume can't be sorted by chapter number alone;
      // the feed's own order (volume, then chapter) is the reading order then.
      info.chapters = attributes.chapterNumbersResetOnNewVolume ? chapters : sortChaptersForReading(chapters);

      return info;
    } catch (err) {
      throw this.error(err);
    }
  };

  /**
   * The chapter's pages, from the MangaDex@Home server MangaDex assigns to it.
   * @param chapterId chapter id (from `fetchMangaInfo`)
   * @param dataSaver smaller, compressed images (default: `false`)
   */
  override fetchChapterPages = async (chapterId: string, dataSaver: boolean = false): Promise<IMangaChapterPage[]> => {
    let server: { baseUrl: string; chapter: { hash: string; data?: string[]; dataSaver?: string[] } };
    try {
      ({ data: server } = await this.ctx.axios.get(`${this.apiUrl}/at-home/server/${encodeURIComponent(chapterId)}`));
    } catch (err) {
      throw this.error(err);
    }

    const files = (dataSaver ? server.chapter.dataSaver : server.chapter.data) ?? [];
    if (files.length === 0) {
      // Chapters of official publishers link to their site and have no pages on MangaDex.
      throw new Error(
        `[${this.name}] Chapter ${chapterId} has no pages on MangaDex (it may be hosted on another site)`
      );
    }
    const folder = dataSaver ? 'data-saver' : 'data';
    return files.map((file, index) => ({
      img: `${server.baseUrl}/${folder}/${server.chapter.hash}/${file}`,
      page: index + 1,
    }));
  };

  /**
   * @param query search query
   * @param page page number (default: 1)
   * @param limit limit of results to return (default: 20) (max: 100) (min: 1)
   */
  override search = async (query: string, page: number = 1, limit: number = 20): Promise<ISearch<IMangaResult>> =>
    this.fetchList(
      [
        ['title', query],
        ['order[relevance]', 'desc'],
      ],
      page,
      limit
    );

  fetchRandom = async (): Promise<ISearch<IMangaResult>> => {
    try {
      const { data } = await this.ctx.axios.get(
        `${this.apiUrl}/manga/random?${queryString([['includes[]', 'cover_art']])}`
      );
      return { currentPage: 1, hasNextPage: false, results: [this.toResult(data.data)] };
    } catch (err) {
      throw this.error(err);
    }
  };

  fetchRecentlyAdded = async (page: number = 1, limit: number = 20): Promise<ISearch<IMangaResult>> =>
    this.fetchList(
      [
        ['contentRating[]', 'safe'],
        ['contentRating[]', 'suggestive'],
        ['contentRating[]', 'erotica'],
        ['order[createdAt]', 'desc'],
        ['hasAvailableChapters', 'true'],
      ],
      page,
      limit
    );

  fetchLatestUpdates = async (page: number = 1, limit: number = 20): Promise<ISearch<IMangaResult>> =>
    this.fetchList([['order[latestUploadedChapter]', 'desc']], page, limit);

  fetchPopular = async (page: number = 1, limit: number = 20): Promise<ISearch<IMangaResult>> =>
    this.fetchList(
      [
        ['order[followedCount]', 'desc'],
        ['contentRating[]', 'safe'],
        ['contentRating[]', 'suggestive'],
        ['hasAvailableChapters', 'true'],
      ],
      page,
      limit
    );

  /** One page of `/manga` with the given filters, covers included. */
  private fetchList = async (
    params: [string, string][],
    page: number,
    limit: number
  ): Promise<ISearch<IMangaResult>> => {
    if (page <= 0) throw new Error('Page number must be greater than 0');
    if (limit > 100) throw new Error('Limit must be less than or equal to 100');
    if (limit * (page - 1) >= MAX_RESULT_WINDOW) throw new Error('not enough results');

    const offset = limit * (page - 1);
    try {
      const { data } = await this.ctx.axios.get(
        `${this.apiUrl}/manga?${queryString([...params, ['includes[]', 'cover_art'], ['limit', limit], ['offset', offset]])}`
      );
      if (data.result !== 'ok') throw new Error(data.errors?.[0]?.detail ?? data.message);

      const total: number = data.total ?? 0;
      return {
        currentPage: page,
        hasNextPage: offset + limit < Math.min(total, MAX_RESULT_WINDOW),
        totalResults: total,
        results: (data.data as MangaEntity[]).map((manga) => this.toResult(manga)),
      };
    } catch (err) {
      throw this.error(err);
    }
  };

  /** Every readable chapter in `lang`, in the feed's order (volume, then chapter). */
  private fetchChapters = async (mangaId: string, lang: string): Promise<IMangaChapter[]> => {
    const chapters: IMangaChapter[] = [];
    let offset = 0;
    let total = Infinity;
    while (offset < total && offset < MAX_RESULT_WINDOW) {
      const { data } = await this.ctx.axios.get(
        `${this.apiUrl}/manga/${encodeURIComponent(mangaId)}/feed?${queryString([
          ['translatedLanguage[]', lang],
          // Chapters that only link to a publisher's site, or aren't readable yet, have no pages here.
          ['includeExternalUrl', 0],
          ['includeEmptyPages', 0],
          ['includeFuturePublishAt', 0],
          ['includeUnavailable', 0],
          ...ALL_CONTENT_RATINGS.map((rating): [string, string] => ['contentRating[]', rating]),
          ['includes[]', 'scanlation_group'],
          ['order[volume]', 'asc'],
          ['order[chapter]', 'asc'],
          ['limit', Math.min(FEED_PAGE_SIZE, MAX_RESULT_WINDOW - offset)],
          ['offset', offset],
        ])}`
      );
      const page: ChapterEntity[] = data.data ?? [];
      for (const chapter of page) chapters.push(this.toChapter(chapter));
      total = data.total ?? 0;
      if (page.length === 0) break;
      offset += page.length;
    }
    return chapters;
  };

  /** A title from `/manga`; `thumbnail` picks the 512 px cover instead of the full-size one. */
  private toResult = (manga: MangaEntity, thumbnail: boolean = true): IMangaResult => {
    const { attributes } = manga;
    const { title, altTitles } = pickTitles(attributes.title, attributes.altTitles);
    const result: IMangaResult = { id: manga.id, title };
    if (altTitles.length > 0) result.altTitles = altTitles;

    const cover = manga.relationships?.find((rel) => rel.type === 'cover_art')?.attributes?.fileName;
    if (cover) result.image = `${this.uploadsUrl}/covers/${manga.id}/${cover}${thumbnail ? '.512.jpg' : ''}`;

    const descriptions = entries(attributes.description);
    const description = (descriptions.find(([lang]) => lang === 'en') ?? descriptions[0])?.[1];
    const text = description ? markdownToText(description) : '';
    if (text) result.description = text;

    if (attributes.status) result.status = STATUSES[attributes.status] ?? MediaStatus.UNKNOWN;
    if (typeof attributes.year === 'number') result.releaseDate = attributes.year;
    result.url = `${this.baseUrl}/title/${manga.id}`;
    if (attributes.contentRating) result.contentRating = attributes.contentRating;
    const lastVolume = toNumber(attributes.lastVolume);
    if (lastVolume !== undefined) result.lastVolume = lastVolume;
    const lastChapter = toNumber(attributes.lastChapter);
    if (lastChapter !== undefined) result.lastChapter = lastChapter;
    return result;
  };

  private toChapter = (chapter: ChapterEntity): IMangaChapter => {
    const { attributes } = chapter;
    const chapterNumber = parseChapterNumber(attributes.chapter);
    const volumeNumber = toNumber(attributes.volume);
    const label = attributes.chapter?.trim();
    const result: IMangaChapter = {
      id: chapter.id,
      title:
        attributes.title?.trim() || (chapterNumber !== undefined ? `Chapter ${chapterNumber}` : label || 'Oneshot'),
    };
    if (chapterNumber !== undefined) result.chapterNumber = chapterNumber;
    if (volumeNumber !== undefined) result.volumeNumber = volumeNumber;
    if (typeof attributes.pages === 'number' && attributes.pages > 0) result.pages = attributes.pages;
    const releaseDate = attributes.publishAt ?? attributes.readableAt;
    if (releaseDate) result.releaseDate = releaseDate;
    const groups = (chapter.relationships ?? [])
      .filter((rel) => rel.type === 'scanlation_group')
      .map((rel) => rel.attributes?.name?.trim())
      .filter((name): name is string => Boolean(name));
    if (groups.length > 0) result.scanlator = groups.join(' & ');
    if (attributes.translatedLanguage) result.language = attributes.translatedLanguage;
    result.url = `${this.baseUrl}/chapter/${chapter.id}`;
    return result;
  };

  /** Names of the title's authors or artists (included with the request), without repeats. */
  private relatedNames = (manga: MangaEntity, type: 'author' | 'artist'): string[] => {
    const names: string[] = [];
    for (const rel of manga.relationships ?? []) {
      const name = rel.type === type ? rel.attributes?.name?.trim() : undefined;
      if (name && !names.includes(name)) names.push(name);
    }
    return names;
  };

  private tagNames = (manga: MangaEntity, group: string): string[] =>
    (manga.attributes.tags ?? [])
      .filter((tag) => tag.attributes.group === group)
      .flatMap((tag) => {
        const names = entries(tag.attributes.name);
        const name = (names.find(([lang]) => lang === 'en') ?? names[0])?.[1];
        return name ? [name] : [];
      });

  /** The API's own error message when it sent one (e.g. `Manga ... not found.`). */
  private error = (err: unknown): Error => {
    const response = (err as AxiosError<{ errors?: { detail?: string }[] }>)?.response;
    const detail = response?.data?.errors?.[0]?.detail;
    if (detail) return new Error(`[${this.name}] ${detail}`);
    if ((err as AxiosError)?.code === 'ERR_BAD_REQUEST')
      return new Error(`[${this.name}] Bad request. Make sure you have entered a valid query.`);
    return new Error(`[${this.name}] ${(err as Error)?.message ?? String(err)}`);
  };
}
