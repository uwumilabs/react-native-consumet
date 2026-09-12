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
    constructor(customBaseURL) {
        var _a, _b, _c;
        super();
        // Use the context factory to create a complete context with all defaults
        const defaultContext = (0, create_provider_context_1.createProviderContext)();
        this.instance = (0, create_anikoto_1.default)(defaultContext, customBaseURL);
        this.logo = this.instance.logo;
        this.name = this.instance.name;
        this.baseUrl = this.instance.baseUrl;
        this.classPath = this.instance.classPath;
        this.isNSFW = (_a = this.instance.isNSFW) !== null && _a !== void 0 ? _a : false;
        this.isWorking = (_b = this.instance.isWorking) !== null && _b !== void 0 ? _b : true;
        this.isDubAvailableSeparately = (_c = this.instance.isDubAvailableSeparately) !== null && _c !== void 0 ? _c : false;
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
}
exports.AniKoto = AniKoto;
exports.AniWatchTv = AniKoto;
exports.default = AniKoto;
//# sourceMappingURL=anikoto.js.map