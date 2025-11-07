import { type IMovieInfo, type IEpisodeServer, type StreamingServers, type ISource, type IMovieResult, type ISearch } from '../../../models';
import type { ProviderContext } from '../../../models/provider-context';
export declare function createYFlix(ctx: ProviderContext, customBaseURL?: string): {
    supportedTypes: Set<import("../../../models").TvType>;
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
export type YFlixProviderInstance = ReturnType<typeof createYFlix>;
//# sourceMappingURL=create-yflix.d.ts.map