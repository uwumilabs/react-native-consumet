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
        this.instance = (0, create_himovies_1.createHiMovies)(defaultContext);
        this.logo = this.instance.logo;
        if (customBaseURL) {
            this.instance.baseUrl = customBaseURL.startsWith('http') ? customBaseURL : `http://${customBaseURL}`;
        }
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
    search(...args) {
        return this.instance.search(...args);
    }
    fetchRecentMovies() {
        return this.instance.fetchRecentMovies();
    }
    fetchRecentTvShows() {
        return this.instance.fetchRecentTvShows();
    }
    fetchTrendingMovies() {
        return this.instance.fetchTrendingMovies();
    }
    fetchTrendingTvShows() {
        return this.instance.fetchTrendingTvShows();
    }
    fetchByCountry(...args) {
        return this.instance.fetchByCountry(...args);
    }
    fetchByGenre(...args) {
        return this.instance.fetchByGenre(...args);
    }
    fetchMediaInfo(...args) {
        return this.instance.fetchAnimeInfo(...args);
    }
    fetchEpisodeSources(...args) {
        return this.instance.fetchEpisodeSources(...args);
    }
    fetchEpisodeServers(...args) {
        return this.instance.fetchEpisodeServers(...args);
    }
}
// (async () => {
//   const movie = new HiMovies();
//   const search = await movie.search('jujutsu');
//   const movieInfo = await movie.fetchMediaInfo(search.results[0].id);
//   // const recentTv = await movie.fetchTrendingTvShows();
//   const genre = await movie.fetchEpisodeSources(movieInfo.episodes![0].id, movieInfo.id);
//   console.log(genre);
// })();
exports.default = HiMovies;
//# sourceMappingURL=himovies.js.map