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
     * @param _proxyConfig ignored: requests go through the library's own client. Kept so existing calls compile.
     * @param _adapter ignored, for the same reason
     */
    constructor(apiKey?: string, provider?: MovieParser | IMovieProvider, _proxyConfig?: ProxyConfig, _adapter?: AxiosAdapter);
    /**
     * @param type `movie`, `tv series`, `people` or `all` (a TvType value, or anything else for all)
     * @param timePeriod `day` or `week`
     */
    fetchTrending: (type: string | "all", timePeriod?: "day" | "week", page?: number) => Promise<ISearch<IMovieResult | IAnimeResult | IPeopleResult>>;
    search: (query: string, page?: number) => Promise<ISearch<IMovieResult>>;
    /**
     * TMDB info with every season and episode. `id` is always the TMDB id. When the title is found on
     * the provider, `providerId` is the provider's media id and episodes carry provider episode ids;
     * with no match (or a failing provider) both are unset and the TMDB metadata is still returned.
     * @param mediaId TMDB id
     * @param type `movie`, or anything else for a show
     */
    fetchMediaInfo: (mediaId: string, type: string) => Promise<IMovieInfo>;
    /**
     * Every season of a show, fetched together, with the provider's episode ids where the provider
     * has the episode. A season whose request fails keeps its place, with no episodes and `failed`
     * set, so the other seasons (and the season indexes apps store) survive it.
     */
    private fetchSeasons;
    /**
     * Find the title on the provider and fetch the provider's info for it. Returns nothing when no
     * search result matches or the provider fails, so the TMDB metadata never depends on the provider.
     */
    private matchProvider;
    /** The id of the provider's search result for the title, checked against TMDB's year and season count. */
    private findIdFromTitle;
    fetchEpisodeSources: (id: string, ...args: any) => Promise<ISource>;
    fetchEpisodeServers: (episodeId: string, ...args: any) => Promise<IEpisodeServer[]>;
    /** A TMDB API URL with the API key. */
    private url;
    /** GET a TMDB list; failures as a TMDB MetaError. */
    private get;
    /** A page of TMDB results; `hasNextPage` and the totals come from TMDB's paging. */
    private toPage;
}
export default TMDB;
//# sourceMappingURL=tmdb.d.ts.map