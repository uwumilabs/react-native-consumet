import { MovieParser, type ProviderContext } from '../../../models';
import { type VegaMoviesProviderInstance } from './create-vegamovies';
export declare class VegaMovies extends MovieParser {
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
    search: VegaMoviesProviderInstance['search'];
    fetchMediaInfo: VegaMoviesProviderInstance['fetchMediaInfo'];
    fetchEpisodeSources: VegaMoviesProviderInstance['fetchEpisodeSources'];
    fetchEpisodeServers: VegaMoviesProviderInstance['fetchEpisodeServers'];
    fetchLatest: VegaMoviesProviderInstance['fetchLatest'];
    fetchRecentMovies: VegaMoviesProviderInstance['fetchRecentMovies'];
    fetchRecentTVShows: VegaMoviesProviderInstance['fetchRecentTVShows'];
    fetchByFilter: VegaMoviesProviderInstance['fetchByFilter'];
}
//# sourceMappingURL=vegamovies.d.ts.map