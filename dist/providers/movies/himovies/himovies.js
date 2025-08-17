"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../../models");
const utils_1 = require("../../../utils");
const create_himovies_1 = require("./create-himovies");
// Backward compatibility wrapper class
class HiMovies extends models_1.MovieParser {
    constructor(customBaseURL) {
        super();
        // Use the context factory to create a complete context with all defaults
        const defaultContext = (0, utils_1.createProviderContext)();
        this.instance = (0, create_himovies_1.createHiMovies)(defaultContext, customBaseURL);
        this.logo = this.instance.logo;
        // Bind all methods to preserve proper typing
        this.search = this.instance.search;
        this.fetchRecentMovies = this.instance.fetchRecentMovies;
        this.fetchRecentTvShows = this.instance.fetchRecentTvShows;
        this.fetchTrendingMovies = this.instance.fetchTrendingMovies;
        this.fetchTrendingTvShows = this.instance.fetchTrendingTvShows;
        this.fetchByCountry = this.instance.fetchByCountry;
        this.fetchByGenre = this.instance.fetchByGenre;
        this.fetchMediaInfo = this.instance.fetchMediaInfo;
        this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
        this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
    }
    // Proxy all methods to the instance
    get supportedTypes() {
        return this.instance.supportedTypes;
    }
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
// (async () => {
//   const movie = new HiMovies();
//   const search = await movie.search('jujutsu');
//   const movieInfo = await movie.fetchMediaInfo(search.results[0]!.id);
//   // const recentTv = await movie.fetchTrendingTvShows();
//   const servers = await movie.fetchEpisodeServers(movieInfo.episodes![0]!.id, movieInfo.id);
//   const genre = await movie.fetchEpisodeSources(movieInfo.episodes![0]!.id, movieInfo.id);
//   // console.log(genre);
// })();
exports.default = HiMovies;
//# sourceMappingURL=himovies.js.map