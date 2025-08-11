"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        return this.instance.fetchMediaInfo(...args);
    }
    fetchEpisodeSources(...args) {
        return this.instance.fetchEpisodeSources(...args);
    }
    fetchEpisodeServers(...args) {
        return this.instance.fetchEpisodeServers(...args);
    }
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    const movie = new HiMovies();
    const search = yield movie.search('jujutsu');
    const movieInfo = yield movie.fetchMediaInfo(search.results[0].id);
    // const recentTv = await movie.fetchTrendingTvShows();
    const servers = yield movie.fetchEpisodeServers(movieInfo.episodes[0].id, movieInfo.id);
    const genre = yield movie.fetchEpisodeSources(movieInfo.episodes[0].id, movieInfo.id, models_1.StreamingServers.UpCloud);
    console.log(genre);
}))();
exports.default = HiMovies;
//# sourceMappingURL=himovies.js.map