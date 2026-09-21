"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AniNeko = void 0;
const models_1 = require("../../../models");
const create_provider_context_1 = require("../../../utils/create-provider-context");
const create_anineko_1 = __importDefault(require("./create-anineko"));
class AniNeko extends models_1.AnimeParser {
    instance;
    logo;
    name;
    baseUrl;
    classPath;
    isNSFW;
    isWorking;
    isDubAvailableSeparately;
    constructor(customBaseURL) {
        super();
        const defaultContext = (0, create_provider_context_1.createProviderContext)();
        this.instance = (0, create_anineko_1.default)(defaultContext, customBaseURL);
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
    fetchRecentlyUpdated;
    fetchNewReleases;
    fetchRecentlyAdded;
    genreSearch;
}
exports.AniNeko = AniNeko;
exports.default = AniNeko;
//# sourceMappingURL=anineko.js.map