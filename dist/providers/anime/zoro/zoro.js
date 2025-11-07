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
    constructor(customBaseURL) {
        var _a, _b, _c;
        super();
        // Use the context factory to create a complete context with all defaults
        const defaultContext = (0, create_provider_context_1.createProviderContext)();
        this.instance = (0, create_zoro_1.default)(defaultContext, customBaseURL);
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
        this.fetchContinueWatching = this.instance.fetchContinueWatching;
        this.fetchWatchList = this.instance.fetchWatchList;
        this.fetchAnimeInfo = this.instance.fetchAnimeInfo;
        this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
        this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
    }
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