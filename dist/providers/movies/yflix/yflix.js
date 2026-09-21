"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../../models");
const create_provider_context_1 = require("../../../utils/create-provider-context");
const create_yflix_1 = require("./create-yflix");
class YFlix extends models_1.MovieParser {
    instance;
    logo;
    name;
    baseUrl;
    classPath;
    supportedTypes;
    isNSFW;
    isWorking;
    constructor(customBaseURL) {
        super();
        const defaultContext = (0, create_provider_context_1.createProviderContext)();
        this.instance = (0, create_yflix_1.createYFlix)(defaultContext, customBaseURL);
        this.logo = this.instance.logo;
        this.name = this.instance.name;
        this.baseUrl = this.instance.baseUrl;
        this.classPath = this.instance.classPath;
        this.supportedTypes = this.instance.supportedTypes;
        this.isNSFW = this.instance.isNSFW;
        this.isWorking = this.instance.isWorking ?? true;
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
    /**
     *
     * @param query search query string
     * @param page page number (default 1) (optional)
     */
    search;
    /**
     *
     * @param mediaId media link or id
     */
    fetchMediaInfo;
    /**
     *
     * @param episodeId episode id
     * @param mediaId media id
     * @param server server type (default `MegaUp`) (optional)
     */
    fetchEpisodeSources;
    /**
     *
     * @param episodeId takes episode link or movie id
     * @param mediaId takes movie link or id (found on movie info object)
     */
    fetchEpisodeServers;
    fetchRecentMovies;
    fetchRecentTvShows;
    fetchTrendingMovies;
    fetchTrendingTvShows;
    fetchByCountry;
    fetchByGenre;
}
exports.default = YFlix;
//# sourceMappingURL=yflix.js.map