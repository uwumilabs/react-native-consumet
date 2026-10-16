"use strict";

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
const meta_http_1 = require("../../utils/meta-http");
const models_1 = require("../../models");
const utils_1 = require("../../utils");
const zoro_1 = __importDefault(require("../anime/zoro/zoro"));
const animekai_1 = __importDefault(require("../anime/animekai/animekai"));
const animepahe_1 = __importDefault(require("../anime/animepahe/animepahe"));
const anikoto_1 = __importDefault(require("../anime/anikoto/anikoto"));
const mangasee123_1 = __importDefault(require("../manga/mangasee123"));
const utils_2 = require("../../utils/utils");
/** A failed AniList request as a MetaError, keeping its status, with a readable message for 404 and 429. */
const anilistError = err => {
  const status = err?.response?.status;
  if (status === 404) return models_1.MetaError.from('anilist', err, 'Media not found. Perhaps the id is invalid or the anime is not in anilist');
  if (status === 429) return models_1.MetaError.from('anilist', err, 'You have been ratelimited by anilist. Please try again later');
  return models_1.MetaError.from('anilist', err);
};
const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';
/**
 * POST a query to AniList. Values always go in `variables`, never into the query text, so a search
 * containing `"` or `\` can't break the query (it used to fail with a 400).
 */
const anilistQuery = (query, variables) => meta_http_1.metaHttp.post(ANILIST_GRAPHQL_URL, {
  query,
  variables
}, {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});
// One mapping per AniList shape. Every method used to carry its own copy, and the copies drifted
// (a missing `?.` that crashed on a hidden recommendation, a URL in `coverHash`).
const STATUS = new Map([['RELEASING', models_1.MediaStatus.ONGOING], ['FINISHED', models_1.MediaStatus.COMPLETED], ['NOT_YET_RELEASED', models_1.MediaStatus.NOT_YET_AIRED], ['CANCELLED', models_1.MediaStatus.CANCELLED], ['HIATUS', models_1.MediaStatus.HIATUS]]);
/** AniList's `status(version: 2)` as a MediaStatus; anything else is UNKNOWN. */
const mapStatus = status => STATUS.get(status) ?? models_1.MediaStatus.UNKNOWN;
/** The largest of AniList's cover (poster) images. */
const pickCover = coverImage => coverImage?.extraLarge ?? coverImage?.large ?? coverImage?.medium ?? undefined;
/** The value of `cover`: the banner, or the cover image for media without one. */
const bannerOrCover = media => media.bannerImage ?? pickCover(media.coverImage);
const mapTitle = title => ({
  romaji: title?.romaji,
  english: title?.english,
  native: title?.native,
  userPreferred: title?.userPreferred
});
const mapName = name => ({
  first: name?.first,
  last: name?.last,
  full: name?.full,
  native: name?.native,
  userPreferred: name?.userPreferred
});
const mapFuzzyDate = date => ({
  year: date?.year,
  month: date?.month,
  day: date?.day
});
/** The fields every list result (search, trending, the airing schedule…) shares. */
const mapMediaResult = media => ({
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
  releaseDate: media.seasonYear
});
/** A trending, popular or by-genre result. */
const mapBrowseResult = media => ({
  ...mapMediaResult(media),
  trailer: {
    id: media.trailer?.id,
    site: media.trailer?.site,
    thumbnail: media.trailer?.thumbnail
  },
  totalEpisodes: isNaN(media.episodes) ? 0 : media.episodes ?? (media.nextAiringEpisode?.episode ? media.nextAiringEpisode.episode - 1 : 0),
  duration: media.duration
});
/**
 * Media inside another media's details (a recommendation or a relation), in one shape for anime
 * and manga. AniList sends `null` for media it hides, which maps to `undefined`.
 */
const mapMediaNode = node => node ? {
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
  type: node.format
} : undefined;
const mapRecommendations = media => media.recommendations?.edges?.flatMap(edge => mapMediaNode(edge?.node?.mediaRecommendation) ?? []);
const mapRelations = media => media.relations?.edges?.flatMap(edge => {
  const node = mapMediaNode(edge?.node);
  return node ? [{
    ...node,
    relationType: edge.relationType
  }] : [];
});
const mapCharacters = media => media.characters?.edges?.map(edge => ({
  id: edge.node?.id,
  role: edge.role,
  name: mapName(edge.node?.name),
  image: edge.node?.image?.large ?? edge.node?.image?.medium,
  voiceActors: (edge.voiceActors ?? []).map(voiceActor => ({
    id: voiceActor.id,
    language: voiceActor.languageV2,
    name: mapName(voiceActor.name),
    image: voiceActor.image?.large ?? voiceActor.image?.medium
  }))
}));
/** The details fetchAnimeInfo, fetchAnilistInfoById and Manga.fetchMangaInfo share. */
const mapMediaDetail = media => ({
  malId: media.idMal,
  title: mapTitle(media.title),
  synonyms: media.synonyms,
  isLicensed: media.isLicensed ?? undefined,
  isAdult: media.isAdult ?? undefined,
  countryOfOrigin: media.countryOfOrigin ?? undefined,
  ...(media.trailer?.id ? {
    trailer: {
      id: media.trailer.id,
      site: media.trailer.site,
      thumbnail: media.trailer.thumbnail
    }
  } : {}),
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
  studios: media.studios?.edges?.map(edge => edge.node.name),
  type: media.format,
  recommendations: mapRecommendations(media),
  characters: mapCharacters(media),
  relations: mapRelations(media)
});
/** mapMediaDetail plus the airing and episode fields of an anime. */
const mapAnimeDetail = media => ({
  ...mapMediaDetail(media),
  ...(media.nextAiringEpisode?.airingAt ? {
    nextAiringEpisode: {
      airingTime: media.nextAiringEpisode.airingAt,
      timeUntilAiring: media.nextAiringEpisode.timeUntilAiring,
      episode: media.nextAiringEpisode.episode
    }
  } : {}),
  totalEpisodes: media.episodes ?? media.nextAiringEpisode?.episode - 1,
  currentEpisode: media.nextAiringEpisode?.episode ? media.nextAiringEpisode.episode - 1 : media.episodes ?? undefined,
  duration: media.duration
});
const DAY_MS = 86_400_000;
const toEpisodeNumber = value => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};
const timeOf = date => {
  if (typeof date !== 'string' || !date) return undefined;
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? undefined : time;
};
/**
 * The key apps store watch progress under: `${anilistId}$ep=${aniDbKey ?? number}`. Falls back to
 * the list position only when the provider gave the episode no usable number.
 */
const episodeUniqueId = (anilistId, _ref, index) => {
  let {
    episode,
    aniDbKey
  } = _ref;
  return `${anilistId}$ep=${aniDbKey ?? toEpisodeNumber(episode.number) ?? index + 1}`;
};
/**
 * Sets `isFiller` from a MAL filler list, which lists episodes in order, by the provider's episode
 * number. Episodes the list doesn't reach keep `isFiller` unset.
 */
const applyFiller = (episode, fillers) => {
  const number = toEpisodeNumber(episode.number);
  const filler = number === undefined ? undefined : fillers[number - 1];
  if (filler) episode.isFiller = Boolean(filler['filler-bool']);
};
class Anilist extends models_1.AnimeParser {
  proxyConfig;
  name = 'Anilist';
  baseUrl = 'https://anilist.co';
  logo = 'https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg';
  classPath = 'META.Anilist';
  kitsuGraphqlUrl = 'https://kitsu.io/api/graphql';
  malSyncUrl = 'https://api.malsync.moe';
  anifyUrl = utils_2.ANIFY_URL;
  provider;
  /**
   * This class maps anilist to kitsu with any other anime provider.
   * kitsu is used for episode images, titles and description.
   * @param provider anime provider (optional) default: Gogoanime
   * @param proxyConfig proxy config (optional)
   * @param adapter axios adapter (optional)
   */
  constructor(provider, proxyConfig, adapter, customBaseURL) {
    super();
    this.proxyConfig = proxyConfig;
    this.provider = provider || new zoro_1.default(customBaseURL);
  }
  /**
   * @param query Search query
   * @param page Page number (optional)
   * @param perPage Number of results per page (optional) (default: 15) (max: 50)
   */
  search = (() => async function (query) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    let perPage = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 15;
    try {
      const {
        data
      } = await anilistQuery((0, utils_1.anilistSearchQuery)(), {
        search: query,
        page,
        perPage,
        type: 'ANIME'
      });
      const res = {
        currentPage: data.data?.Page?.pageInfo?.currentPage,
        hasNextPage: data.data?.Page?.pageInfo?.hasNextPage,
        results: data.data?.Page?.media?.map(item => ({
          ...mapMediaResult(item),
          popularity: item.popularity,
          totalEpisodes: item.episodes ?? item.nextAiringEpisode?.episode - 1,
          currentEpisodeCount: item?.nextAiringEpisode ? item?.nextAiringEpisode?.episode - 1 : item.episodes
        })) ?? []
      };
      return res;
    } catch (err) {
      throw anilistError(err);
    }
  })();
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
  advancedSearch = (() => async function (query) {
    let type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'ANIME';
    let page = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
    let perPage = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 20;
    let format = arguments.length > 4 ? arguments[4] : undefined;
    let sort = arguments.length > 5 ? arguments[5] : undefined;
    let genres = arguments.length > 6 ? arguments[6] : undefined;
    let id = arguments.length > 7 ? arguments[7] : undefined;
    let year = arguments.length > 8 ? arguments[8] : undefined;
    let status = arguments.length > 9 ? arguments[9] : undefined;
    let season = arguments.length > 10 ? arguments[10] : undefined;
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
      season: season
    };
    if (genres) {
      genres.forEach(genre => {
        if (!Object.values(models_1.Genres).includes(genre)) {
          throw new Error(`genre ${genre} is not valid`);
        }
      });
    }
    try {
      const {
        data
      } = await anilistQuery((0, utils_1.anilistAdvancedQuery)(), variables);
      const res = {
        currentPage: data.data?.Page?.pageInfo?.currentPage,
        hasNextPage: data.data?.Page?.pageInfo?.hasNextPage,
        totalPages: data.data?.Page?.pageInfo?.lastPage,
        totalResults: data.data?.Page?.pageInfo?.total,
        results: []
      };
      res.results.push(...(data.data?.Page?.media?.map(item => ({
        ...mapMediaResult(item),
        popularity: item.popularity,
        totalEpisodes: item.episodes ?? item.nextAiringEpisode?.episode - 1,
        currentEpisode: item.nextAiringEpisode?.episode - 1 || item.episodes,
        countryOfOrigin: item.countryOfOrigin
      })) ?? []));
      return res;
    } catch (err) {
      throw anilistError(err);
    }
  })();
  /**
   *
   * @param id Anime id
   * @param dub to get dubbed episodes (optional) set to `true` to get dubbed episodes. **ONLY WORKS FOR GOGOANIME**
   * @param fetchFiller to get filler boolean on the episode object (optional) set to `true` to get filler boolean on the episode object.
   */
  fetchAnimeInfo = (() => {
    var _this = this;
    return async function (id) {
      let fetchFiller = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      try {
        const {
          data
        } = await anilistQuery((0, utils_1.anilistMediaDetailQuery)(), {
          id: Number(id)
        });
        const animeInfo = {
          id,
          ...mapAnimeDetail(data.data.Media)
        };
        const title = mapTitle(data.data.Media.title);
        animeInfo.episodes = await _this.fetchDefaultEpisodeList({
          idMal: animeInfo.malId,
          season: data.data.Media.season,
          startDate: {
            year: parseInt(animeInfo.releaseDate)
          },
          title: {
            english: title.english,
            romaji: title.romaji
          },
          externalLinks: data.data.Media.externalLinks?.filter(link => link.type === 'STREAMING')
        });
        const fillerEpisodes = fetchFiller && animeInfo.malId ? await _this.fetchFillerEpisodes(animeInfo.malId) : [];
        animeInfo.episodes = animeInfo.episodes?.map((episode, index) => {
          if (!episode.image) episode.image = animeInfo.image;
          applyFiller(episode, fillerEpisodes);
          // No ani.zip merge here, so the key comes from the provider's number, as it does in
          // fetchEpisodesListById for episodes ani.zip doesn't match.
          episode.uniqueId = episodeUniqueId(id, {
            episode
          }, index);
          return episode;
        });
        return animeInfo;
      } catch (err) {
        throw anilistError(err);
      }
    };
  })();
  /**
   *
   * @param episodeId Episode id
   */
  fetchEpisodeSources = (() => {
    var _this2 = this;
    return async function (episodeId) {
      try {
        for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }
        return await _this2.provider.fetchEpisodeSources(episodeId, ...args);
      } catch (err) {
        throw models_1.MetaError.from('provider', err, `Failed to fetch episode sources from ${_this2.provider.name}: ${err}`);
      }
    };
  })();
  /**
   *
   * @param episodeId Episode id
   */
  fetchEpisodeServers = async episodeId => {
    try {
      return await this.provider.fetchEpisodeServers(episodeId);
    } catch (err) {
      throw models_1.MetaError.from('provider', err, `Failed to fetch episode servers from ${this.provider.name}: ${err}`);
    }
  };
  /**
   * @param page page number to search for (optional)
   * @param perPage number of results per page (optional)
   */
  fetchTrendingAnime = (() => async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    let perPage = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 10;
    try {
      const {
        data
      } = await anilistQuery((0, utils_1.anilistTrendingQuery)(), {
        page,
        perPage
      });
      const res = {
        currentPage: data.data.Page.pageInfo.currentPage,
        hasNextPage: data.data.Page.pageInfo.hasNextPage,
        results: data.data.Page.media.map(mapBrowseResult)
      };
      return res;
    } catch (err) {
      throw anilistError(err);
    }
  })();
  /**
   *
   * @param page page number to search for (optional)
   * @param perPage number of results per page (optional)
   */
  fetchPopularAnime = (() => async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    let perPage = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 10;
    try {
      const {
        data
      } = await anilistQuery((0, utils_1.anilistPopularQuery)(), {
        page,
        perPage
      });
      const res = {
        currentPage: data.data.Page.pageInfo.currentPage,
        hasNextPage: data.data.Page.pageInfo.hasNextPage,
        results: data.data.Page.media.map(mapBrowseResult)
      };
      return res;
    } catch (err) {
      throw anilistError(err);
    }
  })();
  /**
   *
   * @param page page number (optional)
   * @param perPage number of results per page (optional)
   * @param weekStart Filter by the start of the week (optional) (default: todays date) (options: 2 = Monday, 3 = Tuesday, 4 = Wednesday, 5 = Thursday, 6 = Friday, 0 = Saturday, 1 = Sunday) you can use either the number or the string
   * @param weekEnd Filter by the end of the week (optional) similar to weekStart
   * @param notYetAired if true will return anime that have not yet aired (optional)
   * @returns the next airing episodes
   */
  fetchAiringSchedule = (() => async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    let perPage = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 20;
    let weekStart = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : (new Date().getDay() + 1) % 7;
    let weekEnd = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : (new Date().getDay() + 7) % 7;
    let notYetAired = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
    let day1, day2;
    if (typeof weekStart === 'string' && typeof weekEnd === 'string') [day1, day2] = (0, utils_1.getDays)((0, utils_1.capitalizeFirstLetter)(weekStart.toLowerCase()), (0, utils_1.capitalizeFirstLetter)(weekEnd.toLowerCase()));else if (typeof weekStart === 'number' && typeof weekEnd === 'number') [day1, day2] = [weekStart, weekEnd];else throw new Error('Invalid weekStart or weekEnd');
    try {
      const {
        data
      } = await anilistQuery((0, utils_1.anilistAiringScheduleQuery)(), {
        page,
        perPage,
        notYetAired,
        airingAtGreater: day1,
        airingAtLesser: day2
      });
      const res = {
        currentPage: data.data.Page.pageInfo.currentPage,
        hasNextPage: data.data.Page.pageInfo.hasNextPage,
        results: data.data.Page.airingSchedules.map(item => ({
          ...mapMediaResult(item.media),
          episode: item.episode,
          airingAt: item.airingAt,
          country: item.media.countryOfOrigin
        }))
      };
      return res;
    } catch (err) {
      throw anilistError(err);
    }
  })();
  /**
   *
   * @param genres An array of genres to filter by (optional) genres: [`Action`, `Adventure`, `Cars`, `Comedy`, `Drama`, `Fantasy`, `Horror`, `Mahou Shoujo`, `Mecha`, `Music`, `Mystery`, `Psychological`, `Romance`, `Sci-Fi`, `Slice of Life`, `Sports`, `Supernatural`, `Thriller`]
   * @param page page number (optional)
   * @param perPage number of results per page (optional)
   */
  fetchAnimeGenres = (() => async function (genres) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    let perPage = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 20;
    if (genres.length === 0) throw new Error('No genres specified');
    for (const genre of genres) if (!Object.values(models_1.Genres).includes(genre)) throw new Error('Invalid genre');
    try {
      const {
        data
      } = await anilistQuery((0, utils_1.anilistGenresQuery)(), {
        genres,
        page,
        perPage
      });
      const res = {
        currentPage: data.data.Page.pageInfo.currentPage,
        hasNextPage: data.data.Page.pageInfo.hasNextPage,
        results: data.data.Page.media.map(mapBrowseResult)
      };
      return res;
    } catch (err) {
      throw anilistError(err);
    }
  })();
  findAnimeRaw = async title => {
    const searchTerm = title?.romaji || title?.english || title?.userPreferred || '';
    const findAnime = await this.provider.search(searchTerm);
    if (!findAnime?.results) {
      return {};
    }
    // Run similar title searches in parallel
    const [mappedEng, mappedRom] = await Promise.all([Promise.resolve((0, utils_2.findSimilarTitles)(title?.english || '', findAnime.results)), Promise.resolve((0, utils_2.findSimilarTitles)(title?.romaji || '', findAnime.results))]);
    // console.log({ mappedEng, mappedRom });
    // Use Set for efficient deduplication
    const uniqueResults = Array.from(new Set([...mappedEng, ...mappedRom].map(item => JSON.stringify(item)))).map(str => JSON.parse(str));
    // Sort by similarity score
    uniqueResults.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    const mappings = {};
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
    return animeInfo.episodes;
  };
  /**
   * @returns a random anime
   */
  fetchRandomAnime = async () => {
    try {
      const {
        data: data
      } = await meta_http_1.metaHttp.get('https://raw.githubusercontent.com/5H4D0WILA/IDFetch/main/ids.txt');
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
  fetchRecentEpisodes = (() => {
    var _this3 = this;
    return async function () {
      let provider = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'gogoanime';
      let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      let perPage = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 25;
      try {
        const {
          data
        } = await meta_http_1.metaHttp.get(`${_this3.anifyUrl}/recent?page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}&type=anime`);
        const results = data?.map(item => {
          return {
            id: item.id.toString(),
            malId: item.mappings.find(item => item.providerType === 'META' && item.providerId === 'mal')?.id,
            title: {
              romaji: item.title?.romaji,
              english: item.title?.english,
              native: item.title?.native
              // userPreferred: (_f = item.title) === null || _f === void 0 ? void 0 : _f.userPreferred,
            },
            image: item.coverImage ?? item.bannerImage,
            rating: item.averageScore,
            color: item.anime?.color,
            episodeId: `${provider === 'gogoanime' ? item.episodes.data.find(source => source.providerId.toLowerCase() === 'gogoanime')?.episodes.pop()?.id : item.episodes.data.find(source => source.providerId.toLowerCase() === 'zoro')?.episodes.pop()?.id}`,
            episodeTitle: item.episodes.latest.latestTitle ?? `Episode ${item.currentEpisode}`,
            episodeNumber: item.currentEpisode,
            genres: item.genre,
            type: item.format
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
          results: results
        };
      } catch (err) {
        throw models_1.MetaError.from('provider', err);
      }
    };
  })();
  fetchDefaultEpisodeList = async Media => {
    try {
      return await this.findAnimeRaw({
        english: Media.title?.english,
        romaji: Media.title?.romaji
      });
    } catch (err) {
      throw models_1.MetaError.from('provider', err);
    }
  };
  /**
   * @param id anilist id
   * @param fetchFiller to get filler boolean on the episode object (optional) set to `true` to get filler boolean on the episode object.
   * @returns episode list **(without anime info)**, every episode with a `uniqueId`
   */
  fetchEpisodesListById = (() => {
    var _this4 = this;
    return async function (id) {
      let fetchFiller = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      // ani.zip only needs the AniList id, so request it alongside the AniList query. It is
      // optional enrichment: if it fails or times out, the provider's episodes are still returned.
      const aniZipRequest = _this4.usesAniZipEpisodes() ? meta_http_1.metaHttp.get(`https://api.ani.zip/mappings?anilist_id=${encodeURIComponent(id)}`, {
        timeout: meta_http_1.ENRICHMENT_TIMEOUT_MS
      }).then(res => res.data) : undefined;
      // Don't surface an unhandled rejection if the AniList query below fails first.
      aniZipRequest?.catch(() => undefined);
      const {
        data: {
          data: {
            Media
          }
        }
      } = await anilistQuery(`query($id: Int){ Media(id: $id){ idMal externalLinks { site url } title { romaji english } status season episodes startDate { year month day } endDate { year month day }  coverImage {extraLarge large medium} } }`, {
        id: Number(id)
      }).catch(err => {
        throw anilistError(err);
      });
      const fillerRequest = fetchFiller && Media.idMal ? _this4.fetchFillerEpisodes(Media.idMal) : Promise.resolve([]);
      let episodes;
      if (aniZipRequest) {
        const [aniZip, provider] = await Promise.allSettled([aniZipRequest, _this4.fetchDefaultEpisodeList(Media)]);
        if (provider.status === 'rejected') throw provider.reason;
        const providerEpisodes = Array.isArray(provider.value) ? provider.value : [];
        episodes = aniZip.status === 'fulfilled' ? _this4.mergeAniZipEpisodes(aniZip.value, providerEpisodes) : providerEpisodes.map(episode => ({
          episode
        }));
      } else {
        const providerEpisodes = await _this4.fetchDefaultEpisodeList(Media);
        episodes = (Array.isArray(providerEpisodes) ? providerEpisodes : []).map(episode => ({
          episode
        }));
      }
      const fillerEpisodes = await fillerRequest;
      const cover = pickCover(Media.coverImage);
      return episodes.map((merged, index) => {
        const {
          episode
        } = merged;
        if (!episode.image && cover) episode.image = cover;
        applyFiller(episode, fillerEpisodes);
        // The one place uniqueId is set, so matched, unmatched and un-enriched episodes follow one rule.
        return {
          ...episode,
          uniqueId: episodeUniqueId(id, merged, index)
        };
      });
    };
  })();
  /**
   * Whether to merge the provider's episodes with ani.zip metadata. Providers declare this in
   * `capabilities`, so registry-only providers (no class) can opt in. Code that predates
   * capabilities falls back to the built-in provider classes.
   */
  usesAniZipEpisodes = () => {
    const capabilities = this.provider.capabilities;
    if (capabilities) return Boolean(capabilities.aniZipEpisodes);
    return this.provider instanceof zoro_1.default || this.provider instanceof animekai_1.default || this.provider instanceof animepahe_1.default || this.provider instanceof anikoto_1.default;
  };
  /** Optional filler flags by episode index; an empty list if the source is missing or unreachable. */
  fetchFillerEpisodes = async malId => {
    try {
      const {
        data
      } = await meta_http_1.metaHttp.get(`https://raw.githubusercontent.com/saikou-app/mal-id-filler-list/main/fillers/${encodeURIComponent(malId)}.json`, {
        timeout: meta_http_1.ENRICHMENT_TIMEOUT_MS
      });
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
  mergeAniZipEpisodes = (animeMetaData, providerEpisodes) => {
    const entries = Object.entries(animeMetaData?.episodes ?? {}).filter(_ref2 => {
      let [key, item] = _ref2;
      return /^\d+$/.test(key) && item;
    }).map(_ref3 => {
      let [key, item] = _ref3;
      const releaseDate = item.airDate ?? item.airdate ?? item.airDateUtc;
      return {
        key: Number(key),
        time: timeOf(item.airDateUtc) ?? timeOf(releaseDate),
        title: item.title?.en ?? item.title?.['x-jat'],
        description: item.overview ?? item.summary,
        image: item.image,
        releaseDate,
        tvdbNumber: toEpisodeNumber(item.episodeNumber),
        absoluteNumber: toEpisodeNumber(item.absoluteEpisodeNumber)
      };
    });
    const byKey = new Map(entries.map(entry => [entry.key, entry]));
    // Several episodes can air on one day (premieres, full-season drops), so each day holds a list.
    const byDay = new Map();
    for (const entry of entries) {
      if (entry.time === undefined) continue;
      const day = Math.floor(entry.time / DAY_MS);
      const bucket = byDay.get(day);
      if (bucket) bucket.push(entry);else byDay.set(day, [entry]);
    }
    const matches = providerEpisodes.map(() => undefined);
    const used = new Set();
    const claim = (index, entry) => {
      matches[index] = entry;
      used.add(entry.key);
    };
    const distance = (index, entry) => {
      const time = timeOf(providerEpisodes[index]?.releaseDate);
      return time === undefined || entry.time === undefined ? Infinity : Math.abs(time - entry.time);
    };
    // 1. By number: ani.zip key N is AniDB episode N. When the provider lists a number twice, the
    // copy released closest to the air date takes it.
    const claimants = new Map();
    providerEpisodes.forEach((episode, index) => {
      const number = toEpisodeNumber(episode.number);
      if (number === undefined || !byKey.has(number)) return;
      const indexes = claimants.get(number);
      if (indexes) indexes.push(index);else claimants.set(number, [index]);
    });
    for (const [number, indexes] of claimants) {
      const entry = byKey.get(number);
      const closest = indexes.reduce((best, index) => distance(index, entry) < distance(best, entry) ? index : best);
      claim(closest, entry);
    }
    // 2. By release date, within a day either way, for episodes the provider numbers differently
    // (e.g. continuing the previous season's count). Episodes go in number order and each takes the
    // earliest unused episode aired in that window, so episodes sharing a day keep their order.
    const unmatchedByNumber = providerEpisodes.map((episode, index) => ({
      index,
      number: toEpisodeNumber(episode.number) ?? Infinity,
      time: timeOf(episode.releaseDate)
    })).filter(_ref4 => {
      let {
        index,
        time
      } = _ref4;
      return !matches[index] && time !== undefined;
    }).sort((a, b) => a.number - b.number || a.index - b.index);
    for (const {
      index,
      time
    } of unmatchedByNumber) {
      const day = Math.floor(time / DAY_MS);
      const [entry] = [day - 1, day, day + 1].flatMap(d => byDay.get(d) ?? []).filter(e => !used.has(e.key) && Math.abs(time - e.time) <= DAY_MS).sort((a, b) => a.key - b.key);
      if (entry) claim(index, entry);
    }
    // 3. By title.
    providerEpisodes.forEach((episode, index) => {
      const providerTitle = episode.title;
      if (matches[index] || !providerTitle) return;
      const entry = entries.find(e => !used.has(e.key) && e.title?.includes(providerTitle));
      if (entry) claim(index, entry);
    });
    return providerEpisodes.map((providerEp, index) => {
      const entry = matches[index];
      if (!entry) return {
        episode: providerEp
      };
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
          absoluteNumber: entry.absoluteNumber
        }
      };
    });
  };
  /**
   * @param id anilist id
   * @returns anilist data for the anime **(without episodes)** (use `fetchEpisodesListById` to get the episodes) (use `fetchAnimeInfo` to get both)
   */
  fetchAnilistInfoById = async id => {
    try {
      const {
        data
      } = await anilistQuery((0, utils_1.anilistMediaDetailQuery)(), {
        id: Number(id)
      });
      const animeInfo = {
        id,
        ...mapAnimeDetail(data.data.Media)
      };
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
  fetchStaffById = async id => {
    const staffInfo = {
      id: String(id),
      name: {
        first: '',
        last: '',
        native: '',
        full: ''
      }
    };
    try {
      const {
        data
      } = await anilistQuery((0, utils_1.anilistStaffInfoQuery)(), {
        id: Number(id)
      });
      const staff = data.data.Staff;
      staffInfo.id = staff?.id;
      staffInfo.name = staff?.name;
      staffInfo.image = staff?.image;
      staffInfo.description = staff?.description;
      staffInfo.siteUrl = staff?.siteUrl;
      staffInfo.roles = staff?.staffMedia.edges.map(media => ({
        id: media?.node?.id,
        title: media?.node?.title,
        type: media?.node?.type,
        image: {
          extraLarge: media?.node?.coverImage?.extraLarge,
          large: media?.node?.coverImage?.large,
          medium: media?.node?.coverImage?.medium
        },
        color: media?.node?.coverImage?.color
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
  fetchCharacterInfoById = async id => {
    try {
      const {
        data: {
          data: {
            Character
          }
        }
      } = await anilistQuery((0, utils_1.anilistCharacterQuery)(), {
        id: Number(id)
      });
      const height = Character.description.match(/__Height:__(.*)/)?.[1].trim();
      const weight = Character.description.match(/__Weight:__(.*)/)?.[1].trim();
      const hairColor = Character.description.match(/__Hair Color:__(.*)/)?.[1].trim();
      const eyeColor = Character.description.match(/__Eye Color:__(.*)/)?.[1].trim();
      const relatives = Character.description.match(/__Relatives:__(.*)/)?.[1].trim().split(/(, \[)/g).filter(g => !g.includes(', [')).map(r => ({
        id: r.match(/\/(\d+)/)?.[1],
        name: r.match(/([^)]+)\]/)?.[1].replace(/\[/g, ''),
        relationship: r.match(/\(([^)]+)\).*?(\(([^)]+)\))/)?.[3]
      }));
      const race = Character.description.match(/__Race:__(.*)/)?.[1].split(', ').map(r => r.trim());
      const rank = Character.description.match(/__Rank:__(.*)/)?.[1];
      const occupation = Character.description.match(/__Occupation:__(.*)/)?.[1];
      const previousPosition = Character.description.match(/__Previous Position:__(.*)/)?.[1]?.trim();
      const partner = Character.description.match(/__Partner:__(.*)/)?.[1].split(/(, \[)/g).filter(g => !g.includes(', [')).map(r => ({
        id: r.match(/\/(\d+)/)?.[1],
        name: r.match(/([^)]+)\]/)?.[1].replace(/\[/g, '')
      }));
      const dislikes = Character.description.match(/__Dislikes:__(.*)/)?.[1];
      const sign = Character.description.match(/__Sign:__(.*)/)?.[1];
      const zodicSign = Character.description.match(/__Zodiac sign:__(.*)/)?.[1]?.trim();
      const zodicAnimal = Character.description.match(/__Zodiac Animal:__(.*)/)?.[1]?.trim();
      const themeSong = Character.description.match(/__Theme Song:__(.*)/)?.[1]?.trim();
      Character.description = Character.description.replace(/__Theme Song:__(.*)\n|__Race:__(.*)\n|__Height:__(.*)\n|__Relatives:__(.*)\n|__Rank:__(.*)\n|__Zodiac sign:__(.*)\n|__Zodiac Animal:__(.*)\n|__Weight:__(.*)\n|__Eye Color:__(.*)\n|__Hair Color:__(.*)\n|__Dislikes:__(.*)\n|__Sign:__(.*)\n|__Partner:__(.*)\n|__Previous Position:__(.*)\n|__Occupation:__(.*)\n/gm, '');
      const characterInfo = {
        id: Character.id,
        name: {
          first: Character.name?.first,
          last: Character.name?.last,
          full: Character.name?.full,
          native: Character.name?.native,
          userPreferred: Character.name?.userPreferred,
          alternative: Character.name?.alternative,
          alternativeSpoiler: Character.name?.alternativeSpoiler
        },
        image: Character.image?.large ?? Character.image?.medium,
        description: Character.description,
        gender: Character.gender,
        dateOfBirth: {
          year: Character.dateOfBirth?.year,
          month: Character.dateOfBirth?.month,
          day: Character.dateOfBirth?.day
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
        relations: Character.media.edges?.map(v => ({
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
          color: v.node.coverImage?.color
        }))
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
    provider;
    /**
     * Maps anilist manga to any manga provider (mangadex, mangasee, etc)
     * @param provider MangaParser
     */
    constructor(provider) {
      this.provider = provider || new mangasee123_1.default();
    }
    /**
     *
     * @param query query to search for
     * @param page (optional) page number (default: `1`)
     * @param perPage (optional) number of results per page (default: `20`)
     */
    search = (() => async function (query) {
      let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      let perPage = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 20;
      try {
        const {
          data
        } = await anilistQuery((0, utils_1.anilistSearchQuery)(), {
          search: query,
          page,
          perPage,
          type: 'MANGA'
        });
        const res = {
          currentPage: data.data.Page.pageInfo.currentPage,
          hasNextPage: data.data.Page.pageInfo.hasNextPage,
          results: data.data.Page.media.map(item => ({
            ...mapMediaResult(item),
            popularity: item.popularity,
            totalChapters: item.chapters,
            volumes: item.volumes
          }))
        };
        return res;
      } catch (err) {
        throw anilistError(err);
      }
    })();
    /**
     *
     * @param chapterId chapter id
     * @param args args to pass to the provider (if any)
     * @returns
     */
    fetchChapterPages = (() => {
      var _this5 = this;
      return function (chapterId) {
        for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          args[_key2 - 1] = arguments[_key2];
        }
        return _this5.provider.fetchChapterPages(chapterId, ...args);
      };
    })();
    fetchMangaInfo = (() => {
      var _this6 = this;
      return async function (id) {
        try {
          const {
            data
          } = await anilistQuery((0, utils_1.anilistMediaDetailQuery)(), {
            id: Number(id)
          });
          const mangaInfo = {
            id,
            ...mapMediaDetail(data.data.Media)
          };
          const title = mapTitle(data.data.Media.title);
          mangaInfo.chapters = await new Anilist().findManga(_this6.provider, {
            english: title.english,
            romaji: title.romaji
          }, mangaInfo.malId).catch(err => {
            throw models_1.MetaError.from('provider', err);
          });
          mangaInfo.chapters = mangaInfo.chapters.reverse();
          return mangaInfo;
        } catch (error) {
          throw anilistError(error);
        }
      };
    })();
  };
  findMangaSlug = async (provider, title, malId) => {
    const slug = title.replace(/[^0-9a-zA-Z]+/g, ' ');
    let possibleManga;
    if (malId) {
      const malAsyncReq = await meta_http_1.metaHttp.get(`${this.malSyncUrl}/mal/manga/${encodeURIComponent(malId)}`, {
        validateStatus: () => true
      });
      if (malAsyncReq.status === 200) {
        const sitesT = malAsyncReq.data.Sites;
        let sites = Object.values(sitesT).map((v, i) => {
          const obj = [...Object.values(Object.values(sitesT)[i])];
          const pages = obj.map(v => ({
            page: v.page,
            url: v.url,
            title: v.title
          }));
          return pages;
        });
        sites = sites.flat();
        const possibleSource = sites.find(s => s.page.toLowerCase() === provider.name.toLowerCase());
        if (possibleSource) possibleManga = await provider.fetchMangaInfo(possibleSource.url.split('/').pop());else possibleManga = await this.findMangaRaw(provider, slug, title);
      } else possibleManga = await this.findMangaRaw(provider, slug, title);
    } else possibleManga = await this.findMangaRaw(provider, slug, title);
    const possibleProviderChapters = possibleManga.chapters;
    return possibleProviderChapters;
  };
  findMangaRaw = async (provider, slug, title) => {
    const findAnime = await provider.search(slug);
    if (findAnime.results.length === 0) return [];
    // TODO: use much better way than this
    const possibleManga = findAnime.results.find(manga => title.toLowerCase() === (typeof manga.title === 'string' ? manga.title.toLowerCase() : ''));
    if (!possibleManga) return await provider.fetchMangaInfo(findAnime.results[0].id);
    return await provider.fetchMangaInfo(possibleManga.id);
  };
  findManga = async (provider, title, malId) => {
    title.english = title.english ?? title.romaji;
    title.romaji = title.romaji ?? title.english;
    title.english = title.english.toLowerCase();
    title.romaji = title.romaji.toLowerCase();
    if (title.english === title.romaji) return await this.findMangaSlug(provider, title.english, malId);
    const romajiPossibleEpisodes = this.findMangaSlug(provider, title.romaji, malId);
    if (romajiPossibleEpisodes) {
      return romajiPossibleEpisodes;
    }
    const englishPossibleEpisodes = this.findMangaSlug(provider, title.english, malId);
    return englishPossibleEpisodes;
  };
}
// (async () => {
//   const ani = new Anilist(new Zoro());
//   const anime = await ani.fetchAnimeInfo('21');
//   console.log(anime.episodes);
//   const sources = await ani.fetchEpisodeSources(anime.episodes![0]!.id, anime.episodes![0]!.number, anime.id);
//   console.log(sources);
// })();
exports.default = Anilist;
//# sourceMappingURL=anilist.js.map