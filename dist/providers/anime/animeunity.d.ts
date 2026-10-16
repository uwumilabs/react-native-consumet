import { AnimeParser, type ISearch, type IAnimeInfo, type IAnimeResult, type ISource, type IEpisodeServer } from '../../models';
/**
 * Not working, and not exported from `ANIME`: www.animeunity.to now redirects to www.animeunity.so,
 * and the scraper hasn't been checked against the new site. Kept so it can be ported to a registry
 * factory; delete it if nobody does.
 */
declare class AnimeUnity extends AnimeParser {
    readonly name = "AnimeUnity";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    readonly isWorking = false;
    /**
     * @param query Search query
     */
    search: (query: string) => Promise<ISearch<IAnimeResult>>;
    /**
     * @param id Anime id
     * @param page Page number
     */
    fetchAnimeInfo: (id: string, page?: number) => Promise<IAnimeInfo>;
    /**
     *
     * @param episodeId Episode id
     */
    fetchEpisodeSources: (episodeId: string) => Promise<ISource>;
    /**
     *
     * @param episodeId Episode id
     */
    fetchEpisodeServers: (episodeId: string) => Promise<IEpisodeServer[]>;
}
export default AnimeUnity;
/**
 * old episode sources fetching method, keep it here.
 */
//# sourceMappingURL=animeunity.d.ts.map