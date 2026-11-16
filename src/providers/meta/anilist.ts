import { type AxiosAdapter } from 'axios';
import { metaHttp, ENRICHMENT_TIMEOUT_MS } from '../../utils/meta-http';

import {
  AnimeParser,
  type ISearch,
  type IAnimeInfo,
  type IAnimeResult,
  type ISource,
  type IAnimeEpisode,
  type IEpisodeServer,
  Genres,
  MangaParser,
  type IMangaChapterPage,
  type IMangaInfo,
  type IMangaResult,
  type IMangaChapter,
  type ProxyConfig,
  type ITitle,
  type IStaff,
  type AniZipEpisode,
  type ProviderCapabilities,
  type IAnimeProvider,
  MetaError,
} from '../../models';
import type { IMetaAnimeEpisode } from '../../models/types';
import { normalizeTitle, searchTerm } from '../../utils/utils';
import { Zoro } from '../anime/zoro/zoro';
import { MangaDex } from '../manga/mangadex';
import {
  ADVANCED_SEARCH_QUERY,
  AIRING_SCHEDULE_QUERY,
  CHARACTER_QUERY,
  EPISODES_MEDIA_QUERY,
  GENRES_QUERY,
  MEDIA_DETAIL_QUERY,
  POPULAR_QUERY,
  SEARCH_QUERY,
  STAFF_QUERY,
  TRENDING_QUERY,
  WEEKDAYS,
  episodeCounts,
  mapAnimeDetail,
  mapBrowseResult,
  mapCharacterMedia,
  mapMangaDetail,
  mapMediaResult,
  mapTitle,
  pickCover,
} from './anilist-media';
import {
  applyFiller,
  bestTitleMatch,
  callProvider,
  fetchFillerEpisodes,
  toEpisodeNumber,
  type FillerEpisode,
  type TitleMatch,
} from './shared';

/** A failed AniList request as a MetaError, keeping its status, with a readable message for 404 and 429. */
const anilistError = (err: unknown): MetaError => {
  const status = (err as { response?: { status?: unknown } })?.response?.status;
  if (status === 404)
    return MetaError.from('anilist', err, 'Media not found. Perhaps the id is invalid or the anime is not in anilist');
  if (status === 429)
    return MetaError.from('anilist', err, 'You have been ratelimited by anilist. Please try again later');
  return MetaError.from('anilist', err);
};

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';
const MALSYNC_URL = 'https://api.malsync.moe';

/** POST a query to AniList, its values in `variables`, failing with an anilistError. */
const anilistQuery = async (query: string, variables?: Record<string, unknown>) => {
  try {
    const { data } = await metaHttp.post(
      ANILIST_GRAPHQL_URL,
      { query, variables },
      { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } }
    );
    return data;
  } catch (err) {
    throw anilistError(err);
  }
};

/** A page of AniList's `Page` answer, with `results` mapped from its `items`. */
const toPage = <T>(page: any, results: T[]): ISearch<T> => ({
  currentPage: page?.pageInfo?.currentPage,
  hasNextPage: page?.pageInfo?.hasNextPage,
  results,
});

/** A weekday as an index into WEEKDAYS, from that index or the day's name. */
const weekdayIndex = (day: number | string): number => {
  const index =
    typeof day === 'string' ? WEEKDAYS.findIndex((name) => name.toLowerCase() === day.trim().toLowerCase()) : day;
  if (!Number.isInteger(index) || index < 0 || index >= WEEKDAYS.length)
    throw new Error('Invalid weekStart or weekEnd');
  return index;
};

/**
 * Unix seconds (AniList's `airingAt`) from the start of `weekStart`'s next occurrence, today
 * included, to the end of the first `weekEnd` on or after it, in local time.
 */
const airingWindow = (weekStart: number | string, weekEnd: number | string, now: Date = new Date()) => {
  const start = weekdayIndex(weekStart);
  const end = weekdayIndex(weekEnd);
  const today = (now.getDay() + 1) % 7; // as a WEEKDAYS index, which starts on Saturday
  const firstDay = (start - today + 7) % 7;
  const dayCount = ((end - start + 7) % 7) + 1;
  const midnight = (offset: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset).getTime() / 1000;
  return { from: midnight(firstDay), to: midnight(firstDay + dayCount) };
};

const DAY_MS = 86_400_000;

/** A regular (numbered) ani.zip episode, keyed by its AniDB episode number. */
type AniZipEntry = {
  key: number;
  time?: number;
  title?: string;
  description?: string;
  image?: string;
  releaseDate?: string;
  tvdbNumber?: number;
  absoluteNumber?: number;
};

/** A provider episode, with the AniDB episode number when ani.zip matched it. */
type MergedEpisode = { episode: IAnimeEpisode; aniDbKey?: number };

const timeOf = (date: unknown): number | undefined => {
  if (typeof date !== 'string' || !date) return undefined;
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? undefined : time;
};

/**
 * The key apps store watch progress under: `${anilistId}$ep=${aniDbKey ?? number}`. Falls back to
 * the list position only when the provider gave the episode no usable number.
 */
const episodeUniqueId = (anilistId: string, { episode, aniDbKey }: MergedEpisode, index: number) =>
  `${anilistId}$ep=${aniDbKey ?? toEpisodeNumber(episode.number) ?? index + 1}`;

const romanToArabic = (roman: string): number => {
  const values: Record<string, number> = { i: 1, v: 5, x: 10 };
  const digits = roman.toLowerCase();
  let result = 0;
  for (let i = 0; i < digits.length; i++) {
    const current = values[digits[i]!]!;
    const next = values[digits[i + 1]!];
    if (next && current < next) {
      result += next - current;
      i++;
    } else {
      result += current;
    }
  }
  return result;
};

/**
 * An anime title in the form provider titles are compared in: normalizeTitle without anything in
 * parentheses (`(TV)`, `(Dub)`) or season words, roman numerals (I to IX) as digits, and common
 * romanization variants (`yuu`, ` ou`) spelled one way.
 */
const animeTitle = (title: string): string =>
  normalizeTitle(title.replace(/\([^)]*\)/g, ' '))
    .replace(/(th|rd|nd|st) season/g, '')
    .replace(/season/g, '')
    .replace(/\b(ix|iv|v?i{1,3}|v)\b/g, (numeral) => String(romanToArabic(numeral)))
    .replace(/yuu/g, 'yu')
    .replace(/ ou/g, ' oh')
    .replace(/ {2,}/g, ' ')
    .trim();

/** Results less similar than this to every AniList title are not the anime. */
const MIN_TITLE_SIMILARITY = 0.6;

/** Subbed episodes a provider result lists, for preferring the fuller of two equal matches. */
const subCount = (result: IAnimeResult): number => {
  if (typeof result.episodes?.sub === 'number') return result.episodes.sub;
  if (typeof result.sub === 'number') return result.sub;
  return 0;
};

/**
 * Providers that list the dub as its own entry mark it in the title: "Naruto (Dub)". Anything in
 * parentheses other than `(TV)` and numbers names the audio; a title without is the sub.
 */
const audioOf = (title: unknown): string => {
  const marked = typeof title === 'string' ? /\(([^)0-9]+)\)/.exec(title.replace(/\(TV\)/g, ''))?.[1] : undefined;
  return marked ? marked.replace(/\s+/g, '-').toLowerCase() : 'sub';
};

/** 2 for a sub entry, 1 for a dub entry, 0 for other audio: the sub entry is preferred. */
const audioRank = (result: IAnimeResult): number => {
  const audio = audioOf(result.title);
  return audio === 'sub' ? 2 : audio === 'dub' ? 1 : 0;
};

/** An AniList format as providers name the type: `MOVIE` → `movie`, `TV_SHORT` → `tv`. */
const providerType = (format?: string) => (format === 'TV_SHORT' ? 'tv' : format?.toLowerCase());

/** The numbers in a title, ignoring anything in parentheses: "Jujutsu Kaisen 0" → {0}, "2nd Season" → {2}. */
const titleNumbers = (title?: string) => new Set((title ?? '').replace(/\([^)]*\)/g, '').match(/\d+/g) ?? []);

/**
 * How well a provider search result matches the AniList entry. Title similarity alone ranks "Jujutsu Kaisen (TV)"
 * above "Jujutsu Kaisen 0 Movie" for "JUJUTSU KAISEN 0", since the part in parentheses is ignored. So a result also
 * gains when its type is the AniList format, loses when only one of the two is a movie, and loses when its numbers
 * don't match the title's.
 */
const matchScore = (result: IAnimeResult, similarity: number, title: ITitle, format?: string) => {
  let score = similarity;

  const wanted = providerType(format);
  const type = result.type?.toLowerCase();
  if (wanted && type) {
    if (type === wanted) score += 0.1;
    else if (type === 'movie' || wanted === 'movie') score -= 0.15;
  }

  const expected = titleNumbers(title.english || title.romaji);
  const found = titleNumbers(typeof result.title === 'string' ? result.title : undefined);
  if ([...expected].some((n) => !found.has(n)) || (!expected.size && found.size)) score -= 0.2;

  return score;
};

/**
 * The MALSync site (a key of its `Sites`) that lists a manga provider's titles under the ids the
 * provider uses, by provider name. MALSync calls MangaKakalot's site MangaNato (same titles and ids).
 */
const MALSYNC_SITES = new Map([
  ['MangaDex', 'Mangadex'],
  ['MangaKakalot', 'MangaNato'],
]);

/**
 * The provider's id for a MAL manga, from MALSync. MALSync is optional: it answers 404 for a manga it
 * maps to no site, and that, any other failure, or a provider it doesn't list means searching instead.
 */
const malSyncId = async (provider: MangaParser, malId: unknown): Promise<string | undefined> => {
  const site = MALSYNC_SITES.get(provider.name);
  if (!site || !malId) return undefined;
  try {
    const { data } = await metaHttp.get(`${MALSYNC_URL}/mal/manga/${encodeURIComponent(String(malId))}`, {
      timeout: ENRICHMENT_TIMEOUT_MS,
    });
    const [page] = Object.values((data?.Sites?.[site] ?? {}) as Record<string, { identifier?: unknown }>);
    return page?.identifier ? String(page.identifier) : undefined;
  } catch {
    return undefined;
  }
};

/** Results less similar than this to the AniList titles are not the manga. */
const MIN_MANGA_TITLE_SIMILARITY = 0.6;

/**
 * The provider's chapters for an AniList manga: those of its MALSync mapping when there is one,
 * else of the search result closest to its titles, searching by the romaji title and then by the
 * English one. Empty when the provider doesn't have it.
 */
const findMangaChapters = async (provider: MangaParser, title: ITitle, malId: unknown): Promise<IMangaChapter[]> => {
  const mappedId = await malSyncId(provider, malId);
  if (mappedId) return (await provider.fetchMangaInfo(mappedId)).chapters ?? [];

  // Providers may show an English title and keep the romaji one in altTitles, so both count.
  const wanted = [title.romaji, title.english];
  const terms = [...new Set(wanted.flatMap((name) => (name ? [name.toLowerCase()] : [])))];
  for (const term of terms) {
    const { results = [] } = ((await provider.search(searchTerm(term))) ?? {}) as Partial<ISearch<IMangaResult>>;
    const match = bestTitleMatch(wanted, results, MIN_MANGA_TITLE_SIMILARITY);
    const chapters = match ? ((await provider.fetchMangaInfo(match.id)).chapters ?? []) : [];
    if (chapters.length > 0) return chapters;
  }
  return [];
};

class Anilist extends AnimeParser {
  override readonly name = 'Anilist';
  protected override baseUrl = 'https://anilist.co';
  protected override logo = 'https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg';
  protected override classPath = 'META.Anilist';

  provider: AnimeParser | IAnimeProvider;

  /**
   * Maps AniList anime to an anime provider's episodes, with ani.zip episode metadata for providers
   * that declare `capabilities.aniZipEpisodes`.
   * @param provider anime provider to find the episodes on (default: Zoro, HiAnime)
   * @param _proxyConfig ignored: requests go through the library's own client. Kept so existing calls compile.
   * @param _adapter ignored, for the same reason
   * @param customBaseURL site URL for the default Zoro provider; ignored when `provider` is given
   */
  constructor(
    provider?: AnimeParser | IAnimeProvider,
    _proxyConfig?: ProxyConfig,
    _adapter?: AxiosAdapter,
    customBaseURL?: string
  ) {
    super();
    this.provider = provider || new Zoro(customBaseURL);
  }

  /**
   * @param perPage results per page (default: 15, max: 50)
   */
  override search = async (query: string, page: number = 1, perPage: number = 15): Promise<ISearch<IAnimeResult>> => {
    const data = await anilistQuery(SEARCH_QUERY, { search: query, page, perPage, type: 'ANIME' });
    return toPage(
      data.data?.Page,
      data.data?.Page?.media?.map((item: any) => {
        const { totalEpisodes, currentEpisode } = episodeCounts(item);
        return {
          ...mapMediaResult(item),
          popularity: item.popularity,
          totalEpisodes,
          currentEpisodeCount: currentEpisode,
        };
      }) ?? []
    );
  };

  /**
   * @param type `ANIME` (default) or `MANGA`
   * @param perPage results per page (default: 20, max: 50)
   * @param format `TV`, `TV_SHORT`, `MOVIE`, `SPECIAL`, `OVA`, `ONA` or `MUSIC`
   * @param sort default `[POPULARITY_DESC, SCORE_DESC]`; any of `POPULARITY_DESC`, `POPULARITY`, `TRENDING_DESC`, `TRENDING`, `UPDATED_AT_DESC`, `UPDATED_AT`, `START_DATE_DESC`, `START_DATE`, `END_DATE_DESC`, `END_DATE`, `FAVOURITES_DESC`, `FAVOURITES`, `SCORE_DESC`, `SCORE`, `TITLE_ROMAJI_DESC`, `TITLE_ROMAJI`, `TITLE_ENGLISH_DESC`, `TITLE_ENGLISH`, `TITLE_NATIVE_DESC`, `TITLE_NATIVE`, `EPISODES_DESC`, `EPISODES`, `ID`, `ID_DESC`
   * @param genres any of `Action`, `Adventure`, `Cars`, `Comedy`, `Drama`, `Fantasy`, `Horror`, `Mahou Shoujo`, `Mecha`, `Music`, `Mystery`, `Psychological`, `Romance`, `Sci-Fi`, `Slice of Life`, `Sports`, `Supernatural`, `Thriller`
   * @param id AniList id
   * @param year e.g. `2022`
   * @param status `RELEASING`, `FINISHED`, `NOT_YET_RELEASED`, `CANCELLED` or `HIATUS`
   * @param season `WINTER`, `SPRING`, `SUMMER` or `FALL`
   */
  advancedSearch = async (
    query?: string,
    type: string = 'ANIME',
    page: number = 1,
    perPage: number = 20,
    format?: string,
    sort?: string[],
    genres?: Genres[] | string[],
    id?: string | number,
    year?: number,
    status?: string,
    season?: string
  ): Promise<ISearch<IAnimeResult>> => {
    for (const genre of genres ?? []) {
      if (!Object.values(Genres).includes(genre as Genres)) throw new Error(`genre ${genre} is not valid`);
    }

    const data = await anilistQuery(ADVANCED_SEARCH_QUERY, {
      search: query,
      type,
      page,
      size: perPage,
      format,
      sort,
      genres,
      id,
      year: year ? `${year}%` : undefined,
      status,
      season,
    });
    const pageInfo = data.data?.Page?.pageInfo;
    return {
      ...toPage(
        data.data?.Page,
        data.data?.Page?.media?.map((item: any) => ({
          ...mapMediaResult(item),
          popularity: item.popularity,
          ...episodeCounts(item),
          countryOfOrigin: item.countryOfOrigin,
        })) ?? []
      ),
      totalPages: pageInfo?.lastPage,
      totalResults: pageInfo?.total,
    };
  };

  /**
   * @param id AniList id
   * @param fetchFiller set `isFiller` on the episodes, from the MAL filler list (default: `false`)
   */
  override fetchAnimeInfo = async (id: string, fetchFiller: boolean = false): Promise<IAnimeInfo> => {
    const aniZipRequest = this.requestAniZip(id);
    const media = (await anilistQuery(MEDIA_DETAIL_QUERY, { id: Number(id) })).data.Media;
    return { id, ...mapAnimeDetail(media), episodes: await this.findEpisodes(id, media, fetchFiller, aniZipRequest) };
  };

  override fetchEpisodeSources = (episodeId: string, ...args: any): Promise<ISource> =>
    callProvider(this.provider, 'episode sources', () => this.provider.fetchEpisodeSources(episodeId, ...args));

  override fetchEpisodeServers = (episodeId: string): Promise<IEpisodeServer[]> =>
    callProvider(this.provider, 'episode servers', () => this.provider.fetchEpisodeServers(episodeId));

  fetchTrendingAnime = async (page: number = 1, perPage: number = 10): Promise<ISearch<IAnimeResult>> => {
    const data = await anilistQuery(TRENDING_QUERY, { page, perPage });
    return toPage(data.data.Page, data.data.Page.media.map(mapBrowseResult));
  };

  fetchPopularAnime = async (page: number = 1, perPage: number = 10): Promise<ISearch<IAnimeResult>> => {
    const data = await anilistQuery(POPULAR_QUERY, { page, perPage });
    return toPage(data.data.Page, data.data.Page.media.map(mapBrowseResult));
  };

  /**
   * The episodes airing in a window of days.
   * @param weekStart first day of the window, its next occurrence counting today (default: today): `2` = Monday, `3` = Tuesday, `4` = Wednesday, `5` = Thursday, `6` = Friday, `0` = Saturday, `1` = Sunday, or the day's name
   * @param weekEnd last day of the window, included, on or after weekStart (default: the day before today, so a full week); like weekStart
   * @param notYetAired only episodes that haven't aired yet
   */
  fetchAiringSchedule = async (
    page: number = 1,
    perPage: number = 20,
    weekStart: number | string = (new Date().getDay() + 1) % 7,
    weekEnd: number | string = (new Date().getDay() + 7) % 7,
    notYetAired: boolean = false
  ): Promise<ISearch<IAnimeResult>> => {
    const { from, to } = airingWindow(weekStart, weekEnd);

    // AniList's bounds are exclusive, so one second earlier keeps an episode airing at midnight.
    const data = await anilistQuery(AIRING_SCHEDULE_QUERY, {
      page,
      perPage,
      notYetAired,
      airingAtGreater: from - 1,
      airingAtLesser: to,
    });
    return toPage(
      data.data.Page,
      data.data.Page.airingSchedules.map((item: any) => ({
        ...mapMediaResult(item.media),
        episode: item.episode,
        airingAt: item.airingAt,
        country: item.media.countryOfOrigin,
      }))
    );
  };

  /**
   * @param genres any of `Action`, `Adventure`, `Cars`, `Comedy`, `Drama`, `Fantasy`, `Horror`, `Mahou Shoujo`, `Mecha`, `Music`, `Mystery`, `Psychological`, `Romance`, `Sci-Fi`, `Slice of Life`, `Sports`, `Supernatural`, `Thriller`
   */
  fetchAnimeGenres = async (genres: string[] | Genres[], page: number = 1, perPage: number = 20) => {
    if (genres.length === 0) throw new Error('No genres specified');
    for (const genre of genres) if (!Object.values(Genres).includes(genre as Genres)) throw new Error('Invalid genre');

    const data = await anilistQuery(GENRES_QUERY, { genres, page, perPage });
    return toPage<IAnimeResult>(data.data.Page, data.data.Page.media.map(mapBrowseResult));
  };

  /** The info of an anime picked from a list of AniList ids kept on GitHub (5H4D0WILA/IDFetch). */
  fetchRandomAnime = async (): Promise<IAnimeInfo> => {
    let ids: string[];
    try {
      const { data } = await metaHttp.get('https://raw.githubusercontent.com/5H4D0WILA/IDFetch/main/ids.txt');
      ids = String(data ?? '')
        .split('\n')
        .map((id) => id.trim())
        .filter(Boolean);
    } catch (err) {
      throw MetaError.from('github', err);
    }
    if (ids.length === 0) throw new MetaError('The list of random anime ids is empty', { source: 'github' });
    return this.fetchAnimeInfo(ids[Math.floor(Math.random() * ids.length)]!);
  };

  /**
   * The provider's episodes for the AniList entry: those of the search result whose title is
   * closest (see matchScore), the sub entry before the dub. Empty when no result is close enough.
   */
  private findProviderEpisodes = async (title: ITitle, format?: string): Promise<IAnimeEpisode[]> => {
    try {
      const search = (await this.provider.search(title.romaji || title.english || title.userPreferred || '')) as
        | ISearch<IAnimeResult>
        | undefined;
      const score = ({ result, similarity }: TitleMatch<IAnimeResult>) => matchScore(result, similarity, title, format);
      const match = bestTitleMatch(
        [title.english, title.romaji],
        (search?.results ?? []).filter((result) => audioRank(result) > 0),
        MIN_TITLE_SIMILARITY,
        {
          normalize: animeTitle,
          compare: (a, b) =>
            audioRank(b.result) - audioRank(a.result) || score(b) - score(a) || subCount(b.result) - subCount(a.result),
        }
      );
      if (!match) return [];
      return (await this.provider.fetchAnimeInfo(match.id)).episodes ?? [];
    } catch (err) {
      throw MetaError.from('provider', err);
    }
  };

  /**
   * The provider's episodes for an AniList media, merged with ani.zip when the provider declares
   * `aniZipEpisodes`, each with the cover as its fallback image, its filler flag and its uniqueId.
   * fetchAnimeInfo and fetchEpisodesListById both return these, so they key every episode alike.
   * @param media the AniList media: `title`, `format`, `idMal` and `coverImage` are read
   * @param aniZipRequest ani.zip's mappings, requested alongside the caller's AniList query
   */
  private findEpisodes = async (
    id: string,
    media: any,
    fetchFiller: boolean,
    aniZipRequest: Promise<unknown>
  ): Promise<IMetaAnimeEpisode[]> => {
    const fillerRequest: Promise<FillerEpisode[]> =
      fetchFiller && media.idMal ? fetchFillerEpisodes(media.idMal) : Promise.resolve([]);

    const providerEpisodes = await this.findProviderEpisodes(mapTitle(media.title), media.format);
    const aniZip = await aniZipRequest;
    const episodes: MergedEpisode[] = aniZip
      ? this.mergeAniZipEpisodes(aniZip, providerEpisodes)
      : providerEpisodes.map((episode) => ({ episode }));

    const fillerEpisodes = await fillerRequest;
    const cover = pickCover(media.coverImage);

    return episodes.map((merged, index): IMetaAnimeEpisode => {
      const { episode } = merged;
      if (!episode.image && cover) episode.image = cover;
      applyFiller(episode, fillerEpisodes);
      // The one place uniqueId is set, so matched, unmatched and un-enriched episodes follow one rule.
      return { ...episode, uniqueId: episodeUniqueId(id, merged, index) };
    });
  };

  /**
   * ani.zip's mappings for an AniList id, for providers that declare `aniZipEpisodes`. They are
   * optional enrichment: undefined when the request fails or times out.
   */
  private requestAniZip = (id: string): Promise<unknown> =>
    this.usesAniZipEpisodes()
      ? metaHttp
          .get(`https://api.ani.zip/mappings?anilist_id=${encodeURIComponent(id)}`, { timeout: ENRICHMENT_TIMEOUT_MS })
          .then(
            (res) => res.data,
            () => undefined
          )
      : Promise.resolve(undefined);

  /**
   * @param id AniList id
   * @param fetchFiller set `isFiller` on the episodes, from the MAL filler list (default: `false`)
   * @returns the episode list without the anime info, every episode with a `uniqueId`
   */
  fetchEpisodesListById = async (id: string, fetchFiller: boolean = false): Promise<IMetaAnimeEpisode[]> => {
    const aniZipRequest = this.requestAniZip(id);
    const { Media } = (await anilistQuery(EPISODES_MEDIA_QUERY, { id: Number(id) })).data;
    return this.findEpisodes(id, Media, fetchFiller, aniZipRequest);
  };

  /** Whether to merge the provider's episodes with ani.zip metadata, as the provider declares. */
  private usesAniZipEpisodes = () =>
    Boolean((this.provider as { capabilities?: ProviderCapabilities }).capabilities?.aniZipEpisodes);

  /**
   * Overlay ani.zip titles, descriptions, images and TVDB numbers onto the provider's episodes. Only
   * numeric ani.zip keys (AniDB regular episodes) take part, so specials (`S1`, `O1`…) never land
   * on a regular episode. The provider's `number` is kept as is.
   */
  private mergeAniZipEpisodes = (animeMetaData: any, providerEpisodes: IAnimeEpisode[]): MergedEpisode[] => {
    const entries: AniZipEntry[] = (
      Object.entries(animeMetaData?.episodes ?? {}) as [string, AniZipEpisode & IAnimeEpisode][]
    )
      .filter(([key, item]) => /^\d+$/.test(key) && item)
      .map(([key, item]) => {
        const releaseDate = item.airDate ?? item.airdate ?? item.airDateUtc;
        return {
          key: Number(key),
          time: timeOf(item.airDateUtc) ?? timeOf(releaseDate),
          title: item.title?.en ?? item.title?.['x-jat'],
          description: item.overview ?? item.summary,
          image: item.image,
          releaseDate,
          tvdbNumber: toEpisodeNumber(item.episodeNumber),
          absoluteNumber: toEpisodeNumber(item.absoluteEpisodeNumber),
        };
      });

    const byKey = new Map(entries.map((entry) => [entry.key, entry]));
    // Several episodes can air on one day (premieres, full-season drops), so each day holds a list.
    const byDay = new Map<number, AniZipEntry[]>();
    for (const entry of entries) {
      if (entry.time === undefined) continue;
      const day = Math.floor(entry.time / DAY_MS);
      const bucket = byDay.get(day);
      if (bucket) bucket.push(entry);
      else byDay.set(day, [entry]);
    }

    const matches: (AniZipEntry | undefined)[] = providerEpisodes.map(() => undefined);
    const used = new Set<number>();
    const claim = (index: number, entry: AniZipEntry) => {
      matches[index] = entry;
      used.add(entry.key);
    };
    const distance = (index: number, entry: AniZipEntry) => {
      const time = timeOf(providerEpisodes[index]?.releaseDate);
      return time === undefined || entry.time === undefined ? Infinity : Math.abs(time - entry.time);
    };

    // 1. By number: ani.zip key N is AniDB episode N. When the provider lists a number twice, the
    // copy released closest to the air date takes it.
    const claimants = new Map<number, number[]>();
    providerEpisodes.forEach((episode, index) => {
      const number = toEpisodeNumber(episode.number);
      if (number === undefined || !byKey.has(number)) return;
      const indexes = claimants.get(number);
      if (indexes) indexes.push(index);
      else claimants.set(number, [index]);
    });
    for (const [number, indexes] of claimants) {
      const entry = byKey.get(number)!;
      const closest = indexes.reduce((best, index) => (distance(index, entry) < distance(best, entry) ? index : best));
      claim(closest, entry);
    }

    // 2. By release date, within a day either way, for episodes the provider numbers differently
    // (e.g. continuing the previous season's count). Episodes go in number order and each takes the
    // earliest unused episode aired in that window, so episodes sharing a day keep their order.
    const unmatchedByNumber = providerEpisodes
      .map((episode, index) => ({
        index,
        number: toEpisodeNumber(episode.number) ?? Infinity,
        time: timeOf(episode.releaseDate),
      }))
      .filter(({ index, time }) => !matches[index] && time !== undefined)
      .sort((a, b) => a.number - b.number || a.index - b.index);
    for (const { index, time } of unmatchedByNumber) {
      const day = Math.floor(time! / DAY_MS);
      const [entry] = [day - 1, day, day + 1]
        .flatMap((d) => byDay.get(d) ?? [])
        .filter((e) => !used.has(e.key) && Math.abs(time! - e.time!) <= DAY_MS)
        .sort((a, b) => a.key - b.key);
      if (entry) claim(index, entry);
    }

    // 3. By title.
    providerEpisodes.forEach((episode, index) => {
      const providerTitle = episode.title;
      if (matches[index] || !providerTitle) return;
      const entry = entries.find((e) => !used.has(e.key) && e.title?.includes(providerTitle));
      if (entry) claim(index, entry);
    });

    return providerEpisodes.map((providerEp, index) => {
      const entry = matches[index];
      if (!entry) return { episode: providerEp };
      return {
        aniDbKey: entry.key,
        episode: {
          ...providerEp,
          title: entry.title || providerEp.title,
          description: entry.description || providerEp.description,
          image: entry.image || providerEp.image,
          // A provider's hash describes its own image, not ani.zip's.
          imageHash: entry.image ? undefined : providerEp.imageHash,
          releaseDate: entry.releaseDate || providerEp.releaseDate,
          tvdbNumber: entry.tvdbNumber,
          absoluteNumber: entry.absoluteNumber,
        },
      };
    });
  };

  /**
   * @param id AniList id
   * @returns the AniList info without episodes (`fetchEpisodesListById` gives them, `fetchAnimeInfo` both)
   */
  fetchAnilistInfoById = async (id: string): Promise<IAnimeInfo> => {
    const data = await anilistQuery(MEDIA_DETAIL_QUERY, { id: Number(id) });
    return { id, ...mapAnimeDetail(data.data.Media) };
  };

  /** @param id AniList staff id */
  fetchStaffById = async (id: number) => {
    const data = await anilistQuery(STAFF_QUERY, { id: Number(id) });
    const staff = data.data.Staff;

    const staffInfo: IStaff = {
      id: staff?.id,
      name: staff?.name,
      image: staff?.image,
      description: staff?.description,
      siteUrl: staff?.siteUrl,
      roles: staff?.staffMedia.edges.map((media: any) => ({
        id: media?.node?.id,
        title: media?.node?.title,
        type: media?.node?.type,
        image: {
          extraLarge: media?.node?.coverImage?.extraLarge,
          large: media?.node?.coverImage?.large,
          medium: media?.node?.coverImage?.medium,
        },
        color: media?.node?.coverImage?.color,
      })),
    };
    return staffInfo;
  };

  /** @param id AniList character id */
  fetchCharacterInfoById = async (id: string) => {
    const { Character } = (await anilistQuery(CHARACTER_QUERY, { id: Number(id) })).data;
    // The description holds the character's details as `__Label:__ value` lines, removed below.
    const details: string = Character.description ?? '';

    const height = details.match(/__Height:__(.*)/)?.[1]?.trim();
    const weight = details.match(/__Weight:__(.*)/)?.[1]?.trim();
    const hairColor = details.match(/__Hair Color:__(.*)/)?.[1]?.trim();
    const eyeColor = details.match(/__Eye Color:__(.*)/)?.[1]?.trim();
    const relatives = details
      .match(/__Relatives:__(.*)/)?.[1]
      ?.trim()
      .split(/(, \[)/g)
      .filter((g: string) => !g.includes(', ['))
      .map((r: string) => ({
        id: r.match(/\/(\d+)/)?.[1],
        name: r.match(/([^)]+)\]/)?.[1]!.replace(/\[/g, ''),
        relationship: r.match(/\(([^)]+)\).*?(\(([^)]+)\))/)?.[3],
      }));
    const race = details
      .match(/__Race:__(.*)/)?.[1]
      ?.split(', ')
      .map((r: string) => r.trim());
    const rank = details.match(/__Rank:__(.*)/)?.[1];
    const occupation = details.match(/__Occupation:__(.*)/)?.[1];
    const previousPosition = details.match(/__Previous Position:__(.*)/)?.[1]?.trim();
    const partner = details
      .match(/__Partner:__(.*)/)?.[1]
      ?.split(/(, \[)/g)
      .filter((g: string) => !g.includes(', ['))
      .map((r: string) => ({
        id: r.match(/\/(\d+)/)?.[1],
        name: r.match(/([^)]+)\]/)?.[1]!.replace(/\[/g, ''),
      }));
    const dislikes = details.match(/__Dislikes:__(.*)/)?.[1];
    const sign = details.match(/__Sign:__(.*)/)?.[1];
    const zodicSign = details.match(/__Zodiac sign:__(.*)/)?.[1]?.trim();
    const zodicAnimal = details.match(/__Zodiac Animal:__(.*)/)?.[1]?.trim();
    const themeSong = details.match(/__Theme Song:__(.*)/)?.[1]?.trim();
    const description = details.replace(
      /__Theme Song:__(.*)\n|__Race:__(.*)\n|__Height:__(.*)\n|__Relatives:__(.*)\n|__Rank:__(.*)\n|__Zodiac sign:__(.*)\n|__Zodiac Animal:__(.*)\n|__Weight:__(.*)\n|__Eye Color:__(.*)\n|__Hair Color:__(.*)\n|__Dislikes:__(.*)\n|__Sign:__(.*)\n|__Partner:__(.*)\n|__Previous Position:__(.*)\n|__Occupation:__(.*)\n/gm,
      ''
    );

    const characterInfo = {
      id: Character.id,
      name: {
        first: Character.name?.first,
        last: Character.name?.last,
        full: Character.name?.full,
        native: Character.name?.native,
        userPreferred: Character.name?.userPreferred,
        alternative: Character.name?.alternative,
        alternativeSpoiler: Character.name?.alternativeSpoiler,
      },
      image: Character.image?.large ?? Character.image?.medium,
      description,
      gender: Character.gender,
      dateOfBirth: {
        year: Character.dateOfBirth?.year,
        month: Character.dateOfBirth?.month,
        day: Character.dateOfBirth?.day,
      },
      bloodType: Character.bloodType,
      age: Character.age,
      hairColor: hairColor,
      eyeColor: eyeColor,
      height: height,
      weight: weight,
      occupation: occupation,
      partner: partner,
      relatives: relatives,
      race: race,
      rank: rank,
      previousPosition: previousPosition,
      dislikes: dislikes,
      sign: sign,
      zodicSign: zodicSign,
      zodicAnimal: zodicAnimal,
      themeSong: themeSong,
      relations: Character.media.edges?.map(mapCharacterMedia),
    };

    return characterInfo;
  };

  /** Maps AniList manga to a manga provider's chapters. */
  static Manga = class Manga {
    provider: MangaParser;

    /** @param provider manga provider to find the chapters on (default: MangaDex) */
    constructor(provider?: MangaParser) {
      this.provider = provider || new MangaDex();
    }

    /** @param perPage results per page (default: 20) */
    search = async (query: string, page: number = 1, perPage: number = 20): Promise<ISearch<IMangaResult>> => {
      const data = await anilistQuery(SEARCH_QUERY, { search: query, page, perPage, type: 'MANGA' });
      return toPage(
        data.data.Page,
        data.data.Page.media.map(
          (item: any): IMangaResult => ({
            ...mapMediaResult(item),
            popularity: item.popularity,
            totalChapters: item.chapters,
            volumes: item.volumes,
          })
        )
      );
    };

    /** @param args passed on to the provider's fetchChapterPages */
    fetchChapterPages = (chapterId: string, ...args: any): Promise<IMangaChapterPage[]> =>
      this.provider.fetchChapterPages(chapterId, ...args);

    /**
     * The AniList info with the provider's chapters, in the provider's order (reading order, as every
     * manga provider returns them): from MALSync's mapping for MangaDex and MangaKakalot, else from
     * the provider's search result closest to the romaji or English title.
     */
    fetchMangaInfo = async (id: string): Promise<IMangaInfo> => {
      const media = (await anilistQuery(MEDIA_DETAIL_QUERY, { id: Number(id) })).data.Media;
      const mangaInfo: IMangaInfo = { id, ...mapMangaDetail(media) };
      try {
        mangaInfo.chapters = await findMangaChapters(this.provider, mapTitle(media.title), media.idMal);
      } catch (err) {
        throw MetaError.from('provider', err);
      }
      return mangaInfo;
    };
  };
}

export default Anilist;
