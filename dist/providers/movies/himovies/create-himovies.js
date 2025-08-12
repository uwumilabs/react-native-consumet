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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHiMovies = createHiMovies;
function createHiMovies(ctx, customBaseURL) {
    const { load, extractors, enums, axios, createCustomBaseUrl, URL } = ctx;
    const { MegaCloud } = extractors;
    const { StreamingServers: StreamingServersEnum, TvType: TvTypeEnum } = enums;
    const baseUrl = createCustomBaseUrl('https://himovies.sx', customBaseURL);
    const config = {
        name: 'HiMovies',
        languages: 'all',
        classPath: 'MOVIES.HiMovies',
        logo: 'https://himovies.sx/images/group_1/theme_1/favicon.png',
        baseUrl,
        isNSFW: false,
        isWorking: true,
    };
    const supportedTypes = new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);
    /**
     * Search for movies/TV shows
     * @param query search query string
     * @param page page number (default 1) (optional)
     */
    const search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1) {
        const searchResult = {
            currentPage: page,
            hasNextPage: false,
            results: [],
        };
        try {
            const { data } = yield axios.get(`${config.baseUrl}/search/${query.replace(/[\W_]+/g, '-')}?page=${page}`);
            const $ = load(data);
            const navSelector = 'div.pre-pagination > nav:nth-child(1) > ul:nth-child(1)';
            searchResult.hasNextPage =
                $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass('active') : false;
            const initialResults = [];
            $('.film_list-wrap > div.flw-item').each((i, el) => {
                var _a;
                const releaseDate = $(el).find('div.film-detail > div.fd-infor > span:nth-child(1)').text();
                initialResults.push({
                    id: (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1),
                    title: $(el).find('div.film-detail > h2 > a').attr('title'),
                    url: `${config.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                    image: $(el).find('div.film-poster > img').attr('data-src'),
                    releaseDate: isNaN(parseInt(releaseDate)) ? undefined : releaseDate,
                    seasons: releaseDate.includes('SS') ? parseInt(releaseDate.split('SS')[1]) : undefined,
                    type: $(el).find('div.film-detail > div.fd-infor > span.float-right').text() === 'Movie'
                        ? TvTypeEnum.MOVIE
                        : TvTypeEnum.TVSERIES,
                });
            });
            // Fetch media info for all results in parallel
            const mediaInfoPromises = initialResults.map((result) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const mediaInfo = yield fetchMediaInfo(result.id);
                    if (mediaInfo.releaseDate) {
                        const year = new Date(mediaInfo.releaseDate).getFullYear();
                        result.releaseDate = year.toString();
                    }
                    return result;
                }
                catch (err) {
                    // Return original result if fetchMediaInfo fails
                    return result;
                }
            }));
            searchResult.results = yield Promise.all(mediaInfoPromises);
            return searchResult;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    /**
     * Fetch media info
     * @param mediaId media link or id
     */
    const fetchMediaInfo = (mediaId) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!mediaId.startsWith(config.baseUrl)) {
            mediaId = `${config.baseUrl}/${mediaId}`;
        }
        const movieInfo = {
            id: mediaId.split('sx/').pop(),
            title: '',
            url: mediaId,
        };
        try {
            const { data } = yield axios.get(mediaId);
            const $ = load(data);
            const recommendationsArray = [];
            $('section.block_area > div.block_area-content > div.film_list-wrap > div.flw-item').each((i, el) => {
                var _a, _b, _c;
                recommendationsArray.push({
                    id: (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1),
                    title: $(el).find('div.film-detail > h3.film-name > a').text(),
                    image: $(el).find('div.film-poster > img').attr('data-src'),
                    duration: (_b = $(el).find('div.film-detail > div.fd-infor > span.fdi-duration').text().replace('m', '')) !== null && _b !== void 0 ? _b : null,
                    type: $(el).find('div.film-detail > div.fd-infor > span.fdi-type').text() === 'TV'
                        ? TvTypeEnum.TVSERIES
                        : ((_c = TvTypeEnum.MOVIE) !== null && _c !== void 0 ? _c : null),
                });
            });
            const uid = $('.detail_page-watch').attr('data-id');
            movieInfo.cover = (_a = $('div.cover_follow').attr('style')) === null || _a === void 0 ? void 0 : _a.slice(22).replace(')', '').replace(';', '');
            movieInfo.title = $('.heading-name > a:nth-child(1)').text();
            movieInfo.image = $('.film-poster > img:nth-child(1)').attr('src');
            movieInfo.description = $('.description').text().trim();
            movieInfo.type = movieInfo.id.includes('tv/') ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE;
            movieInfo.releaseDate = $('div.row-line:contains(Released:)').text().replace('Released:', '').trim();
            movieInfo.genres = $('div.row-line:contains(Genre:) a')
                .map((i, el) => $(el).text().split('&'))
                .get()
                .map((v) => v.trim());
            movieInfo.casts = $('.row-line:contains(Casts:) a')
                .map((i, el) => $(el).text())
                .get();
            movieInfo.production = $('.row-line:contains(Production:) a').text().trim();
            movieInfo.country = $('.row-line:contains(Country:) a').text().trim();
            movieInfo.duration = $('.row-line:contains(Duration:)')
                .text()
                .replace('Duration:', '')
                .replace(/\s+/g, ' ')
                .trim();
            movieInfo.rating = parseFloat($('.dp-i-stats > span.item:nth-child(3)').text().replace('IMDB:', '').trim());
            movieInfo.recommendations = recommendationsArray;
            const ajaxReqUrl = (id, type, isSeasons = false) => `${config.baseUrl}/ajax/${type === 'movie' ? type : ``}${isSeasons ? 'season/list' : 'season/episodes'}/${id}`;
            if (movieInfo.type === TvTypeEnum.TVSERIES) {
                const { data } = yield axios.get(ajaxReqUrl(uid, 'tv', true));
                const $$ = load(data);
                const seasonsIds = $$('.dropdown-menu > a')
                    .map((i, el) => $(el).attr('data-id'))
                    .get();
                movieInfo.episodes = [];
                let season = 1;
                for (const id of seasonsIds) {
                    const { data } = yield axios.get(ajaxReqUrl(id, 'season'));
                    const $$$ = load(data);
                    $$$('.nav > li')
                        .map((i, el) => {
                        var _a;
                        const episode = {
                            id: $$$(el).find('a').attr('id').split('-')[1],
                            title: $$$(el).find('a').attr('title'),
                            number: parseInt($$$(el).find('a').attr('title').split(':')[0].slice(3).trim()),
                            season: season,
                            url: `${config.baseUrl}/ajax/episode/servers/${$$$(el).find('a').attr('id').split('-')[1]}`,
                        };
                        (_a = movieInfo.episodes) === null || _a === void 0 ? void 0 : _a.push(episode);
                    })
                        .get();
                    season++;
                }
            }
            else {
                movieInfo.episodes = [
                    {
                        id: uid,
                        title: movieInfo.title,
                        url: `${config.baseUrl}/ajax/episode/list/${uid}`,
                    },
                ];
            }
            return movieInfo;
        }
        catch (err) {
            //console.log(err);
            throw new Error(err.message);
        }
    });
    /**
     * Fetch episode sources
     * @param episodeId episode id
     * @param mediaId media id
     * @param server server type (default `MegaCloud`) (optional)
     */
    const fetchEpisodeSources = (episodeId_1, mediaId_1, ...args_1) => __awaiter(this, [episodeId_1, mediaId_1, ...args_1], void 0, function* (episodeId, mediaId, server = StreamingServersEnum.MegaCloud) {
        if (episodeId.startsWith('http')) {
            const serverUrl = new URL(episodeId);
            switch (server) {
                case StreamingServersEnum.MegaCloud:
                    return Object.assign({ headers: { Referer: serverUrl.href } }, (yield MegaCloud().extract(serverUrl, config.baseUrl)));
                case StreamingServersEnum.UpCloud:
                    return Object.assign({ headers: { Referer: serverUrl.href } }, (yield MegaCloud().extract(serverUrl, config.baseUrl)));
                default:
                    return Object.assign({ headers: { Referer: serverUrl.href } }, (yield MegaCloud().extract(serverUrl, config.baseUrl)));
            }
        }
        try {
            const servers = yield fetchEpisodeServers(episodeId, mediaId);
            const i = servers.findIndex((s) => s.name === server);
            if (i === -1) {
                throw new Error(`Server ${server} not found`);
            }
            const { data } = yield axios.get(`${config.baseUrl}/ajax/episode/sources/${servers[i].url.split('.').slice(-1).shift()}`);
            const serverUrl = new URL(data.link);
            return yield fetchEpisodeSources(serverUrl.href, mediaId, server);
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    /**
     * Fetch episode servers
     * @param episodeId takes episode link or movie id
     * @param mediaId takes movie link or id (found on movie info object)
     */
    const fetchEpisodeServers = (episodeId, mediaId) => __awaiter(this, void 0, void 0, function* () {
        if (!episodeId.startsWith(config.baseUrl + '/ajax') && !mediaId.includes('movie')) {
            episodeId = `${config.baseUrl}/ajax/episode/servers/${episodeId}`;
        }
        else {
            episodeId = `${config.baseUrl}/ajax/episode/list/${episodeId}`;
        }
        try {
            const { data } = yield axios.get(episodeId);
            const $ = load(data);
            const servers = $('ul.nav > li')
                .map((i, el) => {
                const server = {
                    name: $(el).find('a').attr('title').slice(6).toLowerCase().replace('server', '').trim(),
                    url: `${config.baseUrl}/${mediaId}.${$(el).find('a').attr('data-id')}`.replace(!mediaId.includes('movie') ? /\/tv\// : /\/movie\//, !mediaId.includes('movie') ? '/watch-tv/' : '/watch-movie/'),
                };
                return server;
            })
                .get();
            return servers;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    const fetchRecentMovies = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield axios.get(`${config.baseUrl}/home`);
            const $ = load(data);
            const movies = $('section.block_area:contains("Latest Movies") > div:nth-child(2) > div:nth-child(1) > div.flw-item')
                .map((i, el) => {
                var _a;
                const releaseDate = $(el).find('div.film-detail > div.fd-infor > span:nth-child(1)').text();
                const movie = {
                    id: (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1),
                    title: $(el).find('div.film-detail > h3.film-name > a').attr('title'),
                    url: `${config.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                    image: $(el).find('div.film-poster > img').attr('data-src'),
                    releaseDate: isNaN(parseInt(releaseDate)) ? undefined : releaseDate,
                    duration: $(el).find('div.film-detail > div.fd-infor > span.fdi-duration').text() || null,
                    type: $(el).find('div.film-detail > div.fd-infor > span.float-right').text() === 'Movie'
                        ? TvTypeEnum.MOVIE
                        : TvTypeEnum.TVSERIES,
                };
                return movie;
            })
                .get();
            return movies;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    const fetchRecentTvShows = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield axios.get(`${config.baseUrl}/home`);
            const $ = load(data);
            const tvshows = $('section.block_area:contains("Latest TV Shows") > div:nth-child(2) > div:nth-child(1) > div.flw-item')
                .map((i, el) => {
                var _a;
                const tvshow = {
                    id: (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1),
                    title: $(el).find('div.film-detail > h3.film-name > a').attr('title'),
                    url: `${config.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                    image: $(el).find('div.film-poster > img').attr('data-src'),
                    season: $(el).find('div.film-detail > div.fd-infor > span:nth-child(1)').text().replace('SS', '').trim(),
                    latestEpisode: $(el).find('div.film-detail > div.fd-infor > span:nth-child(3)').text().replace('EPS', '').trim() || null,
                    type: $(el).find('div.film-detail > div.fd-infor > span.float-right').text() === 'Movie'
                        ? TvTypeEnum.MOVIE
                        : TvTypeEnum.TVSERIES,
                };
                return tvshow;
            })
                .get();
            return tvshows;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    const fetchTrendingMovies = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield axios.get(`${config.baseUrl}/home`);
            const $ = load(data);
            const movies = $('div#trending-movies div.film_list-wrap div.flw-item')
                .map((i, el) => {
                var _a;
                const releaseDate = $(el).find('div.film-detail > div.fd-infor > span:nth-child(1)').text();
                const movie = {
                    id: (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1),
                    title: $(el).find('div.film-detail > h3.film-name > a').attr('title'),
                    url: `${config.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                    image: $(el).find('div.film-poster > img').attr('data-src'),
                    releaseDate: isNaN(parseInt(releaseDate)) ? undefined : releaseDate,
                    duration: $(el).find('div.film-detail > div.fd-infor > span.fdi-duration').text() || null,
                    type: $(el).find('div.film-detail > div.fd-infor > span.float-right').text() === 'Movie'
                        ? TvTypeEnum.MOVIE
                        : TvTypeEnum.TVSERIES,
                };
                return movie;
            })
                .get();
            return movies;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    const fetchTrendingTvShows = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield axios.get(`${config.baseUrl}/home`);
            const $ = load(data);
            const tvshows = $('div#trending-tv div.film_list-wrap div.flw-item')
                .map((i, el) => {
                var _a;
                const tvshow = {
                    id: (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1),
                    title: $(el).find('div.film-detail > h3.film-name > a').attr('title'),
                    url: `${config.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                    image: $(el).find('div.film-poster > img').attr('data-src'),
                    season: $(el).find('div.film-detail > div.fd-infor > span:nth-child(1)').text().replace('SS', '').trim(),
                    latestEpisode: $(el).find('div.film-detail > div.fd-infor > span:nth-child(3)').text().replace('EPS', '').trim() || null,
                    type: $(el).find('div.film-detail > div.fd-infor > span.float-right').text() === 'Movie'
                        ? TvTypeEnum.MOVIE
                        : TvTypeEnum.TVSERIES,
                };
                return tvshow;
            })
                .get();
            return tvshows;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    const fetchByCountry = (country_1, ...args_1) => __awaiter(this, [country_1, ...args_1], void 0, function* (country, page = 1) {
        const result = {
            currentPage: page,
            hasNextPage: false,
            results: [],
        };
        const navSelector = 'div.pre-pagination > nav:nth-child(1) > ul:nth-child(1)';
        try {
            const { data } = yield axios.get(`${config.baseUrl}/country/${country}/?page=${page}`);
            const $ = load(data);
            result.hasNextPage = $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass('active') : false;
            $('div.container > section.block_area > div.block_area-content > div.film_list-wrap > div.flw-item')
                .each((i, el) => {
                var _a, _b, _c, _d;
                const resultItem = {
                    id: (_b = (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1)) !== null && _b !== void 0 ? _b : '',
                    title: (_c = $(el).find('div.film-detail > h2.film-name > a').attr('title')) !== null && _c !== void 0 ? _c : '',
                    url: `${config.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                    image: $(el).find('div.film-poster > img').attr('data-src'),
                    type: $(el).find('div.film-detail > div.fd-infor > span.float-right').text() === 'Movie'
                        ? TvTypeEnum.MOVIE
                        : TvTypeEnum.TVSERIES,
                };
                const season = $(el)
                    .find('div.film-detail > div.fd-infor > span:nth-child(1)')
                    .text()
                    .replace('SS', '')
                    .trim();
                const latestEpisode = (_d = $(el).find('div.film-detail > div.fd-infor > span:nth-child(3)').text().replace('EPS', '').trim()) !== null && _d !== void 0 ? _d : null;
                if (resultItem.type === TvTypeEnum.TVSERIES) {
                    resultItem.season = season;
                    resultItem.latestEpisode = latestEpisode;
                }
                else {
                    resultItem.releaseDate = season;
                    resultItem.duration = latestEpisode;
                }
                result.results.push(resultItem);
            })
                .get();
            return result;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    const fetchByGenre = (genre_1, ...args_1) => __awaiter(this, [genre_1, ...args_1], void 0, function* (genre, page = 1) {
        const result = {
            currentPage: page,
            hasNextPage: false,
            results: [],
        };
        try {
            const { data } = yield axios.get(`${config.baseUrl}/genre/${genre}?page=${page}`);
            const $ = load(data);
            const navSelector = 'div.pre-pagination > nav:nth-child(1) > ul:nth-child(1)';
            result.hasNextPage = $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass('active') : false;
            $('.film_list-wrap > div.flw-item')
                .each((i, el) => {
                var _a, _b, _c, _d;
                const resultItem = {
                    id: (_b = (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1)) !== null && _b !== void 0 ? _b : '',
                    title: (_c = $(el).find('div.film-detail > h2 > a').attr('title')) !== null && _c !== void 0 ? _c : '',
                    url: `${config.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                    image: $(el).find('div.film-poster > img').attr('data-src'),
                    type: $(el).find('div.film-detail > div.fd-infor > span.float-right').text() === 'Movie'
                        ? TvTypeEnum.MOVIE
                        : TvTypeEnum.TVSERIES,
                };
                const season = $(el)
                    .find('div.film-detail > div.fd-infor > span:nth-child(1)')
                    .text()
                    .replace('SS', '')
                    .trim();
                const latestEpisode = (_d = $(el).find('div.film-detail > div.fd-infor > span:nth-child(3)').text().replace('EPS', '').trim()) !== null && _d !== void 0 ? _d : null;
                if (resultItem.type === TvTypeEnum.TVSERIES) {
                    resultItem.season = season;
                    resultItem.latestEpisode = latestEpisode;
                }
                else {
                    resultItem.releaseDate = season;
                    resultItem.duration = latestEpisode;
                }
                result.results.push(resultItem);
            })
                .get();
            return result;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    // Return the functional provider object
    return {
        // Configuration
        name: config.name,
        get baseUrl() {
            return config.baseUrl;
        },
        set baseUrl(value) {
            config.baseUrl = value.startsWith('http') ? value : `http://${value}`;
        },
        logo: config.logo,
        classPath: config.classPath,
        supportedTypes,
        search,
        fetchMediaInfo,
        fetchEpisodeSources,
        fetchEpisodeServers,
        fetchRecentMovies,
        fetchRecentTvShows,
        fetchTrendingMovies,
        fetchTrendingTvShows,
        fetchByCountry,
        fetchByGenre,
    };
}
//# sourceMappingURL=create-himovies.js.map