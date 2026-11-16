"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createMultiStream = createMultiStream;
const tmdb_1 = require("../../../utils/tmdb");
const utils_1 = require("./utils");
/**
 * MultiStream: titles from TMDB, streams from several embed sites (111movies, vidsrc, videasy,
 * hexa), each of whose servers is listed.
 * @param ctx provider context; requests go through its axios
 * @param customBaseURL site URL to use instead of the default (optional)
 * @param tmdbApiKey your TMDB API key; without one a shared key is used, with a warning (see `META.TMDB`)
 */
function createMultiStream(ctx, customBaseURL, tmdbApiKey) {
  const {
    axios,
    createCustomBaseUrl,
    enums
  } = ctx;
  const {
    TvType
  } = enums;
  const apiKey = (0, tmdb_1.resolveTmdbApiKey)(tmdbApiKey, 'MOVIES.MultiStream');
  const tmdb = path => `${tmdb_1.TMDB_API_URL}${path}${path.includes('?') ? '&' : '?'}api_key=${apiKey}`;
  const config = {
    name: 'MultiStream',
    languages: 'en',
    classPath: 'MOVIES.MultiStream',
    logo: 'https://himovies.sx/images/group_1/theme_1/favicon.png',
    baseUrl: createCustomBaseUrl('https://rivestream.org', customBaseURL),
    isNSFW: false,
    isWorking: true
  };
  const supportedTypes = new Set([TvType.MOVIE, TvType.TVSERIES]);
  /** Search TMDB. Ids are `<tmdbId>$movie` or `<tmdbId>$tv`; shows carry their season count. */
  const search = async function (query) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    const {
      data
    } = await axios.get(tmdb(`/search/multi?language=en-US&page=${page}&include_adult=false&query=${encodeURIComponent(query)}`));
    if (!data.results?.length) return {
      currentPage: page,
      hasNextPage: false,
      results: []
    };
    const results = await Promise.all(data.results.map(async result => {
      let seasons;
      if (result.media_type === 'tv') {
        try {
          const {
            data: tvData
          } = await axios.get(tmdb(`/tv/${result.id}?language=en-US`));
          seasons = tvData.number_of_seasons;
        } catch {
          // The season count is extra; a show whose lookup fails is listed without it.
        }
      }
      return {
        ...(0, tmdb_1.mapTmdbResult)(result),
        id: (0, utils_1.toMediaId)(result.id, result.media_type),
        seasons
      };
    }));
    return {
      currentPage: page,
      hasNextPage: page + 1 <= data.total_pages,
      totalResults: data.total_results,
      totalPages: data.total_pages,
      results
    };
  };
  /** @param id a MultiStream media id from `search` (`1071585$movie`, `1399$tv`) */
  const fetchMediaInfo = async id => {
    const {
      tmdbId,
      type
    } = (0, utils_1.parseId)(id);
    const mediaType = type === 'movie' ? 'movie' : 'tv';
    const {
      data
    } = await axios.get(tmdb(`/${type}/${tmdbId}?language=en-US&append_to_response=release_dates,images,recommendations,credits,videos`));
    const info = {
      id,
      ...(0, tmdb_1.mapTmdbInfo)(data, mediaType),
      recommendations: data?.recommendations?.results?.length ? data.recommendations.results.map(result => ({
        ...(0, tmdb_1.mapTmdbResult)(result, mediaType),
        id: (0, utils_1.toMediaId)(result.id, result.media_type ?? mediaType)
      })) : undefined
    };
    if (info.type === TvType.TVSERIES) {
      info.episodes = [];
      for (let season = 1; season <= data?.number_of_seasons; season++) {
        const {
          data: seasonData
        } = await axios.get(tmdb(`/tv/${tmdbId}/season/${season}`));
        for (const item of seasonData.episodes) {
          info.episodes.push({
            id: (0, utils_1.toEpisodeId)(tmdbId, item.episode_number, item.season_number, item.id),
            title: item.name,
            number: item.episode_number,
            season: item.season_number || season,
            description: item.overview,
            image: (0, tmdb_1.tmdbImage)(item.still_path)
          });
        }
      }
    } else {
      info.episodes = [{
        id: (0, utils_1.toMediaId)(tmdbId, 'movie'),
        title: info.title,
        description: info.description,
        image: info.image,
        number: 1
      }];
    }
    return info;
  };
  /** @param episodeId an episode id from `fetchMediaInfo` */
  const fetchEpisodeServers = episodeId => (0, utils_1.getMultiServers)(ctx, episodeId);
  /**
   * @param episodeId an episode id from `fetchMediaInfo`
   * @param _mediaId unused: the episode id names the title
   * @param server a server name from `fetchEpisodeServers` (default: the first)
   */
  const fetchEpisodeSources = (episodeId, _mediaId, server) => (0, utils_1.getMultiSources)(ctx, episodeId, server);
  return {
    ...config,
    supportedTypes,
    search,
    fetchMediaInfo,
    fetchEpisodeSources,
    fetchEpisodeServers
  };
}
//# sourceMappingURL=create-multistream.js.map