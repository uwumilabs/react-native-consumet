"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimePahe = void 0;
const models_1 = require("../../../models");
const create_provider_context_1 = require("../../../utils/create-provider-context");
const create_animepahe_1 = __importDefault(require("./create-animepahe"));
// Backward compatibility wrapper class
class AnimePahe extends models_1.AnimeParser {
    constructor(customBaseURL) {
        var _a, _b, _c;
        super();
        // Use the context factory to create a complete context with all defaults
        const defaultContext = (0, create_provider_context_1.createProviderContext)();
        this.instance = (0, create_animepahe_1.default)(defaultContext, customBaseURL);
        this.logo = this.instance.logo;
        this.name = this.instance.name;
        this.baseUrl = this.instance.baseUrl;
        this.classPath = this.instance.classPath;
        this.isNSFW = (_a = this.instance.isNSFW) !== null && _a !== void 0 ? _a : false;
        this.isWorking = (_b = this.instance.isWorking) !== null && _b !== void 0 ? _b : true;
        this.isDubAvailableSeparately = (_c = this.instance.isDubAvailableSeparately) !== null && _c !== void 0 ? _c : false;
        // Bind all methods to preserve proper typing
        this.search = this.instance.search;
        this.fetchAnimeInfo = this.instance.fetchAnimeInfo;
        this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
        this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
    }
}
exports.AnimePahe = AnimePahe;
exports.default = AnimePahe;
// (async () => {
//   const pahe = new AnimePahe();
//   const anime = await pahe.search('Dandadan');
//   const info = await pahe.fetchAnimeInfo(anime.results[0]!.id);
//   console.log(info.episodes);
//   const sources = await pahe.fetchEpisodeSources(
//     'solo-leveling-season-2-arise-from-the-shadow-19413$episode$131394$dub',
//     // 'megacloud-hd-2',
//     undefined,
//     SubOrDub.DUB
//   );
//   // console.log(sources);
// })();
//# sourceMappingURL=animepahe.js.map