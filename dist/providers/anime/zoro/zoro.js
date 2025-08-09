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
    }
    // Proxy all methods to the instance
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
    search(...args) {
        return this.instance.search(...args);
    }
    fetchAdvancedSearch(...args) {
        return this.instance.fetchAdvancedSearch(...args);
    }
    fetchTopAiring(...args) {
        return this.instance.fetchTopAiring(...args);
    }
    fetchMostPopular(...args) {
        return this.instance.fetchMostPopular(...args);
    }
    fetchMostFavorite(...args) {
        return this.instance.fetchMostFavorite(...args);
    }
    fetchLatestCompleted(...args) {
        return this.instance.fetchLatestCompleted(...args);
    }
    fetchRecentlyUpdated(...args) {
        return this.instance.fetchRecentlyUpdated(...args);
    }
    fetchRecentlyAdded(...args) {
        return this.instance.fetchRecentlyAdded(...args);
    }
    fetchTopUpcoming(...args) {
        return this.instance.fetchTopUpcoming(...args);
    }
    fetchStudio(...args) {
        return this.instance.fetchStudio(...args);
    }
    fetchSubbedAnime(...args) {
        return this.instance.fetchSubbedAnime(...args);
    }
    fetchDubbedAnime(...args) {
        return this.instance.fetchDubbedAnime(...args);
    }
    fetchMovie(...args) {
        return this.instance.fetchMovie(...args);
    }
    fetchTV(...args) {
        return this.instance.fetchTV(...args);
    }
    fetchOVA(...args) {
        return this.instance.fetchOVA(...args);
    }
    fetchONA(...args) {
        return this.instance.fetchONA(...args);
    }
    fetchSpecial(...args) {
        return this.instance.fetchSpecial(...args);
    }
    fetchGenres(...args) {
        return this.instance.fetchGenres(...args);
    }
    genreSearch(...args) {
        return this.instance.genreSearch(...args);
    }
    fetchSchedule(...args) {
        return this.instance.fetchSchedule(...args);
    }
    fetchSpotlight(...args) {
        return this.instance.fetchSpotlight(...args);
    }
    fetchSearchSuggestions(...args) {
        return this.instance.fetchSearchSuggestions(...args);
    }
    fetchContinueWatching(...args) {
        return this.instance.fetchContinueWatching(...args);
    }
    fetchWatchList(...args) {
        return this.instance.fetchWatchList(...args);
    }
    fetchAnimeInfo(...args) {
        return this.instance.fetchAnimeInfo(...args);
    }
    fetchEpisodeSources(...args) {
        return this.instance.fetchEpisodeSources(...args);
    }
    fetchEpisodeServers(...args) {
        return this.instance.fetchEpisodeServers(...args);
    }
    verifyLoginState(...args) {
        return this.instance.verifyLoginState(...args);
    }
    retrieveServerId(...args) {
        return this.instance.retrieveServerId(...args);
    }
    scrapeCardPage(...args) {
        return this.instance.scrapeCardPage(...args);
    }
    scrapeCard(...args) {
        return this.instance.scrapeCard(...args);
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