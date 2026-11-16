import { AnimeParser, type ISearch, type IAnimeInfo, type IAnimeResult, type ISource, type IEpisodeServer, type IAnimeProvider } from '../../models';
/**
 * @deprecated Use `META.Anilist` instead. Myanimelist scrapes myanimelist.net pages, which change
 * without notice, and its episodes have no `uniqueId`. AniList has the same anime, gives the MAL id
 * as `malId`, and keys every episode with a stable `uniqueId`. Myanimelist will be removed in a
 * future major release.
 */
declare class Myanimelist extends AnimeParser {
    readonly name = "Myanimelist";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    provider: AnimeParser | IAnimeProvider;
    /**
     * Maps MyAnimeList anime to an anime provider's episodes, filling missing episode titles, images
     * and descriptions from Kitsu.
     * @param provider anime provider to find the episodes on (default: Zoro, HiAnime)
     */
    constructor(provider?: AnimeParser | IAnimeProvider);
    search: (query: string, page?: number) => Promise<ISearch<IAnimeResult>>;
    /**
     * @param animeId MAL id
     * @param dub look for the dubbed episodes (default: `false`)
     * @param fetchFiller set `isFiller` on the episodes, from the MAL filler list (default: `false`)
     */
    fetchAnimeInfo: (animeId: string, dub?: boolean, fetchFiller?: boolean) => Promise<IAnimeInfo>;
    fetchEpisodeSources: (episodeId: string, ...args: any) => Promise<ISource>;
    fetchEpisodeServers: (episodeId: string) => Promise<IEpisodeServer[]>;
    /** The provider's info for the search result whose title is closest to `term`. */
    private findProviderAnime;
    private findProviderEpisodes;
    /** Fills the episodes' missing titles, images and descriptions from the Kitsu anime of the same season and year. */
    private addKitsuDetails;
    /**
     * @param id MAL id
     * @returns the MAL info without episodes
     */
    fetchMalInfoById: (id: string) => Promise<IAnimeInfo>;
}
export default Myanimelist;
//# sourceMappingURL=mal.d.ts.map