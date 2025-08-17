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
const models_1 = require("../../models");
const NativeConsumet_1 = require("../../NativeConsumet");
class NetflixMirror extends models_1.MovieParser {
    constructor(customBaseURL) {
        super();
        this.name = 'NetflixMirror';
        this.baseUrl = 'https://a.netfree2.cc';
        this.logo = 'https://a.netfree2.cc//mobile/img/nf2/icon_x192.png';
        this.classPath = 'MOVIES.NetflixMirror';
        this.supportedTypes = new Set([models_1.TvType.MOVIE, models_1.TvType.TVSERIES]);
        this.nfCookie = 'hd=on;';
        /**
         *
         * @param query search query string
         * @param page page number (default 1) (optional)
         */
        this.search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1) {
            const searchResult = {
                currentPage: page,
                hasNextPage: false,
                results: [],
            };
            try {
                const { data } = yield axios_1.default.get(`https://netmirror.8man.me/api/net-proxy?isPrime=false&url=${this.baseUrl}/mobile/search.php?s=${encodeURI(query)}`, {
                    headers: this.Headers(),
                });
                const basicResults = data.searchResult || [];
                if (basicResults.length === 0) {
                    return searchResult;
                }
                const detailedResults = yield Promise.all(basicResults.map((item) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    try {
                        // Fetch additional details for each item
                        const detailResponse = yield axios_1.default.get(`https://netmirror.8man.me/api/net-proxy?isPrime=false&url=${this.baseUrl}/mobile/post.php?id=${item.id}`, {
                            headers: this.Headers(),
                        });
                        return {
                            id: item.id,
                            title: item.t,
                            image: `https://imgcdn.media/poster/v/${item.id}.jpg`,
                            type: detailResponse.data.type === 't' ? models_1.TvType.TVSERIES : models_1.TvType.MOVIE,
                            releaseDate: detailResponse.data.year,
                            seasons: (_b = (_a = detailResponse.data.season) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : undefined,
                        };
                    }
                    catch (error) {
                        // If we can't fetch details, just return the basic info
                        console.error(`Error fetching details for ${item.id}:`, error);
                        return {
                            id: item.id,
                            title: item.t,
                            image: `https://imgcdn.media/poster/v/${item.id}.jpg`,
                        };
                    }
                })));
                searchResult.results = detailedResults;
                return searchResult;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param mediaId media link or id
         */
        this.fetchMediaInfo = (mediaId) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const movieInfo = {
                id: mediaId,
                title: '',
            };
            try {
                const { data } = yield axios_1.default.get(`https://netmirror.8man.me/api/net-proxy?isPrime=false&url=${this.baseUrl}/mobile/post.php?id=${mediaId}`, {
                    headers: this.Headers(),
                });
                movieInfo.cover = `https://imgcdn.media/poster/h/${mediaId}.jpg`;
                movieInfo.title = data.title;
                movieInfo.image = `https://imgcdn.media/poster/v/${mediaId}.jpg`;
                movieInfo.description = (_b = (_a = data.desc) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : '';
                movieInfo.type = data.type === 't' ? models_1.TvType.TVSERIES : models_1.TvType.MOVIE;
                movieInfo.releaseDate = data.year;
                movieInfo.genres = (_d = (_c = data.genre) === null || _c === void 0 ? void 0 : _c.split(',').map((genre) => genre === null || genre === void 0 ? void 0 : genre.trim())) !== null && _d !== void 0 ? _d : [];
                movieInfo.duration = data.runtime;
                if (movieInfo.type === models_1.TvType.TVSERIES) {
                    movieInfo.episodes = yield this.fetchAllEpisodesOrdered(data.season, mediaId);
                }
                else {
                    movieInfo.episodes = [
                        {
                            id: mediaId,
                            title: data.title,
                            image: movieInfo.cover || movieInfo.image,
                        },
                    ];
                }
                return movieInfo;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param episodeId episode id
         * @param media media id
         */
        this.fetchEpisodeSources = (episodeId, mediaId //just placeholder for compatibility with tmdb
        ) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                if (!this.nfCookie) {
                    yield this.initCookie();
                }
                yield (0, NativeConsumet_1.makeGetRequestWithWebView)(`https://netfree2.cc/mobile/playlist.php?id=${episodeId}&tm=${Math.round(new Date().getTime() / 1000)}`, {
                    Cookie: this.nfCookie,
                });
                const { data } = yield axios_1.default.get(`https://netmirror.8man.me/api/net-proxy?isPrime=false&url=${this.baseUrl}/mobile/playlist.php?id=${episodeId}`, {
                    headers: this.Headers(),
                });
                const sources = {
                    sources: [],
                    subtitles: [],
                };
                (_a = data[0].sources) === null || _a === void 0 ? void 0 : _a.map((source) => {
                    var _a;
                    sources.sources.push({
                        url: `${this.baseUrl}${source.file.replace(/%3A%3Asu/g, '%3A%3Ani').replace(/::su/g, '::ni')}`,
                        quality: source.label === 'Auto' ? source.label.toLowerCase() : (_a = source.file.match(/[?&]q=([^&]+)/)) === null || _a === void 0 ? void 0 : _a[1],
                        isM3U8: source.file.includes('.m3u8'),
                    });
                });
                (_b = data[0].tracks) === null || _b === void 0 ? void 0 : _b.map((subtitle) => {
                    sources.subtitles = sources.subtitles || [];
                    sources.subtitles.push({
                        url: `https:${subtitle.file}`,
                        lang: subtitle.label,
                    });
                });
                return sources;
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
        /**
         * @deprecated method not implemented
         * @param episodeId takes episode link or movie id
         */
        this.fetchEpisodeServers = (episodeId) => __awaiter(this, void 0, void 0, function* () {
            throw new Error('Method not implemented.');
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
        this.initCookie();
    }
    initCookie() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data } = yield axios_1.default.get('https://raw.githubusercontent.com/2004durgesh/nfmirror-cookies/refs/heads/main/captured-cookies.json');
                for (const cookie of data.cookiesByDomain['.netfree2.cc']) {
                    this.nfCookie += `${cookie.name}=${cookie.value.replace('%3A%3Asu', '%3A%3Ani')};`;
                }
            }
            catch (err) {
                console.error('Failed to get cookie:', err);
            }
        });
    }
    Headers() {
        const headers = {
            'authority': 'netfree2.cc',
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'sec-ch-ua': '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'x-requested-with': 'XMLHttpRequest',
            'Referer': `${this.baseUrl}/mobile/home`,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        };
        if (this.nfCookie) {
            headers.Cookie = this.nfCookie || '';
        }
        return headers;
    }
    fetchAllEpisodesForSeason(seasonId, seriesId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            let page = 1;
            let episodes = [];
            while (true) {
                const url = `https://netfree2.cc/mobile/episodes.php?s=${seasonId}&series=${seriesId}&page=${page}`;
                const { data } = yield axios_1.default.get(url);
                if ((_a = data.episodes) === null || _a === void 0 ? void 0 : _a.length) {
                    episodes.push(...data.episodes.map((episode) => ({
                        id: episode.id,
                        title: episode.t,
                        season: parseInt(String(episode.s).replace('S', '')),
                        number: parseInt(String(episode.ep).replace('E', '')),
                        image: `https://imgcdn.media/epimg/150/${episode.id}.jpg`,
                    })));
                }
                if (data.nextPageShow !== 1)
                    break; // no more pages
                page++;
            }
            return episodes;
        });
    }
    fetchAllEpisodesOrdered(seasons, seriesId) {
        return __awaiter(this, void 0, void 0, function* () {
            const allEpisodes = [];
            for (const season of seasons.sort((a, b) => Number(a.s) - Number(b.s))) {
                const seasonEpisodes = yield this.fetchAllEpisodesForSeason(season.id, seriesId);
                allEpisodes.push(...seasonEpisodes);
            }
            return allEpisodes;
        });
    }
}
// (async () => {
//   const movie = new NetflixMirror();
//   const search = await movie.search('one');
//   // const movieInfo = await movie.fetchMediaInfo(search.results[0]?.id);
//   // const sources = await movie.fetchEpisodeSources(movieInfo.episodes![0]?.id);
//   //   const server = await movie.fetchEpisodeServers(search.results[0]?.id);
//   // const recentTv = await movie.fetchPopular();
//   // const genre = await movie.fetchByGenre('action');
//   console.log(search);
// })();
exports.default = NetflixMirror;
//# sourceMappingURL=netflixmirror.js.map