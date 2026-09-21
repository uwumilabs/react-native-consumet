"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AniWatchTv = exports.AniKoto = void 0;
const models_1 = require("../../../models");
const create_provider_context_1 = require("../../../utils/create-provider-context");
const create_anikoto_1 = __importDefault(require("./create-anikoto"));
class AniKoto extends models_1.AnimeParser {
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
        this.instance = (0, create_anikoto_1.default)(defaultContext, customBaseURL);
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
    search;
    /**
     * Fetch advanced anime search results with various filters
     */
    fetchAdvancedSearch;
    /**
     * Fetch top airing anime
     * @param page Page number (default: 1)
     */
    fetchTopAiring;
    /**
     * Fetch most popular anime
     * @param page Page number (default: 1)
     */
    fetchMostPopular;
    /**
     * Fetch most favorite anime
     * @param page Page number (default: 1)
     */
    fetchMostFavorite;
    /**
     * Fetch latest completed anime
     * @param page Page number (default: 1)
     */
    fetchLatestCompleted;
    /**
     * Fetch recently updated anime
     * @param page Page number (default: 1)
     */
    fetchRecentlyUpdated;
    /**
     * Fetch recently added anime
     * @param page Page number (default: 1)
     */
    fetchRecentlyAdded;
    /**
     * Fetch top upcoming anime
     * @param page Page number (default: 1)
     */
    fetchTopUpcoming;
    /**
     * Fetch anime by studio
     * @param studioId Studio slug / id
     * @param page Page number (default: 1)
     */
    fetchStudio;
    /**
     * Fetch subbed anime
     * @param page Page number (default: 1)
     */
    fetchSubbedAnime;
    /**
     * Fetch dubbed anime
     * @param page Page number (default: 1)
     */
    fetchDubbedAnime;
    /**
     * Fetch movie anime
     * @param page Page number (default: 1)
     */
    fetchMovie;
    /**
     * Fetch TV series anime
     * @param page Page number (default: 1)
     */
    fetchTV;
    /**
     * Fetch OVA anime
     * @param page Page number (default: 1)
     */
    fetchOVA;
    /**
     * Fetch ONA anime
     * @param page Page number (default: 1)
     */
    fetchONA;
    /**
     * Fetch special anime
     * @param page Page number (default: 1)
     */
    fetchSpecial;
    /**
     * Fetch genres list
     */
    fetchGenres;
    /**
     * Search anime by genre
     * @param genre Genre name / slug
     * @param page Page number (default: 1)
     */
    genreSearch;
    /**
     * Fetch anime release schedule
     * @param date Date in YYYY-MM-DD format
     */
    fetchSchedule;
    /**
     * Fetch spotlight anime from homepage
     */
    fetchSpotlight;
    /**
     * Fetch search suggestions
     * @param query Search query
     */
    fetchSearchSuggestions;
    /**
     * Fetch anime info and episode list
     * @param id Anime slug / id
     */
    fetchAnimeInfo;
    /**
     * Fetch episode video sources
     * @param episodeId Episode id
     * @param server Server type (default: MegaPlay)
     * @param subOrDub Sub or Dub (default: Sub)
     */
    fetchEpisodeSources;
    /**
     * Fetch episode servers
     * @param episodeId Episode id
     * @param subOrDub Sub or Dub (default: Sub)
     */
    fetchEpisodeServers;
}
exports.AniKoto = AniKoto;
exports.AniWatchTv = AniKoto;
exports.default = AniKoto;
//# sourceMappingURL=anikoto.js.map