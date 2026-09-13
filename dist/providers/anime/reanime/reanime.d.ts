import { AnimeParser } from '../../../models';
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
    constructor(customBaseURL?: string, cookie?: string);
    search: ReAnimeProviderInstance['search'];
    fetchAnimeInfo: ReAnimeProviderInstance['fetchAnimeInfo'];
    fetchEpisodeServers: ReAnimeProviderInstance['fetchEpisodeServers'];
    fetchEpisodeSources: ReAnimeProviderInstance['fetchEpisodeSources'];
}
export default ReAnime;
//# sourceMappingURL=reanime.d.ts.map