import { AnimeParser } from '../../../models';
import { createProviderContext } from '../../../utils/create-provider-context';
import createAniKoto, { type AniKotoProviderInstance } from './create-anikoto';

export class AniKoto extends AnimeParser {
  private instance: AniKotoProviderInstance;
  override logo: string;
  override name: string;
  override baseUrl: string;
  override classPath: string;
  override isNSFW: boolean;
  override isWorking: boolean;
  override readonly isDubAvailableSeparately: boolean;

  constructor(customBaseURL?: string) {
    super();

    // Use the context factory to create a complete context with all defaults
    const defaultContext = createProviderContext();

    this.instance = createAniKoto(defaultContext, customBaseURL);

    this.logo = this.instance.logo;
    this.name = this.instance.name;
    this.baseUrl = this.instance.baseUrl;
    this.classPath = this.instance.classPath;
    this.isNSFW = this.instance.isNSFW ?? false;
    this.isWorking = this.instance.isWorking ?? true;
    this.isDubAvailableSeparately = this.instance.isDubAvailableSeparately ?? false;

    // Bind all methods to preserve proper typing
    this.search = this.instance.search;
    this.fetchAdvancedSearch = this.instance.fetchAdvancedSearch;
    this.fetchTopAiring = this.instance.fetchTopAiring;
    this.fetchMostPopular = this.instance.fetchMostPopular;
    this.fetchMostFavorite = this.instance.fetchMostFavorite;
    this.fetchLatestCompleted = this.instance.fetchLatestCompleted;
    this.fetchRecentlyUpdated = this.instance.fetchRecentlyUpdated;
    this.fetchRecentlyAdded = this.instance.fetchRecentlyAdded;
    this.fetchTopUpcoming = this.instance.fetchTopUpcoming;
    this.fetchStudio = this.instance.fetchStudio;
    this.fetchSubbedAnime = this.instance.fetchSubbedAnime;
    this.fetchDubbedAnime = this.instance.fetchDubbedAnime;
    this.fetchMovie = this.instance.fetchMovie;
    this.fetchTV = this.instance.fetchTV;
    this.fetchOVA = this.instance.fetchOVA;
    this.fetchONA = this.instance.fetchONA;
    this.fetchSpecial = this.instance.fetchSpecial;
    this.fetchGenres = this.instance.fetchGenres;
    this.genreSearch = this.instance.genreSearch;
    this.fetchSchedule = this.instance.fetchSchedule;
    this.fetchSpotlight = this.instance.fetchSpotlight;
    this.fetchSearchSuggestions = this.instance.fetchSearchSuggestions;
    this.fetchAnimeInfo = this.instance.fetchAnimeInfo;
    this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
    this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
  }

  /**
   * Search for anime titles
   * @param query Search keyword
   * @param page Page number (default: 1)
   */
  search!: AniKotoProviderInstance['search'];

  /**
   * Fetch advanced anime search results with various filters
   */
  fetchAdvancedSearch!: AniKotoProviderInstance['fetchAdvancedSearch'];

  /**
   * Fetch top airing anime
   * @param page Page number (default: 1)
   */
  fetchTopAiring!: AniKotoProviderInstance['fetchTopAiring'];

  /**
   * Fetch most popular anime
   * @param page Page number (default: 1)
   */
  fetchMostPopular!: AniKotoProviderInstance['fetchMostPopular'];

  /**
   * Fetch most favorite anime
   * @param page Page number (default: 1)
   */
  fetchMostFavorite!: AniKotoProviderInstance['fetchMostFavorite'];

  /**
   * Fetch latest completed anime
   * @param page Page number (default: 1)
   */
  fetchLatestCompleted!: AniKotoProviderInstance['fetchLatestCompleted'];

  /**
   * Fetch recently updated anime
   * @param page Page number (default: 1)
   */
  fetchRecentlyUpdated!: AniKotoProviderInstance['fetchRecentlyUpdated'];

  /**
   * Fetch recently added anime
   * @param page Page number (default: 1)
   */
  fetchRecentlyAdded!: AniKotoProviderInstance['fetchRecentlyAdded'];

  /**
   * Fetch top upcoming anime
   * @param page Page number (default: 1)
   */
  fetchTopUpcoming!: AniKotoProviderInstance['fetchTopUpcoming'];

  /**
   * Fetch anime by studio
   * @param studioId Studio slug / id
   * @param page Page number (default: 1)
   */
  fetchStudio!: AniKotoProviderInstance['fetchStudio'];

  /**
   * Fetch subbed anime
   * @param page Page number (default: 1)
   */
  fetchSubbedAnime!: AniKotoProviderInstance['fetchSubbedAnime'];

  /**
   * Fetch dubbed anime
   * @param page Page number (default: 1)
   */
  fetchDubbedAnime!: AniKotoProviderInstance['fetchDubbedAnime'];

  /**
   * Fetch movie anime
   * @param page Page number (default: 1)
   */
  fetchMovie!: AniKotoProviderInstance['fetchMovie'];

  /**
   * Fetch TV series anime
   * @param page Page number (default: 1)
   */
  fetchTV!: AniKotoProviderInstance['fetchTV'];

  /**
   * Fetch OVA anime
   * @param page Page number (default: 1)
   */
  fetchOVA!: AniKotoProviderInstance['fetchOVA'];

  /**
   * Fetch ONA anime
   * @param page Page number (default: 1)
   */
  fetchONA!: AniKotoProviderInstance['fetchONA'];

  /**
   * Fetch special anime
   * @param page Page number (default: 1)
   */
  fetchSpecial!: AniKotoProviderInstance['fetchSpecial'];

  /**
   * Fetch genres list
   */
  fetchGenres!: AniKotoProviderInstance['fetchGenres'];

  /**
   * Search anime by genre
   * @param genre Genre name / slug
   * @param page Page number (default: 1)
   */
  genreSearch!: AniKotoProviderInstance['genreSearch'];

  /**
   * Fetch anime release schedule
   * @param date Date in YYYY-MM-DD format
   */
  fetchSchedule!: AniKotoProviderInstance['fetchSchedule'];

  /**
   * Fetch spotlight anime from homepage
   */
  fetchSpotlight!: AniKotoProviderInstance['fetchSpotlight'];

  /**
   * Fetch search suggestions
   * @param query Search query
   */
  fetchSearchSuggestions!: AniKotoProviderInstance['fetchSearchSuggestions'];

  /**
   * Fetch anime info and episode list
   * @param id Anime slug / id
   */
  fetchAnimeInfo!: AniKotoProviderInstance['fetchAnimeInfo'];

  /**
   * Fetch episode video sources
   * @param episodeId Episode id
   * @param server Server type (default: MegaPlay)
   * @param subOrDub Sub or Dub (default: Sub)
   */
  fetchEpisodeSources!: AniKotoProviderInstance['fetchEpisodeSources'];

  /**
   * Fetch episode servers
   * @param episodeId Episode id
   * @param subOrDub Sub or Dub (default: Sub)
   */
  fetchEpisodeServers!: AniKotoProviderInstance['fetchEpisodeServers'];
}

// Export AniKoto as AniWatchTv as well for backwards compatibility
export { AniKoto as AniWatchTv };
export default AniKoto;
