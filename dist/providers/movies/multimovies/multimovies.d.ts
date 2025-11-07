import { MovieParser } from '../../../models';
import { type MultiMoviesProviderInstance } from './create-multimovies';
declare class MultiMovies extends MovieParser {
    private instance;
    logo: string;
    name: string;
    baseUrl: string;
    classPath: string;
    supportedTypes: Set<any>;
    isNSFW: boolean;
    isWorking: boolean;
    constructor(customBaseURL?: string);
    search: MultiMoviesProviderInstance['search'];
    fetchMediaInfo: MultiMoviesProviderInstance['fetchMediaInfo'];
    fetchEpisodeSources: MultiMoviesProviderInstance['fetchEpisodeSources'];
    fetchEpisodeServers: MultiMoviesProviderInstance['fetchEpisodeServers'];
    fetchPopular: MultiMoviesProviderInstance['fetchPopular'];
    fetchByGenre: MultiMoviesProviderInstance['fetchByGenre'];
}
export default MultiMovies;
//# sourceMappingURL=multimovies.d.ts.map