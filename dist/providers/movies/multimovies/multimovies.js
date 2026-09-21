"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../../models");
const utils_1 = require("../../../utils");
const create_multimovies_1 = require("./create-multimovies");
// Backward compatibility wrapper class
class MultiMovies extends models_1.MovieParser {
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
        // Use the context factory to create a complete context with all defaults
        const defaultContext = (0, utils_1.createProviderContext)();
        this.instance = (0, create_multimovies_1.createMultiMovies)(defaultContext, customBaseURL);
        this.logo = this.instance.logo;
        this.name = this.instance.name;
        this.baseUrl = this.instance.baseUrl;
        this.classPath = this.instance.classPath;
        this.supportedTypes = this.instance.supportedTypes;
        this.isNSFW = this.instance.isNSFW;
        this.isWorking = this.instance.isWorking ?? true;
        // Bind all methods to preserve proper typing
        this.search = this.instance.search;
        this.fetchMediaInfo = this.instance.fetchMediaInfo;
        this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
        this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
        this.fetchPopular = this.instance.fetchPopular;
        this.fetchByGenre = this.instance.fetchByGenre;
    }
    // Expose search as an instance method (already bound in constructor)
    search;
    // Expose fetchMediaInfo
    fetchMediaInfo;
    // Expose fetchEpisodeSources
    fetchEpisodeSources;
    // Expose fetchEpisodeServers
    fetchEpisodeServers;
    // Additional public methods
    fetchPopular;
    fetchByGenre;
}
exports.default = MultiMovies;
//# sourceMappingURL=multimovies.js.map