"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HiMovies = void 0;
const models_1 = require("../../../models");
const provider_args_1 = require("../../provider-args");
const create_himovies_1 = require("./create-himovies");
// Backward compatibility wrapper class
class HiMovies extends models_1.MovieParser {
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
        this.instance = (0, create_himovies_1.createHiMovies)(ctx, baseURL);
        this.logo = this.instance.logo;
        this.name = this.instance.name;
        this.baseUrl = this.instance.baseUrl;
        this.classPath = this.instance.classPath;
        this.supportedTypes = this.instance.supportedTypes;
        this.isNSFW = this.instance.isNSFW;
        this.isWorking = this.instance.isWorking ?? true;
        // Bind all methods to preserve proper typing
        this.search = this.instance.search;
        this.fetchRecentMovies = this.instance.fetchRecentMovies;
        this.fetchRecentTvShows = this.instance.fetchRecentTvShows;
        this.fetchTrendingMovies = this.instance.fetchTrendingMovies;
        this.fetchTrendingTvShows = this.instance.fetchTrendingTvShows;
        this.fetchByCountry = this.instance.fetchByCountry;
        this.fetchByGenre = this.instance.fetchByGenre;
        this.fetchMediaInfo = this.instance.fetchMediaInfo;
        this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
        this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
    }
    /**
     *
     * @param query search query string
     * @param page page number (default 1) (optional)
     */
    search;
    fetchRecentMovies;
    fetchRecentTvShows;
    fetchTrendingMovies;
    fetchTrendingTvShows;
    fetchByCountry;
    fetchByGenre;
    /**
     *
     * @param mediaId media link or id
     */
    fetchMediaInfo;
    /**
     *
     * @param episodeId episode id
     * @param mediaId media id
     * @param server server type (default `MegaCloud`) (optional)
     */
    fetchEpisodeSources;
    /**
     *
     * @param episodeId takes episode link or movie id
     * @param mediaId takes movie link or id (found on movie info object)
     */
    fetchEpisodeServers;
}
exports.HiMovies = HiMovies;
// (async () => {
//   const movie = new HiMovies();
//   const search = await movie.search('jujutsu');
//   const movieInfo = await movie.fetchMediaInfo(search.results[0]!.id);
//   // const recentTv = await movie.fetchTrendingTvShows();
//   const servers = await movie.fetchEpisodeServers(movieInfo.episodes![0]!.id, movieInfo.id);
//   const genre = await movie.fetchEpisodeSources(movieInfo.episodes![0]!.id, movieInfo.id);
//   // console.log(genre);
// })();
// Kept only while src/providers/meta imports the default; import { HiMovies } instead.
exports.default = HiMovies;
//# sourceMappingURL=himovies.js.map