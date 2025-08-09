import { AnimeParser } from '../../../models';
import { createProviderContext } from '../../../utils/create-provider-context';
import { createZoro } from './create-zoro';

// Backward compatibility wrapper class
export class Zoro extends AnimeParser {
  private instance: any;
  public logo: string;

  constructor(customBaseURL?: string) {
    super();

    // Use the context factory to create a complete context with all defaults
    const defaultContext = createProviderContext();

    this.instance = createZoro(defaultContext);
    this.logo = this.instance.logo;
    if (customBaseURL) {
      this.instance.baseUrl = customBaseURL.startsWith('http') ? customBaseURL : `http://${customBaseURL}`;
    }
  }

  // Proxy all methods to the instance
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
  fetchAdvancedSearch(...args: any[]) {
    return this.instance.fetchAdvancedSearch(...args);
  }
  fetchTopAiring(...args: any[]) {
    return this.instance.fetchTopAiring(...args);
  }
  fetchMostPopular(...args: any[]) {
    return this.instance.fetchMostPopular(...args);
  }
  fetchMostFavorite(...args: any[]) {
    return this.instance.fetchMostFavorite(...args);
  }
  fetchLatestCompleted(...args: any[]) {
    return this.instance.fetchLatestCompleted(...args);
  }
  fetchRecentlyUpdated(...args: any[]) {
    return this.instance.fetchRecentlyUpdated(...args);
  }
  fetchRecentlyAdded(...args: any[]) {
    return this.instance.fetchRecentlyAdded(...args);
  }
  fetchTopUpcoming(...args: any[]) {
    return this.instance.fetchTopUpcoming(...args);
  }
  fetchStudio(...args: any[]) {
    return this.instance.fetchStudio(...args);
  }
  fetchSubbedAnime(...args: any[]) {
    return this.instance.fetchSubbedAnime(...args);
  }
  fetchDubbedAnime(...args: any[]) {
    return this.instance.fetchDubbedAnime(...args);
  }
  fetchMovie(...args: any[]) {
    return this.instance.fetchMovie(...args);
  }
  fetchTV(...args: any[]) {
    return this.instance.fetchTV(...args);
  }
  fetchOVA(...args: any[]) {
    return this.instance.fetchOVA(...args);
  }
  fetchONA(...args: any[]) {
    return this.instance.fetchONA(...args);
  }
  fetchSpecial(...args: any[]) {
    return this.instance.fetchSpecial(...args);
  }
  fetchGenres(...args: any[]) {
    return this.instance.fetchGenres(...args);
  }
  genreSearch(...args: any[]) {
    return this.instance.genreSearch(...args);
  }
  fetchSchedule(...args: any[]) {
    return this.instance.fetchSchedule(...args);
  }
  fetchSpotlight(...args: any[]) {
    return this.instance.fetchSpotlight(...args);
  }
  fetchSearchSuggestions(...args: any[]) {
    return this.instance.fetchSearchSuggestions(...args);
  }
  fetchContinueWatching(...args: any[]) {
    return this.instance.fetchContinueWatching(...args);
  }
  fetchWatchList(...args: any[]) {
    return this.instance.fetchWatchList(...args);
  }
  fetchAnimeInfo(...args: any[]) {
    return this.instance.fetchAnimeInfo(...args);
  }
  fetchEpisodeSources(...args: any[]) {
    return this.instance.fetchEpisodeSources(...args);
  }
  fetchEpisodeServers(...args: any[]) {
    return this.instance.fetchEpisodeServers(...args);
  }
  verifyLoginState(...args: any[]) {
    return this.instance.verifyLoginState(...args);
  }
  retrieveServerId(...args: any[]) {
    return this.instance.retrieveServerId(...args);
  }
  scrapeCardPage(...args: any[]) {
    return this.instance.scrapeCardPage(...args);
  }
  scrapeCard(...args: any[]) {
    return this.instance.scrapeCard(...args);
  }
}

export default Zoro;

// (async () => {
//   const zoro = new Zoro();
//   const anime = await zoro.search('Dandadan');
//   const info = await zoro.fetchAnimeInfo('solo-leveling-season-2-arise-from-the-shadow-19413');
//   // console.log(info.episodes);
//   const sources = await zoro.fetchEpisodeSources("solo-leveling-season-2-arise-from-the-shadow-19413$episode$131394$dub", StreamingServers.VidCloud,SubOrSub.DUB);
// })();