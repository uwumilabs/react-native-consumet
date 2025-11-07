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
exports.createMultiMovies = createMultiMovies;
function createMultiMovies(ctx, customBaseURL) {
    const { load, extractors, enums, axios, createCustomBaseUrl, PolyURL, USER_AGENT, NativeConsumet } = ctx;
    const { StreamWish, VidHide } = extractors;
    const { StreamingServers: StreamingServersEnum, TvType: TvTypeEnum } = enums;
    const { makePostRequest } = NativeConsumet;
    const baseUrl = createCustomBaseUrl('https://multimovies.center', customBaseURL);
    const config = {
        name: 'MultiMovies',
        languages: 'all',
        classPath: 'MOVIES.MultiMovies',
        logo: `${baseUrl}/wp-content/uploads/2024/01/cropped-CompressJPEG.online_512x512_image.png`,
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
            let url;
            if (page === 1) {
                url = `${config.baseUrl}/?s=${query.replace(/[\W_]+/g, '+')}`;
            }
            else {
                url = `${config.baseUrl}/page/${page}/?s=${query.replace(/[\W_]+/g, '+')}`;
            }
            const { data } = yield axios.get(url);
            const $ = load(data);
            const navSelector = 'div.pagination';
            searchResult.hasNextPage = $(navSelector).find('#nextpagination').length > 0;
            const articles = $('.search-page .result-item article').toArray();
            yield Promise.all(articles.map((el) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e;
                const seasonSet = new Set();
                const href = (_b = (_a = $(el)
                    .find('.thumbnail a')
                    .attr('href')) === null || _a === void 0 ? void 0 : _a.replace(/^https?:\/\/[^/]+\//, '').replace(/^\/|\/$/g, '')) !== null && _b !== void 0 ? _b : '';
                const episodesInfo = yield fetchMediaInfo(href);
                const episodes = (episodesInfo === null || episodesInfo === void 0 ? void 0 : episodesInfo.episodes) || [];
                for (const episode of episodes) {
                    if (episode.season != null) {
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
                    seasons: seasonSet.size,
                    description: $(el).find('.contenido p').text().trim(),
                    type: ((_e = $(el).find('.thumbnail a').attr('href')) === null || _e === void 0 ? void 0 : _e.includes('/movies/'))
                        ? TvTypeEnum.MOVIE
                        : TvTypeEnum.TVSERIES,
                });
            })));
            return searchResult;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    /**
     * Fetch media information
     * @param mediaId media link or id
     */
    const fetchMediaInfo = (mediaId) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if (!mediaId.startsWith(config.baseUrl)) {
            mediaId = `${config.baseUrl}/${mediaId}`;
        }
        const movieInfo = {
            id: mediaId.replace(/^https?:\/\/[^/]+\//, '').replace(/^\/|\/$/g, ''),
            title: '',
            url: mediaId,
        };
        try {
            const { data } = yield axios.get(mediaId);
            const $ = load(data);
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
                        ? TvTypeEnum.TVSERIES
                        : ((_d = TvTypeEnum.MOVIE) !== null && _d !== void 0 ? _d : null),
                });
            });
            movieInfo.cover = (_b = (_a = $('div#info .galeria').first().find('.g-item a').attr('href')) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : '';
            movieInfo.title = $('.sheader > .data > h1').text();
            movieInfo.image = (_c = $('.sheader > .poster > img').attr('src')) !== null && _c !== void 0 ? _c : $('.sheader > .poster > img').attr('data-src');
            movieInfo.description = $('div#info div[itemprop="description"] p').text();
            movieInfo.type = movieInfo.id.split('/')[0] === 'tvshows' ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE;
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
            if (movieInfo.type === TvTypeEnum.TVSERIES) {
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
     * Fetch episode sources
     * @param episodeId episode id
     * @param mediaId media id
     * @param server server type (default `StreamWish`) (optional)
     */
    const fetchEpisodeSources = (episodeId_1, mediaId_1, ...args_1) => __awaiter(this, [episodeId_1, mediaId_1, ...args_1], void 0, function* (episodeId, mediaId, server = StreamingServersEnum.StreamWish, fileId) {
        if (episodeId.startsWith('http')) {
            const serverUrl = new PolyURL(episodeId);
            const referer = serverUrl.origin;
            const downloadUrl = fileId ? `${serverUrl.href.toString().replace('/e/', '/f/')}/${fileId}` : '';
            switch (server) {
                case StreamingServersEnum.StreamWish:
                    return Object.assign(Object.assign({ headers: { Referer: referer } }, (yield StreamWish().extract(serverUrl, referer))), { download: downloadUrl });
                case StreamingServersEnum.VidHide:
                    return Object.assign(Object.assign({ headers: { Referer: referer } }, (yield VidHide().extract(serverUrl))), { download: fileId ? `https://gdmirrorbot.nl/file/${fileId}` : '' });
                default:
                    return Object.assign(Object.assign({ headers: { Referer: referer } }, (yield StreamWish().extract(serverUrl, referer))), { download: downloadUrl });
            }
        }
        try {
            const servers = yield fetchEpisodeServers(episodeId, episodeId);
            const i = servers.findIndex((s) => s.name.toLowerCase() === server.toLowerCase());
            if (i === -1) {
                throw new Error(`Server ${server} not found`);
            }
            const serverUrl = new URL(servers[i].url);
            let fId = '';
            if (!episodeId.startsWith('http')) {
                const { fileId: id } = yield getServer(`${config.baseUrl}/${episodeId}`);
                fId = id !== null && id !== void 0 ? id : '';
            }
            // fileId to be used for download link
            return yield fetchEpisodeSources(serverUrl.href, mediaId, server, fId);
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    /**
     * Fetch episode servers
     * @param episodeId takes episode link or movie id
     * @param mediaId takes movie link or id (found on movie info object, this is just a placeholder for compatibility)
     */
    const fetchEpisodeServers = (episodeId, mediaId) => __awaiter(this, void 0, void 0, function* () {
        if (!episodeId.startsWith(config.baseUrl)) {
            episodeId = `${config.baseUrl}/${episodeId}`;
        }
        try {
            const { servers } = yield getServer(episodeId);
            return servers;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    /**
     * Fetch popular movies
     * @param page page number (default 1)
     */
    const fetchPopular = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const result = {
            currentPage: page,
            hasNextPage: false,
            results: [],
        };
        try {
            const { data } = yield axios.get(`${config.baseUrl}/trending/page/${page}/`);
            const $ = load(data);
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
                    type: ((_c = $(el).find('div.poster > a').attr('href')) === null || _c === void 0 ? void 0 : _c.includes('/movies/'))
                        ? TvTypeEnum.MOVIE
                        : TvTypeEnum.TVSERIES,
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
    /**
     * Fetch by genre
     * @param genre genre name
     * @param page page number (default 1)
     */
    const fetchByGenre = (genre_1, ...args_1) => __awaiter(this, [genre_1, ...args_1], void 0, function* (genre, page = 1) {
        const result = {
            currentPage: page,
            hasNextPage: false,
            results: [],
        };
        try {
            const { data } = yield axios.get(`${config.baseUrl}/genre/${genre}/page/${page}`);
            const $ = load(data);
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
                    type: ((_c = $(el).find('div.poster > a').attr('href')) === null || _c === void 0 ? void 0 : _c.includes('/movies/'))
                        ? TvTypeEnum.MOVIE
                        : TvTypeEnum.TVSERIES,
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
    /**
     * Get server information
     * @param url episode url
     */
    const getServer = (url) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const { data } = yield axios.get(url);
            const $ = load(data);
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
                'User-Agent': USER_AGENT,
            };
            //   const { data: playerRes } = await axios.post(`${baseUrl}/wp-admin/admin-ajax.php`, formData, {
            //     headers,
            //   });
            console.log(`${baseUrl}/wp-admin/admin-ajax.php`);
            const res = yield fetch(`${baseUrl}/wp-admin/admin-ajax.php`, {
                method: 'POST',
                headers: Object.assign({}, headers),
                body: formData,
            });
            const postTestOkHttp = yield makePostRequest(`${baseUrl}/wp-admin/admin-ajax.php`, Object.assign({}, headers), formData);
            console.timeEnd('POST Request - OkHttp');
            console.log('POST Response (OkHttp):', {
                statusCode: postTestOkHttp.statusCode,
                body: postTestOkHttp.body, // Full response body
                headers: postTestOkHttp.headers,
            });
            const playerRes = yield res.json();
            console.log({ playerRes });
            const iframeUrl = ((_b = (_a = playerRes.embed_url) === null || _a === void 0 ? void 0 : _a.match(/<iframe[^>]+src="([^"]+)"[^>]*>/i)) === null || _b === void 0 ? void 0 : _b[1]) || playerRes.embed_url;
            // Handle non-multimovies case
            if (!iframeUrl.includes('multimovies')) {
                if (iframeUrl.includes('dhcplay')) {
                    return {
                        servers: [{ name: 'StreamWish', url: iframeUrl }],
                        fileId: (_c = iframeUrl.split('/').pop()) !== null && _c !== void 0 ? _c : '',
                    };
                }
                // let playerBaseUrl = iframeUrl.split('/').slice(0, 3).join('/');
                // const redirectResponse = await axios.head(playerBaseUrl, {
                //   headers: headers,
                //   maxRedirects: 5,
                //   validateStatus: () => true,
                // });
                // const redirectResponse = await fetch(playerBaseUrl, {
                //   method: 'HEAD',
                //   headers: headers,
                //   redirect: 'follow',
                // });
                // const isRedirected = redirectResponse.request._redirectable._isRedirect ? redirectResponse : null;
                // const finalResponse = true ? redirectResponse : null;
                // // Update base URL if redirect occurred
                // if (finalResponse) {
                //   playerBaseUrl = finalResponse?.url;
                // }
                const fileId = iframeUrl.split('/').pop();
                if (!fileId) {
                    throw new Error('No player ID found');
                }
                const streamRequestData = new FormData();
                streamRequestData.append('sid', fileId);
                // const streamResponse = await axios.post(`https://pro.gtxgamer.site/embedhelper.php`, streamRequestData, {
                //   headers,
                // });
                const streamRes = yield fetch(`https://pro.gtxgamer.site/embedhelper.php`, {
                    method: 'POST',
                    headers: Object.assign({}, headers),
                    body: streamRequestData,
                });
                const streamResponse = yield streamRes.json();
                if (!streamResponse) {
                    throw new Error('No stream data found');
                }
                // Decode and parse mresult
                const decodedMresult = JSON.parse(atob(streamResponse.mresult));
                const mresultKeys = Object.keys(decodedMresult);
                // Find common keys
                const commonKeys = mresultKeys.filter((key) => streamResponse.siteUrls.hasOwnProperty(key));
                // Convert to a Set (if needed)
                const commonStreamSites = new Set(commonKeys);
                const servers = Array.from(commonStreamSites).map((site) => {
                    return {
                        name: streamResponse.siteFriendlyNames[site] === 'StreamHG'
                            ? 'StreamWish'
                            : streamResponse.siteFriendlyNames[site] === 'EarnVids'
                                ? 'VidHide'
                                : streamResponse.siteFriendlyNames[site],
                        url: streamResponse.siteUrls[site] + JSON.parse(atob(streamResponse.mresult))[site],
                    };
                });
                return { servers, fileId };
            }
            else {
                return {
                    servers: [{ name: 'StreamWish', url: iframeUrl }],
                    fileId: (_d = iframeUrl.split('/').pop()) !== null && _d !== void 0 ? _d : '',
                };
            }
        }
        catch (err) {
            console.log(err);
            throw new Error(err.message);
        }
    });
    return Object.assign(Object.assign({}, config), { supportedTypes,
        search,
        fetchMediaInfo,
        fetchEpisodeSources,
        fetchEpisodeServers,
        fetchPopular,
        fetchByGenre });
}
//# sourceMappingURL=create-multimovies.js.map