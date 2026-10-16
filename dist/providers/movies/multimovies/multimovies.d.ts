import { MovieParser, type ProviderContext } from '../../../models';
import { type MultiMoviesProviderInstance } from './create-multimovies';
export declare class MultiMovies extends MovieParser {
    private instance;
    logo: string;
    name: string;
    baseUrl: string;
    classPath: string;
    supportedTypes: Set<any>;
    isNSFW: boolean;
    isWorking: boolean;
    /**
     * @param ctx provider context; requests and extractors come from it (default: `createProviderContext()`)
     * @param customBaseURL site URL to use instead of the default (optional)
     */
    constructor(ctx?: ProviderContext, customBaseURL?: string);
    /** The older form, without a context. */
    constructor(customBaseURL?: string);
    search: MultiMoviesProviderInstance['search'];
    fetchMediaInfo: MultiMoviesProviderInstance['fetchMediaInfo'];
    fetchEpisodeSources: MultiMoviesProviderInstance['fetchEpisodeSources'];
    fetchEpisodeServers: MultiMoviesProviderInstance['fetchEpisodeServers'];
    fetchPopular: MultiMoviesProviderInstance['fetchPopular'];
    fetchByGenre: MultiMoviesProviderInstance['fetchByGenre'];
}
//# sourceMappingURL=multimovies.d.ts.map