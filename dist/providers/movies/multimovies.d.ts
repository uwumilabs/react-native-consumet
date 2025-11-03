import { MovieParser, TvType, type IMovieInfo, type IEpisodeServer, StreamingServers, type ISource, type IMovieResult, type ISearch } from '../../models';
declare class MultiMovies extends MovieParser {
    readonly name = "MultiMovies";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    supportedTypes: Set<TvType>;
    constructor(customBaseURL?: string);
    private proxiedBaseUrl;
    private customProxyUrl;
    /**
     *
     * @param query search query string
     * @param page page number (default 1) (optional)
     */
    search: (query: string, page?: number) => Promise<ISearch<IMovieResult>>;
    /**
     *
     * @param mediaId media link or id
     */
    fetchMediaInfo: (mediaId: string) => Promise<IMovieInfo>;
    /**
     *
     * @param episodeId episode id
     * @param media media id
     * @param server server type (default `StreamWish`) (optional)
     */
    fetchEpisodeSources: (episodeId: string, mediaId?: string, //just placeholder for compatibility with tmdb
    server?: StreamingServers, fileId?: string) => Promise<ISource>;
    /**
     *
     * @param episodeId takes episode link or movie id
     * @param mediaId takes movie link or id (found on movie info object, this is just a placeholder for compatibility)
     */
    fetchEpisodeServers: (episodeId: string, mediaId: string) => Promise<IEpisodeServer[]>;
    fetchPopular: (page?: number) => Promise<ISearch<IMovieResult>>;
    fetchByGenre: (genre: string, page?: number) => Promise<ISearch<IMovieResult>>;
    private getServer;
}
export default MultiMovies;
//# sourceMappingURL=multimovies.d.ts.map