"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
const meta_http_1 = require("../../utils/meta-http");
const models_1 = require("../../models");
const zoro_1 = require("../anime/zoro/zoro");
const mangadex_1 = require("../manga/mangadex");
const anilist_media_1 = require("./anilist-media");
const shared_1 = require("./shared");
/** A failed AniList request as a MetaError, keeping its status, with a readable message for 404 and 429. */
const anilistError = err => {
  const status = err?.response?.status;
  if (status === 404) return models_1.MetaError.from('anilist', err, 'Media not found. Perhaps the id is invalid or the anime is not in anilist');
  if (status === 429) return models_1.MetaError.from('anilist', err, 'You have been ratelimited by anilist. Please try again later');
  return models_1.MetaError.from('anilist', err);
};
const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';
const MALSYNC_URL = 'https://api.malsync.moe';
/** POST a query to AniList, its values in `variables`, failing with an anilistError. */
const anilistQuery = async (query, variables) => {
  try {
    const {
      data
    } = await meta_http_1.metaHttp.post(ANILIST_GRAPHQL_URL, {
      query,
      variables
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    return data;
  } catch (err) {
    throw anilistError(err);
  }
};
/** A page of AniList's `Page` answer, with `results` mapped from its `items`. */
const toPage = (page, results) => ({
  currentPage: page?.pageInfo?.currentPage,
  hasNextPage: page?.pageInfo?.hasNextPage,
  results
});
/** A weekday as an index into WEEKDAYS, from that index or the day's name. */
const weekdayIndex = day => {
  const index = typeof day === 'string' ? anilist_media_1.WEEKDAYS.findIndex(name => name.toLowerCase() === day.trim().toLowerCase()) : day;
  if (!Number.isInteger(index) || index < 0 || index >= anilist_media_1.WEEKDAYS.length) throw new Error('Invalid weekStart or weekEnd');
  return index;
};
/**
 * Unix seconds (AniList's `airingAt`) from the start of `weekStart`'s next occurrence, today
 * included, to the end of the first `weekEnd` on or after it, in local time.
 */
const airingWindow = function (weekStart, weekEnd) {
  let now = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Date();
  const start = weekdayIndex(weekStart);
  const end = weekdayIndex(weekEnd);
  const today = (now.getDay() + 1) % 7; // as a WEEKDAYS index, which starts on Saturday
  const firstDay = (start - today + 7) % 7;
  const dayCount = (end - start + 7) % 7 + 1;
  const midnight = offset => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset).getTime() / 1000;
  return {
    from: midnight(firstDay),
    to: midnight(firstDay + dayCount)
  };
};
const DAY_MS = 86_400_000;
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
  return `${anilistId}$ep=${aniDbKey ?? (0, shared_1.toEpisodeNumber)(episode.number) ?? index + 1}`;
};
const romanToArabic = roman => {
  const values = {
    i: 1,
    v: 5,
    x: 10
  };
  const digits = roman.toLowerCase();
  let result = 0;
  for (let i = 0; i < digits.length; i++) {
    const current = values[digits[i]];
    const next = values[digits[i + 1]];
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
 * An anime title in the form provider titles are compared in: letters, digits and spaces only,
 * without season words or a trailing part in parentheses, roman numerals (I to IX) as digits, and
 * common romanization variants (`yuu`, ` ou`) spelled one way.
 */
const cleanTitle = title => title.replace(/[^A-Za-z0-9!@#$%^&*() ]/g, ' ').replace(/(th|rd|nd|st) season/gi, '').replace(/\([^(]*\)$/g, '').replace(/season/g, '').replace(/\b(ix|iv|v?i{1,3}|v)\b/gi, numeral => String(romanToArabic(numeral))).replace(/[^A-Za-z0-9\-= ]/g, '').replace(/ {2,}/g, ' ').trim().replace(/yuu/g, 'yu').replace(/ ou/g, ' oh');
/** Results less similar than this to every AniList title are not the anime. */
const MIN_TITLE_SIMILARITY = 0.6;
/** The best similarity between any of AniList's titles and any of a provider result's titles. */
const titleSimilarity = (wanted, result) => {
  const clean = titles => titles.flatMap(title => typeof title === 'string' && title.trim() ? [cleanTitle(title.toLowerCase())] : []);
  const candidates = clean([result.title, result.japaneseTitle].map(t => typeof t === 'string' ? t.replace(/\([^)]*\)/g, '') : t));
  return Math.max(0, ...clean(wanted).flatMap(input => candidates.map(candidate => (0, shared_1.stringSimilarity)(input, candidate))));
};
/** Subbed episodes a provider result lists, for preferring the fuller of two equal matches. */
const subCount = result => {
  if (typeof result.episodes?.sub === 'number') return result.episodes.sub;
  if (typeof result.sub === 'number') return result.sub;
  return 0;
};
/**
 * Providers that list the dub as its own entry mark it in the title: "Naruto (Dub)". Anything in
 * parentheses other than `(TV)` and numbers names the audio; a title without is the sub.
 */
const audioOf = title => {
  const marked = typeof title === 'string' ? /\(([^)0-9]+)\)/.exec(title.replace(/\(TV\)/g, ''))?.[1] : undefined;
  return marked ? marked.replace(/\s+/g, '-').toLowerCase() : 'sub';
};
/** An AniList format as providers name the type: `MOVIE` → `movie`, `TV_SHORT` → `tv`. */
const providerType = format => format === 'TV_SHORT' ? 'tv' : format?.toLowerCase();
/** The numbers in a title, ignoring anything in parentheses: "Jujutsu Kaisen 0" → {0}, "2nd Season" → {2}. */
const titleNumbers = title => new Set((title ?? '').replace(/\([^)]*\)/g, '').match(/\d+/g) ?? []);
/**
 * How well a provider search result matches the AniList entry. Title similarity alone ranks "Jujutsu Kaisen (TV)"
 * above "Jujutsu Kaisen 0 Movie" for "JUJUTSU KAISEN 0", since the part in parentheses is ignored. So a result also
 * gains when its type is the AniList format, loses when only one of the two is a movie, and loses when its numbers
 * don't match the title's.
 */
const matchScore = (result, similarity, title, format) => {
  let score = similarity;
  const wanted = providerType(format);
  const type = result.type?.toLowerCase();
  if (wanted && type) {
    if (type === wanted) score += 0.1;else if (type === 'movie' || wanted === 'movie') score -= 0.15;
  }
  const expected = titleNumbers(title.english || title.romaji);
  const found = titleNumbers(typeof result.title === 'string' ? result.title : undefined);
  if ([...expected].some(n => !found.has(n)) || !expected.size && found.size) score -= 0.2;
  return score;
};
/** The manga's info on the provider for a search, preferring an exact title match; undefined when it finds none. */
const searchManga = async (provider, title) => {
  const {
    results = []
  } = (await provider.search((0, shared_1.searchTerm)(title))) ?? {};
  if (results.length === 0) return undefined;
  // Providers may show an English title and keep the romaji one in altTitles, so match either.
  const wanted = title.toLowerCase();
  const names = manga => [...(typeof manga.title === 'string' ? [manga.title] : []), ...(manga.altTitles ?? [])];
  const exact = results.find(manga => names(manga).some(name => name.toLowerCase() === wanted));
  return provider.fetchMangaInfo((exact ?? results[0]).id);
};
/** The provider's chapters for the manga titled `title`; empty when the provider doesn't have it. */
const findMangaChapters = async (provider, title, malId) => {
  if (malId) {
    // MALSync answers 404 for a manga it maps to no site; any answer but 200 means searching instead.
    const malSync = await meta_http_1.metaHttp.get(`${MALSYNC_URL}/mal/manga/${encodeURIComponent(malId)}`, {
      validateStatus: () => true
    });
    if (malSync.status === 200) {
      const sites = Object.values(malSync.data?.Sites ?? {}).flatMap(pages => Object.values(pages));
      const mapped = sites.find(site => site.page.toLowerCase() === provider.name.toLowerCase());
      if (mapped) return (await provider.fetchMangaInfo(mapped.url.split('/').pop())).chapters ?? [];
    }
  }
  return (await searchManga(provider, title))?.chapters ?? [];
};
class Anilist extends models_1.AnimeParser {
  name = 'Anilist';
  baseUrl = 'https://anilist.co';
  logo = 'https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg';
  classPath = 'META.Anilist';
  provider;
  /**
   * Maps AniList anime to an anime provider's episodes, with ani.zip episode metadata for providers
   * that declare `capabilities.aniZipEpisodes`.
   * @param provider anime provider to find the episodes on (default: Zoro, HiAnime)
   * @param _proxyConfig ignored: requests go through the library's own client. Kept so existing calls compile.
   * @param _adapter ignored, for the same reason
   * @param customBaseURL site URL for the default Zoro provider; ignored when `provider` is given
   */
  constructor(provider, _proxyConfig, _adapter, customBaseURL) {
    super();
    this.provider = provider || new zoro_1.Zoro(customBaseURL);
  }
  /**
   * @param perPage results per page (default: 15, max: 50)
   */
  search = (() => async function (query) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    let perPage = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 15;
    const data = await anilistQuery(anilist_media_1.SEARCH_QUERY, {
      search: query,
      page,
      perPage,
      type: 'ANIME'
    });
    return toPage(data.data?.Page, data.data?.Page?.media?.map(item => {
      const {
        totalEpisodes,
        currentEpisode
      } = (0, anilist_media_1.episodeCounts)(item);
      return {
        ...(0, anilist_media_1.mapMediaResult)(item),
        popularity: item.popularity,
        totalEpisodes,
        currentEpisodeCount: currentEpisode
      };
    }) ?? []);
  })();
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
    for (const genre of genres ?? []) {
      if (!Object.values(models_1.Genres).includes(genre)) throw new Error(`genre ${genre} is not valid`);
    }
    const data = await anilistQuery(anilist_media_1.ADVANCED_SEARCH_QUERY, {
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
      season
    });
    const pageInfo = data.data?.Page?.pageInfo;
    return {
      ...toPage(data.data?.Page, data.data?.Page?.media?.map(item => ({
        ...(0, anilist_media_1.mapMediaResult)(item),
        popularity: item.popularity,
        ...(0, anilist_media_1.episodeCounts)(item),
        countryOfOrigin: item.countryOfOrigin
      })) ?? []),
      totalPages: pageInfo?.lastPage,
      totalResults: pageInfo?.total
    };
  })();
  /**
   * @param id AniList id
   * @param fetchFiller set `isFiller` on the episodes, from the MAL filler list (default: `false`)
   */
  fetchAnimeInfo = (() => {
    var _this = this;
    return async function (id) {
      let fetchFiller = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      const data = await anilistQuery(anilist_media_1.MEDIA_DETAIL_QUERY, {
        id: Number(id)
      });
      const media = data.data.Media;
      const animeInfo = {
        id,
        ...(0, anilist_media_1.mapAnimeDetail)(media)
      };
      const [episodes, fillerEpisodes] = await Promise.all([_this.findProviderEpisodes((0, anilist_media_1.mapTitle)(media.title), media.format), fetchFiller && animeInfo.malId ? (0, shared_1.fetchFillerEpisodes)(animeInfo.malId) : []]);
      animeInfo.episodes = episodes.map((episode, index) => {
        if (!episode.image) episode.image = animeInfo.image;
        (0, shared_1.applyFiller)(episode, fillerEpisodes);
        // No ani.zip merge here, so the key comes from the provider's number, as it does in
        // fetchEpisodesListById for episodes ani.zip doesn't match.
        episode.uniqueId = episodeUniqueId(id, {
          episode
        }, index);
        return episode;
      });
      return animeInfo;
    };
  })();
  fetchEpisodeSources = (() => {
    var _this2 = this;
    return function (episodeId) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      return (0, shared_1.callProvider)(_this2.provider, 'episode sources', () => _this2.provider.fetchEpisodeSources(episodeId, ...args));
    };
  })();
  fetchEpisodeServers = episodeId => (0, shared_1.callProvider)(this.provider, 'episode servers', () => this.provider.fetchEpisodeServers(episodeId));
  fetchTrendingAnime = (() => async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    let perPage = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 10;
    const data = await anilistQuery(anilist_media_1.TRENDING_QUERY, {
      page,
      perPage
    });
    return toPage(data.data.Page, data.data.Page.media.map(anilist_media_1.mapBrowseResult));
  })();
  fetchPopularAnime = (() => async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    let perPage = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 10;
    const data = await anilistQuery(anilist_media_1.POPULAR_QUERY, {
      page,
      perPage
    });
    return toPage(data.data.Page, data.data.Page.media.map(anilist_media_1.mapBrowseResult));
  })();
  /**
   * The episodes airing in a window of days.
   * @param weekStart first day of the window, its next occurrence counting today (default: today): `2` = Monday, `3` = Tuesday, `4` = Wednesday, `5` = Thursday, `6` = Friday, `0` = Saturday, `1` = Sunday, or the day's name
   * @param weekEnd last day of the window, included, on or after weekStart (default: the day before today, so a full week); like weekStart
   * @param notYetAired only episodes that haven't aired yet
   */
  fetchAiringSchedule = (() => async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    let perPage = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 20;
    let weekStart = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : (new Date().getDay() + 1) % 7;
    let weekEnd = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : (new Date().getDay() + 7) % 7;
    let notYetAired = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
    const {
      from,
      to
    } = airingWindow(weekStart, weekEnd);
    // AniList's bounds are exclusive, so one second earlier keeps an episode airing at midnight.
    const data = await anilistQuery(anilist_media_1.AIRING_SCHEDULE_QUERY, {
      page,
      perPage,
      notYetAired,
      airingAtGreater: from - 1,
      airingAtLesser: to
    });
    return toPage(data.data.Page, data.data.Page.airingSchedules.map(item => ({
      ...(0, anilist_media_1.mapMediaResult)(item.media),
      episode: item.episode,
      airingAt: item.airingAt,
      country: item.media.countryOfOrigin
    })));
  })();
  /**
   * @param genres any of `Action`, `Adventure`, `Cars`, `Comedy`, `Drama`, `Fantasy`, `Horror`, `Mahou Shoujo`, `Mecha`, `Music`, `Mystery`, `Psychological`, `Romance`, `Sci-Fi`, `Slice of Life`, `Sports`, `Supernatural`, `Thriller`
   */
  fetchAnimeGenres = (() => async function (genres) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    let perPage = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 20;
    if (genres.length === 0) throw new Error('No genres specified');
    for (const genre of genres) if (!Object.values(models_1.Genres).includes(genre)) throw new Error('Invalid genre');
    const data = await anilistQuery(anilist_media_1.GENRES_QUERY, {
      genres,
      page,
      perPage
    });
    return toPage(data.data.Page, data.data.Page.media.map(anilist_media_1.mapBrowseResult));
  })();
  fetchRandomAnime = async () => {
    let ids;
    try {
      const {
        data
      } = await meta_http_1.metaHttp.get('https://raw.githubusercontent.com/5H4D0WILA/IDFetch/main/ids.txt');
      ids = data?.trim().split('\n');
    } catch (err) {
      throw anilistError(err);
    }
    return this.fetchAnimeInfo(ids[Math.floor(Math.random() * ids.length)]);
  };
  /**
   * The provider's episodes for the AniList entry: the search result whose title is closest (see
   * matchScore), the sub entry before the dub. Empty when no result is close enough.
   */
  findProviderEpisodes = async (title, format) => {
    try {
      const search = await this.provider.search(title.romaji || title.english || title.userPreferred || '');
      const ranked = (search?.results ?? []).map(result => ({
        result,
        similarity: titleSimilarity([title.english, title.romaji], result)
      })).filter(_ref2 => {
        let {
          similarity
        } = _ref2;
        return similarity > MIN_TITLE_SIMILARITY;
      }).sort((a, b) => matchScore(b.result, b.similarity, title, format) - matchScore(a.result, a.similarity, title, format) || subCount(b.result) - subCount(a.result)).map(_ref3 => {
        let {
          result
        } = _ref3;
        return result;
      });
      const match = ranked.find(result => audioOf(result.title) === 'sub') ?? ranked.find(result => audioOf(result.title) === 'dub');
      if (!match) return [];
      return (await this.provider.fetchAnimeInfo(match.id)).episodes ?? [];
    } catch (err) {
      throw models_1.MetaError.from('provider', err);
    }
  };
  /**
   * @param id AniList id
   * @param fetchFiller set `isFiller` on the episodes, from the MAL filler list (default: `false`)
   * @returns the episode list without the anime info, every episode with a `uniqueId`
   */
  fetchEpisodesListById = (() => {
    var _this3 = this;
    return async function (id) {
      let fetchFiller = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      // ani.zip only needs the AniList id, so request it alongside the AniList query. It is
      // optional enrichment: if it fails or times out, the provider's episodes are still returned.
      const aniZipRequest = _this3.usesAniZipEpisodes() ? meta_http_1.metaHttp.get(`https://api.ani.zip/mappings?anilist_id=${encodeURIComponent(id)}`, {
        timeout: meta_http_1.ENRICHMENT_TIMEOUT_MS
      }).then(res => res.data) : undefined;
      // Don't surface an unhandled rejection if the AniList query below fails first.
      aniZipRequest?.catch(() => undefined);
      const {
        Media
      } = (await anilistQuery(anilist_media_1.EPISODES_MEDIA_QUERY, {
        id: Number(id)
      })).data;
      const fillerRequest = fetchFiller && Media.idMal ? (0, shared_1.fetchFillerEpisodes)(Media.idMal) : Promise.resolve([]);
      const providerEpisodes = await _this3.findProviderEpisodes((0, anilist_media_1.mapTitle)(Media.title), Media.format);
      const aniZip = await aniZipRequest?.catch(() => undefined);
      const episodes = aniZip ? _this3.mergeAniZipEpisodes(aniZip, providerEpisodes) : providerEpisodes.map(episode => ({
        episode
      }));
      const fillerEpisodes = await fillerRequest;
      const cover = (0, anilist_media_1.pickCover)(Media.coverImage);
      return episodes.map((merged, index) => {
        const {
          episode
        } = merged;
        if (!episode.image && cover) episode.image = cover;
        (0, shared_1.applyFiller)(episode, fillerEpisodes);
        // The one place uniqueId is set, so matched, unmatched and un-enriched episodes follow one rule.
        return {
          ...episode,
          uniqueId: episodeUniqueId(id, merged, index)
        };
      });
    };
  })();
  /** Whether to merge the provider's episodes with ani.zip metadata, as the provider declares. */
  usesAniZipEpisodes = () => Boolean(this.provider.capabilities?.aniZipEpisodes);
  /**
   * Overlay ani.zip titles, descriptions, images and TVDB numbers onto the provider's episodes. Only
   * numeric ani.zip keys (AniDB regular episodes) take part, so specials (`S1`, `O1`…) never land
   * on a regular episode. The provider's `number` is kept as is.
   */
  mergeAniZipEpisodes = (animeMetaData, providerEpisodes) => {
    const entries = Object.entries(animeMetaData?.episodes ?? {}).filter(_ref4 => {
      let [key, item] = _ref4;
      return /^\d+$/.test(key) && item;
    }).map(_ref5 => {
      let [key, item] = _ref5;
      const releaseDate = item.airDate ?? item.airdate ?? item.airDateUtc;
      return {
        key: Number(key),
        time: timeOf(item.airDateUtc) ?? timeOf(releaseDate),
        title: item.title?.en ?? item.title?.['x-jat'],
        description: item.overview ?? item.summary,
        image: item.image,
        releaseDate,
        tvdbNumber: (0, shared_1.toEpisodeNumber)(item.episodeNumber),
        absoluteNumber: (0, shared_1.toEpisodeNumber)(item.absoluteEpisodeNumber)
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
      const number = (0, shared_1.toEpisodeNumber)(episode.number);
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
      number: (0, shared_1.toEpisodeNumber)(episode.number) ?? Infinity,
      time: timeOf(episode.releaseDate)
    })).filter(_ref6 => {
      let {
        index,
        time
      } = _ref6;
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
   * @param id AniList id
   * @returns the AniList info without episodes (`fetchEpisodesListById` gives them, `fetchAnimeInfo` both)
   */
  fetchAnilistInfoById = async id => {
    const data = await anilistQuery(anilist_media_1.MEDIA_DETAIL_QUERY, {
      id: Number(id)
    });
    return {
      id,
      ...(0, anilist_media_1.mapAnimeDetail)(data.data.Media)
    };
  };
  /** @param id AniList staff id */
  fetchStaffById = async id => {
    const data = await anilistQuery(anilist_media_1.STAFF_QUERY, {
      id: Number(id)
    });
    const staff = data.data.Staff;
    const staffInfo = {
      id: staff?.id,
      name: staff?.name,
      image: staff?.image,
      description: staff?.description,
      siteUrl: staff?.siteUrl,
      roles: staff?.staffMedia.edges.map(media => ({
        id: media?.node?.id,
        title: media?.node?.title,
        type: media?.node?.type,
        image: {
          extraLarge: media?.node?.coverImage?.extraLarge,
          large: media?.node?.coverImage?.large,
          medium: media?.node?.coverImage?.medium
        },
        color: media?.node?.coverImage?.color
      }))
    };
    return staffInfo;
  };
  /** @param id AniList character id */
  fetchCharacterInfoById = async id => {
    const {
      Character
    } = (await anilistQuery(anilist_media_1.CHARACTER_QUERY, {
      id: Number(id)
    })).data;
    // The description holds the character's details as `__Label:__ value` lines, removed below.
    const details = Character.description ?? '';
    const height = details.match(/__Height:__(.*)/)?.[1]?.trim();
    const weight = details.match(/__Weight:__(.*)/)?.[1]?.trim();
    const hairColor = details.match(/__Hair Color:__(.*)/)?.[1]?.trim();
    const eyeColor = details.match(/__Eye Color:__(.*)/)?.[1]?.trim();
    const relatives = details.match(/__Relatives:__(.*)/)?.[1]?.trim().split(/(, \[)/g).filter(g => !g.includes(', [')).map(r => ({
      id: r.match(/\/(\d+)/)?.[1],
      name: r.match(/([^)]+)\]/)?.[1].replace(/\[/g, ''),
      relationship: r.match(/\(([^)]+)\).*?(\(([^)]+)\))/)?.[3]
    }));
    const race = details.match(/__Race:__(.*)/)?.[1]?.split(', ').map(r => r.trim());
    const rank = details.match(/__Rank:__(.*)/)?.[1];
    const occupation = details.match(/__Occupation:__(.*)/)?.[1];
    const previousPosition = details.match(/__Previous Position:__(.*)/)?.[1]?.trim();
    const partner = details.match(/__Partner:__(.*)/)?.[1]?.split(/(, \[)/g).filter(g => !g.includes(', [')).map(r => ({
      id: r.match(/\/(\d+)/)?.[1],
      name: r.match(/([^)]+)\]/)?.[1].replace(/\[/g, '')
    }));
    const dislikes = details.match(/__Dislikes:__(.*)/)?.[1];
    const sign = details.match(/__Sign:__(.*)/)?.[1];
    const zodicSign = details.match(/__Zodiac sign:__(.*)/)?.[1]?.trim();
    const zodicAnimal = details.match(/__Zodiac Animal:__(.*)/)?.[1]?.trim();
    const themeSong = details.match(/__Theme Song:__(.*)/)?.[1]?.trim();
    const description = details.replace(/__Theme Song:__(.*)\n|__Race:__(.*)\n|__Height:__(.*)\n|__Relatives:__(.*)\n|__Rank:__(.*)\n|__Zodiac sign:__(.*)\n|__Zodiac Animal:__(.*)\n|__Weight:__(.*)\n|__Eye Color:__(.*)\n|__Hair Color:__(.*)\n|__Dislikes:__(.*)\n|__Sign:__(.*)\n|__Partner:__(.*)\n|__Previous Position:__(.*)\n|__Occupation:__(.*)\n/gm, '');
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
      description,
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
      relations: Character.media.edges?.map(anilist_media_1.mapCharacterMedia)
    };
    return characterInfo;
  };
  /** Maps AniList manga to a manga provider's chapters. */
  static Manga = class Manga {
    provider;
    /** @param provider manga provider to find the chapters on (default: MangaDex) */
    constructor(provider) {
      this.provider = provider || new mangadex_1.MangaDex();
    }
    /** @param perPage results per page (default: 20) */
    search = (() => async function (query) {
      let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      let perPage = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 20;
      const data = await anilistQuery(anilist_media_1.SEARCH_QUERY, {
        search: query,
        page,
        perPage,
        type: 'MANGA'
      });
      return toPage(data.data.Page, data.data.Page.media.map(item => ({
        ...(0, anilist_media_1.mapMediaResult)(item),
        popularity: item.popularity,
        totalChapters: item.chapters,
        volumes: item.volumes
      })));
    })();
    /** @param args passed on to the provider's fetchChapterPages */
    fetchChapterPages = (() => {
      var _this4 = this;
      return function (chapterId) {
        for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          args[_key2 - 1] = arguments[_key2];
        }
        return _this4.provider.fetchChapterPages(chapterId, ...args);
      };
    })();
    /**
     * The AniList info with the provider's chapters, in the provider's order (reading order, as every
     * manga provider returns them), looked up by the romaji title, then by the English one.
     */
    fetchMangaInfo = async id => {
      const media = (await anilistQuery(anilist_media_1.MEDIA_DETAIL_QUERY, {
        id: Number(id)
      })).data.Media;
      const mangaInfo = {
        id,
        ...(0, anilist_media_1.mapMediaDetail)(media)
      };
      const title = (0, anilist_media_1.mapTitle)(media.title);
      const romaji = (title.romaji ?? title.english ?? '').toLowerCase();
      const english = (title.english ?? title.romaji ?? '').toLowerCase();
      try {
        let chapters = await findMangaChapters(this.provider, romaji, mangaInfo.malId);
        if (chapters.length === 0 && english !== romaji) {
          chapters = await findMangaChapters(this.provider, english, mangaInfo.malId);
        }
        mangaInfo.chapters = chapters;
      } catch (err) {
        throw models_1.MetaError.from('provider', err);
      }
      return mangaInfo;
    };
  };
}
exports.default = Anilist;
//# sourceMappingURL=anilist.js.map