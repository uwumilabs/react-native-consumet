"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimeSuge = void 0;
const models_1 = require("../../../models");
const create_provider_context_1 = require("../../../utils/create-provider-context");
const create_animesuge_1 = __importDefault(require("./create-animesuge"));
// Backward compatibility wrapper class
class AnimeSuge extends models_1.AnimeParser {
    instance;
    logo;
    constructor(customBaseURL) {
        super();
        // Use the context factory to create a complete context with all defaults
        const defaultContext = (0, create_provider_context_1.createProviderContext)();
        this.instance = (0, create_animesuge_1.default)(defaultContext, customBaseURL);
        this.logo = this.instance.logo;
        // Bind all methods to preserve proper typing
        this.search = this.instance.search;
        this.fetchAnimeInfo = this.instance.fetchAnimeInfo;
        this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
        this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
    }
    // Getters for required AnimeParser properties
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
    /**
     * @param query Search query
     * @param page Page number (optional)
     */
    search;
    /**
     * @param id Anime id
     */
    fetchAnimeInfo;
    /**
     *
     * @param episodeId Episode id
     * @param server server type (default `VidCloud`) (optional)
     * @param subOrDub sub or dub (default `SubOrDub.SUB`) (optional)
     */
    fetchEpisodeSources;
    /**
     * Method not implemented in AnimeSuge provider.
     * @param episodeId Episode id
     */
    fetchEpisodeServers;
}
exports.AnimeSuge = AnimeSuge;
exports.default = AnimeSuge;
(async () => {
    // tsx ./src/providers/anime/animesuge/animesuge.ts
    const animesuge = new AnimeSuge();
    const anime = await animesuge.search('Dandadan');
    //   const info = await animesuge.fetchAnimeInfo('solo-leveling-season-2-arise-from-the-shadow-19413');
    //   // console.log(info.episodes);
    //   const sources = await animesuge.fetchEpisodeServers(
    //     'solo-leveling-season-2-arise-from-the-shadow-19413$episode$131394',
    //     // 'megacloud-hd-2',
    //     // undefined,
    //     SubOrDub.DUB
    //   );
    console.log(anime);
})();
//# sourceMappingURL=animesuge.js.map