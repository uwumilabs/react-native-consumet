import { AnimeParser } from '../../../models';
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
export default AniNeko;
//# sourceMappingURL=anineko.d.ts.map