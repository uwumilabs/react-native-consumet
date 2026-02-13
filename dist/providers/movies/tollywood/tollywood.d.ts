import { MovieParser } from '../../../models';
import { type TollywoodProviderInstance } from './create-tollywood';
declare class Tollywood extends MovieParser {
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
     * Search for Telugu/Tollywood movies
     */
    search: TollywoodProviderInstance['search'];
    /**
     * Fetch media info for a movie
     */
    fetchMediaInfo: TollywoodProviderInstance['fetchMediaInfo'];
    /**
     * Fetch episode sources (actual video URLs)
     */
    fetchEpisodeSources: TollywoodProviderInstance['fetchEpisodeSources'];
    /**
     * Fetch episode servers (streaming sources)
     */
    fetchEpisodeServers: TollywoodProviderInstance['fetchEpisodeServers'];
    /**
     * Fetch Telugu featured movies
     */
    fetchTeluguFeatured: TollywoodProviderInstance['fetchTeluguFeatured'];
    /**
     * Fetch Telugu movies by year
     */
    fetchTeluguByYear: TollywoodProviderInstance['fetchTeluguByYear'];
    /**
     * Fetch latest Telugu movies from homepage
     */
    fetchLatestMovies: TollywoodProviderInstance['fetchLatestMovies'];
}
export default Tollywood;
//# sourceMappingURL=tollywood.d.ts.map