import { MovieParser } from '../../../models';
import { createProviderContext } from '../../../utils/create-provider-context';
import { createYFlix, type YFlixProviderInstance } from './create-yflix';

class YFlix extends MovieParser {
  private instance: YFlixProviderInstance;
  override logo: string;
  override name: string;
  override baseUrl: string;
  override classPath: string;
  override supportedTypes: Set<any>;
  override isNSFW: boolean;
  override isWorking: boolean;

  constructor(customBaseURL?: string) {
    super();

    const defaultContext = createProviderContext();

    this.instance = createYFlix(defaultContext, customBaseURL);
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

export default YFlix;
