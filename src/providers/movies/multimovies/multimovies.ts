import { MovieParser, type ProviderContext } from '../../../models';
import { providerArgs } from '../../provider-args';
import { createMultiMovies, type MultiMoviesProviderInstance } from './create-multimovies';

// Backward compatibility wrapper class
export class MultiMovies extends MovieParser {
  private instance: MultiMoviesProviderInstance;
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
    this.instance = createMultiMovies(ctx, baseURL);
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
    this.fetchPopular = this.instance.fetchPopular;
    this.fetchByGenre = this.instance.fetchByGenre;
  }

  // Expose search as an instance method (already bound in constructor)
  override search!: MultiMoviesProviderInstance['search'];

  // Expose fetchMediaInfo
  override fetchMediaInfo!: MultiMoviesProviderInstance['fetchMediaInfo'];

  // Expose fetchEpisodeSources
  override fetchEpisodeSources!: MultiMoviesProviderInstance['fetchEpisodeSources'];

  // Expose fetchEpisodeServers
  override fetchEpisodeServers!: MultiMoviesProviderInstance['fetchEpisodeServers'];

  // Additional public methods
  fetchPopular!: MultiMoviesProviderInstance['fetchPopular'];
  fetchByGenre!: MultiMoviesProviderInstance['fetchByGenre'];
}
