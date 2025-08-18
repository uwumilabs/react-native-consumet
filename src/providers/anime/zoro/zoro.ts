import { AnimeParser } from '../../../models';
import { createProviderContext } from '../../../utils/create-provider-context';
import createZoro, { type ZoroProviderInstance } from './create-zoro';

// Backward compatibility wrapper class
export class Zoro extends AnimeParser {
  private instance: ZoroProviderInstance;
  public logo: string;

  constructor(customBaseURL?: string) {
    super();

    // Use the context factory to create a complete context with all defaults
    const defaultContext = createProviderContext();

    this.instance = createZoro(defaultContext, customBaseURL);
    this.logo = this.instance.logo;

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
    this.fetchContinueWatching = this.instance.fetchContinueWatching;
    this.fetchWatchList = this.instance.fetchWatchList;
    this.fetchAnimeInfo = this.instance.fetchAnimeInfo;
    this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
    this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
  }

  // Getters for required AnimeParser properties
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
  /**
   * @param query Search query
   * @param page Page number (optional)
   */
  search!: ZoroProviderInstance['search'];
  /**
   * Fetch advanced anime search results with various filters.
   *
   * @param page Page number (default: 1)
   * @param type One of (Optional): movie, tv, ova, ona, special, music
   * @param status One of (Optional): finished_airing, currently_airing, not_yet_aired
   * @param rated One of (Optional): g, pg, pg_13, r, r_plus, rx
   * @param score Number from 1 to 10 (Optional)
   * @param season One of (Optional): spring, summer, fall, winter
   * @param language One of (Optional): sub, dub, sub_dub
   * @param startDate Start date object { year, month, day } (Optional)
   * @param endDate End date object { year, month, day } (Optional)
   * @param sort One of (Optional): recently_added, recently_updated, score, name_az, released_date, most_watched
   * @param genres Array of genres (Optional): action, adventure, cars, comedy, dementia, demons, mystery, drama, ecchi, fantasy, game, historical, horror, kids, magic, martial_arts, mecha, music, parody, samurai, romance, school, sci_fi, shoujo, shoujo_ai, shounen, shounen_ai, space, sports, super_power, vampire, harem, military, slice_of_life, supernatural, police, psychological, thriller, seinen, isekai, josei
   * @returns A Promise resolving to the search results.
   */
  fetchAdvancedSearch!: ZoroProviderInstance['fetchAdvancedSearch'];
  /**
   * @param page number
   */
  fetchTopAiring!: ZoroProviderInstance['fetchTopAiring'];
  /**
   * @param page number
   */
  fetchMostPopular!: ZoroProviderInstance['fetchMostPopular'];
  /**
   * @param page number
   */
  fetchMostFavorite!: ZoroProviderInstance['fetchMostFavorite'];
  /**
   * @param page number
   */
  fetchLatestCompleted!: ZoroProviderInstance['fetchLatestCompleted'];
  /**
   * @param page number
   */
  fetchRecentlyUpdated!: ZoroProviderInstance['fetchRecentlyUpdated'];
  /**
   * @param page number
   */
  fetchRecentlyAdded!: ZoroProviderInstance['fetchRecentlyAdded'];
  /**
   * @param page number
   */
  fetchTopUpcoming!: ZoroProviderInstance['fetchTopUpcoming'];
  /**
   * @param studio Studio id, e.g. "toei-animation"
   * @param page page number (optional) `default 1`
   */
  fetchStudio!: ZoroProviderInstance['fetchStudio'];
  /**
   * @param page number
   */
  fetchSubbedAnime!: ZoroProviderInstance['fetchSubbedAnime'];
  /**
   * @param page number
   */
  fetchDubbedAnime!: ZoroProviderInstance['fetchDubbedAnime'];
  /**
   * @param page number
   */
  fetchMovie!: ZoroProviderInstance['fetchMovie'];
  /**
   * @param page number
   */
  fetchTV!: ZoroProviderInstance['fetchTV'];
  /**
   * @param page number
   */
  fetchOVA!: ZoroProviderInstance['fetchOVA'];
  /**
   * @param page number
   */
  fetchONA!: ZoroProviderInstance['fetchONA'];
  /**
   * @param page number
   */
  fetchSpecial!: ZoroProviderInstance['fetchSpecial'];
  fetchGenres!: ZoroProviderInstance['fetchGenres'];
  /**
   * @param page number
   */
  genreSearch!: ZoroProviderInstance['genreSearch'];
  /**
   * Fetches the schedule for a given date.
   * @param date The date in format 'YYYY-MM-DD'. Defaults to the current date.
   * @returns A promise that resolves to an object containing the search results.
   */
  fetchSchedule!: ZoroProviderInstance['fetchSchedule'];
  fetchSpotlight!: ZoroProviderInstance['fetchSpotlight'];
  fetchSearchSuggestions!: ZoroProviderInstance['fetchSearchSuggestions'];
  /**
   * Fetches the list of episodes that the user is currently watching.
   * @param connectSid The session ID of the user. Note: This can be obtained from the browser cookies (needs to be signed in)
   * @returns A promise that resolves to an array of anime episodes.
   */
  fetchContinueWatching!: ZoroProviderInstance['fetchContinueWatching'];
  fetchWatchList!: ZoroProviderInstance['fetchWatchList'];
  /**
   * @param id Anime id
   */
  fetchAnimeInfo!: ZoroProviderInstance['fetchAnimeInfo'];
  /**
   *
   * @param episodeId Episode id
   * @param server server type (default `VidCloud`) (optional)
   * @param subOrDub sub or dub (default `SubOrDub.SUB`) (optional)
   */
  fetchEpisodeSources!: ZoroProviderInstance['fetchEpisodeSources'];
  /**
   * Method not implemented in Zoro provider.
   * @param episodeId Episode id
   */
  fetchEpisodeServers!: ZoroProviderInstance['fetchEpisodeServers'];
}

export default Zoro;

// (async () => {
//   const zoro = new Zoro();
//   const anime = await zoro.search('Dandadan');
//   const info = await zoro.fetchAnimeInfo('solo-leveling-season-2-arise-from-the-shadow-19413');
//   // console.log(info.episodes);
//   const sources = await zoro.fetchEpisodeSources(
//     'solo-leveling-season-2-arise-from-the-shadow-19413$episode$131394$dub',
//     // 'megacloud-hd-2',
//     undefined,
//     SubOrDub.DUB
//   );
//   // console.log(sources);
// })();
