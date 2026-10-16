import { MovieParser, type ProviderContext } from '../../../models';
import { providerArgs } from '../../provider-args';
import { createHiMovies, type HiMoviesProviderInstance } from './create-himovies';

// Backward compatibility wrapper class
export class HiMovies extends MovieParser {
  private instance: HiMoviesProviderInstance;
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
    this.instance = createHiMovies(ctx, baseURL);

    this.logo = this.instance.logo;
    this.name = this.instance.name;
    this.baseUrl = this.instance.baseUrl;
    this.classPath = this.instance.classPath;
    this.supportedTypes = this.instance.supportedTypes;
    this.isNSFW = this.instance.isNSFW;
    this.isWorking = this.instance.isWorking ?? true;

    // Bind all methods to preserve proper typing
    this.search = this.instance.search;
    this.fetchRecentMovies = this.instance.fetchRecentMovies;
    this.fetchRecentTvShows = this.instance.fetchRecentTvShows;
    this.fetchTrendingMovies = this.instance.fetchTrendingMovies;
    this.fetchTrendingTvShows = this.instance.fetchTrendingTvShows;
    this.fetchByCountry = this.instance.fetchByCountry;
    this.fetchByGenre = this.instance.fetchByGenre;
    this.fetchMediaInfo = this.instance.fetchMediaInfo;
    this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
    this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
  }

  /**
   *
   * @param query search query string
   * @param page page number (default 1) (optional)
   */
  search!: HiMoviesProviderInstance['search'];
  fetchRecentMovies!: HiMoviesProviderInstance['fetchRecentMovies'];
  fetchRecentTvShows!: HiMoviesProviderInstance['fetchRecentTvShows'];
  fetchTrendingMovies!: HiMoviesProviderInstance['fetchTrendingMovies'];
  fetchTrendingTvShows!: HiMoviesProviderInstance['fetchTrendingTvShows'];
  fetchByCountry!: HiMoviesProviderInstance['fetchByCountry'];
  fetchByGenre!: HiMoviesProviderInstance['fetchByGenre'];

  /**
   *
   * @param mediaId media link or id
   */
  fetchMediaInfo!: HiMoviesProviderInstance['fetchMediaInfo'];
  /**
   *
   * @param episodeId episode id
   * @param mediaId media id
   * @param server server type (default `MegaCloud`) (optional)
   */
  fetchEpisodeSources!: HiMoviesProviderInstance['fetchEpisodeSources'];
  /**
   *
   * @param episodeId takes episode link or movie id
   * @param mediaId takes movie link or id (found on movie info object)
   */
  fetchEpisodeServers!: HiMoviesProviderInstance['fetchEpisodeServers'];
}

// (async () => {
//   const movie = new HiMovies();
//   const search = await movie.search('jujutsu');
//   const movieInfo = await movie.fetchMediaInfo(search.results[0]!.id);
//   // const recentTv = await movie.fetchTrendingTvShows();
//   const servers = await movie.fetchEpisodeServers(movieInfo.episodes![0]!.id, movieInfo.id);
//   const genre = await movie.fetchEpisodeSources(movieInfo.episodes![0]!.id, movieInfo.id);
//   // console.log(genre);
// })();

// Kept only while src/providers/meta imports the default; import { HiMovies } instead.
export default HiMovies;
