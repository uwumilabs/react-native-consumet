import { AnimeParser } from '../../../models';
import { createProviderContext } from '../../../utils/create-provider-context';
import createAnimeKai, { type AnimeKaiProviderInstance } from './create-animekai';

export class AnimeKai extends AnimeParser {
  private instance: AnimeKaiProviderInstance;
  override logo: string;
  override name: string;
  override baseUrl: string;
  override classPath: string;
  override isNSFW: boolean;
  override isWorking: boolean;
  override isDubAvailableSeparately: boolean;

  constructor(customBaseURL?: string) {
    super();

    const defaultContext = createProviderContext();
    this.instance = createAnimeKai(defaultContext, customBaseURL);

    this.logo = this.instance.logo;
    this.name = this.instance.name;
    this.baseUrl = this.instance.baseUrl;
    this.classPath = this.instance.classPath;
    this.isNSFW = this.instance.isNSFW ?? false;
    this.isWorking = this.instance.isWorking ?? true;
    this.isDubAvailableSeparately = this.instance.isDubAvailableSeparately ?? false;

    this.search = this.instance.search;
    this.fetchLatestCompleted = this.instance.fetchLatestCompleted;
    this.fetchRecentlyAdded = this.instance.fetchRecentlyAdded;
    this.fetchRecentlyUpdated = this.instance.fetchRecentlyUpdated;
    this.fetchNewReleases = this.instance.fetchNewReleases;
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
   * @param query Search query
   * @param page Page number (optional)
   */
  search!: AnimeKaiProviderInstance['search'];
  /**
   * @param page number
   */
  fetchLatestCompleted!: AnimeKaiProviderInstance['fetchLatestCompleted'];
  /**
   * @param page number
   */
  fetchRecentlyAdded!: AnimeKaiProviderInstance['fetchRecentlyAdded'];
  /**
   * @param page number
   */
  fetchRecentlyUpdated!: AnimeKaiProviderInstance['fetchRecentlyUpdated'];
  /**
   * @param page number
   */
  fetchNewReleases!: AnimeKaiProviderInstance['fetchNewReleases'];
  /**
   * @param page number
   */
  fetchMovie!: AnimeKaiProviderInstance['fetchMovie'];
  /**
   * @param page number
   */
  fetchTV!: AnimeKaiProviderInstance['fetchTV'];
  /**
   * @param page number
   */
  fetchOVA!: AnimeKaiProviderInstance['fetchOVA'];
  /**
   * @param page number
   */
  fetchONA!: AnimeKaiProviderInstance['fetchONA'];
  /**
   * @param page number
   */
  fetchSpecial!: AnimeKaiProviderInstance['fetchSpecial'];
  fetchGenres!: AnimeKaiProviderInstance['fetchGenres'];
  /**
   * @param page number
   */
  genreSearch!: AnimeKaiProviderInstance['genreSearch'];
  /**
   * Fetches the schedule for a given date.
   * @param date The date in format 'YYYY-MM-DD'. Defaults to the current date.
   * @returns A promise that resolves to an object containing the search results.
   */
  fetchSchedule!: AnimeKaiProviderInstance['fetchSchedule'];
  fetchSpotlight!: AnimeKaiProviderInstance['fetchSpotlight'];
  fetchSearchSuggestions!: AnimeKaiProviderInstance['fetchSearchSuggestions'];
  /**
   * @param id Anime id
   */
  fetchAnimeInfo!: AnimeKaiProviderInstance['fetchAnimeInfo'];
  /**
   *
   * @param episodeId Episode id
   * @param server server type (default `MegaUp`) (optional)
   * @param subOrDub sub or dub (default `SubOrDub.SUB`) (optional)
   */
  fetchEpisodeSources!: AnimeKaiProviderInstance['fetchEpisodeSources'];
  /**
   * @param episodeId Episode id
   * @param subOrDub sub or dub (default `sub`) (optional)
   */
  fetchEpisodeServers!: AnimeKaiProviderInstance['fetchEpisodeServers'];
}

export default AnimeKai;
