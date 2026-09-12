import { MovieParser } from '../../../models';
import { type VegaMoviesProviderInstance } from './create-vegamovies';
declare class VegaMovies extends MovieParser {
    private instance;
    logo: string;
    name: string;
    baseUrl: string;
    classPath: string;
    supportedTypes: Set<any>;
    isNSFW: boolean;
    isWorking: boolean;
    constructor(customBaseURL?: string);
    search: VegaMoviesProviderInstance['search'];
    fetchMediaInfo: VegaMoviesProviderInstance['fetchMediaInfo'];
    fetchEpisodeSources: VegaMoviesProviderInstance['fetchEpisodeSources'];
    fetchEpisodeServers: VegaMoviesProviderInstance['fetchEpisodeServers'];
    fetchLatest: VegaMoviesProviderInstance['fetchLatest'];
    fetchRecentMovies: VegaMoviesProviderInstance['fetchRecentMovies'];
    fetchRecentTVShows: VegaMoviesProviderInstance['fetchRecentTVShows'];
    fetchByFilter: VegaMoviesProviderInstance['fetchByFilter'];
}
export { VegaMovies };
export { createVegaMovies } from './create-vegamovies';
export default VegaMovies;
//# sourceMappingURL=vegamovies.d.ts.map