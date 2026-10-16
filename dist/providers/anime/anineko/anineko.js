"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AniNeko = void 0;
const models_1 = require("../../../models");
const provider_args_1 = require("../../provider-args");
const create_anineko_1 = require("./create-anineko");
class AniNeko extends models_1.AnimeParser {
    instance;
    logo;
    name;
    baseUrl;
    classPath;
    isNSFW;
    isWorking;
    isDubAvailableSeparately;
    constructor(ctxOrBaseURL, customBaseURL) {
        super();
        const [ctx, baseURL] = (0, provider_args_1.providerArgs)(ctxOrBaseURL, customBaseURL);
        this.instance = (0, create_anineko_1.createAniNeko)(ctx, baseURL);
        this.logo = this.instance.logo;
        this.capabilities = this.instance.capabilities;
        this.name = this.instance.name;
        this.baseUrl = this.instance.baseUrl;
        this.classPath = this.instance.classPath;
        this.isNSFW = this.instance.isNSFW ?? false;
        this.isWorking = this.instance.isWorking ?? true;
        this.isDubAvailableSeparately = this.instance.isDubAvailableSeparately ?? false;
        this.search = this.instance.search;
        this.fetchAnimeInfo = this.instance.fetchAnimeInfo;
        this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
        this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
        this.fetchRecentlyUpdated = this.instance.fetchRecentlyUpdated;
        this.fetchNewReleases = this.instance.fetchNewReleases;
        this.fetchRecentlyAdded = this.instance.fetchRecentlyAdded;
        this.genreSearch = this.instance.genreSearch;
    }
    search;
    fetchAnimeInfo;
    fetchEpisodeServers;
    fetchEpisodeSources;
    fetchRecentlyUpdated;
    fetchNewReleases;
    fetchRecentlyAdded;
    genreSearch;
}
exports.AniNeko = AniNeko;
//# sourceMappingURL=anineko.js.map