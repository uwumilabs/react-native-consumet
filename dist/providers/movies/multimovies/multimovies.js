"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiMovies = void 0;
const models_1 = require("../../../models");
const provider_args_1 = require("../../provider-args");
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
    constructor(ctxOrBaseURL, customBaseURL) {
        super();
        const [ctx, baseURL] = (0, provider_args_1.providerArgs)(ctxOrBaseURL, customBaseURL);
        this.instance = (0, create_multimovies_1.createMultiMovies)(ctx, baseURL);
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
exports.MultiMovies = MultiMovies;
//# sourceMappingURL=multimovies.js.map