import { type AxiosAdapter } from 'axios';
import { metaHttp, ENRICHMENT_TIMEOUT_MS } from '../../utils/meta-http';

import {
  AnimeParser,
  type ISearch,
  type IAnimeInfo,
  MediaStatus,
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
  type FuzzyDate,
  type IStaff,
  type AniZipEpisode,
  type ProviderCapabilities,
  type IAnimeProvider,
  MetaError,
} from '../../models';
import type { IMetaAnimeEpisode } from '../../models/types';
import {
  anilistSearchQuery,
  anilistMediaDetailQuery,
  anilistTrendingQuery,
  anilistPopularQuery,
  anilistAiringScheduleQuery,
  anilistGenresQuery,
  anilistAdvancedQuery,
  anilistCharacterQuery,
  anilistStaffInfoQuery,
  days,
} from '../../utils';
import { Zoro } from '../anime/zoro/zoro';
import { AnimeKai } from '../anime/animekai/animekai';
import { AnimePahe } from '../anime/animepahe/animepahe';
import { AniKoto } from '../anime/anikoto/anikoto';
import { Mangasee123 } from '../manga/mangasee123';
import { ANIFY_URL, findSimilarTitles } from '../../utils/utils';

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

/**
 * POST a query to AniList. Values always go in `variables`, never into the query text, so a search
 * containing `"` or `\` can't break the query (it used to fail with a 400).
 */
const anilistQuery = (query: string, variables?: Record<string, unknown>) =>
  metaHttp.post(
    ANILIST_GRAPHQL_URL,
    { query, variables },
    { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } }
  );

// One mapping per AniList shape. Every method used to carry its own copy, and the copies drifted
// (a missing `?.` that crashed on a hidden recommendation, a URL in `coverHash`).

const STATUS = new Map<unknown, MediaStatus>([
  ['RELEASING', MediaStatus.ONGOING],
  ['FINISHED', MediaStatus.COMPLETED],
  ['NOT_YET_RELEASED', MediaStatus.NOT_YET_AIRED],
  ['CANCELLED', MediaStatus.CANCELLED],
  ['HIATUS', MediaStatus.HIATUS],
]);

/** AniList's `status(version: 2)` as a MediaStatus; anything else is UNKNOWN. */
const mapStatus = (status: unknown): MediaStatus => STATUS.get(status) ?? MediaStatus.UNKNOWN;

type CoverImage = { extraLarge?: string | null; large?: string | null; medium?: string | null } | null | undefined;

/** The largest of AniList's cover (poster) images. */
const pickCover = (coverImage: CoverImage): string | undefined =>
  coverImage?.extraLarge ?? coverImage?.large ?? coverImage?.medium ?? undefined;

/** The value of `cover`: the banner, or the cover image for media without one. */
const bannerOrCover = (media: { bannerImage?: string | null; coverImage?: CoverImage }): string | undefined =>
  media.bannerImage ?? pickCover(media.coverImage);

const mapTitle = (title: any): ITitle => ({
  romaji: title?.romaji,
  english: title?.english,
  native: title?.native,
  userPreferred: title?.userPreferred,
});

const mapName = (name: any) => ({
  first: name?.first,
  last: name?.last,
  full: name?.full,
  native: name?.native,
  userPreferred: name?.userPreferred,
});

const mapFuzzyDate = (date: any): FuzzyDate => ({ year: date?.year, month: date?.month, day: date?.day });

/** The fields every list result (search, trending, the airing schedule…) shares. */
const mapMediaResult = (media: any) => ({
  id: String(media.id),
  malId: media.idMal,
  title: mapTitle(media.title),
  status: mapStatus(media.status),
  image: pickCover(media.coverImage),
  cover: bannerOrCover(media),
  color: media.coverImage?.color,
  description: media.description,
  genres: media.genres,
  rating: media.averageScore,
  type: media.format,
  releaseDate: media.seasonYear,
});

/** A trending, popular or by-genre result. */
const mapBrowseResult = (media: any): IAnimeResult => ({
  ...mapMediaResult(media),
  trailer: { id: media.trailer?.id, site: media.trailer?.site, thumbnail: media.trailer?.thumbnail },
  totalEpisodes: isNaN(media.episodes)
    ? 0
    : (media.episodes ?? (media.nextAiringEpisode?.episode ? media.nextAiringEpisode.episode - 1 : 0)),
  duration: media.duration,
});

/**
 * Media inside another media's details (a recommendation or a relation), in one shape for anime
 * and manga. AniList sends `null` for media it hides, which maps to `undefined`.
 */
const mapMediaNode = (node: any): IAnimeResult | undefined =>
  node
    ? {
        id: node.id,
        malId: node.idMal,
        title: mapTitle(node.title),
        status: mapStatus(node.status),
        episodes: node.episodes,
        chapters: node.chapters,
        image: pickCover(node.coverImage),
        cover: bannerOrCover(node),
        color: node.coverImage?.color,
        rating: node.meanScore,
        type: node.format,
      }
    : undefined;

const mapRecommendations = (media: any): IAnimeResult[] | undefined =>
  media.recommendations?.edges?.flatMap((edge: any) => mapMediaNode(edge?.node?.mediaRecommendation) ?? []);

const mapRelations = (media: any): IAnimeResult[] | undefined =>
  media.relations?.edges?.flatMap((edge: any) => {
    const node = mapMediaNode(edge?.node);
    return node ? [{ ...node, relationType: edge.relationType }] : [];
  });

const mapCharacters = (media: any) =>
  media.characters?.edges?.map((edge: any) => ({
    id: edge.node?.id,
    role: edge.role,
    name: mapName(edge.node?.name),
    image: edge.node?.image?.large ?? edge.node?.image?.medium,
    voiceActors: (edge.voiceActors ?? []).map((voiceActor: any) => ({
      id: voiceActor.id,
      language: voiceActor.languageV2,
      name: mapName(voiceActor.name),
      image: voiceActor.image?.large ?? voiceActor.image?.medium,
    })),
  }));

/** The details fetchAnimeInfo, fetchAnilistInfoById and Manga.fetchMangaInfo share. */
const mapMediaDetail = (media: any) => ({
  malId: media.idMal,
  title: mapTitle(media.title),
  synonyms: media.synonyms,
  isLicensed: media.isLicensed ?? undefined,
  isAdult: media.isAdult ?? undefined,
  countryOfOrigin: media.countryOfOrigin ?? undefined,
  ...(media.trailer?.id
    ? { trailer: { id: media.trailer.id, site: media.trailer.site, thumbnail: media.trailer.thumbnail } }
    : {}),
  image: pickCover(media.coverImage),
  popularity: media.popularity,
  color: media.coverImage?.color,
  cover: bannerOrCover(media),
  description: media.description,
  status: mapStatus(media.status),
  releaseDate: media.startDate?.year,
  startDate: mapFuzzyDate(media.startDate),
  endDate: mapFuzzyDate(media.endDate),
  rating: media.averageScore,
  genres: media.genres,
  season: media.season,
  studios: media.studios?.edges?.map((edge: any) => edge.node.name),
  type: media.format,
  recommendations: mapRecommendations(media),
  characters: mapCharacters(media),
  relations: mapRelations(media),
});

/** mapMediaDetail plus the airing and episode fields of an anime. */
const mapAnimeDetail = (media: any) => ({
  ...mapMediaDetail(media),
  ...(media.nextAiringEpisode?.airingAt
    ? {
        nextAiringEpisode: {
          airingTime: media.nextAiringEpisode.airingAt,
          timeUntilAiring: media.nextAiringEpisode.timeUntilAiring,
          episode: media.nextAiringEpisode.episode,
        },
      }
    : {}),
  totalEpisodes: media.episodes ?? media.nextAiringEpisode?.episode - 1,
  currentEpisode: media.nextAiringEpisode?.episode
    ? media.nextAiringEpisode.episode - 1
    : (media.episodes ?? undefined),
  duration: media.duration,
});

/** A weekday as an index into `days` (0 = Saturday … 6 = Friday), from that index or the day's name. */
const weekdayIndex = (day: number | string): number => {
  const index =
    typeof day === 'string' ? days.findIndex((name) => name.toLowerCase() === day.trim().toLowerCase()) : day;
  if (!Number.isInteger(index) || index < 0 || index >= days.length) throw new Error('Invalid weekStart or weekEnd');
  return index;
};

/**
 * Unix seconds (AniList's `airingAt`) from the start of `weekStart`'s next occurrence, today
 * included, to the end of the first `weekEnd` on or after it, in local time.
 */
const airingWindow = (weekStart: number | string, weekEnd: number | string, now: Date = new Date()) => {
  const start = weekdayIndex(weekStart);
  const end = weekdayIndex(weekEnd);
  const today = (now.getDay() + 1) % 7; // as a `days` index, which starts on Saturday
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

const toEpisodeNumber = (value: unknown): number | undefined => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};

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

type FillerEpisode = { 'number': string; 'filler-bool': boolean };

/**
 * Sets `isFiller` from a MAL filler list, which lists episodes in order, by the provider's episode
 * number. Episodes the list doesn't reach keep `isFiller` unset.
 */
const applyFiller = (episode: IAnimeEpisode, fillers: FillerEpisode[]) => {
  const number = toEpisodeNumber(episode.number);
  const filler = number === undefined ? undefined : fillers[number - 1];
  if (filler) episode.isFiller = Boolean(filler['filler-bool']);
};

class Anilist extends AnimeParser {
  override readonly name = 'Anilist';
  protected override baseUrl = 'https://anilist.co';
  protected override logo = 'https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg';
  protected override classPath = 'META.Anilist';

  private readonly kitsuGraphqlUrl = 'https://kitsu.io/api/graphql';
  private readonly malSyncUrl = 'https://api.malsync.moe';
  private readonly anifyUrl = ANIFY_URL;
  provider: AnimeParser | IAnimeProvider;

  /**
   * This class maps anilist to kitsu with any other anime provider.
   * kitsu is used for episode images, titles and description.
   * @param provider anime provider (optional) default: Gogoanime
   * @param proxyConfig proxy config (optional)
   * @param adapter axios adapter (optional)
   */
  constructor(
    provider?: AnimeParser | IAnimeProvider,
    public proxyConfig?: ProxyConfig,
    adapter?: AxiosAdapter,
    customBaseURL?: string
  ) {
    super();
    this.provider = provider || new Zoro(customBaseURL);
  }

  /**
   * @param query Search query
   * @param page Page number (optional)
   * @param perPage Number of results per page (optional) (default: 15) (max: 50)
   */
  override search = async (query: string, page: number = 1, perPage: number = 15): Promise<ISearch<IAnimeResult>> => {
    try {
      const { data } = await anilistQuery(anilistSearchQuery(), { search: query, page, perPage, type: 'ANIME' });

      const res: ISearch<IAnimeResult> = {
        currentPage: data.data?.Page?.pageInfo?.currentPage,
        hasNextPage: data.data?.Page?.pageInfo?.hasNextPage,
        results:
          data.data?.Page?.media?.map((item: any) => ({
            ...mapMediaResult(item),
            popularity: item.popularity,
            totalEpisodes: item.episodes ?? item.nextAiringEpisode?.episode - 1,
            currentEpisodeCount: item?.nextAiringEpisode ? item?.nextAiringEpisode?.episode - 1 : item.episodes,
          })) ?? [],
      };

      return res;
    } catch (err) {
      throw anilistError(err);
    }
  };

  /**
   *
   * @param query Search query (optional)
   * @param type Media type (optional) (default: `ANIME`) (options: `ANIME`, `MANGA`)
   * @param page Page number (optional)
   * @param perPage Number of results per page (optional) (default: `20`) (max: `50`)
   * @param format Format (optional) (options: `TV`, `TV_SHORT`, `MOVIE`, `SPECIAL`, `OVA`, `ONA`, `MUSIC`)
   * @param sort Sort (optional) (Default: `[POPULARITY_DESC, SCORE_DESC]`) (options: `POPULARITY_DESC`, `POPULARITY`, `TRENDING_DESC`, `TRENDING`, `UPDATED_AT_DESC`, `UPDATED_AT`, `START_DATE_DESC`, `START_DATE`, `END_DATE_DESC`, `END_DATE`, `FAVOURITES_DESC`, `FAVOURITES`, `SCORE_DESC`, `SCORE`, `TITLE_ROMAJI_DESC`, `TITLE_ROMAJI`, `TITLE_ENGLISH_DESC`, `TITLE_ENGLISH`, `TITLE_NATIVE_DESC`, `TITLE_NATIVE`, `EPISODES_DESC`, `EPISODES`, `ID`, `ID_DESC`)
   * @param genres Genres (optional) (options: `Action`, `Adventure`, `Cars`, `Comedy`, `Drama`, `Fantasy`, `Horror`, `Mahou Shoujo`, `Mecha`, `Music`, `Mystery`, `Psychological`, `Romance`, `Sci-Fi`, `Slice of Life`, `Sports`, `Supernatural`, `Thriller`)
   * @param id anilist Id (optional)
   * @param year Year (optional) e.g. `2022`
   * @param status Status (optional) (options: `RELEASING`, `FINISHED`, `NOT_YET_RELEASED`, `CANCELLED`, `HIATUS`)
   * @param season Season (optional) (options: `WINTER`, `SPRING`, `SUMMER`, `FALL`)
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
    const variables = {
      search: query,
      type: type,
      page: page,
      size: perPage,
      format: format,
      sort: sort,
      genres: genres,
      id: id,
      year: year ? `${year}%` : undefined,
      status: status,
      season: season,
    };

    if (genres) {
      genres.forEach((genre) => {
        if (!Object.values(Genres).includes(genre as Genres)) {
          throw new Error(`genre ${genre} is not valid`);
        }
      });
    }

    try {
      const { data } = await anilistQuery(anilistAdvancedQuery(), variables);

      const res: ISearch<IAnimeResult> = {
        currentPage: data.data?.Page?.pageInfo?.currentPage,
        hasNextPage: data.data?.Page?.pageInfo?.hasNextPage,
        totalPages: data.data?.Page?.pageInfo?.lastPage,
        totalResults: data.data?.Page?.pageInfo?.total,
        results: [],
      };

      res.results.push(
        ...(data.data?.Page?.media?.map((item: any) => ({
          ...mapMediaResult(item),
          popularity: item.popularity,
          totalEpisodes: item.episodes ?? item.nextAiringEpisode?.episode - 1,
          currentEpisode: item.nextAiringEpisode?.episode - 1 || item.episodes,
          countryOfOrigin: item.countryOfOrigin,
        })) ?? [])
      );

      return res;
    } catch (err) {
      throw anilistError(err);
    }
  };

  /**
   *
   * @param id Anime id
   * @param dub to get dubbed episodes (optional) set to `true` to get dubbed episodes. **ONLY WORKS FOR GOGOANIME**
   * @param fetchFiller to get filler boolean on the episode object (optional) set to `true` to get filler boolean on the episode object.
   */
  override fetchAnimeInfo = async (id: string, fetchFiller: boolean = false): Promise<IAnimeInfo> => {
    try {
      const { data } = await anilistQuery(anilistMediaDetailQuery(), { id: Number(id) });
      const animeInfo: IAnimeInfo = { id, ...mapAnimeDetail(data.data.Media) };
      const title = mapTitle(data.data.Media.title);
      animeInfo.episodes = await this.fetchDefaultEpisodeList({
        idMal: animeInfo.malId! as number,
        season: data.data.Media.season,
        startDate: { year: parseInt(animeInfo.releaseDate!) },
        title: {
          english: title.english!,
          romaji: title.romaji!,
        },
        externalLinks: data.data.Media.externalLinks?.filter((link: any) => link.type === 'STREAMING'),
      });

      const fillerEpisodes =
        fetchFiller && animeInfo.malId ? await this.fetchFillerEpisodes(animeInfo.malId as number) : [];

      animeInfo.episodes = animeInfo.episodes?.map((episode: IAnimeEpisode, index) => {
        if (!episode.image) episode.image = animeInfo.image;
        applyFiller(episode, fillerEpisodes);

        // No ani.zip merge here, so the key comes from the provider's number, as it does in
        // fetchEpisodesListById for episodes ani.zip doesn't match.
        episode.uniqueId = episodeUniqueId(id, { episode }, index);
        return episode;
      });

      return animeInfo;
    } catch (err) {
      throw anilistError(err);
    }
  };

  /**
   *
   * @param episodeId Episode id
   */
  override fetchEpisodeSources = async (episodeId: string, ...args: any): Promise<ISource> => {
    try {
      return await this.provider.fetchEpisodeSources(episodeId, ...args);
    } catch (err) {
      throw MetaError.from('provider', err, `Failed to fetch episode sources from ${this.provider.name}: ${err}`);
    }
  };

  /**
   *
   * @param episodeId Episode id
   */
  override fetchEpisodeServers = async (episodeId: string): Promise<IEpisodeServer[]> => {
    try {
      return await this.provider.fetchEpisodeServers(episodeId);
    } catch (err) {
      throw MetaError.from('provider', err, `Failed to fetch episode servers from ${this.provider.name}: ${err}`);
    }
  };

  /**
   * @param page page number to search for (optional)
   * @param perPage number of results per page (optional)
   */
  fetchTrendingAnime = async (page: number = 1, perPage: number = 10): Promise<ISearch<IAnimeResult>> => {
    try {
      const { data } = await anilistQuery(anilistTrendingQuery(), { page, perPage });

      const res: ISearch<IAnimeResult> = {
        currentPage: data.data.Page.pageInfo.currentPage,
        hasNextPage: data.data.Page.pageInfo.hasNextPage,
        results: data.data.Page.media.map(mapBrowseResult),
      };
      return res;
    } catch (err) {
      throw anilistError(err);
    }
  };

  /**
   *
   * @param page page number to search for (optional)
   * @param perPage number of results per page (optional)
   */
  fetchPopularAnime = async (page: number = 1, perPage: number = 10): Promise<ISearch<IAnimeResult>> => {
    try {
      const { data } = await anilistQuery(anilistPopularQuery(), { page, perPage });

      const res: ISearch<IAnimeResult> = {
        currentPage: data.data.Page.pageInfo.currentPage,
        hasNextPage: data.data.Page.pageInfo.hasNextPage,
        results: data.data.Page.media.map(mapBrowseResult),
      };
      return res;
    } catch (err) {
      throw anilistError(err);
    }
  };

  /**
   *
   * @param page page number (optional)
   * @param perPage number of results per page (optional)
   * @param weekStart First day of the schedule, its next occurrence counting today (optional) (default: today) (options: 2 = Monday, 3 = Tuesday, 4 = Wednesday, 5 = Thursday, 6 = Friday, 0 = Saturday, 1 = Sunday) you can use either the number or the day's name
   * @param weekEnd Last day of the schedule, included, on or after weekStart (optional) (default: the day before today, so a full week) similar to weekStart
   * @param notYetAired if true will return anime that have not yet aired (optional)
   * @returns the next airing episodes
   */
  fetchAiringSchedule = async (
    page: number = 1,
    perPage: number = 20,
    weekStart: number | string = (new Date().getDay() + 1) % 7,
    weekEnd: number | string = (new Date().getDay() + 7) % 7,
    notYetAired: boolean = false
  ): Promise<ISearch<IAnimeResult>> => {
    const { from, to } = airingWindow(weekStart, weekEnd);

    try {
      // AniList's bounds are exclusive, so one second earlier keeps an episode airing at midnight.
      const { data } = await anilistQuery(anilistAiringScheduleQuery(), {
        page,
        perPage,
        notYetAired,
        airingAtGreater: from - 1,
        airingAtLesser: to,
      });

      const res: ISearch<IAnimeResult> = {
        currentPage: data.data.Page.pageInfo.currentPage,
        hasNextPage: data.data.Page.pageInfo.hasNextPage,
        results: data.data.Page.airingSchedules.map((item: any) => ({
          ...mapMediaResult(item.media),
          episode: item.episode,
          airingAt: item.airingAt,
          country: item.media.countryOfOrigin,
        })),
      };
      return res;
    } catch (err) {
      throw anilistError(err);
    }
  };

  /**
   *
   * @param genres An array of genres to filter by (optional) genres: [`Action`, `Adventure`, `Cars`, `Comedy`, `Drama`, `Fantasy`, `Horror`, `Mahou Shoujo`, `Mecha`, `Music`, `Mystery`, `Psychological`, `Romance`, `Sci-Fi`, `Slice of Life`, `Sports`, `Supernatural`, `Thriller`]
   * @param page page number (optional)
   * @param perPage number of results per page (optional)
   */
  fetchAnimeGenres = async (genres: string[] | Genres[], page: number = 1, perPage: number = 20) => {
    if (genres.length === 0) throw new Error('No genres specified');

    for (const genre of genres) if (!Object.values(Genres).includes(genre as Genres)) throw new Error('Invalid genre');

    try {
      const { data } = await anilistQuery(anilistGenresQuery(), { genres, page, perPage });

      const res: ISearch<IAnimeResult> = {
        currentPage: data.data.Page.pageInfo.currentPage,
        hasNextPage: data.data.Page.pageInfo.hasNextPage,
        results: data.data.Page.media.map(mapBrowseResult),
      };
      return res;
    } catch (err) {
      throw anilistError(err);
    }
  };

  private findAnimeRaw = async (title: ITitle) => {
    const searchTerm = title?.romaji || title?.english || title?.userPreferred || '';
    const findAnime = (await this.provider.search(searchTerm)) as ISearch<IAnimeResult>;

    if (!findAnime?.results) {
      return {} as IAnimeEpisode[];
    }

    // Run similar title searches in parallel
    const [mappedEng, mappedRom] = await Promise.all([
      Promise.resolve(findSimilarTitles(title?.english || '', findAnime.results)),
      Promise.resolve(findSimilarTitles(title?.romaji || '', findAnime.results)),
    ]);
    // console.log({ mappedEng, mappedRom });
    // Use Set for efficient deduplication
    const uniqueResults = Array.from(new Set([...mappedEng, ...mappedRom].map((item) => JSON.stringify(item)))).map(
      (str) => JSON.parse(str)
    );

    // Sort by similarity score
    uniqueResults.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    const mappings: any = {};
    for (const obj of uniqueResults) {
      const match = obj.title.replace(/\(TV\)/g, '').match(/\(([^)0-9]+)\)/);
      const key = match ? match[1].replace(/\s+/g, '-').toLowerCase() : 'sub';

      if (!mappings[key]) {
        mappings[key] = obj.id;
      }

      // Early return if we have both sub and dub
      if (mappings.sub && mappings.dub) break;
    }
    // console.log('mappings', mappings);
    // console.time('animeinfo');
    const animeInfo = await this.provider.fetchAnimeInfo(mappings.sub || mappings.dub);
    // console.timeEnd('animeinfo');
    return animeInfo.episodes as IAnimeEpisode[];
  };
  /**
   * @returns a random anime
   */
  fetchRandomAnime = async (): Promise<IAnimeInfo> => {
    try {
      const { data: data } = await metaHttp.get('https://raw.githubusercontent.com/5H4D0WILA/IDFetch/main/ids.txt');

      const ids = data?.trim().split('\n');
      const selectedAnime = Math.floor(Math.random() * ids.length);
      return await this.fetchAnimeInfo(ids[selectedAnime]);
    } catch (err) {
      throw anilistError(err);
    }
  };

  /**
   * @deprecated Reads from Anify, which is offline, so this always fails.
   * @param provider The provider to get the episode Ids from (optional) default: `gogoanime` (options: `gogoanime`, `zoro`)
   * @param page page number (optional)
   * @param perPage number of results per page (optional)
   */
  fetchRecentEpisodes = async (
    provider: 'gogoanime' | 'zoro' = 'gogoanime',
    page: number = 1,
    perPage: number = 25
  ): Promise<ISearch<IAnimeResult>> => {
    try {
      const { data } = await metaHttp.get(
        `${this.anifyUrl}/recent?page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}&type=anime`
      );

      const results: IAnimeInfo[] = data?.map((item: any) => {
        return {
          id: item.id.toString(),
          malId: item.mappings.find((item: any) => item.providerType === 'META' && item.providerId === 'mal')?.id,
          title: {
            romaji: item.title?.romaji,
            english: item.title?.english,
            native: item.title?.native,
            // userPreferred: (_f = item.title) === null || _f === void 0 ? void 0 : _f.userPreferred,
          },
          image: item.coverImage ?? item.bannerImage,
          rating: item.averageScore,
          color: item.anime?.color,
          episodeId: `${
            provider === 'gogoanime'
              ? item.episodes.data
                  .find((source: any) => source.providerId.toLowerCase() === 'gogoanime')
                  ?.episodes.pop()?.id
              : item.episodes.data.find((source: any) => source.providerId.toLowerCase() === 'zoro')?.episodes.pop()?.id
          }`,
          episodeTitle: item.episodes.latest.latestTitle ?? `Episode ${item.currentEpisode}`,
          episodeNumber: item.currentEpisode,
          genres: item.genre,
          type: item.format,
        };
      });
      // results = results.filter((item) => item.episodeNumber !== 0 &&
      //     item.episodeId.replace('-enime', '').length > 0 &&
      //     item.episodeId.replace('-enime', '') !== 'undefined');
      return {
        currentPage: page,
        // hasNextPage: meta.lastPage !== page,
        // totalPages: meta.lastPage,
        totalResults: results?.length,
        results: results,
      };
    } catch (err) {
      throw MetaError.from('provider', err);
    }
  };

  private fetchDefaultEpisodeList = async (Media: {
    idMal: number;
    title: { english: string; romaji: string };
    season: string;
    startDate: { year: number };
    externalLinks?: any;
  }) => {
    try {
      return await this.findAnimeRaw({ english: Media.title?.english!, romaji: Media.title?.romaji! });
    } catch (err) {
      throw MetaError.from('provider', err);
    }
  };

  /**
   * @param id anilist id
   * @param fetchFiller to get filler boolean on the episode object (optional) set to `true` to get filler boolean on the episode object.
   * @returns episode list **(without anime info)**, every episode with a `uniqueId`
   */
  fetchEpisodesListById = async (id: string, fetchFiller: boolean = false): Promise<IMetaAnimeEpisode[]> => {
    // ani.zip only needs the AniList id, so request it alongside the AniList query. It is
    // optional enrichment: if it fails or times out, the provider's episodes are still returned.
    const aniZipRequest = this.usesAniZipEpisodes()
      ? metaHttp
          .get(`https://api.ani.zip/mappings?anilist_id=${encodeURIComponent(id)}`, { timeout: ENRICHMENT_TIMEOUT_MS })
          .then((res) => res.data)
      : undefined;
    // Don't surface an unhandled rejection if the AniList query below fails first.
    aniZipRequest?.catch(() => undefined);

    const {
      data: {
        data: { Media },
      },
    } = await anilistQuery(
      `query($id: Int){ Media(id: $id){ idMal externalLinks { site url } title { romaji english } status season episodes startDate { year month day } endDate { year month day }  coverImage {extraLarge large medium} } }`,
      { id: Number(id) }
    ).catch((err) => {
      throw anilistError(err);
    });

    const fillerRequest = fetchFiller && Media.idMal ? this.fetchFillerEpisodes(Media.idMal) : Promise.resolve([]);

    let episodes: MergedEpisode[];
    if (aniZipRequest) {
      const [aniZip, provider] = await Promise.allSettled([aniZipRequest, this.fetchDefaultEpisodeList(Media)]);
      if (provider.status === 'rejected') throw provider.reason;

      const providerEpisodes = Array.isArray(provider.value) ? provider.value : [];
      episodes =
        aniZip.status === 'fulfilled'
          ? this.mergeAniZipEpisodes(aniZip.value, providerEpisodes)
          : providerEpisodes.map((episode) => ({ episode }));
    } else {
      const providerEpisodes = await this.fetchDefaultEpisodeList(Media);
      episodes = (Array.isArray(providerEpisodes) ? providerEpisodes : []).map((episode) => ({ episode }));
    }

    const fillerEpisodes = await fillerRequest;
    const cover = pickCover(Media.coverImage);

    return episodes.map((merged, index): IMetaAnimeEpisode => {
      const { episode } = merged;
      if (!episode.image && cover) episode.image = cover;
      applyFiller(episode, fillerEpisodes);

      // The one place uniqueId is set, so matched, unmatched and un-enriched episodes follow one rule.
      return { ...episode, uniqueId: episodeUniqueId(id, merged, index) };
    });
  };

  /**
   * Whether to merge the provider's episodes with ani.zip metadata. Providers declare this in
   * `capabilities`, so registry-only providers (no class) can opt in. Code that predates
   * capabilities falls back to the built-in provider classes.
   */
  private usesAniZipEpisodes = () => {
    const capabilities = (this.provider as { capabilities?: ProviderCapabilities }).capabilities;
    if (capabilities) return Boolean(capabilities.aniZipEpisodes);
    return (
      this.provider instanceof Zoro ||
      this.provider instanceof AnimeKai ||
      this.provider instanceof AnimePahe ||
      this.provider instanceof AniKoto
    );
  };

  /** Optional filler flags by episode index; an empty list if the source is missing or unreachable. */
  private fetchFillerEpisodes = async (malId: number): Promise<FillerEpisode[]> => {
    try {
      const { data } = await metaHttp.get(
        `https://raw.githubusercontent.com/saikou-app/mal-id-filler-list/main/fillers/${encodeURIComponent(malId)}.json`,
        { timeout: ENRICHMENT_TIMEOUT_MS }
      );
      return Array.isArray(data?.episodes) ? data.episodes : [];
    } catch {
      return [];
    }
  };

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
   * @param id anilist id
   * @returns anilist data for the anime **(without episodes)** (use `fetchEpisodesListById` to get the episodes) (use `fetchAnimeInfo` to get both)
   */
  fetchAnilistInfoById = async (id: string) => {
    try {
      const { data } = await anilistQuery(anilistMediaDetailQuery(), { id: Number(id) });
      const animeInfo: IAnimeInfo = { id, ...mapAnimeDetail(data.data.Media) };
      return animeInfo;
    } catch (err) {
      throw anilistError(err);
    }
  };

  /**
   * To get Staff details by anilistId
   * @param id staff id from anilist
   *
   */
  fetchStaffById = async (id: number) => {
    const staffInfo: IStaff = {
      id: String(id),
      name: { first: '', last: '', native: '', full: '' },
    };

    try {
      const { data } = await anilistQuery(anilistStaffInfoQuery(), { id: Number(id) });
      const staff = data.data.Staff;

      staffInfo.id = staff?.id;
      staffInfo.name = staff?.name;
      staffInfo.image = staff?.image;
      staffInfo.description = staff?.description;
      staffInfo.siteUrl = staff?.siteUrl;

      staffInfo.roles = staff?.staffMedia.edges.map((media: any) => ({
        id: media?.node?.id,
        title: media?.node?.title,
        type: media?.node?.type,
        image: {
          extraLarge: media?.node?.coverImage?.extraLarge,
          large: media?.node?.coverImage?.large,
          medium: media?.node?.coverImage?.medium,
        },
        color: media?.node?.coverImage?.color,
      }));

      return staffInfo;
    } catch (err) {
      throw anilistError(err);
    }
  };

  /**
   *
   * @param id character id from anilist
   */
  fetchCharacterInfoById = async (id: string) => {
    try {
      const {
        data: {
          data: { Character },
        },
      } = await anilistQuery(anilistCharacterQuery(), { id: Number(id) });

      const height = Character.description.match(/__Height:__(.*)/)?.[1].trim();
      const weight = Character.description.match(/__Weight:__(.*)/)?.[1].trim();
      const hairColor = Character.description.match(/__Hair Color:__(.*)/)?.[1].trim();
      const eyeColor = Character.description.match(/__Eye Color:__(.*)/)?.[1].trim();
      const relatives = Character.description
        .match(/__Relatives:__(.*)/)?.[1]
        .trim()
        .split(/(, \[)/g)
        .filter((g: string) => !g.includes(', ['))
        .map((r: string) => ({
          id: r.match(/\/(\d+)/)?.[1],
          name: r.match(/([^)]+)\]/)?.[1]!.replace(/\[/g, ''),
          relationship: r.match(/\(([^)]+)\).*?(\(([^)]+)\))/)?.[3],
        }));
      const race = Character.description
        .match(/__Race:__(.*)/)?.[1]
        .split(', ')
        .map((r: string) => r.trim());
      const rank = Character.description.match(/__Rank:__(.*)/)?.[1];
      const occupation = Character.description.match(/__Occupation:__(.*)/)?.[1];
      const previousPosition = Character.description.match(/__Previous Position:__(.*)/)?.[1]?.trim();
      const partner = Character.description
        .match(/__Partner:__(.*)/)?.[1]
        .split(/(, \[)/g)
        .filter((g: string) => !g.includes(', ['))
        .map((r: string) => ({
          id: r.match(/\/(\d+)/)?.[1],
          name: r.match(/([^)]+)\]/)?.[1]!.replace(/\[/g, ''),
        }));
      const dislikes = Character.description.match(/__Dislikes:__(.*)/)?.[1];
      const sign = Character.description.match(/__Sign:__(.*)/)?.[1];
      const zodicSign = Character.description.match(/__Zodiac sign:__(.*)/)?.[1]?.trim();
      const zodicAnimal = Character.description.match(/__Zodiac Animal:__(.*)/)?.[1]?.trim();
      const themeSong = Character.description.match(/__Theme Song:__(.*)/)?.[1]?.trim();
      Character.description = Character.description.replace(
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
        description: Character.description,
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
        relations: Character.media.edges?.map((v: any) => ({
          id: v.node.id,
          malId: v.node.idMal,
          role: v.characterRole,
          title: mapTitle(v.node.title),
          status: mapStatus(v.node.status),
          episodes: v.node.episodes,
          image: pickCover(v.node.coverImage),
          rating: v.node.averageScore,
          releaseDate: v.node.startDate?.year,
          type: v.node.format,
          color: v.node.coverImage?.color,
        })),
      };

      return characterInfo;
    } catch (err) {
      throw anilistError(err);
    }
  };

  /**
   * Anilist Anime class
   */
  static Anime = this;

  /**
   * Anilist Manga Class
   */
  static Manga = class Manga {
    provider: MangaParser;

    /**
     * Maps anilist manga to any manga provider (mangadex, mangasee, etc)
     * @param provider MangaParser
     */
    constructor(provider?: MangaParser) {
      this.provider = provider || new Mangasee123();
    }

    /**
     *
     * @param query query to search for
     * @param page (optional) page number (default: `1`)
     * @param perPage (optional) number of results per page (default: `20`)
     */
    search = async (query: string, page: number = 1, perPage: number = 20): Promise<ISearch<IMangaResult>> => {
      try {
        const { data } = await anilistQuery(anilistSearchQuery(), { search: query, page, perPage, type: 'MANGA' });

        const res: ISearch<IMangaResult> = {
          currentPage: data.data.Page.pageInfo.currentPage,
          hasNextPage: data.data.Page.pageInfo.hasNextPage,
          results: data.data.Page.media.map(
            (item: any): IMangaResult => ({
              ...mapMediaResult(item),
              popularity: item.popularity,
              totalChapters: item.chapters,
              volumes: item.volumes,
            })
          ),
        };

        return res;
      } catch (err) {
        throw anilistError(err);
      }
    };

    /**
     *
     * @param chapterId chapter id
     * @param args args to pass to the provider (if any)
     * @returns
     */
    fetchChapterPages = (chapterId: string, ...args: any): Promise<IMangaChapterPage[]> => {
      return this.provider.fetchChapterPages(chapterId, ...args);
    };

    fetchMangaInfo = async (id: string, ...args: any): Promise<IMangaInfo> => {
      try {
        const { data } = await anilistQuery(anilistMediaDetailQuery(), { id: Number(id) });
        const mangaInfo: IMangaInfo = { id, ...mapMediaDetail(data.data.Media) };
        const chapters = await new Anilist()
          .findManga(this.provider, mapTitle(data.data.Media.title), mangaInfo.malId as number)
          .catch((err) => {
            throw MetaError.from('provider', err);
          });
        mangaInfo.chapters = [...chapters].reverse();

        return mangaInfo;
      } catch (error) {
        throw anilistError(error);
      }
    };
  };

  /** The provider's chapters for the manga titled `title`; empty when the provider doesn't have it. */
  private findMangaSlug = async (provider: MangaParser, title: string, malId?: number): Promise<IMangaChapter[]> => {
    const slug = title.replace(/[^0-9a-zA-Z]+/g, ' ');

    let possibleManga: IMangaInfo | undefined;

    if (malId) {
      const malAsyncReq = await metaHttp.get(`${this.malSyncUrl}/mal/manga/${encodeURIComponent(malId)}`, {
        validateStatus: () => true,
      });

      if (malAsyncReq.status === 200) {
        const sitesT = malAsyncReq.data.Sites as {
          [k: string]: {
            [k: string]: { url: string; page: string; title: string };
          };
        };
        let sites = Object.values(sitesT).map((v, i) => {
          const obj: any = [...Object.values(Object.values(sitesT)[i]!)];
          const pages: any = obj.map((v: any) => ({
            page: v.page,
            url: v.url,
            title: v.title,
          }));
          return pages;
        }) as any[];

        sites = sites.flat();

        const possibleSource = sites.find((s) => s.page.toLowerCase() === provider.name.toLowerCase());

        if (possibleSource) possibleManga = await provider.fetchMangaInfo(possibleSource.url.split('/').pop()!);
        else possibleManga = await this.findMangaRaw(provider, slug, title);
      } else possibleManga = await this.findMangaRaw(provider, slug, title);
    } else possibleManga = await this.findMangaRaw(provider, slug, title);

    return possibleManga?.chapters ?? [];
  };

  /** The provider's manga for a search, preferring an exact title match; `undefined` when it finds none. */
  private findMangaRaw = async (
    provider: MangaParser,
    slug: string,
    title: string
  ): Promise<IMangaInfo | undefined> => {
    const { results = [] } = ((await provider.search(slug)) ?? {}) as Partial<ISearch<IMangaResult>>;

    if (results.length === 0) return undefined;
    // TODO: use much better way than this

    const possibleManga = results.find(
      (manga: IMangaResult) =>
        title.toLowerCase() === (typeof manga.title === 'string' ? manga.title.toLowerCase() : '')
    );

    return (await provider.fetchMangaInfo((possibleManga ?? results[0]!).id)) as IMangaInfo;
  };

  /** The provider's chapters, looked up by the romaji title, then by the English one if that finds none. */
  private findManga = async (provider: MangaParser, title: ITitle, malId?: number): Promise<IMangaChapter[]> => {
    const romaji = (title.romaji ?? title.english ?? '').toLowerCase();
    const english = (title.english ?? title.romaji ?? '').toLowerCase();

    const romajiChapters = await this.findMangaSlug(provider, romaji, malId);
    if (romajiChapters.length > 0 || english === romaji) return romajiChapters;

    return this.findMangaSlug(provider, english, malId);
  };
}

// (async () => {
//   const ani = new Anilist(new Zoro());
//   const anime = await ani.fetchAnimeInfo('21');
//   console.log(anime.episodes);
//   const sources = await ani.fetchEpisodeSources(anime.episodes![0]!.id, anime.episodes![0]!.number, anime.id);
//   console.log(sources);
// })();

export default Anilist;
