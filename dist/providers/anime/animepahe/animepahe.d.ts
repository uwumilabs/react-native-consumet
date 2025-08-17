import { AnimeParser } from '../../../models';
import { type AnimePaheProviderInstance } from './create-animepahe';
export declare class AnimePahe extends AnimeParser {
    private instance;
    logo: string;
    constructor(customBaseURL?: string);
    get name(): string;
    get baseUrl(): string;
    set baseUrl(value: string);
    get classPath(): string;
    /**
     * @param query Search query
     */
    search: AnimePaheProviderInstance['search'];
    /**
     * @param id id format id/session
     * @param episodePage Episode page number (optional) default: -1 to get all episodes. number of episode pages can be found in the anime info object
     */
    fetchAnimeInfo: AnimePaheProviderInstance['fetchAnimeInfo'];
    /**
     *
     * @param episodeId Episode id
     * @param server server type (default `Kwik`) (optional)
     * @param subOrDub sub or dub (default `SubOrDub.SUB`) (optional)
     */
    fetchEpisodeSources: AnimePaheProviderInstance['fetchEpisodeSources'];
    /**
     * Method not implemented in AnimePahe provider.
     * @param episodeId Episode id
     */
    fetchEpisodeServers: AnimePaheProviderInstance['fetchEpisodeServers'];
}
export default AnimePahe;
//# sourceMappingURL=animepahe.d.ts.map