import { type IMovieInfo, type IEpisodeServer, type StreamingServers, type ISource, type IMovieResult, type ISearch, type ProviderContext } from '../../../models';
/**
 * Tollywood Movie Provider for MovieRulz
 * Scrapes 5movierulz.tires for Telugu/Tollywood movies
 */
export declare function createTollywood(ctx: ProviderContext, customBaseURL?: string): {
    supportedTypes: Set<import("../../../models").TvType>;
    search: (query: string, page?: number) => Promise<ISearch<IMovieResult>>;
    fetchMediaInfo: (mediaId: string) => Promise<IMovieInfo>;
    fetchEpisodeSources: (episodeId: string, mediaId: string, server?: StreamingServers) => Promise<ISource>;
    fetchEpisodeServers: (episodeId: string, _mediaId: string) => Promise<IEpisodeServer[]>;
    fetchTeluguFeatured: (page?: number) => Promise<ISearch<IMovieResult>>;
    fetchTeluguByYear: (year: number, page?: number) => Promise<ISearch<IMovieResult>>;
    fetchLatestMovies: () => Promise<IMovieResult[]>;
    name: string;
    languages: string[] | string;
    classPath: string;
    baseUrl: string;
    isNSFW: boolean;
    logo: string;
    isWorking?: boolean;
    isDubAvailableSeparately?: boolean;
};
export type TollywoodProviderInstance = ReturnType<typeof createTollywood>;
//# sourceMappingURL=create-tollywood.d.ts.map