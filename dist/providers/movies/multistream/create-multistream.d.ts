import type { IMovieInfo, IEpisodeServer, ISource, IMovieResult, ISearch, ProviderContext } from '../../../models';
/**
 * MultiStream: titles from TMDB, streams from several embed sites (111movies, vidsrc, videasy,
 * hexa), each of whose servers is listed.
 * @param ctx provider context; requests go through its axios
 * @param customBaseURL site URL to use instead of the default (optional)
 * @param tmdbApiKey your TMDB API key; without one a shared key is used, with a warning (see `META.TMDB`)
 */
export declare function createMultiStream(ctx: ProviderContext, customBaseURL?: string, tmdbApiKey?: string): {
    supportedTypes: Set<import("../../..").TvType>;
    search: (query: string, page?: number) => Promise<ISearch<IMovieResult>>;
    fetchMediaInfo: (id: string) => Promise<IMovieInfo>;
    fetchEpisodeSources: (episodeId: string, _mediaId?: string, server?: string) => Promise<ISource>;
    fetchEpisodeServers: (episodeId: string) => Promise<IEpisodeServer[]>;
    name: string;
    languages: string[] | string;
    classPath: string;
    baseUrl: string;
    isNSFW: boolean;
    logo: string;
    isWorking?: boolean;
    isDubAvailableSeparately?: boolean;
};
export type MultiStreamProviderInstance = ReturnType<typeof createMultiStream>;
//# sourceMappingURL=create-multistream.d.ts.map