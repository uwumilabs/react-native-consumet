import { MovieParser } from '../../../models';
import { createProviderContext } from '../../../utils';
import { createHiMovies, type HiMoviesProviderInstance } from './create-himovies';

// Backward compatibility wrapper class
class HiMovies extends MovieParser {
  private instance: HiMoviesProviderInstance;
  override logo: string;
  override name: string;
  override baseUrl: string;
  override classPath: string;
  override supportedTypes: Set<any>;
  override isNSFW: boolean;
  override isWorking: boolean;
  constructor(customBaseURL?: string) {
    super();

    // Use the context factory to create a complete context with all defaults
    const defaultContext = createProviderContext();

    this.instance = createHiMovies(defaultContext, customBaseURL);

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

export default HiMovies;
