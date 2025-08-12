import { AnimeParser, type ISearch, type IAnimeInfo, type IAnimeResult, type ISource, type IEpisodeServer, SubOrDub } from '../../models';
declare class AnimePahe extends AnimeParser {
    readonly name = "AnimePahe";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    private ddgCookie;
    constructor();
    private initDdgCookie;
    /**
     * @param query Search query
     */
    search: (query: string) => Promise<ISearch<IAnimeResult>>;
    /**
     * @param id id format id/session
     * @param episodePage Episode page number (optional) default: -1 to get all episodes. number of episode pages can be found in the anime info object
     */
    fetchAnimeInfo: (id: string, episodePage?: number) => Promise<IAnimeInfo>;
    /**
     *
     * @param episodeId Episode id
     * @param subOrDub sub or dub (default `SubOrDub.SUB`) (optional)
     */
    fetchEpisodeSources: (episodeId: string, subOrDub?: SubOrDub) => Promise<ISource>;
    private fetchEpisodes;
    /**
     * @deprecated
     * @attention AnimePahe doesn't support this method
     */
    fetchEpisodeServers: (episodeLink: string) => Promise<IEpisodeServer[]>;
    private Headers;
}
export default AnimePahe;
//# sourceMappingURL=animepahe.d.ts.map