"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
const meta_http_1 = require("../../utils/meta-http");
const models_1 = require("../../models");
const tmdb_1 = require("../../utils/tmdb");
const himovies_1 = require("../movies/himovies/himovies");
const shared_1 = require("./shared");
/** TMDB's trending list for each TvType; anything else is `all`. */
const TRENDING_PATHS = new Map([[models_1.TvType.MOVIE.toLowerCase(), 'movie'], [models_1.TvType.TVSERIES.toLowerCase(), 'tv'], [models_1.TvType.PEOPLE.toLowerCase(), 'person']]);
class TMDB extends models_1.MovieParser {
  name = 'TMDB';
  baseUrl = 'https://www.themoviedb.org';
  apiUrl = tmdb_1.TMDB_API_URL;
  logo = 'https://pbs.twimg.com/profile_images/1243623122089041920/gVZIvphd_400x400.jpg';
  classPath = 'META.TMDB';
  supportedTypes = new Set([models_1.TvType.MOVIE, models_1.TvType.TVSERIES, models_1.TvType.ANIME]);
  apiKey;
  provider;
  /**
   * @param apiKey your TMDB API key. Without one, a key shared by every app that passes none is
   * used, and a warning is logged once; TMDB can rate-limit or revoke that key at any time.
   * @param provider movie provider to find the title on (default HiMovies)
   * @param _proxyConfig ignored: requests go through the library's own client. Kept so existing calls compile.
   * @param _adapter ignored, for the same reason
   */
  constructor(apiKey, provider, _proxyConfig, _adapter) {
    super();
    this.apiKey = (0, tmdb_1.resolveTmdbApiKey)(apiKey, 'META.TMDB');
    this.provider = provider || new himovies_1.HiMovies();
  }
  /**
   * @param type `movie`, `tv series`, `people` or `all` (a TvType value, or anything else for all)
   * @param timePeriod `day` or `week`
   */
  fetchTrending = (() => {
    var _this = this;
    return async function (type) {
      let timePeriod = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'day';
      let page = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
      const path = TRENDING_PATHS.get(type.toLowerCase()) ?? 'all';
      const data = await _this.get(`/trending/${path}/${timePeriod}?page=${page}&language=en-US`);
      return _this.toPage(data, page, result => result.media_type === 'person' ? {
        id: result.id,
        name: result.name,
        rating: result.popularity,
        image: (0, tmdb_1.tmdbImage)(result.profile_path),
        // TMDB's trending people no longer come with known_for
        movies: (result.known_for ?? []).map(movie => (0, tmdb_1.mapTmdbResult)(movie))
      } : (0, tmdb_1.mapTmdbResult)(result));
    };
  })();
  search = (() => {
    var _this2 = this;
    return async function (query) {
      let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      const data = await _this2.get(`/search/multi?language=en-US&page=${page}&include_adult=false&query=${encodeURIComponent(query)}`);
      return _this2.toPage(data, page, result => (0, tmdb_1.mapTmdbResult)(result));
    };
  })();
  /**
   * TMDB info with every season and episode. `id` is always the TMDB id. When the title is found on
   * the provider, `providerId` is the provider's media id and episodes carry provider episode ids;
   * with no match (or a failing provider) both are unset and the TMDB metadata is still returned.
   * @param mediaId TMDB id
   * @param type `movie`, or anything else for a show
   */
  fetchMediaInfo = async (mediaId, type) => {
    const mediaType = type.toLowerCase() === 'movie' ? 'movie' : 'tv';
    try {
      const {
        data
      } = await meta_http_1.metaHttp.get(this.url(`/${mediaType}/${mediaId}?language=en-US&append_to_response=release_dates,watch/providers,alternative_titles,credits,external_ids,images,keywords,recommendations,reviews,similar,translations,videos&include_image_language=en`));
      const match = await this.matchProvider(data?.title || data?.name, {
        type: mediaType === 'movie' ? models_1.TvType.MOVIE : models_1.TvType.TVSERIES,
        totalSeasons: data?.number_of_seasons,
        totalEpisodes: data?.number_of_episodes,
        year: Number((0, tmdb_1.releaseYear)(data)) || undefined
      });
      // With no match there is nothing playable to map; the TMDB info and seasons are still returned.
      const providerEpisodes = match?.info?.episodes;
      const info = {
        id: mediaId,
        ...(0, tmdb_1.mapTmdbInfo)(data, mediaType),
        ...(match ? {
          providerId: match.id
        } : {}),
        ...(mediaType === 'movie' ? {
          episodeId: providerEpisodes?.[0]?.id
        } : {}),
        directors: data?.credits?.crew?.filter(crew => crew.job === 'Director').map(crew => crew.name),
        writers: data?.credits?.crew?.filter(crew => crew.job === 'Screenplay').map(crew => crew.name),
        actors: data?.credits?.cast?.map(cast => cast.name),
        mappings: {
          imdb: data?.external_ids?.imdb_id || undefined,
          tmdb: data?.id || undefined
        },
        similar: (0, tmdb_1.mapTmdbResults)(data?.similar, mediaType)
      };
      const totalSeasons = info.totalSeasons || 0;
      if (mediaType === 'tv' && totalSeasons > 0) {
        info.nextAiringEpisode = data?.next_episode_to_air ? {
          season: data.next_episode_to_air?.season_number || undefined,
          episode: data.next_episode_to_air?.episode_number || undefined,
          releaseDate: data.next_episode_to_air?.air_date || undefined,
          title: data.next_episode_to_air?.name || undefined,
          description: data.next_episode_to_air?.overview || undefined,
          runtime: data.next_episode_to_air?.runtime || undefined
        } : undefined;
        info.seasons = await this.fetchSeasons(mediaId, totalSeasons, providerEpisodes);
      } else {
        info.seasons = [{
          season: 1,
          image: (0, tmdb_1.tmdbImageSizes)(data?.poster_path),
          episodes: [{
            id: providerEpisodes?.[0]?.id,
            uniqueId: `${mediaId}-${mediaType}-s1-e1`,
            title: data.title || data.original_title,
            number: 1,
            episode: 1,
            season: 1,
            releaseDate: data.release_date,
            description: data.overview,
            url: providerEpisodes?.[0]?.url,
            image: (0, tmdb_1.tmdbImageSizes)(data?.backdrop_path)
          }]
        }];
      }
      return info;
    } catch (err) {
      // matchProvider absorbs provider failures, so anything here comes from TMDB's requests or data
      throw models_1.MetaError.from('tmdb', err);
    }
  };
  /**
   * Every season of a show, fetched together, with the provider's episode ids where the provider
   * has the episode. A season whose request fails keeps its place, with no episodes and `failed`
   * set, so the other seasons (and the season indexes apps store) survive it.
   */
  fetchSeasons = async (mediaId, totalSeasons, providerEpisodes) => {
    const seasonNumbers = Array.from({
      length: totalSeasons
    }, (_, index) => index + 1);
    const responses = await Promise.allSettled(seasonNumbers.map(season => meta_http_1.metaHttp.get(this.url(`/tv/${mediaId}/season/${season}`))));
    const failure = responses.find(response => response.status === 'rejected');
    if (failure && responses.every(response => response.status === 'rejected')) throw failure.reason;
    return responses.map((response, index) => {
      const season = index + 1;
      if (response.status === 'rejected') return {
        season,
        episodes: [],
        failed: true
      };
      const seasonData = response.value.data;
      const seasonEpisodes = providerEpisodes?.filter(episode => episode.season === season);
      const tmdbEpisodes = seasonData?.episodes ?? [];
      return {
        season,
        image: (0, tmdb_1.tmdbImageSizes)(seasonData?.poster_path),
        episodes: tmdbEpisodes.map(episode => {
          const episodeFromProvider = seasonEpisodes?.find(ep => ep.number === episode.episode_number);
          return {
            id: episodeFromProvider?.id,
            uniqueId: `${mediaId}-tv-s${episode.season_number}-e${episode.episode_number}`,
            title: episode.name,
            number: episode.episode_number,
            episode: episode.episode_number,
            season: episode.season_number,
            releaseDate: episode.air_date,
            description: episode.overview,
            url: episodeFromProvider?.url || undefined,
            image: (0, tmdb_1.tmdbImageSizes)(episode?.still_path)
          };
        }),
        isReleased: !(tmdbEpisodes[0]?.air_date > new Date().toISOString())
      };
    });
  };
  /**
   * Find the title on the provider and fetch the provider's info for it. Returns nothing when no
   * search result matches or the provider fails, so the TMDB metadata never depends on the provider.
   */
  matchProvider = async (title, extraData) => {
    try {
      const id = await this.findIdFromTitle(title, extraData);
      if (!id) return undefined;
      return {
        id,
        info: await this.provider.fetchMediaInfo(id)
      };
    } catch {
      return undefined;
    }
  };
  /** The id of the provider's search result for the title, checked against TMDB's year and season count. */
  findIdFromTitle = async (title, extraData) => {
    const term = (0, shared_1.searchTerm)(title).toLowerCase();
    const findMedia = await this.provider.search(term);
    // Drop results whose title isn't close, or whose type, year (±1) or season count (±2) contradicts
    // TMDB. Results that don't report a type, year or season count stay as candidates.
    const yearOf = result => Number(/\b(\d{4})\b/.exec(String(result.releaseDate ?? ''))?.[1]);
    const checkType = extraData.type === models_1.TvType.MOVIE || extraData.type === models_1.TvType.TVSERIES;
    const checkSeasons = extraData.type === models_1.TvType.TVSERIES && Boolean(extraData.totalSeasons);
    const candidates = findMedia.results.map(result => {
      const resultTitle = typeof result.title === 'string' ? result.title : '';
      const year = yearOf(result);
      return {
        result,
        similarity: (0, shared_1.stringSimilarity)(term, resultTitle.toLowerCase()),
        yearGap: year && extraData.year ? Math.abs(year - extraData.year) : undefined
      };
    }).filter(_ref => {
      let {
        result,
        similarity,
        yearGap
      } = _ref;
      if (similarity < 0.5) return false;
      if (checkType && result.type && result.type !== extraData.type) return false;
      if (yearGap !== undefined && yearGap > 1) return false;
      const seasons = result.seasons;
      if (checkSeasons && typeof seasons === 'number') {
        return seasons >= extraData.totalSeasons - 2 && seasons <= extraData.totalSeasons + 2;
      }
      return true;
    })
    // Closest title first; between equally close titles, the exact year, then ±1, then unknown.
    .sort((a, b) => b.similarity - a.similarity || (a.yearGap ?? 2) - (b.yearGap ?? 2));
    return candidates[0]?.result.id || undefined;
  };
  fetchEpisodeSources = (() => {
    var _this3 = this;
    return function (id) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      return (0, shared_1.callProvider)(_this3.provider, 'episode sources', () => _this3.provider.fetchEpisodeSources(id, ...args));
    };
  })();
  fetchEpisodeServers = (() => {
    var _this4 = this;
    return function (episodeId) {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }
      return (0, shared_1.callProvider)(_this4.provider, 'episode servers', () => _this4.provider.fetchEpisodeServers(episodeId, ...args));
    };
  })();
  /** A TMDB API URL with the API key. */
  url = path => `${this.apiUrl}${path}${path.includes('?') ? '&' : '?'}api_key=${this.apiKey}`;
  /** GET a TMDB list; failures as a TMDB MetaError. */
  get = async path => {
    try {
      return (await meta_http_1.metaHttp.get(this.url(path))).data;
    } catch (err) {
      throw models_1.MetaError.from('tmdb', err);
    }
  };
  /** A page of TMDB results; `hasNextPage` and the totals come from TMDB's paging. */
  toPage = (data, page, map) => {
    if (!data?.results?.length) return {
      currentPage: page,
      hasNextPage: false,
      results: []
    };
    return {
      currentPage: page,
      hasNextPage: page + 1 <= data.total_pages,
      totalResults: data.total_results,
      totalPages: data.total_pages,
      results: data.results.map(map)
    };
  };
}
exports.default = TMDB;
//# sourceMappingURL=tmdb.js.map