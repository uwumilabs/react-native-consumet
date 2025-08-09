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
const cheerio_1 = require("cheerio");
const models_1 = require("../../models");
const extractors_1 = require("../../extractors");
const utils_1 = require("../../utils");
class MultiMovies extends models_1.MovieParser {
    constructor(customBaseURL) {
        super();
        this.name = 'MultiMovies';
        this.baseUrl = 'https://multimovies.asia';
        this.logo = 'https://multimovies.asia/wp-content/uploads/2024/01/cropped-CompressJPEG.online_512x512_image.png';
        this.classPath = 'MOVIES.MultiMovies';
        this.supportedTypes = new Set([models_1.TvType.MOVIE, models_1.TvType.TVSERIES]);
        this.proxiedBaseUrl = 'https://m3u8proxy.durgeshdwivedi81.workers.dev/v2?url=' + encodeURIComponent(this.baseUrl);
        this.customProxyUrl = 'https://m3u8proxy.durgeshdwivedi81.workers.dev/v2?url=';
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
                let url;
                if (page === 1) {
                    url = `${this.proxiedBaseUrl}/?s=${query.replace(/[\W_]+/g, '+')}`;
                }
                else {
                    url = `${this.proxiedBaseUrl}/page/${page}/?s=${query.replace(/[\W_]+/g, '+')}`;
                }
                const { data } = yield axios_1.default.get(url);
                const $ = (0, cheerio_1.load)(data);
                const navSelector = 'div.pagination';
                searchResult.hasNextPage = $(navSelector).find('#nextpagination').length > 0;
                const articles = $('.search-page .result-item article').toArray();
                yield Promise.all(articles.map((el) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c, _d, _e;
                    const seasonSet = new Set();
                    const href = (_b = (_a = $(el)
                        .find('.thumbnail a')
                        .attr('href')) === null || _a === void 0 ? void 0 : _a.replace(/^https?:\/\/[^/]+\//, '').replace(/^\/|\/$/g, '')) !== null && _b !== void 0 ? _b : '';
                    const episodesInfo = yield this.fetchMediaInfo(href);
                    const episodes = (episodesInfo === null || episodesInfo === void 0 ? void 0 : episodesInfo.episodes) || [];
                    for (const episode of episodes) {
                        if (episode.season !== null) {
                            seasonSet.add(episode.season);
                        }
                    }
                    searchResult.results.push({
                        id: href,
                        title: $(el).find('.details .title a').text().trim(),
                        url: (_c = $(el).find('.thumbnail a').attr('href')) !== null && _c !== void 0 ? _c : '',
                        image: (_d = $(el).find('.thumbnail img').attr('src')) !== null && _d !== void 0 ? _d : '',
                        rating: parseFloat($(el).find('.meta .rating').text().replace('IMDb ', '')) || 0,
                        releaseDate: $(el).find('.meta .year').text().trim(),
                        season: seasonSet.size,
                        description: $(el).find('.contenido p').text().trim(),
                        type: ((_e = $(el).find('.thumbnail a').attr('href')) === null || _e === void 0 ? void 0 : _e.includes('/movies/')) ? models_1.TvType.MOVIE : models_1.TvType.TVSERIES,
                    });
                })));
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
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            if (!mediaId.startsWith(this.proxiedBaseUrl)) {
                mediaId = `${this.proxiedBaseUrl}/${mediaId}`;
            }
            // Extract the clean media ID from the proxied URL
            let cleanId = mediaId;
            if (mediaId.includes('?url=')) {
                // If it's a proxied URL, extract the original URL and then get the path
                const originalUrl = decodeURIComponent(mediaId.split('?url=')[1]);
                cleanId = originalUrl.replace(/^https?:\/\/[^/]+\//, '').replace(/^\/|\/$/g, '');
            }
            else {
                // If it's not proxied, clean it normally
                cleanId = mediaId.replace(/^https?:\/\/[^/]+\//, '').replace(/^\/|\/$/g, '');
            }
            const movieInfo = {
                id: cleanId,
                title: '',
                url: mediaId,
            };
            try {
                const { data } = yield axios_1.default.get(mediaId);
                const $ = (0, cheerio_1.load)(data);
                const recommendationsArray = [];
                $('div#single_relacionados  article').each((i, el) => {
                    var _a, _b, _c, _d;
                    recommendationsArray.push({
                        id: (_a = $(el)
                            .find('a')
                            .attr('href')) === null || _a === void 0 ? void 0 : _a.replace(/^https?:\/\/[^/]+\//, '').replace(/^\/|\/$/g, ''),
                        title: $(el).find('a img').attr('alt'),
                        image: (_b = $(el).find('a img').attr('data-src')) !== null && _b !== void 0 ? _b : $(el).find('a img').attr('src'),
                        type: ((_c = $(el).find('.thumbnail a').attr('href')) === null || _c === void 0 ? void 0 : _c.includes('/movies/'))
                            ? models_1.TvType.TVSERIES
                            : ((_d = models_1.TvType.MOVIE) !== null && _d !== void 0 ? _d : null),
                    });
                });
                movieInfo.cover = (_b = (_a = $('div#info .galeria').first().find('.g-item a').attr('href')) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : '';
                movieInfo.title = $('.sheader > .data > h1').text();
                movieInfo.image = (_c = $('.sheader > .poster > img').attr('src')) !== null && _c !== void 0 ? _c : $('.sheader > .poster > img').attr('data-src');
                movieInfo.description = $('div#info div[itemprop="description"] p').text();
                movieInfo.type = movieInfo.id.split('/')[0] === 'tvshows' ? models_1.TvType.TVSERIES : models_1.TvType.MOVIE;
                movieInfo.releaseDate = $('.sheader > .data > .extra > span.date').text().trim();
                movieInfo.trailer = {
                    id: (_f = (_e = (_d = $('div#trailer .embed  iframe').attr('data-litespeed-src')) === null || _d === void 0 ? void 0 : _d.split('embed/')[1]) === null || _e === void 0 ? void 0 : _e.split('?')[0]) !== null && _f !== void 0 ? _f : (_h = (_g = $('div#trailer .embed  iframe').attr('src')) === null || _g === void 0 ? void 0 : _g.split('embed/')[1]) === null || _h === void 0 ? void 0 : _h.split('?')[0],
                    url: (_j = $('div#trailer .embed iframe').attr('data-litespeed-src')) !== null && _j !== void 0 ? _j : $('div#trailer .embed iframe').attr('src'),
                };
                movieInfo.genres = $('.sgeneros a')
                    .map((i, el) => $(el).text())
                    .get()
                    .map((v) => v.trim());
                movieInfo.characters = [];
                $('div#cast .persons .person').each((i, el) => {
                    var _a;
                    const url = $(el).find('.img > a').attr('href');
                    const image = (_a = $(el).find('.img > a > img').attr('data-src')) !== null && _a !== void 0 ? _a : $(el).find('.img > a > img').attr('src');
                    const name = $(el).find('.data > .name > a').text();
                    const character = $(el).find('.data > .caracter').text();
                    movieInfo.characters.push({
                        url,
                        image,
                        name,
                        character,
                    });
                });
                movieInfo.country = $('.sheader > .data > .extra > span.country').text();
                movieInfo.duration = $('.sheader > .data > .extra > span.runtime').text();
                movieInfo.rating = parseFloat($('.starstruck-rating span.dt_rating_vgs[itemprop="ratingValue"]').text());
                movieInfo.recommendations = recommendationsArray;
                if (movieInfo.type === models_1.TvType.TVSERIES) {
                    movieInfo.episodes = [];
                    $('#seasons .se-c').each((i, el) => {
                        const seasonNumber = parseInt($(el).find('.se-t').text().trim());
                        $(el)
                            .find('.episodios li')
                            .each((j, ep) => {
                            var _a, _b, _c, _d, _e, _f, _g;
                            const episode = {
                                id: (_a = $(ep)
                                    .find('.episodiotitle a')
                                    .attr('href')) === null || _a === void 0 ? void 0 : _a.replace(/^https?:\/\/[^/]+\//, '').replace(/^\/|\/$/g, ''),
                                season: seasonNumber,
                                number: parseInt($(ep).find('.numerando').text().trim().split('-')[1]),
                                title: $(ep).find('.episodiotitle a').text().trim(),
                                url: (_c = (_b = $(ep).find('.episodiotitle a').attr('href')) === null || _b === void 0 ? void 0 : _b.trim()) !== null && _c !== void 0 ? _c : '',
                                releaseDate: String(new Date($(ep).find('.episodiotitle .date').text().trim()).getFullYear()),
                                image: (_e = (_d = $(ep).find('.imagen img').attr('data-src')) === null || _d === void 0 ? void 0 : _d.trim()) !== null && _e !== void 0 ? _e : (_f = $(ep).find('.imagen img').attr('src')) === null || _f === void 0 ? void 0 : _f.trim(),
                            };
                            (_g = movieInfo.episodes) === null || _g === void 0 ? void 0 : _g.push(episode);
                        });
                    });
                }
                else {
                    movieInfo.episodes = [
                        {
                            id: movieInfo.id,
                            title: movieInfo.title,
                            url: movieInfo.url,
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
         * @param server server type (default `StreamWish`) (optional)
         */
        this.fetchEpisodeSources = (episodeId_1, mediaId_1, ...args_1) => __awaiter(this, [episodeId_1, mediaId_1, ...args_1], void 0, function* (episodeId, mediaId, //just placeholder for compatibility with tmdb
        server = models_1.StreamingServers.StreamWish, fileId) {
            if (episodeId.startsWith('http')) {
                const serverUrl = new URL(episodeId);
                switch (server) {
                    case models_1.StreamingServers.MixDrop:
                        return {
                            headers: { Referer: serverUrl.href },
                            sources: yield new extractors_1.MixDrop().extract(serverUrl),
                            download: fileId ? `https://gdmirrorbot.nl/file/${fileId}` : '',
                        };
                    case models_1.StreamingServers.StreamWish:
                        return Object.assign(Object.assign({ headers: { Referer: serverUrl.href } }, (yield new extractors_1.StreamWish().extract(serverUrl, this.baseUrl))), { download: fileId ? `${serverUrl.href.toString().replace('/e/', '/f/')}/${fileId}` : '' });
                    case models_1.StreamingServers.StreamTape:
                        return {
                            headers: { Referer: serverUrl.href },
                            sources: yield new extractors_1.StreamTape().extract(serverUrl),
                            download: fileId ? `https://gdmirrorbot.nl/file/${fileId}` : '',
                        };
                    case models_1.StreamingServers.VidHide:
                        return {
                            headers: { Referer: serverUrl.href },
                            sources: yield new extractors_1.VidHide().extract(serverUrl),
                            download: fileId ? `https://gdmirrorbot.nl/file/${fileId}` : '',
                        };
                    default:
                        return Object.assign(Object.assign({ headers: { Referer: serverUrl.href } }, (yield new extractors_1.StreamWish().extract(serverUrl))), { download: fileId ? `https://gdmirrorbot.nl/file/${fileId}` : '' });
                }
            }
            try {
                const servers = yield this.fetchEpisodeServers(episodeId);
                const i = servers.findIndex((s) => s.name.toLowerCase() === server.toLowerCase());
                if (i === -1) {
                    throw new Error(`Server ${server} not found`);
                }
                const serverUrl = new URL(servers[i].url);
                let extractedFileId = '';
                if (!episodeId.startsWith('http')) {
                    const { fileId: id } = yield this.getServer(`${this.baseUrl}/${episodeId}`);
                    extractedFileId = id !== null && id !== void 0 ? id : '';
                }
                // extractedFileId to be used for download link
                return yield this.fetchEpisodeSources(serverUrl.href, mediaId, server, extractedFileId);
            }
            catch (err) {
                console.log(err);
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param episodeId takes episode link or movie id
         */
        this.fetchEpisodeServers = (episodeId) => __awaiter(this, void 0, void 0, function* () {
            if (!episodeId.startsWith(this.baseUrl)) {
                episodeId = `${this.baseUrl}/${episodeId}`;
            }
            try {
                const { servers } = yield this.getServer(episodeId);
                return servers;
            }
            catch (err) {
                console.log(err);
                throw new Error(err.message);
            }
        });
        this.fetchPopular = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
            const result = {
                currentPage: page,
                hasNextPage: false,
                results: [],
            };
            try {
                const { data } = yield axios_1.default.get(`${this.proxiedBaseUrl}/trending/page/${page}/`);
                const $ = (0, cheerio_1.load)(data);
                const navSelector = 'div.pagination';
                result.hasNextPage = $(navSelector).find('#nextpagination').length > 0;
                $('.items > article')
                    .each((i, el) => {
                    var _a, _b, _c, _d, _e;
                    const resultItem = {
                        id: $(el).attr('id'),
                        title: (_a = $(el).find('div.data > h3').text()) !== null && _a !== void 0 ? _a : '',
                        url: $(el).find('div.poster > a').attr('href'),
                        image: (_b = $(el).find('div.poster > img').attr('data-src')) !== null && _b !== void 0 ? _b : '',
                        type: ((_c = $(el).find('div.poster > a').attr('href')) === null || _c === void 0 ? void 0 : _c.includes('/movies/')) ? models_1.TvType.MOVIE : models_1.TvType.TVSERIES,
                        rating: (_d = $(el).find('div.poster > div.rating').text()) !== null && _d !== void 0 ? _d : '',
                        releaseDate: (_e = $(el).find('div.data > span').text()) !== null && _e !== void 0 ? _e : '',
                    };
                    result.results.push(resultItem);
                })
                    .get();
                return result;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        this.fetchByGenre = (genre_1, ...args_1) => __awaiter(this, [genre_1, ...args_1], void 0, function* (genre, page = 1) {
            const result = {
                currentPage: page,
                hasNextPage: false,
                results: [],
            };
            try {
                const { data } = yield axios_1.default.get(`${this.proxiedBaseUrl}/genre/${genre}/page/${page}`);
                const $ = (0, cheerio_1.load)(data);
                const navSelector = 'div.pagination';
                result.hasNextPage = $(navSelector).find('#nextpagination').length > 0;
                $('.items > article')
                    .each((i, el) => {
                    var _a, _b, _c, _d, _e;
                    const resultItem = {
                        id: $(el).attr('id'),
                        title: (_a = $(el).find('div.data > h3').text()) !== null && _a !== void 0 ? _a : '',
                        url: $(el).find('div.poster > a').attr('href'),
                        image: (_b = $(el).find('div.poster > img').attr('data-src')) !== null && _b !== void 0 ? _b : '',
                        type: ((_c = $(el).find('div.poster > a').attr('href')) === null || _c === void 0 ? void 0 : _c.includes('/movies/')) ? models_1.TvType.MOVIE : models_1.TvType.TVSERIES,
                        rating: (_d = $(el).find('div.poster > div.rating').text()) !== null && _d !== void 0 ? _d : '',
                        releaseDate: (_e = $(el).find('div.data > span').text()) !== null && _e !== void 0 ? _e : '',
                    };
                    result.results.push(resultItem);
                })
                    .get();
                return result;
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
    getServer(url) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            console.log(`Fetching server for URL: ${url}`);
            try {
                console.log('step1');
                const { data } = yield axios_1.default.get(this.customProxyUrl + url);
                const $ = (0, cheerio_1.load)(data);
                console.log('step2');
                // Extract player config
                const playerConfig = {
                    postId: $('#player-option-1').attr('data-post'),
                    nume: $('#player-option-1').attr('data-nume'),
                    type: $('#player-option-1').attr('data-type'),
                };
                if (!playerConfig.postId || !playerConfig.nume || !playerConfig.type) {
                    throw new Error('Missing player configuration');
                }
                const formData = new FormData();
                formData.append('action', 'doo_player_ajax');
                formData.append('post', playerConfig.postId);
                formData.append('nume', playerConfig.nume);
                formData.append('type', playerConfig.type);
                const headers = {
                    'User-Agent': utils_1.USER_AGENT,
                };
                console.log(`${this.baseUrl}/wp-admin/admin-ajax.php`, formData);
                const response = yield fetch(this.customProxyUrl + `${this.baseUrl}/wp-admin/admin-ajax.php`, {
                    method: 'POST',
                    headers: headers,
                    body: formData,
                });
                const playerRes = yield response.json();
                // console.log('playerRes', playerRes);
                const iframeUrl = ((_b = (_a = playerRes === null || playerRes === void 0 ? void 0 : playerRes.embed_url) === null || _a === void 0 ? void 0 : _a.match(/<iframe[^>]+src="([^"]+)"[^>]*>/i)) === null || _b === void 0 ? void 0 : _b[1]) || (playerRes === null || playerRes === void 0 ? void 0 : playerRes.embed_url);
                // Handle non-multimovies case
                if (!iframeUrl.includes('multimovies')) {
                    if (iframeUrl.includes('dhcplay')) {
                        return {
                            servers: [{ name: 'StreamWish', url: iframeUrl }],
                            fileId: (_c = iframeUrl.split('/').pop()) !== null && _c !== void 0 ? _c : '',
                        };
                    }
                    let playerBaseUrl = iframeUrl.split('/').slice(0, 3).join('/');
                    const redirectResponse = yield axios_1.default.head(playerBaseUrl, {
                        headers,
                    });
                    // Update base URL if redirect occurred
                    if (redirectResponse) {
                        playerBaseUrl = (_e = (_d = redirectResponse.request) === null || _d === void 0 ? void 0 : _d.responseURL) === null || _e === void 0 ? void 0 : _e.split('/').slice(0, 3).join('/');
                    }
                    const fileId = iframeUrl.split('/').pop();
                    if (!fileId) {
                        throw new Error('No player ID found');
                    }
                    const streamRequestData = new FormData();
                    streamRequestData.append('sid', fileId);
                    const streamResponse = yield fetch(`${playerBaseUrl}/embedhelper.php`, {
                        headers: headers,
                        body: streamRequestData,
                        method: 'POST',
                    });
                    const streamResponseData = yield streamResponse.json();
                    if (!streamResponseData) {
                        throw new Error('No stream data found');
                    }
                    const streamDetails = streamResponseData;
                    const mresultKeys = new Set(Object.keys(JSON.parse(atob(streamDetails.mresult))));
                    const siteUrlsKeys = new Set(Object.keys(streamDetails.siteUrls));
                    // Find common keys
                    const commonKeys = [...mresultKeys].filter((key) => siteUrlsKeys.has(key));
                    // Convert to a Set (if needed)
                    const commonStreamSites = new Set(commonKeys);
                    const servers = Array.from(commonStreamSites).map((site) => {
                        return {
                            name: streamDetails.siteFriendlyNames[site] === 'StreamHG'
                                ? 'StreamWish'
                                : streamDetails.siteFriendlyNames[site] === 'EarnVids'
                                    ? 'VidHide'
                                    : streamDetails.siteFriendlyNames[site],
                            url: streamDetails.siteUrls[site] + JSON.parse(atob(streamDetails.mresult))[site],
                        };
                    });
                    return { servers, fileId };
                }
                else {
                    return {
                        servers: [{ name: 'StreamWish', url: iframeUrl }],
                        fileId: (_f = iframeUrl.split('/').pop()) !== null && _f !== void 0 ? _f : '',
                    };
                }
            }
            catch (err) {
                console.log(err);
                throw new Error(err.message);
            }
        });
    }
}
// (async () => {
//   const movie = new MultiMovies();
//   const search = await movie.search('jujutsu');
//   const movieInfo = await movie.fetchEpisodeSources('movies/pushpa-2-the-rule/');
//   const server = await movie.fetchEpisodeServers('movies/pushpa-2-the-rule/');
//   // const recentTv = await movie.fetchPopular();
//   // const genre = await movie.fetchByGenre('action');
//   console.log(search);
// })();
exports.default = MultiMovies;
//# sourceMappingURL=multimovies.js.map