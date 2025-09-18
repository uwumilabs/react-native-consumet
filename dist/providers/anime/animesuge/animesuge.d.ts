import { AnimeParser } from '../../../models';
import { type AnimeSugeProviderInstance } from './create-animesuge';
export declare class AnimeSuge extends AnimeParser {
    private instance;
    logo: string;
    constructor(customBaseURL?: string);
    get name(): string;
    get baseUrl(): string;
    set baseUrl(value: string);
    get classPath(): string;
    /**
     * @param query Search query
     * @param page Page number (optional)
     */
    search: AnimeSugeProviderInstance['search'];
    /**
     * @param id Anime id
     */
    fetchAnimeInfo: AnimeSugeProviderInstance['fetchAnimeInfo'];
    /**
     *
     * @param episodeId Episode id
     * @param server server type (default `VidCloud`) (optional)
     * @param subOrDub sub or dub (default `SubOrDub.SUB`) (optional)
     */
    fetchEpisodeSources: AnimeSugeProviderInstance['fetchEpisodeSources'];
    /**
     * Method not implemented in AnimeSuge provider.
     * @param episodeId Episode id
     */
    fetchEpisodeServers: AnimeSugeProviderInstance['fetchEpisodeServers'];
}
export default AnimeSuge;
//# sourceMappingURL=animesuge.d.ts.map