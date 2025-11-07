"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../../models");
const create_provider_context_1 = require("../../../utils/create-provider-context");
const create_yflix_1 = require("./create-yflix");
class YFlix extends models_1.MovieParser {
    constructor(customBaseURL) {
        var _a;
        super();
        const defaultContext = (0, create_provider_context_1.createProviderContext)();
        this.instance = (0, create_yflix_1.createYFlix)(defaultContext, customBaseURL);
        this.logo = this.instance.logo;
        this.name = this.instance.name;
        this.baseUrl = this.instance.baseUrl;
        this.classPath = this.instance.classPath;
        this.supportedTypes = this.instance.supportedTypes;
        this.isNSFW = this.instance.isNSFW;
        this.isWorking = (_a = this.instance.isWorking) !== null && _a !== void 0 ? _a : true;
        this.search = this.instance.search;
        this.fetchMediaInfo = this.instance.fetchMediaInfo;
        this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
        this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
        this.fetchRecentMovies = this.instance.fetchRecentMovies;
        this.fetchRecentTvShows = this.instance.fetchRecentTvShows;
        this.fetchTrendingMovies = this.instance.fetchTrendingMovies;
        this.fetchTrendingTvShows = this.instance.fetchTrendingTvShows;
        this.fetchByCountry = this.instance.fetchByCountry;
        this.fetchByGenre = this.instance.fetchByGenre;
    }
}
exports.default = YFlix;
//# sourceMappingURL=yflix.js.map