import { MovieParser, type ProviderContext } from '../../../models';
import { providerArgs } from '../../provider-args';
import { createYFlix, type YFlixProviderInstance } from './create-yflix';

export class YFlix extends MovieParser {
  private instance: YFlixProviderInstance;
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
    this.instance = createYFlix(ctx, baseURL);
    this.logo = this.instance.logo;
    this.name = this.instance.name;
    this.baseUrl = this.instance.baseUrl;
    this.classPath = this.instance.classPath;
    this.supportedTypes = this.instance.supportedTypes;
    this.isNSFW = this.instance.isNSFW;
    this.isWorking = this.instance.isWorking ?? true;

    this.search = this.instance.search;
    this.fetchMediaInfo = this.instance.fetchMediaInfo;
    this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
    this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
    this.fetchRecentMovies = this.instance.fetchRecentMovies;
    this.fetchRecentTvShows = this.instance.fetchRecentTvShows;
    this.fetchTrendingMovies = this.instance.fetchTrendingMovies;
    this.fetchTrendingTvShows = this.instance.fetchTrendingTvShows;
    this.fetchByCountry = this.instance.fetchByCountry;
    this.fetchByGenre = this.instance.fetchByGenre;
  }

  /**
   *
   * @param query search query string
   * @param page page number (default 1) (optional)
   */
  override search!: typeof this.instance.search;

  /**
   *
   * @param mediaId media link or id
   */
  override fetchMediaInfo!: typeof this.instance.fetchMediaInfo;

  /**
   *
   * @param episodeId episode id
   * @param mediaId media id
   * @param server server type (default `MegaUp`) (optional)
   */
  override fetchEpisodeSources!: typeof this.instance.fetchEpisodeSources;

  /**
   *
   * @param episodeId takes episode link or movie id
   * @param mediaId takes movie link or id (found on movie info object)
   */
  override fetchEpisodeServers!: typeof this.instance.fetchEpisodeServers;

  fetchRecentMovies!: typeof this.instance.fetchRecentMovies;

  fetchRecentTvShows!: typeof this.instance.fetchRecentTvShows;

  fetchTrendingMovies!: typeof this.instance.fetchTrendingMovies;

  fetchTrendingTvShows!: typeof this.instance.fetchTrendingTvShows;

  fetchByCountry!: typeof this.instance.fetchByCountry;

  fetchByGenre!: typeof this.instance.fetchByGenre;
}
