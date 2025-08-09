"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const models_1 = require("../../../models");
const utils_1 = require("./utils");
class MultiStream extends models_1.MovieParser {
    constructor(customBaseURL) {
        super();
        this.name = 'MultiStream';
        this.baseUrl = 'https://rivestream.org';
        this.apiUrl = 'https://api.themoviedb.org/3';
        this.apiKey = '5201b54eb0968700e693a30576d7d4dc';
        this.logo = 'https://himovies.sx/images/group_1/theme_1/favicon.png';
        this.classPath = 'MOVIES.MultiStream';
        this.supportedTypes = new Set([models_1.TvType.MOVIE, models_1.TvType.TVSERIES]);
        /**
         *
         * @param query search query string
         * @param page page number (default 1) (optional)
         */
        this.search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1) {
            const searchUrl = `${this.apiUrl}/search/multi?api_key=${this.apiKey}&language=en-US&page=${page}&include_adult=false&query=${query}`;
            const search = {
                currentPage: page,
                hasNextPage: false,
                results: [],
            };
            try {
                const { data } = yield axios_1.default.get(searchUrl);
                if (data.results.length < 1)
                    return search;
                search.hasNextPage = page + 1 <= data.total_pages;
                search.currentPage = page;
                search.totalResults = data.total_results;
                search.totalPages = data.total_pages;
                const moviePromises = data.results.map((result) => __awaiter(this, void 0, void 0, function* () {
                    const date = new Date((result === null || result === void 0 ? void 0 : result.release_date) || (result === null || result === void 0 ? void 0 : result.first_air_date));
                    let totalSeasons;
                    if (result.media_type === 'tv') {
                        try {
                            const { data: tvData } = yield axios_1.default.get(`${this.apiUrl}/tv/${result.id}?api_key=${this.apiKey}&language=en-US`);
                            totalSeasons = tvData.number_of_seasons;
                        }
                        catch (err) {
                            // Continue without seasons data if request fails
                        }
                    }
                    const movie = {
                        id: `${result.id}$${result.media_type}`,
                        title: (result === null || result === void 0 ? void 0 : result.title) || (result === null || result === void 0 ? void 0 : result.name),
                        image: `https://image.tmdb.org/t/p/original${result === null || result === void 0 ? void 0 : result.poster_path}`,
                        type: result.media_type === 'movie' ? models_1.TvType.MOVIE : models_1.TvType.TVSERIES,
                        rating: (result === null || result === void 0 ? void 0 : result.vote_average) || 0,
                        releaseDate: `${date.getFullYear()}` || '0',
                        seasons: totalSeasons,
                    };
                    return movie;
                }));
                search.results = yield Promise.all(moviePromises);
                return search;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param mediaId - The media identifier (TMDB ID with type, e.g., "1071585$movie")
         */
        this.fetchMediaInfo = (mediaId) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const movieInfo = {
                id: mediaId,
                title: '',
            };
            const parts = mediaId.split('$');
            const type = parts[1];
            mediaId = parts[0];
            const infoUrl = `${this.apiUrl}/${type}/${parts[0]}?api_key=${this.apiKey}&language=en-US&append_to_response=release_dates,images,recommendations,credits,videos`;
            try {
                const { data } = yield axios_1.default.get(infoUrl);
                movieInfo.title = (data === null || data === void 0 ? void 0 : data.title) || (data === null || data === void 0 ? void 0 : data.name);
                movieInfo.image = `https://image.tmdb.org/t/p/original${data === null || data === void 0 ? void 0 : data.poster_path}`;
                movieInfo.cover = `https://image.tmdb.org/t/p/original${data === null || data === void 0 ? void 0 : data.backdrop_path}`;
                movieInfo.type = type === 'movie' ? models_1.TvType.MOVIE : models_1.TvType.TVSERIES;
                movieInfo.rating = (data === null || data === void 0 ? void 0 : data.vote_average) || 0;
                movieInfo.releaseDate = (data === null || data === void 0 ? void 0 : data.release_date) || (data === null || data === void 0 ? void 0 : data.first_air_date);
                movieInfo.description = data === null || data === void 0 ? void 0 : data.overview;
                movieInfo.genres = data === null || data === void 0 ? void 0 : data.genres.map((genre) => genre.name);
                movieInfo.duration = (data === null || data === void 0 ? void 0 : data.runtime) || (data === null || data === void 0 ? void 0 : data.episode_run_time[0]);
                movieInfo.totalEpisodes = data === null || data === void 0 ? void 0 : data.number_of_episodes;
                movieInfo.totalSeasons = data === null || data === void 0 ? void 0 : data.number_of_seasons;
                movieInfo.characters = (_a = data === null || data === void 0 ? void 0 : data.credits) === null || _a === void 0 ? void 0 : _a.cast.map((cast) => ({
                    id: cast.id,
                    name: cast.name,
                    url: `https://www.themoviedb.org/person/${cast.id}`,
                    character: cast.character,
                    image: `https://image.tmdb.org/t/p/original${cast.profile_path}`,
                }));
                movieInfo.trailer = {
                    id: (_c = (_b = data === null || data === void 0 ? void 0 : data.videos) === null || _b === void 0 ? void 0 : _b.results[0]) === null || _c === void 0 ? void 0 : _c.key,
                    site: (_e = (_d = data === null || data === void 0 ? void 0 : data.videos) === null || _d === void 0 ? void 0 : _d.results[0]) === null || _e === void 0 ? void 0 : _e.site,
                    url: `https://www.youtube.com/watch?v=${(_g = (_f = data === null || data === void 0 ? void 0 : data.videos) === null || _f === void 0 ? void 0 : _f.results[0]) === null || _g === void 0 ? void 0 : _g.key}`,
                };
                movieInfo.recommendations =
                    ((_j = (_h = data === null || data === void 0 ? void 0 : data.recommendations) === null || _h === void 0 ? void 0 : _h.results) === null || _j === void 0 ? void 0 : _j.length) <= 0
                        ? undefined
                        : (_k = data === null || data === void 0 ? void 0 : data.recommendations) === null || _k === void 0 ? void 0 : _k.results.map((result) => {
                            return {
                                id: result.id,
                                title: result.title || result.name,
                                image: `https://image.tmdb.org/t/p/original${result.poster_path}`,
                                type: type === 'movie' ? models_1.TvType.MOVIE : models_1.TvType.TVSERIES,
                                rating: result.vote_average || 0,
                                releaseDate: result.release_date || result.first_air_date,
                            };
                        });
                if (movieInfo.type === models_1.TvType.TVSERIES) {
                    movieInfo.episodes = [];
                    for (let i = 1; i <= (data === null || data === void 0 ? void 0 : data.number_of_seasons); i++) {
                        const { data } = yield axios_1.default.get(`${this.apiUrl}/tv/${mediaId}/season/${i}?api_key=${this.apiKey}`);
                        data.episodes.map((item) => {
                            var _a;
                            const episode = {
                                id: `${mediaId}$tv$${item.episode_number}$${item.season_number}$${item.id}`,
                                //first part is mediaId, second is episode number, third is season number, fourth is episode id(to avoid conflicts just in case)
                                title: item.name,
                                number: item.episode_number,
                                season: item.season_number || i,
                                description: item.overview,
                                image: `https://image.tmdb.org/t/p/original${item.still_path}`,
                            };
                            (_a = movieInfo.episodes) === null || _a === void 0 ? void 0 : _a.push(episode);
                        });
                    }
                }
                else {
                    movieInfo.episodes = [
                        {
                            id: `${mediaId}$movie`,
                            title: movieInfo.title,
                            description: movieInfo.description,
                            image: movieInfo.image,
                            number: 1,
                        },
                    ];
                }
                return movieInfo;
            }
            catch (err) {
                console.log(err);
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param episodeId episode id
         * @param mediaId media id
         * @param server server type (defaults to the first from `fetchEpisodeServers`) (optional)
         */
        this.fetchEpisodeSources = (episodeId, mediaId, server) => __awaiter(this, void 0, void 0, function* () {
            const firstServer = (yield this.fetchEpisodeServers(episodeId, mediaId))[0].name;
            return yield (0, utils_1.getMultiSources)(episodeId, server ? server : firstServer);
        });
        /**
         *
         * @param episodeId takes episode link or movie id
         * @param mediaId takes movie link or id (found on movie movieInfo object)
         */
        this.fetchEpisodeServers = (episodeId, mediaId) => __awaiter(this, void 0, void 0, function* () {
            try {
                const servers = yield (0, utils_1.getMultiServers)(episodeId);
                return servers;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        if (customBaseURL) {
            if (customBaseURL.startsWith('http://') || customBaseURL.startsWith('https://')) {
                this.baseUrl = customBaseURL;
            }
            else {
                this.baseUrl = `http://${customBaseURL}`;
            }
        }
        else {
            this.baseUrl = this.baseUrl;
        }
    }
}
// (async () => {
//   const movie = new MultiStream();
//   const search = await movie.search('jujutsu');
//   const movieInfo = await movie.fetchMediaInfo(search.results[0].id);
//   // const recentTv = await movie.fetchTrendingTvShows();
//   const servers = await movie.fetchEpisodeServers(movieInfo.episodes![0].id, movieInfo.id);
//   console.log(servers);
//   const genre = await movie.fetchEpisodeSources(
//     movieInfo.episodes![0].id,
//     movieInfo.id,
//     servers[0].name as StreamingServers
//   );
//   console.log(genre);
// })();
exports.default = MultiStream;
//# sourceMappingURL=index.js.map