import { AnimeParser } from '../../../models';
import { type AniWatchTvProviderInstance } from './create-aniwatchtv';
export declare class AniWatchTv extends AnimeParser {
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
     * @param query Search query
     * @param page Page number (optional)
     */
    search: AniWatchTvProviderInstance['search'];
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
    fetchAdvancedSearch: AniWatchTvProviderInstance['fetchAdvancedSearch'];
    /**
     * @param page number
     */
    fetchTopAiring: AniWatchTvProviderInstance['fetchTopAiring'];
    /**
     * @param page number
     */
    fetchMostPopular: AniWatchTvProviderInstance['fetchMostPopular'];
    /**
     * @param page number
     */
    fetchMostFavorite: AniWatchTvProviderInstance['fetchMostFavorite'];
    /**
     * @param page number
     */
    fetchLatestCompleted: AniWatchTvProviderInstance['fetchLatestCompleted'];
    /**
     * @param page number
     */
    fetchRecentlyUpdated: AniWatchTvProviderInstance['fetchRecentlyUpdated'];
    /**
     * @param page number
     */
    fetchRecentlyAdded: AniWatchTvProviderInstance['fetchRecentlyAdded'];
    /**
     * @param page number
     */
    fetchTopUpcoming: AniWatchTvProviderInstance['fetchTopUpcoming'];
    /**
     * @param studio Studio id, e.g. "toei-animation"
     * @param page page number (optional) `default 1`
     */
    fetchStudio: AniWatchTvProviderInstance['fetchStudio'];
    /**
     * @param page number
     */
    fetchSubbedAnime: AniWatchTvProviderInstance['fetchSubbedAnime'];
    /**
     * @param page number
     */
    fetchDubbedAnime: AniWatchTvProviderInstance['fetchDubbedAnime'];
    /**
     * @param page number
     */
    fetchMovie: AniWatchTvProviderInstance['fetchMovie'];
    /**
     * @param page number
     */
    fetchTV: AniWatchTvProviderInstance['fetchTV'];
    /**
     * @param page number
     */
    fetchOVA: AniWatchTvProviderInstance['fetchOVA'];
    /**
     * @param page number
     */
    fetchONA: AniWatchTvProviderInstance['fetchONA'];
    /**
     * @param page number
     */
    fetchSpecial: AniWatchTvProviderInstance['fetchSpecial'];
    fetchGenres: AniWatchTvProviderInstance['fetchGenres'];
    /**
     * @param page number
     */
    genreSearch: AniWatchTvProviderInstance['genreSearch'];
    /**
     * Fetches the schedule for a given date.
     * @param date The date in format 'YYYY-MM-DD'. Defaults to the current date.
     * @returns A promise that resolves to an object containing the search results.
     */
    fetchSchedule: AniWatchTvProviderInstance['fetchSchedule'];
    fetchSpotlight: AniWatchTvProviderInstance['fetchSpotlight'];
    fetchSearchSuggestions: AniWatchTvProviderInstance['fetchSearchSuggestions'];
    /**
     * Fetches the list of episodes that the user is currently watching.
     * @param connectSid The session ID of the user. Note: This can be obtained from the browser cookies (needs to be signed in)
     * @returns A promise that resolves to an array of anime episodes.
     */
    fetchContinueWatching: AniWatchTvProviderInstance['fetchContinueWatching'];
    fetchWatchList: AniWatchTvProviderInstance['fetchWatchList'];
    /**
     * @param id Anime id
     */
    fetchAnimeInfo: AniWatchTvProviderInstance['fetchAnimeInfo'];
    /**
     *
     * @param episodeId Episode id
     * @param server server type (default `VidCloud`) (optional)
     * @param subOrDub sub or dub (default `SubOrDub.SUB`) (optional)
     */
    fetchEpisodeSources: AniWatchTvProviderInstance['fetchEpisodeSources'];
    /**
     * Method not implemented in AniWatchTv provider.
     * @param episodeId Episode id
     */
    fetchEpisodeServers: AniWatchTvProviderInstance['fetchEpisodeServers'];
}
export default AniWatchTv;
//# sourceMappingURL=aniwatchtv.d.ts.map