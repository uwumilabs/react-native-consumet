"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Zoro = void 0;
const models_1 = require("../../../models");
const create_provider_context_1 = require("../../../utils/create-provider-context");
const create_zoro_1 = require("./create-zoro");
// Backward compatibility wrapper class
class Zoro extends models_1.AnimeParser {
    constructor(customBaseURL) {
        super();
        // Use the context factory to create a complete context with all defaults
        const defaultContext = (0, create_provider_context_1.createProviderContext)();
        this.instance = (0, create_zoro_1.createZoro)(defaultContext, customBaseURL);
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
    set baseUrl(value) {
        this.instance.baseUrl = value;
    }
    get classPath() {
        return this.instance.classPath;
    }
}
exports.Zoro = Zoro;
exports.default = Zoro;
// (async () => {
//   const zoro = new Zoro();
//   const anime = await zoro.search('Dandadan');
//   const info = await zoro.fetchAnimeInfo('solo-leveling-season-2-arise-from-the-shadow-19413');
//   // console.log(info.episodes);
//   const sources = await zoro.fetchEpisodeSources("solo-leveling-season-2-arise-from-the-shadow-19413$episode$131394$dub", StreamingServers.VidCloud,SubOrSub.DUB);
// })();
//# sourceMappingURL=zoro.js.map