import { MovieParser } from '../../../models';
import { createProviderContext } from '../../../utils';
import { createHiMovies } from './create-himovies';

// Backward compatibility wrapper class
class HiMovies extends MovieParser {
  private instance: any;
  public logo: string;
  constructor(customBaseURL?: string) {
    super();

    // Use the context factory to create a complete context with all defaults
    const defaultContext = createProviderContext();

    this.instance = createHiMovies(defaultContext);
    this.logo = this.instance.logo;
    if (customBaseURL) {
      this.instance.baseUrl = customBaseURL.startsWith('http') ? customBaseURL : `http://${customBaseURL}`;
    }
  }

  // Proxy all methods to the instance
  get supportedTypes() {
    return this.instance.supportedTypes;
  }
  get name() {
    return this.instance.name;
  }
  get baseUrl() {
    return this.instance.baseUrl;
  }
  set baseUrl(value: string) {
    this.instance.baseUrl = value;
  }
  get classPath() {
    return this.instance.classPath;
  }

  search(...args: any[]) {
    return this.instance.search(...args);
  }
  fetchRecentMovies() {
    return this.instance.fetchRecentMovies();
  }
  fetchRecentTvShows() {
    return this.instance.fetchRecentTvShows();
  }
  fetchTrendingMovies() {
    return this.instance.fetchTrendingMovies();
  }
  fetchTrendingTvShows() {
    return this.instance.fetchTrendingTvShows();
  }
  fetchByCountry(...args: any[]) {
    return this.instance.fetchByCountry(...args);
  }
  fetchByGenre(...args: any[]) {
    return this.instance.fetchByGenre(...args);
  }
  fetchMediaInfo(...args: any[]) {
    return this.instance.fetchAnimeInfo(...args);
  }
  fetchEpisodeSources(...args: any[]) {
    return this.instance.fetchEpisodeSources(...args);
  }
  fetchEpisodeServers(...args: any[]) {
    return this.instance.fetchEpisodeServers(...args);
  }
}

// (async () => {
//   const movie = new HiMovies();
//   const search = await movie.search('jujutsu');
//   const movieInfo = await movie.fetchMediaInfo(search.results[0].id);
//   // const recentTv = await movie.fetchTrendingTvShows();
//   const genre = await movie.fetchEpisodeSources(movieInfo.episodes![0].id, movieInfo.id);
//   console.log(genre);
// })();

export default HiMovies;
