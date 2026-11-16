import { type IMovieInfo, type IEpisodeServer, type StreamingServers, type ISource, type IMovieResult, type ISearch, type ProviderContext } from '../../../models';
/**
 * MultiMovies (multimovies.center), a DooPlay (WordPress) site. Media and episode ids are page
 * paths such as `tvshows/jujutsu-kaisen` and `episodes/jujutsu-kaisen-1x1`.
 * @param customBaseURL site URL to use instead of the default
 */
export declare function createMultiMovies(ctx: ProviderContext, customBaseURL?: string): {
    supportedTypes: Set<import("../../..").TvType>;
    search: (query: string, page?: number) => Promise<ISearch<IMovieResult>>;
    fetchMediaInfo: (mediaId: string) => Promise<IMovieInfo>;
    fetchEpisodeSources: (episodeId: string, _mediaId?: string, server?: StreamingServers) => Promise<ISource>;
    fetchEpisodeServers: (episodeId: string, _mediaId?: string) => Promise<IEpisodeServer[]>;
    fetchPopular: (page?: number) => Promise<ISearch<IMovieResult>>;
    fetchByGenre: (genre: string, page?: number) => Promise<ISearch<IMovieResult>>;
    name: string;
    languages: string[] | string;
    classPath: string;
    baseUrl: string;
    isNSFW: boolean;
    logo: string;
    isWorking?: boolean;
    isDubAvailableSeparately?: boolean;
};
export type MultiMoviesProviderInstance = ReturnType<typeof createMultiMovies>;
//# sourceMappingURL=create-multimovies.d.ts.map