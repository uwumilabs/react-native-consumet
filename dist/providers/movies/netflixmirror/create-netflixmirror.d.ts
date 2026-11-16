import { type IMovieInfo, type IEpisodeServer, type ISource, type IMovieResult, type ISearch, type ProviderContext } from '../../../models';
export type NetflixMirrorProviderInstance = {
    name: string;
    logo: string;
    baseUrl: string;
    classPath: string;
    supportedTypes: Set<any>;
    isNSFW: boolean;
    isWorking?: boolean;
    search: (query: string, page?: number) => Promise<ISearch<IMovieResult>>;
    fetchMediaInfo: (mediaId: string) => Promise<IMovieInfo>;
    fetchEpisodeServers: (episodeId: string, mediaId?: string) => Promise<IEpisodeServer[]>;
    fetchEpisodeSources: (episodeId: string, mediaId?: string) => Promise<ISource>;
    /** The episode's master playlist (its `auto` source) as text, fetched with the headers the CDN needs. */
    fetchHlsPlaylist: (episodeId: string) => Promise<string>;
};
/**
 * NetflixMirror (net52.cc): the site's Netflix catalog.
 * @param customBaseURL site URL to use instead of the default
 */
export declare function createNetflixMirror(ctx: ProviderContext, customBaseURL?: string): NetflixMirrorProviderInstance;
/**
 * PrimeMirror (net52.cc): the site's Prime Video catalog.
 * @param customBaseURL site URL to use instead of the default
 */
export declare function createPrimeMirror(ctx: ProviderContext, customBaseURL?: string): NetflixMirrorProviderInstance;
/**
 * DisneyMirror (net52.cc): the site's Disney+ catalog.
 * @param customBaseURL site URL to use instead of the default
 */
export declare function createDisneyMirror(ctx: ProviderContext, customBaseURL?: string): NetflixMirrorProviderInstance;
//# sourceMappingURL=create-netflixmirror.d.ts.map