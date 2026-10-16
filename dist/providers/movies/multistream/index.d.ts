import { MovieParser, TvType, type IMovieInfo, type IEpisodeServer, StreamingServers, type ISource, type IMovieResult, type ISearch, type ProviderContext } from '../../../models';
export declare class MultiStream extends MovieParser {
    readonly name = "MultiStream";
    protected baseUrl: string;
    protected apiUrl: string;
    private apiKey;
    protected logo: string;
    protected classPath: string;
    supportedTypes: Set<TvType>;
    private readonly ctx;
    /**
     * @param ctx provider context; requests go through its axios (default: `createProviderContext()`)
     * @param customBaseURL site URL to use instead of the default (optional)
     * @param apiKey your TMDB API key; without one a shared key is used, with a warning (see `META.TMDB`)
     */
    constructor(ctx?: ProviderContext, customBaseURL?: string, apiKey?: string);
    /** The older form, without a context. */
    constructor(customBaseURL?: string);
    /**
     *
     * @param query search query string
     * @param page page number (default 1) (optional)
     */
    search: (query: string, page?: number) => Promise<ISearch<IMovieResult>>;
    /**
     *
     * @param mediaId - The media identifier (TMDB ID with type, e.g., "1071585$movie")
     */
    fetchMediaInfo: (mediaId: string) => Promise<IMovieInfo>;
    /**
     *
     * @param episodeId episode id
     * @param mediaId media id
     * @param server server type (defaults to the first from `fetchEpisodeServers`) (optional)
     */
    fetchEpisodeSources: (episodeId: string, mediaId: string, server?: StreamingServers) => Promise<ISource>;
    /**
     *
     * @param episodeId takes episode link or movie id
     * @param mediaId takes movie link or id (found on movie movieInfo object)
     */
    fetchEpisodeServers: (episodeId: string, mediaId?: string) => Promise<IEpisodeServer[]>;
}
//# sourceMappingURL=index.d.ts.map