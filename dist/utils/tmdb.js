"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mapTmdbInfo = exports.mapTmdbResults = exports.mapTmdbResult = exports.releaseYear = exports.tmdbImageSizes = exports.tmdbImage = exports.resolveTmdbApiKey = exports.TMDB_API_URL = void 0;
const models_1 = require("../models");
/** TMDB's API, which META.TMDB and MOVIES.MultiStream read titles from. */
exports.TMDB_API_URL = 'https://api.themoviedb.org/3';
/**
 * The TMDB API key used when the caller passes none. Every app that doesn't pass its own key shares
 * it, so TMDB can rate-limit or revoke it at any time.
 */
const SHARED_TMDB_API_KEY = '5201b54eb0968700e693a30576d7d4dc';
const warned = new Set();
/**
 * The caller's TMDB API key, or the shared key with a `console.warn` the first time each class
 * falls back to it. A missing key is a setup problem for the app's developer, not a failed request:
 * requests still work, so it is a warning (a LogBox notice in React Native dev builds), not an error.
 */
const resolveTmdbApiKey = (apiKey, className) => {
  const key = apiKey?.trim();
  if (key) return key;
  if (!warned.has(className)) {
    warned.add(className);
    console.warn(`[react-native-consumet] ${className} was created without a TMDB API key, so it uses a key shared by ` + 'every app that passes none, which TMDB can rate-limit or revoke at any time. Pass your own key ' + '(https://www.themoviedb.org/settings/api).');
  }
  return SHARED_TMDB_API_KEY;
};
exports.resolveTmdbApiKey = resolveTmdbApiKey;
/** A TMDB image URL at `size` (`original`, `w300`, `w780`, ...); undefined when TMDB has no image. */
const tmdbImage = function (path) {
  let size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'original';
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;
};
exports.tmdbImage = tmdbImage;
/** A season poster or episode still in the two sizes apps show them at. */
const tmdbImageSizes = path => path ? {
  mobile: (0, exports.tmdbImage)(path, 'w300'),
  hd: (0, exports.tmdbImage)(path, 'w780')
} : undefined;
exports.tmdbImageSizes = tmdbImageSizes;
/** The year of a TMDB result's release or first air date, or undefined when TMDB has no date. */
const releaseYear = result => /^\d{4}/.exec(result?.release_date || result?.first_air_date || '')?.[0];
exports.releaseYear = releaseYear;
/** A TMDB movie or show as a list result (search, trending, recommendations, similar). */
const mapTmdbResult = (result, mediaType) => ({
  id: result.id,
  title: result.title || result.name,
  image: (0, exports.tmdbImage)(result.poster_path),
  // Recommendations carry media_type; similar titles don't, and are of the requested type.
  type: (result.media_type ?? mediaType) === 'movie' ? models_1.TvType.MOVIE : models_1.TvType.TVSERIES,
  rating: result.vote_average || 0,
  releaseDate: (0, exports.releaseYear)(result)
});
exports.mapTmdbResult = mapTmdbResult;
/** A list of TMDB results, or undefined when TMDB sent none. */
const mapTmdbResults = (list, mediaType) => list?.results?.length ? list.results.map(result => (0, exports.mapTmdbResult)(result, mediaType)) : undefined;
exports.mapTmdbResults = mapTmdbResults;
/**
 * The details of `/movie/<id>` or `/tv/<id>` that META.TMDB and MOVIES.MultiStream both return.
 * The request appends `credits`, `videos` and `recommendations` for the fields that use them.
 */
const mapTmdbInfo = (data, mediaType) => {
  const video = data?.videos?.results?.[0];
  return {
    title: data?.title || data?.name,
    image: (0, exports.tmdbImage)(data?.poster_path),
    cover: (0, exports.tmdbImage)(data?.backdrop_path),
    type: mediaType === 'movie' ? models_1.TvType.MOVIE : models_1.TvType.TVSERIES,
    rating: data?.vote_average || 0,
    releaseDate: data?.release_date || data?.first_air_date,
    description: data?.overview,
    genres: data?.genres?.map(genre => genre.name),
    duration: data?.runtime || data?.episode_run_time?.[0],
    totalEpisodes: data?.number_of_episodes,
    totalSeasons: data?.number_of_seasons,
    characters: data?.credits?.cast?.map(cast => ({
      id: cast.id,
      name: cast.name,
      url: `https://www.themoviedb.org/person/${cast.id}`,
      character: cast.character,
      image: (0, exports.tmdbImage)(cast.profile_path)
    })),
    trailer: video?.key ? {
      id: video.key,
      site: video.site,
      url: `https://www.youtube.com/watch?v=${video.key}`
    } : undefined,
    recommendations: (0, exports.mapTmdbResults)(data?.recommendations, mediaType)
  };
};
exports.mapTmdbInfo = mapTmdbInfo;
//# sourceMappingURL=tmdb.js.map