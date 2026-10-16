"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReAnime = void 0;
const models_1 = require("../../../models");
const provider_args_1 = require("../../provider-args");
const create_reanime_1 = require("./create-reanime");
class ReAnime extends models_1.AnimeParser {
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
        this.instance = (0, create_reanime_1.createReanime)(ctx, baseURL);
        this.logo = this.instance.logo;
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
    }
    search;
    fetchAnimeInfo;
    fetchEpisodeServers;
    fetchEpisodeSources;
}
exports.ReAnime = ReAnime;
//# sourceMappingURL=reanime.js.map