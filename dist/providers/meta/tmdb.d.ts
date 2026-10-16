import { type ISearch, type IAnimeResult, type ISource, type IEpisodeServer, MovieParser, TvType, type IMovieResult, type IMovieInfo, type ProxyConfig } from '../../models';
import type { IMovieProvider, IPeopleResult } from '../../models/types';
import type { AxiosAdapter } from 'axios';
declare class TMDB extends MovieParser {
    readonly name = "TMDB";
    protected baseUrl: string;
    protected apiUrl: string;
    protected logo: string;
    protected classPath: string;
    supportedTypes: Set<TvType>;
    private apiKey;
    private provider;
    /**
     * @param apiKey your TMDB API key. Without one, a key shared by every app that passes none is
     * used, and a warning is logged once; TMDB can rate-limit or revoke that key at any time.
     * @param provider movie provider to find the title on (default HiMovies)
     */
    constructor(apiKey?: string, provider?: MovieParser | IMovieProvider, proxyConfig?: ProxyConfig, adapter?: AxiosAdapter);
    /**
     * @param type trending type: tv series, movie, people or all
     * @param timePeriod trending time period day or week
     * @param page page number
     */
    fetchTrending: (type: string | "all", timePeriod?: "day" | "week", page?: number) => Promise<ISearch<IMovieResult | IAnimeResult | IPeopleResult>>;
    /**
     * @param query search query
     * @param page page number
     */
    search: (query: string, page?: number) => Promise<ISearch<IMovieResult | IAnimeResult>>;
    /**
     * TMDB info with every season and episode. `id` is always the TMDB id. When the title is found on
     * the provider, `providerId` is the provider's media id and episodes carry provider episode ids;
     * with no match (or a failing provider) both are unset and the TMDB metadata is still returned.
     * @param id media id (anime or movie/tv)
     * @param type movie or tv
     */
    fetchMediaInfo: (mediaId: string, type: string) => Promise<IMovieInfo>;
    /**
     * Find the title on the provider and fetch the provider's info for it. Returns nothing when no
     * search result matches or the provider fails, so the TMDB metadata never depends on the provider.
     */
    private matchProvider;
    /**
     * Find the id of a media from its title. and extra data. (year, totalSeasons, totalEpisodes)
     * @param title
     * @param extraData
     * @returns id of the media
     */
    private findIdFromTitle;
    /**
     * @param id media id (anime or movie/tv)
     * @param args optional arguments
     */
    fetchEpisodeSources: (id: string, ...args: any) => Promise<ISource>;
    /**
     * @param episodeId episode id
     * @param args optional arguments
     **/
    fetchEpisodeServers: (episodeId: string, ...args: any) => Promise<IEpisodeServer[]>;
}
export default TMDB;
//# sourceMappingURL=tmdb.d.ts.map