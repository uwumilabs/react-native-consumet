"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimePahe = void 0;
const models_1 = require("../../../models");
const provider_args_1 = require("../../provider-args");
const create_animepahe_1 = require("./create-animepahe");
// Backward compatibility wrapper class
class AnimePahe extends models_1.AnimeParser {
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
        this.instance = (0, create_animepahe_1.createAnimePahe)(ctx, baseURL);
        this.logo = this.instance.logo;
        this.capabilities = this.instance.capabilities;
        this.name = this.instance.name;
        this.baseUrl = this.instance.baseUrl;
        this.classPath = this.instance.classPath;
        this.isNSFW = this.instance.isNSFW ?? false;
        this.isWorking = this.instance.isWorking ?? true;
        this.isDubAvailableSeparately = this.instance.isDubAvailableSeparately ?? false;
        // Bind all methods to preserve proper typing
        this.search = this.instance.search;
        this.fetchAnimeInfo = this.instance.fetchAnimeInfo;
        this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
        this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
    }
    /**
     * @param query Search query
     */
    search;
    /**
     * @param id id format id/session
     * @param episodePage Episode page number (optional) default: -1 to get all episodes. number of episode pages can be found in the anime info object
     */
    fetchAnimeInfo;
    /**
     *
     * @param episodeId Episode id
     * @param server server type (default `Kwik`) (optional)
     * @param subOrDub sub or dub (default `SubOrDub.SUB`) (optional)
     */
    fetchEpisodeSources;
    /**
     * Method not implemented in AnimePahe provider.
     * @param episodeId Episode id
     */
    fetchEpisodeServers;
}
exports.AnimePahe = AnimePahe;
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