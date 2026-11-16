import { TvType, type IMovieResult } from '../models';
/** TMDB's API, which META.TMDB and MOVIES.MultiStream read titles from. */
export declare const TMDB_API_URL = "https://api.themoviedb.org/3";
/**
 * The caller's TMDB API key, or the shared key with a `console.warn` the first time each class
 * falls back to it. A missing key is a setup problem for the app's developer, not a failed request:
 * requests still work, so it is a warning (a LogBox notice in React Native dev builds), not an error.
 */
export declare const resolveTmdbApiKey: (apiKey: string | undefined, className: string) => string;
/** A TMDB image URL at `size` (`original`, `w300`, `w780`, ...); undefined when TMDB has no image. */
export declare const tmdbImage: (path: string | null | undefined, size?: string) => string | undefined;
/** A season poster or episode still in the two sizes apps show them at. */
export declare const tmdbImageSizes: (path: string | null | undefined) => {
    mobile: string;
    hd: string;
} | undefined;
/** The year of a TMDB result's release or first air date, or undefined when TMDB has no date. */
export declare const releaseYear: (result: any) => string | undefined;
/** `movie` or `tv`, the media types TMDB's paths and results use. */
export type TmdbMediaType = 'movie' | 'tv';
/** A TMDB movie or show as a list result (search, trending, recommendations, similar). */
export declare const mapTmdbResult: (result: any, mediaType?: TmdbMediaType) => IMovieResult;
/** A list of TMDB results, or undefined when TMDB sent none. */
export declare const mapTmdbResults: (list: any, mediaType: TmdbMediaType) => IMovieResult[] | undefined;
/**
 * The details of `/movie/<id>` or `/tv/<id>` that META.TMDB and MOVIES.MultiStream both return.
 * The request appends `credits`, `videos` and `recommendations` for the fields that use them.
 */
export declare const mapTmdbInfo: (data: any, mediaType: TmdbMediaType) => {
    title: any;
    image: string | undefined;
    cover: string | undefined;
    type: TvType.TVSERIES | TvType.MOVIE;
    rating: any;
    releaseDate: any;
    description: any;
    genres: any;
    duration: any;
    totalEpisodes: any;
    totalSeasons: number | undefined;
    characters: any;
    trailer: {
        id: any;
        site: any;
        url: string;
    } | undefined;
    recommendations: IMovieResult[] | undefined;
};
//# sourceMappingURL=tmdb.d.ts.map