import { MovieParser } from '../../../models';
import { type HiMoviesProviderInstance } from './create-himovies';
declare class HiMovies extends MovieParser {
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
    search: HiMoviesProviderInstance['search'];
    fetchRecentMovies: HiMoviesProviderInstance['fetchRecentMovies'];
    fetchRecentTvShows: HiMoviesProviderInstance['fetchRecentTvShows'];
    fetchTrendingMovies: HiMoviesProviderInstance['fetchTrendingMovies'];
    fetchTrendingTvShows: HiMoviesProviderInstance['fetchTrendingTvShows'];
    fetchByCountry: HiMoviesProviderInstance['fetchByCountry'];
    fetchByGenre: HiMoviesProviderInstance['fetchByGenre'];
    /**
     *
     * @param mediaId media link or id
     */
    fetchMediaInfo: HiMoviesProviderInstance['fetchMediaInfo'];
    /**
     *
     * @param episodeId episode id
     * @param mediaId media id
     * @param server server type (default `MegaCloud`) (optional)
     */
    fetchEpisodeSources: HiMoviesProviderInstance['fetchEpisodeSources'];
    /**
     *
     * @param episodeId takes episode link or movie id
     * @param mediaId takes movie link or id (found on movie info object)
     */
    fetchEpisodeServers: HiMoviesProviderInstance['fetchEpisodeServers'];
}
export default HiMovies;
//# sourceMappingURL=himovies.d.ts.map