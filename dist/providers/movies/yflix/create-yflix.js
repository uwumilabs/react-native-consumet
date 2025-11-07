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
exports.createYFlix = createYFlix;
function createYFlix(ctx, customBaseURL) {
    const { load, extractors, enums, axios, createCustomBaseUrl, PolyURL } = ctx;
    const { MegaUp } = extractors;
    const { TvType: TvTypeEnum, StreamingServers: StreamingServersEnum } = enums;
    const apiBase = 'https://enc-dec.app/api';
    const baseUrl = createCustomBaseUrl('https://yflix.to', customBaseURL);
    const config = {
        name: 'YFlix',
        languages: 'all',
        classPath: 'MOVIES.YFlix',
        logo: `${baseUrl}/assets/uploads/2f505f3de3c99889c1a72557f3e3714fc0c457b0.png`,
        baseUrl,
        isNSFW: false,
        isWorking: true,
    };
    const supportedTypes = new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);
    const GenerateToken = (n) => __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield axios.get(`${apiBase}/enc-movies-flix?text=${encodeURIComponent(n)}`);
            return res.data.result;
        }
        catch (error) {
            throw new Error(error.message);
        }
    });
    const DecodeIframeData = (n) => __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield axios.post(`${apiBase}/dec-movies-flix`, { text: n });
            return res.data.result;
        }
        catch (error) {
            throw new Error(error.message);
        }
    });
    /**
     *
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
            const { data } = yield axios.get(`${baseUrl}/browser?keyword=${query.replace(/[\W_]+/g, '+')}&page=${page}`);
            const $ = load(data);
            const navSelector = 'nav.navigation > ul.pagination';
            searchResult.hasNextPage =
                $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass('active') : false;
            $('.film-section > div.item').each((i, el) => {
                var _a;
                const releaseDate = $(el).find('div.metadata > span:nth-child(2)').text();
                searchResult.results.push({
                    id: (_a = $(el).find('div.inner > a').attr('href')) === null || _a === void 0 ? void 0 : _a.split('/watch/')[1],
                    title: $(el).find('div.info > a').text().trim(),
                    url: `${baseUrl}${$(el).find('div.inner > a').attr('href')}`,
                    image: $(el).find('img').attr('data-src') || $(el).find('img').attr('src'),
                    releaseDate: isNaN(parseInt(releaseDate)) ? undefined : releaseDate,
                    seasons: releaseDate.includes('SS') ? parseInt(releaseDate.split('SS')[1]) : undefined,
                    type: $(el).find('div.metadata > span:nth-child(1)').text() === 'Movie' ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES,
                });
            });
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
    const fetchMediaInfo = (mediaId) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!mediaId.startsWith(baseUrl)) {
            mediaId = `${baseUrl}/watch/${mediaId}`;
        }
        const movieInfo = {
            id: mediaId.split('to/').pop(),
            title: '',
            url: mediaId,
        };
        try {
            const { data } = yield axios.get(mediaId);
            const $ = load(data);
            const recommendationsArray = [];
            $('section.movie-related > div.film-section > div.item').each((i, el) => {
                var _a;
                const releaseDate = $(el).find('div.metadata > span:nth-child(2)').text();
                recommendationsArray.push({
                    id: (_a = $(el).find('div.inner > a').attr('href')) === null || _a === void 0 ? void 0 : _a.split('/watch/')[1],
                    title: $(el).find('div.info > a').text().trim(),
                    image: $(el).find('img').attr('data-src') || $(el).find('img').attr('src'),
                    releaseDate: isNaN(parseInt(releaseDate)) ? undefined : releaseDate,
                    seasons: releaseDate.includes('SS') ? parseInt(releaseDate.split('SS')[1]) : undefined,
                    type: $(el).find('div.metadata > span:nth-child(1)').text() === 'Movie' ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES,
                });
            });
            const uid = $('#movie-rating').attr('data-id');
            movieInfo.cover = (_a = $('div.detail-bg').attr('style')) === null || _a === void 0 ? void 0 : _a.slice(22).replace(')', '').replace(';', '');
            movieInfo.title = $('h1.title').text();
            movieInfo.image = $('.poster  img').attr('src');
            movieInfo.description = $('.description').text().trim();
            movieInfo.releaseDate = $('ul.mics > li:contains(Released:)').text().replace('Released:', '').trim();
            movieInfo.genres = $('ul.mics > li:contains(Genres:) a')
                .map((i, el) => $(el).text().split('&'))
                .get()
                .map((v) => v.trim());
            movieInfo.casts = $('ul.mics > li:contains(Casts:) a')
                .map((i, el) => $(el).text())
                .get();
            movieInfo.country = $('ul.mics > li:contains(Country:) a').text().trim();
            movieInfo.rating = parseFloat($('.metadata > span.IMDb').text().replace('IMDb', '').trim());
            movieInfo.recommendations = recommendationsArray;
            const episodesAjax = yield axios.get(`${baseUrl}/ajax/episodes/list?id=${uid}&_=${yield GenerateToken(uid)}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': `${baseUrl}/watch/${mediaId}`,
                },
            });
            const $$ = load(episodesAjax.data.result);
            movieInfo.episodes = [];
            $$('.episodes').each((_, el) => {
                const season = parseInt($$(el).attr('data-season'), 10);
                $$(el)
                    .find('li a')
                    .each((_, link) => {
                    var _a, _b, _c, _d;
                    const $link = $(link);
                    const id = ((_a = $link.attr('eid')) === null || _a === void 0 ? void 0 : _a.trim()) || '';
                    const url = baseUrl + ((_b = $link.attr('href')) === null || _b === void 0 ? void 0 : _b.trim()) || '';
                    const number = parseInt($link.attr('num') || '', 10);
                    const releaseDate = ((_c = $link.attr('title')) === null || _c === void 0 ? void 0 : _c.trim()) || '';
                    const title = $link.find('span:last-child').text().trim();
                    (_d = movieInfo.episodes) === null || _d === void 0 ? void 0 : _d.push({
                        id,
                        title,
                        url,
                        number,
                        season,
                        releaseDate,
                    });
                });
            });
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
     * @param server server type (default `MegaUp`) (optional)
     */
    const fetchEpisodeSources = (episodeId_1, mediaId_1, ...args_1) => __awaiter(this, [episodeId_1, mediaId_1, ...args_1], void 0, function* (episodeId, mediaId, server = StreamingServersEnum.MegaUp) {
        var _a;
        if (episodeId.startsWith('http')) {
            const serverUrl = new PolyURL(episodeId);
            switch (server) {
                case StreamingServersEnum.MegaUp:
                    return Object.assign({ headers: { Referer: serverUrl.href } }, (yield MegaUp().extract(serverUrl)));
                default:
                    return Object.assign({ headers: { Referer: serverUrl.href } }, (yield MegaUp().extract(serverUrl)));
            }
        }
        try {
            const servers = yield fetchEpisodeServers(episodeId, mediaId);
            const i = servers.findIndex((s) => s.name.toLowerCase().includes(server));
            if (i === -1) {
                throw new Error(`Server ${server} not found`);
            }
            const serverUrl = new URL((_a = servers[i]) === null || _a === void 0 ? void 0 : _a.url);
            const sources = yield fetchEpisodeSources(serverUrl.href, mediaId, server);
            return sources;
        }
        catch (err) {
            console.log(err, 'err');
            throw new Error(err.message);
        }
    });
    /**
     *
     * @param episodeId takes episode link or movie id
     * @param mediaId takes movie link or id (found on movie info object)
     */
    const fetchEpisodeServers = (episodeId, mediaId) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield axios.get(`${baseUrl}/ajax/links/list?eid=${episodeId}&_=${yield GenerateToken(episodeId)}`);
            const $ = load(data.result);
            const servers = [];
            const serverItems = $('ul > li.server');
            yield Promise.all(serverItems.map((i, server) => __awaiter(this, void 0, void 0, function* () {
                const id = $(server).attr('data-lid');
                const { data } = yield axios.get(`${baseUrl}/ajax/links/view?id=${id}&_=${yield GenerateToken(id)}`);
                const decodedIframeData = yield DecodeIframeData(data.result);
                servers.push({
                    name: `MegaUp ${$(server).text().trim()}`.toLowerCase(),
                    url: decodedIframeData.url,
                });
            })));
            return servers;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    const fetchRecentMovies = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield axios.get(`${baseUrl}/home`);
            const $ = load(data);
            const movies = $('section.block_area:contains("Latest Movies") > div:nth-child(2) > div:nth-child(1) > div.flw-item')
                .map((i, el) => {
                var _a;
                const releaseDate = $(el).find('div.film-detail > div.fd-infor > span:nth-child(1)').text();
                const movie = {
                    id: (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1),
                    title: $(el).find('div.film-detail > h3.film-name > a').attr('title'),
                    url: `${baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
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
            const { data } = yield axios.get(`${baseUrl}/home`);
            const $ = load(data);
            const tvshows = $('section.block_area:contains("Latest TV Shows") > div:nth-child(2) > div:nth-child(1) > div.flw-item')
                .map((i, el) => {
                var _a;
                const tvshow = {
                    id: (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1),
                    title: $(el).find('div.film-detail > h3.film-name > a').attr('title'),
                    url: `${baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
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
            const { data } = yield axios.get(`${baseUrl}/home`);
            const $ = load(data);
            const movies = $('div#trending-movies div.film_list-wrap div.flw-item')
                .map((i, el) => {
                var _a;
                const releaseDate = $(el).find('div.film-detail > div.fd-infor > span:nth-child(1)').text();
                const movie = {
                    id: (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1),
                    title: $(el).find('div.film-detail > h3.film-name > a').attr('title'),
                    url: `${baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
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
            const { data } = yield axios.get(`${baseUrl}/home`);
            const $ = load(data);
            const tvshows = $('div#trending-tv div.film_list-wrap div.flw-item')
                .map((i, el) => {
                var _a;
                const tvshow = {
                    id: (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1),
                    title: $(el).find('div.film-detail > h3.film-name > a').attr('title'),
                    url: `${baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
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
            const { data } = yield axios.get(`${baseUrl}/country/${country}/?page=${page}`);
            const $ = load(data);
            result.hasNextPage = $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass('active') : false;
            $('div.container > section.block_area > div.block_area-content > div.film_list-wrap > div.flw-item')
                .each((i, el) => {
                var _a, _b, _c, _d;
                const resultItem = {
                    id: (_b = (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1)) !== null && _b !== void 0 ? _b : '',
                    title: (_c = $(el).find('div.film-detail > h2.film-name > a').attr('title')) !== null && _c !== void 0 ? _c : '',
                    url: `${baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
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
            const { data } = yield axios.get(`${baseUrl}/genre/${genre}?page=${page}`);
            const $ = load(data);
            const navSelector = 'div.pre-pagination > nav:nth-child(1) > ul:nth-child(1)';
            result.hasNextPage = $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass('active') : false;
            $('.film_list-wrap > div.flw-item')
                .each((i, el) => {
                var _a, _b, _c, _d;
                const resultItem = {
                    id: (_b = (_a = $(el).find('div.film-poster > a').attr('href')) === null || _a === void 0 ? void 0 : _a.slice(1)) !== null && _b !== void 0 ? _b : '',
                    title: (_c = $(el).find('div.film-detail > h2 > a').attr('title')) !== null && _c !== void 0 ? _c : '',
                    url: `${baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
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
    return Object.assign(Object.assign({}, config), { supportedTypes,
        search,
        fetchMediaInfo,
        fetchEpisodeSources,
        fetchEpisodeServers,
        fetchRecentMovies,
        fetchRecentTvShows,
        fetchTrendingMovies,
        fetchTrendingTvShows,
        fetchByCountry,
        fetchByGenre });
}
//# sourceMappingURL=create-yflix.js.map