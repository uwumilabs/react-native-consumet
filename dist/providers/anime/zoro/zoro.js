"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Zoro = void 0;
const models_1 = require("../../../models");
const create_provider_context_1 = require("../../../utils/create-provider-context");
const create_zoro_1 = __importDefault(require("./create-zoro"));
// Backward compatibility wrapper class
class Zoro extends models_1.AnimeParser {
    instance;
    logo;
    name;
    baseUrl;
    classPath;
    isNSFW;
    isWorking;
    isDubAvailableSeparately;
    constructor(customBaseURL) {
        super();
        // Use the context factory to create a complete context with all defaults
        const defaultContext = (0, create_provider_context_1.createProviderContext)();
        this.instance = (0, create_zoro_1.default)(defaultContext, customBaseURL);
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
        this.fetchContinueWatching = this.instance.fetchContinueWatching;
        this.fetchWatchList = this.instance.fetchWatchList;
        this.fetchAnimeInfo = this.instance.fetchAnimeInfo;
        this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
        this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
    }
    /**
     * @param query Search query
     * @param page Page number (optional)
     */
    search;
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
    fetchAdvancedSearch;
    /**
     * @param page number
     */
    fetchTopAiring;
    /**
     * @param page number
     */
    fetchMostPopular;
    /**
     * @param page number
     */
    fetchMostFavorite;
    /**
     * @param page number
     */
    fetchLatestCompleted;
    /**
     * @param page number
     */
    fetchRecentlyUpdated;
    /**
     * @param page number
     */
    fetchRecentlyAdded;
    /**
     * @param page number
     */
    fetchTopUpcoming;
    /**
     * @param studio Studio id, e.g. "toei-animation"
     * @param page page number (optional) `default 1`
     */
    fetchStudio;
    /**
     * @param page number
     */
    fetchSubbedAnime;
    /**
     * @param page number
     */
    fetchDubbedAnime;
    /**
     * @param page number
     */
    fetchMovie;
    /**
     * @param page number
     */
    fetchTV;
    /**
     * @param page number
     */
    fetchOVA;
    /**
     * @param page number
     */
    fetchONA;
    /**
     * @param page number
     */
    fetchSpecial;
    fetchGenres;
    /**
     * @param page number
     */
    genreSearch;
    /**
     * Fetches the schedule for a given date.
     * @param date The date in format 'YYYY-MM-DD'. Defaults to the current date.
     * @returns A promise that resolves to an object containing the search results.
     */
    fetchSchedule;
    fetchSpotlight;
    fetchSearchSuggestions;
    /**
     * Fetches the list of episodes that the user is currently watching.
     * @param connectSid The session ID of the user. Note: This can be obtained from the browser cookies (needs to be signed in)
     * @returns A promise that resolves to an array of anime episodes.
     */
    fetchContinueWatching;
    fetchWatchList;
    /**
     * @param id Anime id
     */
    fetchAnimeInfo;
    /**
     *
     * @param episodeId Episode id
     * @param server server type (default `VidCloud`) (optional)
     * @param subOrDub sub or dub (default `SubOrDub.SUB`) (optional)
     */
    fetchEpisodeSources;
    /**
     * Method not implemented in Zoro provider.
     * @param episodeId Episode id
     */
    fetchEpisodeServers;
}
exports.Zoro = Zoro;
exports.default = Zoro;
// (async () => {
//   // tsx ./src/providers/anime/zoro/zoro.ts
//   const zoro = new Zoro();
//   const anime = await zoro.search('Dandadan');
//   const info = await zoro.fetchAnimeInfo('solo-leveling-season-2-arise-from-the-shadow-19413');
//   // console.log(info.episodes);
//   const sources = await zoro.fetchEpisodeServers(
//     'solo-leveling-season-2-arise-from-the-shadow-19413$episode$131394',
//     // 'megacloud-hd-2',
//     // undefined,
//     SubOrDub.DUB
//   );
//   // console.log(sources);
// })();
//# sourceMappingURL=zoro.js.map