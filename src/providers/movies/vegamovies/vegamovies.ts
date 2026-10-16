import { MovieParser, type ProviderContext } from '../../../models';
import { providerArgs } from '../../provider-args';
import { createVegaMovies, type VegaMoviesProviderInstance } from './create-vegamovies';

// Backward compatibility wrapper class
export class VegaMovies extends MovieParser {
  private instance: VegaMoviesProviderInstance;
  override logo: string;
  override name: string;
  override baseUrl: string;
  override classPath: string;
  override supportedTypes: Set<any>;
  override isNSFW: boolean;
  override isWorking: boolean;

  /**
   * @param ctx provider context; requests and extractors come from it (default: `createProviderContext()`)
   * @param customBaseURL site URL to use instead of the default (optional)
   */
  constructor(ctx?: ProviderContext, customBaseURL?: string);
  /** The older form, without a context. */
  constructor(customBaseURL?: string);
  constructor(ctxOrBaseURL?: ProviderContext | string, customBaseURL?: string) {
    super();
    const [ctx, baseURL] = providerArgs(ctxOrBaseURL, customBaseURL);
    this.instance = createVegaMovies(ctx, baseURL);
    this.logo = this.instance.logo;
    this.name = this.instance.name;
    this.baseUrl = this.instance.baseUrl;
    this.classPath = this.instance.classPath;
    this.supportedTypes = this.instance.supportedTypes;
    this.isNSFW = this.instance.isNSFW;
    this.isWorking = this.instance.isWorking ?? true;

    // Bind all methods to preserve proper typing
    this.search = this.instance.search;
    this.fetchMediaInfo = this.instance.fetchMediaInfo;
    this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
    this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
    this.fetchLatest = this.instance.fetchLatest;
    this.fetchRecentMovies = this.instance.fetchRecentMovies;
    this.fetchRecentTVShows = this.instance.fetchRecentTVShows;
    this.fetchByFilter = this.instance.fetchByFilter;
  }

  // Expose search as an instance method (already bound in constructor)
  override search!: VegaMoviesProviderInstance['search'];

  // Expose fetchMediaInfo
  override fetchMediaInfo!: VegaMoviesProviderInstance['fetchMediaInfo'];

  // Expose fetchEpisodeSources
  override fetchEpisodeSources!: VegaMoviesProviderInstance['fetchEpisodeSources'];

  // Expose fetchEpisodeServers
  override fetchEpisodeServers!: VegaMoviesProviderInstance['fetchEpisodeServers'];

  // Additional public methods
  fetchLatest!: VegaMoviesProviderInstance['fetchLatest'];
  fetchRecentMovies!: VegaMoviesProviderInstance['fetchRecentMovies'];
  fetchRecentTVShows!: VegaMoviesProviderInstance['fetchRecentTVShows'];
  fetchByFilter!: VegaMoviesProviderInstance['fetchByFilter'];
}
