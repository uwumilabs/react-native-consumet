import { AnimeParser } from '../../../models';
import { type AnimeKaiProviderInstance } from './create-animekai';
export declare class AnimeKai extends AnimeParser {
    private instance;
    logo: string;
    constructor(customBaseURL?: string);
    get name(): string;
    get baseUrl(): string;
    set baseUrl(value: string);
    get classPath(): string;
    /**
     * @param query Search query
     * @param page Page number (optional)
     */
    search: AnimeKaiProviderInstance['search'];
    /**
     * @param page number
     */
    fetchLatestCompleted: AnimeKaiProviderInstance['fetchLatestCompleted'];
    /**
     * @param page number
     */
    fetchRecentlyAdded: AnimeKaiProviderInstance['fetchRecentlyAdded'];
    /**
     * @param page number
     */
    fetchRecentlyUpdated: AnimeKaiProviderInstance['fetchRecentlyUpdated'];
    /**
     * @param page number
     */
    fetchNewReleases: AnimeKaiProviderInstance['fetchNewReleases'];
    /**
     * @param page number
     */
    fetchMovie: AnimeKaiProviderInstance['fetchMovie'];
    /**
     * @param page number
     */
    fetchTV: AnimeKaiProviderInstance['fetchTV'];
    /**
     * @param page number
     */
    fetchOVA: AnimeKaiProviderInstance['fetchOVA'];
    /**
     * @param page number
     */
    fetchONA: AnimeKaiProviderInstance['fetchONA'];
    /**
     * @param page number
     */
    fetchSpecial: AnimeKaiProviderInstance['fetchSpecial'];
    fetchGenres: AnimeKaiProviderInstance['fetchGenres'];
    /**
     * @param page number
     */
    genreSearch: AnimeKaiProviderInstance['genreSearch'];
    /**
     * Fetches the schedule for a given date.
     * @param date The date in format 'YYYY-MM-DD'. Defaults to the current date.
     * @returns A promise that resolves to an object containing the search results.
     */
    fetchSchedule: AnimeKaiProviderInstance['fetchSchedule'];
    fetchSpotlight: AnimeKaiProviderInstance['fetchSpotlight'];
    fetchSearchSuggestions: AnimeKaiProviderInstance['fetchSearchSuggestions'];
    /**
     * @param id Anime id
     */
    fetchAnimeInfo: AnimeKaiProviderInstance['fetchAnimeInfo'];
    /**
     *
     * @param episodeId Episode id
     * @param server server type (default `MegaUp`) (optional)
     * @param subOrDub sub or dub (default `SubOrDub.SUB`) (optional)
     */
    fetchEpisodeSources: AnimeKaiProviderInstance['fetchEpisodeSources'];
    /**
     * @param episodeId Episode id
     * @param subOrDub sub or dub (default `sub`) (optional)
     */
    fetchEpisodeServers: AnimeKaiProviderInstance['fetchEpisodeServers'];
}
export default AnimeKai;
//# sourceMappingURL=animekai.d.ts.map