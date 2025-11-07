import { type IMovieInfo, type IEpisodeServer, type StreamingServers, type ISource, type IMovieResult, type ISearch, type ProviderContext } from '../../../models';
export declare function createMultiMovies(ctx: ProviderContext, customBaseURL?: string): {
    supportedTypes: Set<import("../../../models").TvType>;
    search: (query: string, page?: number) => Promise<ISearch<IMovieResult>>;
    fetchMediaInfo: (mediaId: string) => Promise<IMovieInfo>;
    fetchEpisodeSources: (episodeId: string, mediaId?: string, server?: StreamingServers, fileId?: string) => Promise<ISource>;
    fetchEpisodeServers: (episodeId: string, mediaId: string) => Promise<IEpisodeServer[]>;
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