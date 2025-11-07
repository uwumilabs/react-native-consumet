import { MovieParser } from '../../../models';
declare class YFlix extends MovieParser {
    private instance;
    logo: string;
    name: string;
    baseUrl: string;
    classPath: string;
    supportedTypes: Set<any>;
    isNSFW: boolean;
    isWorking: boolean;
    constructor(customBaseURL?: string);
    /**
     *
     * @param query search query string
     * @param page page number (default 1) (optional)
     */
    search: typeof this.instance.search;
    /**
     *
     * @param mediaId media link or id
     */
    fetchMediaInfo: typeof this.instance.fetchMediaInfo;
    /**
     *
     * @param episodeId episode id
     * @param mediaId media id
     * @param server server type (default `MegaUp`) (optional)
     */
    fetchEpisodeSources: typeof this.instance.fetchEpisodeSources;
    /**
     *
     * @param episodeId takes episode link or movie id
     * @param mediaId takes movie link or id (found on movie info object)
     */
    fetchEpisodeServers: typeof this.instance.fetchEpisodeServers;
    fetchRecentMovies: typeof this.instance.fetchRecentMovies;
    fetchRecentTvShows: typeof this.instance.fetchRecentTvShows;
    fetchTrendingMovies: typeof this.instance.fetchTrendingMovies;
    fetchTrendingTvShows: typeof this.instance.fetchTrendingTvShows;
    fetchByCountry: typeof this.instance.fetchByCountry;
    fetchByGenre: typeof this.instance.fetchByGenre;
}
export default YFlix;
//# sourceMappingURL=yflix.d.ts.map