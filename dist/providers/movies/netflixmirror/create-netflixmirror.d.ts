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
    fetchHlsPlaylist: (episodeId: string) => Promise<string>;
};
export declare function createNetflixMirror(ctx: ProviderContext, customBaseURL?: string): NetflixMirrorProviderInstance;
export declare function createPrimeMirror(ctx: ProviderContext, customBaseURL?: string): NetflixMirrorProviderInstance;
export declare function createDisneyMirror(ctx: ProviderContext, customBaseURL?: string): NetflixMirrorProviderInstance;
//# sourceMappingURL=create-netflixmirror.d.ts.map