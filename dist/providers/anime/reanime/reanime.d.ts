import { AnimeParser, type ProviderContext } from '../../../models';
import { type ReAnimeProviderInstance } from './create-reanime';
export declare class ReAnime extends AnimeParser {
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
    /** The older form, without a context. `cookie` is ignored. */
    constructor(customBaseURL?: string, cookie?: string);
    search: ReAnimeProviderInstance['search'];
    fetchAnimeInfo: ReAnimeProviderInstance['fetchAnimeInfo'];
    fetchEpisodeServers: ReAnimeProviderInstance['fetchEpisodeServers'];
    fetchEpisodeSources: ReAnimeProviderInstance['fetchEpisodeSources'];
}
//# sourceMappingURL=reanime.d.ts.map