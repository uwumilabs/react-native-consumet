import { type IMovieInfo, type IEpisodeServer, type ISource, type IMovieResult, type ISearch, type ProviderContext } from '../../../models';
export type NetflixMirrorProviderInstance = {
    name: string;
    logo: string;
    baseUrl: string;
    classPath: string;
    supportedTypes: Set<any>;
    isNSFW: boolean;
    isWorking?: boolean;
    /**
     * Searches Netflix, Prime Video, Disney+ and Lionsgate in parallel.
     * Each result's `otherNames` array contains the platform label(s) it was found on.
     * Results are deduplicated by id; if the same id appears on multiple platforms
     * all platform labels are merged into `otherNames`.
     */
    search: (query: string, page?: number) => Promise<ISearch<IMovieResult>>;
    fetchMediaInfo: (mediaId: string) => Promise<IMovieInfo>;
    fetchEpisodeServers: (episodeId: string, mediaId?: string) => Promise<IEpisodeServer[]>;
    fetchEpisodeSources: (episodeId: string, mediaId?: string) => Promise<ISource>;
    fetchHlsPlaylist: (episodeId: string) => Promise<string>;
};
export declare function createNetflixMirror(ctx: ProviderContext, customBaseURL?: string): NetflixMirrorProviderInstance;
//# sourceMappingURL=create-netflixmirror.d.ts.map