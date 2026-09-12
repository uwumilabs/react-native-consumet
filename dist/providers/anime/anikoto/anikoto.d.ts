import { AnimeParser } from '../../../models';
import { type AniKotoProviderInstance } from './create-anikoto';
export declare class AniKoto extends AnimeParser {
    private instance;
    logo: string;
    name: string;
    baseUrl: string;
    classPath: string;
    isNSFW: boolean;
    isWorking: boolean;
    readonly isDubAvailableSeparately: boolean;
    constructor(customBaseURL?: string);
    /**
     * Search for anime titles
     * @param query Search keyword
     * @param page Page number (default: 1)
     */
    search: AniKotoProviderInstance['search'];
    /**
     * Fetch advanced anime search results with various filters
     */
    fetchAdvancedSearch: AniKotoProviderInstance['fetchAdvancedSearch'];
    /**
     * Fetch top airing anime
     * @param page Page number (default: 1)
     */
    fetchTopAiring: AniKotoProviderInstance['fetchTopAiring'];
    /**
     * Fetch most popular anime
     * @param page Page number (default: 1)
     */
    fetchMostPopular: AniKotoProviderInstance['fetchMostPopular'];
    /**
     * Fetch most favorite anime
     * @param page Page number (default: 1)
     */
    fetchMostFavorite: AniKotoProviderInstance['fetchMostFavorite'];
    /**
     * Fetch latest completed anime
     * @param page Page number (default: 1)
     */
    fetchLatestCompleted: AniKotoProviderInstance['fetchLatestCompleted'];
    /**
     * Fetch recently updated anime
     * @param page Page number (default: 1)
     */
    fetchRecentlyUpdated: AniKotoProviderInstance['fetchRecentlyUpdated'];
    /**
     * Fetch recently added anime
     * @param page Page number (default: 1)
     */
    fetchRecentlyAdded: AniKotoProviderInstance['fetchRecentlyAdded'];
    /**
     * Fetch top upcoming anime
     * @param page Page number (default: 1)
     */
    fetchTopUpcoming: AniKotoProviderInstance['fetchTopUpcoming'];
    /**
     * Fetch anime by studio
     * @param studioId Studio slug / id
     * @param page Page number (default: 1)
     */
    fetchStudio: AniKotoProviderInstance['fetchStudio'];
    /**
     * Fetch subbed anime
     * @param page Page number (default: 1)
     */
    fetchSubbedAnime: AniKotoProviderInstance['fetchSubbedAnime'];
    /**
     * Fetch dubbed anime
     * @param page Page number (default: 1)
     */
    fetchDubbedAnime: AniKotoProviderInstance['fetchDubbedAnime'];
    /**
     * Fetch movie anime
     * @param page Page number (default: 1)
     */
    fetchMovie: AniKotoProviderInstance['fetchMovie'];
    /**
     * Fetch TV series anime
     * @param page Page number (default: 1)
     */
    fetchTV: AniKotoProviderInstance['fetchTV'];
    /**
     * Fetch OVA anime
     * @param page Page number (default: 1)
     */
    fetchOVA: AniKotoProviderInstance['fetchOVA'];
    /**
     * Fetch ONA anime
     * @param page Page number (default: 1)
     */
    fetchONA: AniKotoProviderInstance['fetchONA'];
    /**
     * Fetch special anime
     * @param page Page number (default: 1)
     */
    fetchSpecial: AniKotoProviderInstance['fetchSpecial'];
    /**
     * Fetch genres list
     */
    fetchGenres: AniKotoProviderInstance['fetchGenres'];
    /**
     * Search anime by genre
     * @param genre Genre name / slug
     * @param page Page number (default: 1)
     */
    genreSearch: AniKotoProviderInstance['genreSearch'];
    /**
     * Fetch anime release schedule
     * @param date Date in YYYY-MM-DD format
     */
    fetchSchedule: AniKotoProviderInstance['fetchSchedule'];
    /**
     * Fetch spotlight anime from homepage
     */
    fetchSpotlight: AniKotoProviderInstance['fetchSpotlight'];
    /**
     * Fetch search suggestions
     * @param query Search query
     */
    fetchSearchSuggestions: AniKotoProviderInstance['fetchSearchSuggestions'];
    /**
     * Fetch anime info and episode list
     * @param id Anime slug / id
     */
    fetchAnimeInfo: AniKotoProviderInstance['fetchAnimeInfo'];
    /**
     * Fetch episode video sources
     * @param episodeId Episode id
     * @param server Server type (default: MegaPlay)
     * @param subOrDub Sub or Dub (default: Sub)
     */
    fetchEpisodeSources: AniKotoProviderInstance['fetchEpisodeSources'];
    /**
     * Fetch episode servers
     * @param episodeId Episode id
     * @param subOrDub Sub or Dub (default: Sub)
     */
    fetchEpisodeServers: AniKotoProviderInstance['fetchEpisodeServers'];
}
export { AniKoto as AniWatchTv };
export default AniKoto;
//# sourceMappingURL=anikoto.d.ts.map