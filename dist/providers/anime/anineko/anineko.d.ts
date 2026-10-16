import { AnimeParser, type ProviderContext } from '../../../models';
import { type AniNekoProviderInstance } from './create-anineko';
export declare class AniNeko extends AnimeParser {
    private instance;
    logo: string;
    name: string;
    baseUrl: string;
    classPath: string;
    isNSFW: boolean;
    isWorking: boolean;
    isDubAvailableSeparately: boolean;
    /**
     * @param ctx provider context; requests and extractors come from it (default: `createProviderContext()`)
     * @param customBaseURL site URL to use instead of the default (optional)
     */
    constructor(ctx?: ProviderContext, customBaseURL?: string);
    /** The older form, without a context. */
    constructor(customBaseURL?: string);
    search: AniNekoProviderInstance['search'];
    fetchAnimeInfo: AniNekoProviderInstance['fetchAnimeInfo'];
    fetchEpisodeServers: AniNekoProviderInstance['fetchEpisodeServers'];
    fetchEpisodeSources: AniNekoProviderInstance['fetchEpisodeSources'];
    fetchRecentlyUpdated: AniNekoProviderInstance['fetchRecentlyUpdated'];
    fetchNewReleases: AniNekoProviderInstance['fetchNewReleases'];
    fetchRecentlyAdded: AniNekoProviderInstance['fetchRecentlyAdded'];
    genreSearch: AniNekoProviderInstance['genreSearch'];
}
//# sourceMappingURL=anineko.d.ts.map