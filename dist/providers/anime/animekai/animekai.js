"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimeKai = void 0;
const models_1 = require("../../../models");
const create_provider_context_1 = require("../../../utils/create-provider-context");
const create_animekai_1 = __importDefault(require("./create-animekai"));
class AnimeKai extends models_1.AnimeParser {
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
        const defaultContext = (0, create_provider_context_1.createProviderContext)();
        this.instance = (0, create_animekai_1.default)(defaultContext, customBaseURL);
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
    search;
    /**
     * @param page number
     */
    fetchLatestCompleted;
    /**
     * @param page number
     */
    fetchRecentlyAdded;
    /**
     * @param page number
     */
    fetchRecentlyUpdated;
    /**
     * @param page number
     */
    fetchNewReleases;
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
     * @param id Anime id
     */
    fetchAnimeInfo;
    /**
     *
     * @param episodeId Episode id
     * @param server server type (default `MegaUp`) (optional)
     * @param subOrDub sub or dub (default `SubOrDub.SUB`) (optional)
     */
    fetchEpisodeSources;
    /**
     * @param episodeId Episode id
     * @param subOrDub sub or dub (default `sub`) (optional)
     */
    fetchEpisodeServers;
}
exports.AnimeKai = AnimeKai;
exports.default = AnimeKai;
//# sourceMappingURL=animekai.js.map