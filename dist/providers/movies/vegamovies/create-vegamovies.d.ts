import { type IMovieInfo, type IEpisodeServer, type StreamingServers, type ISource, type IMovieResult, type ISearch, type ProviderContext } from '../../../models';
export declare function createVegaMovies(ctx: ProviderContext, customBaseURL?: string): {
    supportedTypes: Set<import("../../../models").TvType>;
    search: (query: string, page?: number) => Promise<ISearch<IMovieResult>>;
    fetchMediaInfo: (mediaId: string) => Promise<IMovieInfo>;
    fetchEpisodeServers: (episodeId: string, mediaId?: string) => Promise<IEpisodeServer[]>;
    fetchEpisodeSources: (episodeId: string, mediaId?: string, server?: StreamingServers | string) => Promise<ISource>;
    fetchLatest: (page?: number) => Promise<ISearch<IMovieResult>>;
    fetchRecentMovies: (page?: number) => Promise<ISearch<IMovieResult>>;
    fetchRecentTVShows: (page?: number) => Promise<ISearch<IMovieResult>>;
    fetchByFilter: (filter: string, page?: number) => Promise<ISearch<IMovieResult>>;
    name: string;
    languages: string[] | string;
    classPath: string;
    baseUrl: string;
    isNSFW: boolean;
    logo: string;
    isWorking?: boolean;
    isDubAvailableSeparately?: boolean;
};
export type VegaMoviesProviderInstance = ReturnType<typeof createVegaMovies>;
//# sourceMappingURL=create-vegamovies.d.ts.map