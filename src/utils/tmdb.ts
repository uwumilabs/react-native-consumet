import { TvType, type IMovieInfo, type IMovieResult, type ISearch } from '../models';
import { emptySearch } from '../providers/common/search';

/**
 * The URL of a path (`/search/multi?query=...`) of TMDB's API, which META.TMDB and MOVIES.MultiStream
 * read titles from, with the API key.
 */
export const tmdbUrl = (path: string, apiKey: string): string =>
  `https://api.themoviedb.org/3${path}${path.includes('?') ? '&' : '?'}api_key=${apiKey}`;

/** What `/movie/<id>` and `/tv/<id>` append to the details for mapTmdbInfo: cast, trailer, recommendations. */
export const TMDB_INFO_APPEND = 'credits,videos,recommendations';

/**
 * A page of TMDB's paged answer (search, trending) with `results` already mapped from its
 * `results`; an empty page when TMDB sent none.
 */
export const tmdbPage = <T>(data: any, page: number, results: T[]): ISearch<T> =>
  results.length
    ? {
        currentPage: page,
        hasNextPage: page + 1 <= data?.total_pages,
        totalResults: data?.total_results,
        totalPages: data?.total_pages,
        results,
      }
    : emptySearch(page);

/**
 * The TMDB API key used when the caller passes none. Every app that doesn't pass its own key shares
 * it, so TMDB can rate-limit or revoke it at any time.
 */
const SHARED_TMDB_API_KEY = '5201b54eb0968700e693a30576d7d4dc';

const warned = new Set<string>();

/**
 * The caller's TMDB API key, or the shared key with a `console.warn` the first time each class
 * falls back to it. A missing key is a setup problem for the app's developer, not a failed request:
 * requests still work, so it is a warning (a LogBox notice in React Native dev builds), not an error.
 */
export const resolveTmdbApiKey = (apiKey: string | undefined, className: string): string => {
  const key = apiKey?.trim();
  if (key) return key;

  if (!warned.has(className)) {
    warned.add(className);
    console.warn(
      `[react-native-consumet] ${className} was created without a TMDB API key, so it uses a key shared by ` +
        'every app that passes none, which TMDB can rate-limit or revoke at any time. Pass your own key ' +
        '(https://www.themoviedb.org/settings/api).'
    );
  }
  return SHARED_TMDB_API_KEY;
};

/** A TMDB image URL at `size` (`original`, `w300`, `w780`, ...); undefined when TMDB has no image. */
export const tmdbImage = (path: string | null | undefined, size: string = 'original'): string | undefined =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;

/** A season poster or episode still in the two sizes apps show them at. */
export const tmdbImageSizes = (path: string | null | undefined) =>
  path ? { mobile: tmdbImage(path, 'w300')!, hd: tmdbImage(path, 'w780')! } : undefined;

/** The year of a TMDB result's release or first air date, or undefined when TMDB has no date. */
export const releaseYear = (result: any): string | undefined =>
  /^\d{4}/.exec(result?.release_date || result?.first_air_date || '')?.[0];

/** `movie` or `tv`, the media types TMDB's paths and results use. */
export type TmdbMediaType = 'movie' | 'tv';

/** A TMDB movie or show as a list result (search, trending, recommendations, similar). */
export const mapTmdbResult = (result: any, mediaType?: TmdbMediaType): IMovieResult => ({
  id: String(result.id),
  title: result.title || result.name,
  image: tmdbImage(result.poster_path),
  // Recommendations carry media_type; similar titles don't, and are of the requested type.
  type: (result.media_type ?? mediaType) === 'movie' ? TvType.MOVIE : TvType.TVSERIES,
  rating: result.vote_average || 0,
  releaseDate: releaseYear(result),
});

/** A list of TMDB results, or undefined when TMDB sent none. */
export const mapTmdbResults = (list: any, mediaType: TmdbMediaType): IMovieResult[] | undefined =>
  list?.results?.length ? list.results.map((result: any) => mapTmdbResult(result, mediaType)) : undefined;

/**
 * The details of `/movie/<id>` or `/tv/<id>` that META.TMDB and MOVIES.MultiStream both return.
 * The request appends TMDB_INFO_APPEND for the fields that use them.
 */
export const mapTmdbInfo = (data: any, mediaType: TmdbMediaType) => {
  const video = data?.videos?.results?.[0];
  return {
    title: data?.title || data?.name,
    image: tmdbImage(data?.poster_path),
    cover: tmdbImage(data?.backdrop_path),
    type: mediaType === 'movie' ? TvType.MOVIE : TvType.TVSERIES,
    rating: data?.vote_average || 0,
    releaseDate: data?.release_date || data?.first_air_date,
    description: data?.overview,
    genres: data?.genres?.map((genre: { name: string }) => genre.name),
    duration: data?.runtime || data?.episode_run_time?.[0],
    totalEpisodes: data?.number_of_episodes,
    totalSeasons: data?.number_of_seasons as number | undefined,
    characters: data?.credits?.cast?.map((cast: any) => ({
      id: cast.id,
      name: cast.name,
      url: `https://www.themoviedb.org/person/${cast.id}`,
      character: cast.character,
      image: tmdbImage(cast.profile_path),
    })),
    trailer: video?.key
      ? { id: video.key, site: video.site, url: `https://www.youtube.com/watch?v=${video.key}` }
      : undefined,
    recommendations: mapTmdbResults(data?.recommendations, mediaType),
  } satisfies Partial<IMovieInfo>;
};
