"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVegaMovies = exports.VegaMovies = void 0;
const models_1 = require("../../../models");
const utils_1 = require("../../../utils");
const create_vegamovies_1 = require("./create-vegamovies");
// Backward compatibility wrapper class
class VegaMovies extends models_1.MovieParser {
    constructor(customBaseURL) {
        var _a;
        super();
        // Use the context factory to create a complete context with all defaults
        const defaultContext = (0, utils_1.createProviderContext)();
        this.instance = (0, create_vegamovies_1.createVegaMovies)(defaultContext, customBaseURL);
        this.logo = this.instance.logo;
        this.name = this.instance.name;
        this.baseUrl = this.instance.baseUrl;
        this.classPath = this.instance.classPath;
        this.supportedTypes = this.instance.supportedTypes;
        this.isNSFW = this.instance.isNSFW;
        this.isWorking = (_a = this.instance.isWorking) !== null && _a !== void 0 ? _a : true;
        // Bind all methods to preserve proper typing
        this.search = this.instance.search;
        this.fetchMediaInfo = this.instance.fetchMediaInfo;
        this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
        this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
        this.fetchLatest = this.instance.fetchLatest;
        this.fetchRecentMovies = this.instance.fetchRecentMovies;
        this.fetchRecentTVShows = this.instance.fetchRecentTVShows;
        this.fetchByFilter = this.instance.fetchByFilter;
    }
}
exports.VegaMovies = VegaMovies;
var create_vegamovies_2 = require("./create-vegamovies");
Object.defineProperty(exports, "createVegaMovies", { enumerable: true, get: function () { return create_vegamovies_2.createVegaMovies; } });
exports.default = VegaMovies;
//# sourceMappingURL=vegamovies.js.map