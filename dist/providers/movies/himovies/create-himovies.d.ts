import { type IMovieInfo, type IEpisodeServer, type StreamingServers, type ISource, type IMovieResult, type ISearch, type ProviderContext } from '../../../models';
export declare function createHiMovies(ctx: ProviderContext, customBaseURL?: string): {
    supportedTypes: Set<import("../../..").TvType>;
    search: (query: string, page?: number) => Promise<ISearch<IMovieResult>>;
    fetchMediaInfo: (mediaId: string) => Promise<IMovieInfo>;
    fetchEpisodeSources: (episodeId: string, mediaId: string, server?: StreamingServers) => Promise<ISource>;
    fetchEpisodeServers: (episodeId: string, mediaId: string) => Promise<IEpisodeServer[]>;
    fetchRecentMovies: () => Promise<IMovieResult[]>;
    fetchRecentTvShows: () => Promise<IMovieResult[]>;
    fetchTrendingMovies: () => Promise<IMovieResult[]>;
    fetchTrendingTvShows: () => Promise<IMovieResult[]>;
    fetchByCountry: (country: string, page?: number) => Promise<ISearch<IMovieResult>>;
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
export type HiMoviesProviderInstance = ReturnType<typeof createHiMovies>;
//# sourceMappingURL=create-himovies.d.ts.map