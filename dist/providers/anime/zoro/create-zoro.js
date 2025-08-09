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
exports.createZoro = createZoro;
function createZoro(ctx, customBaseURL) {
    const { load, extractors, enums, createCustomBaseUrl } = ctx;
    const { StreamSB, MegaCloud, StreamTape } = extractors;
    const { StreamingServers: StreamingServersEnum, SubOrSub: SubOrSubEnum, MediaStatus: MediaStatusEnum, WatchListType: WatchListTypeEnum, } = enums;
    // Provider configuration - use the standardized base URL creation
    const baseUrl = createCustomBaseUrl('https://hianime.to', customBaseURL);
    const config = {
        name: 'Zoro',
        languages: 'en',
        classPath: 'ANIME.Zoro',
        logo: 'https://is3-ssl.mzstatic.com/image/thumb/Purple112/v4/7e/91/00/7e9100ee-2b62-0942-4cdc-e9b93252ce1c/source/512x512bb.jpg',
        baseUrl,
        isNSFW: false,
        isWorking: true,
        isDubAvailableSeparately: true,
    };
    // Helper functions
    const normalizePageNumber = (page) => {
        return page <= 0 ? 1 : page;
    };
    const scrapeCard = ($) => __awaiter(this, void 0, void 0, function* () {
        try {
            const results = [];
            $('.flw-item').each((i, ele) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                const card = $(ele);
                const atag = card.find('.film-name a');
                const id = (_a = atag.attr('href')) === null || _a === void 0 ? void 0 : _a.split('/')[1].split('?')[0];
                const watchList = card.find('.dropdown-menu .added').text().trim();
                const type = (_c = (_b = card
                    .find('.fdi-item')) === null || _b === void 0 ? void 0 : _b.first()) === null || _c === void 0 ? void 0 : _c.text().replace(' (? eps)', '').replace(/\s\(\d+ eps\)/g, '');
                results.push({
                    id: id,
                    title: atag.text(),
                    url: `${config.baseUrl}${atag.attr('href')}`,
                    image: (_d = card.find('img')) === null || _d === void 0 ? void 0 : _d.attr('data-src'),
                    duration: (_e = card.find('.fdi-duration')) === null || _e === void 0 ? void 0 : _e.text(),
                    watchList: watchList || WatchListTypeEnum.NONE,
                    japaneseTitle: atag.attr('data-jname'),
                    type: type,
                    nsfw: ((_f = card.find('.tick-rate')) === null || _f === void 0 ? void 0 : _f.text()) === '18+' ? true : false,
                    sub: parseInt((_g = card.find('.tick-item.tick-sub')) === null || _g === void 0 ? void 0 : _g.text()) || 0,
                    dub: parseInt((_h = card.find('.tick-item.tick-dub')) === null || _h === void 0 ? void 0 : _h.text()) || 0,
                    episodes: parseInt((_j = card.find('.tick-item.tick-eps')) === null || _j === void 0 ? void 0 : _j.text()) || 0,
                });
            });
            return results;
        }
        catch (err) {
            console.log(err);
            throw new Error(`Failed to scrape card: ${err}`);
        }
    });
    const scrapeCardPage = (url, headers) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const res = {
                currentPage: 0,
                hasNextPage: false,
                totalPages: 0,
                results: [],
            };
            const response = yield fetch(url, headers);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
            }
            const data = yield response.text();
            const $ = load(data);
            const pagination = $('ul.pagination');
            res.currentPage = parseInt((_a = pagination.find('.page-item.active')) === null || _a === void 0 ? void 0 : _a.text());
            const nextPage = (_b = pagination.find('a[title=Next]')) === null || _b === void 0 ? void 0 : _b.attr('href');
            if (nextPage !== undefined && nextPage !== '') {
                res.hasNextPage = true;
            }
            const totalPages = (_c = pagination.find('a[title=Last]').attr('href')) === null || _c === void 0 ? void 0 : _c.split('=').pop();
            if (totalPages === undefined || totalPages === '') {
                res.totalPages = res.currentPage;
            }
            else {
                res.totalPages = parseInt(totalPages);
            }
            res.results = yield scrapeCard($);
            if (res.results.length === 0) {
                res.currentPage = 0;
                res.hasNextPage = false;
                res.totalPages = 0;
            }
            return res;
        }
        catch (err) {
            console.error('scrapeCardPage error:', err);
            throw new Error(`Failed to scrape page ${url}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    });
    const retrieveServerId = ($, index, subOrDub) => {
        const rawOrSubOrDub = (raw) => $(`.ps_-block.ps_-block-sub.servers-${raw ? 'raw' : subOrDub} > .ps__-list .server-item`)
            .map((i, el) => ($(el).attr('data-server-id') === `${index}` ? $(el) : null))
            .get()[0]
            .attr('data-id');
        try {
            // Attempt to get the subOrDub ID
            return rawOrSubOrDub(false);
        }
        catch (error) {
            // If an error is thrown, attempt to get the raw ID (The raw is the newest episode uploaded to zoro)
            return rawOrSubOrDub(true);
        }
    };
    // Main provider functions
    const search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/search?keyword=${decodeURIComponent(query)}&page=${normalizedPage}`);
    });
    const fetchAdvancedSearch = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1, type, status, rated, score, season, language, startDate, endDate, sort, genres) {
        const normalizedPage = normalizePageNumber(page);
        const mappings = {
            type: { movie: 1, tv: 2, ova: 3, ona: 4, special: 5, music: 6 },
            status: { finished_airing: 1, currently_airing: 2, not_yet_aired: 3 },
            rated: { g: 1, pg: 2, pg_13: 3, r: 4, r_plus: 5, rx: 6 },
            season: { spring: 1, summer: 2, fall: 3, winter: 4 },
            language: { sub: 1, dub: 2, sub_dub: 3 },
            genre: {
                action: 1,
                adventure: 2,
                cars: 3,
                comedy: 4,
                dementia: 5,
                demons: 6,
                mystery: 7,
                drama: 8,
                ecchi: 9,
                fantasy: 10,
                game: 11,
                historical: 12,
                horror: 13,
                kids: 14,
                magic: 15,
                martial_arts: 16,
                mecha: 17,
                music: 18,
                parody: 19,
                samurai: 20,
                romance: 21,
                school: 22,
                sci_fi: 23,
                shoujo: 24,
                shoujo_ai: 25,
                shounen: 26,
                shounen_ai: 27,
                space: 28,
                sports: 29,
                super_power: 30,
                vampire: 31,
                harem: 32,
                slice_of_life: 33,
                supernatural: 34,
                military: 35,
                police: 36,
                psychological: 37,
                thriller: 38,
                seinen: 39,
                josei: 40,
                isekai: 41,
            },
        };
        const params = new URLSearchParams();
        params.append('page', normalizedPage.toString());
        if (type && mappings.type[type]) {
            params.append('type', mappings.type[type].toString());
        }
        if (status && mappings.status[status]) {
            params.append('status', mappings.status[status].toString());
        }
        if (rated && mappings.rated[rated]) {
            params.append('rated', mappings.rated[rated].toString());
        }
        if (score)
            params.append('score', score.toString());
        if (season && mappings.season[season]) {
            params.append('season', mappings.season[season].toString());
        }
        if (language && mappings.language[language]) {
            params.append('language', mappings.language[language].toString());
        }
        if (sort)
            params.append('sort', sort);
        if (startDate) {
            params.append('start_date', `${startDate.year}-${startDate.month.toString().padStart(2, '0')}-${startDate.day.toString().padStart(2, '0')}`);
        }
        if (endDate) {
            params.append('end_date', `${endDate.year}-${endDate.month.toString().padStart(2, '0')}-${endDate.day.toString().padStart(2, '0')}`);
        }
        if (genres && genres.length > 0) {
            const genreIds = genres.map((g) => mappings.genre[g]).filter(Boolean);
            if (genreIds.length > 0) {
                params.append('genres', genreIds.join(','));
            }
        }
        return scrapeCardPage(`${config.baseUrl}/filter?${params.toString()}`);
    });
    const fetchTopAiring = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/top-airing?page=${normalizedPage}`);
    });
    const fetchMostPopular = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/most-popular?page=${normalizedPage}`);
    });
    const fetchMostFavorite = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/most-favorite?page=${normalizedPage}`);
    });
    const fetchLatestCompleted = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/completed?page=${normalizedPage}`);
    });
    const fetchRecentlyUpdated = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/recently-updated?page=${normalizedPage}`);
    });
    const fetchRecentlyAdded = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/recently-added?page=${normalizedPage}`);
    });
    const fetchTopUpcoming = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/top-upcoming?page=${normalizedPage}`);
    });
    const fetchStudio = (studio_1, ...args_1) => __awaiter(this, [studio_1, ...args_1], void 0, function* (studio, page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/producer/${studio}?page=${normalizedPage}`);
    });
    const fetchSubbedAnime = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/subbed-anime?page=${normalizedPage}`);
    });
    const fetchDubbedAnime = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/dubbed-anime?page=${normalizedPage}`);
    });
    const fetchMovie = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/movie?page=${normalizedPage}`);
    });
    const fetchTV = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/tv?page=${normalizedPage}`);
    });
    const fetchOVA = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/ova?page=${normalizedPage}`);
    });
    const fetchONA = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/ona?page=${normalizedPage}`);
    });
    const fetchSpecial = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/special?page=${normalizedPage}`);
    });
    const fetchGenres = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/genre?page=${normalizedPage}`);
    });
    const genreSearch = (genre_1, ...args_1) => __awaiter(this, [genre_1, ...args_1], void 0, function* (genre, page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/genre/${genre}?page=${normalizedPage}`);
    });
    const fetchSchedule = (date) => __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${config.baseUrl}/ajax/schedule/list?tzOffset=-330&date=${date}`);
            const data = yield response.json();
            const $ = load(data.html);
            return yield scrapeCard($);
        }
        catch (error) {
            throw new Error(`Failed to fetch schedule: ${error}`);
        }
    });
    const fetchSpotlight = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(config.baseUrl);
            const data = yield response.text();
            const $ = load(data);
            const results = [];
            $('.deslide-item').each((_, element) => {
                var _a, _b, _c;
                const id = ((_a = $(element).find('a').attr('href')) === null || _a === void 0 ? void 0 : _a.split('/')[1]) || '';
                const title = $(element).find('.desi-head-title').text().trim();
                const poster = ((_c = (_b = $(element)
                    .find('.desi-buttons-wrap .btn-secondary')
                    .attr('href')) === null || _b === void 0 ? void 0 : _b.match(/url=([^&]+)/)) === null || _c === void 0 ? void 0 : _c[1]) || '';
                const description = $(element).find('.desi-description').text().trim();
                if (id) {
                    results.push({
                        id,
                        title,
                        url: `${config.baseUrl}/${id}`,
                        image: decodeURIComponent(poster),
                        description,
                    });
                }
            });
            return results;
        }
        catch (error) {
            throw new Error(`Failed to fetch spotlight: ${error}`);
        }
    });
    const fetchSearchSuggestions = (query) => __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${config.baseUrl}/ajax/search/suggest?keyword=${encodeURIComponent(query)}`);
            const data = yield response.json();
            const $ = load(data.html);
            return yield scrapeCard($);
        }
        catch (error) {
            throw new Error(`Failed to fetch search suggestions: ${error}`);
        }
    });
    const fetchContinueWatching = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${config.baseUrl}/ajax/home/widget/continue-watching`);
            const data = yield response.json();
            const $ = load(data.html);
            return yield scrapeCard($);
        }
        catch (error) {
            throw new Error(`Failed to fetch continue watching: ${error}`);
        }
    });
    const fetchWatchList = (watchListType) => __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${config.baseUrl}/ajax/user/watchlist/${watchListType}`);
            const data = yield response.json();
            const $ = load(data.html);
            return yield scrapeCard($);
        }
        catch (error) {
            throw new Error(`Failed to fetch watch list: ${error}`);
        }
    });
    const fetchAnimeInfo = (id) => __awaiter(this, void 0, void 0, function* () {
        try {
            const animeUrl = `${config.baseUrl}/${id}`;
            const response = yield fetch(animeUrl);
            const data = yield response.text();
            const $ = load(data);
            const info = {
                id: id,
                title: $('.anisc-detail h2.film-name').text().trim(),
                url: animeUrl,
                genres: [],
                totalEpisodes: 0,
            };
            info.image = $('.film-poster img').attr('src');
            info.description = $('.film-description .text').text().trim();
            // Extract genres
            $('.item-list a[href*="/genre/"]').each((_, el) => {
                var _a;
                (_a = info.genres) === null || _a === void 0 ? void 0 : _a.push($(el).text().trim());
            });
            // Extract other info from the info list
            $('.anisc-info .item').each((_, item) => {
                const label = $(item).find('.item-head').text().trim().toLowerCase();
                const value = $(item).find('.name').text().trim() || $(item).text().replace($(item).find('.item-head').text(), '').trim();
                if (label.includes('studio'))
                    info.studios = [value];
                if (label.includes('duration'))
                    info.duration = value;
                if (label.includes('status')) {
                    switch (value) {
                        case 'Finished Airing':
                            info.status = MediaStatusEnum.COMPLETED;
                            break;
                        case 'Currently Airing':
                            info.status = MediaStatusEnum.ONGOING;
                            break;
                        case 'Not yet aired':
                            info.status = MediaStatusEnum.NOT_YET_AIRED;
                            break;
                        default:
                            info.status = MediaStatusEnum.UNKNOWN;
                            break;
                    }
                }
                if (label.includes('type'))
                    info.type = value;
                if (label.includes('score'))
                    info.rating = parseFloat(value);
                if (label.includes('premiered'))
                    info.releaseDate = value;
                if (label.includes('japanese'))
                    info.japaneseTitle = value;
            });
            // Check for sub/dub availability
            const hasSub = $('div.film-stats div.tick div.tick-item.tick-sub').length > 0;
            const hasDub = $('div.film-stats div.tick div.tick-item.tick-dub').length > 0;
            if (hasSub) {
                info.subOrDub = SubOrSubEnum.SUB;
                info.hasSub = hasSub;
            }
            if (hasDub) {
                info.subOrDub = SubOrSubEnum.DUB;
                info.hasDub = hasDub;
            }
            if (hasSub && hasDub) {
                info.subOrDub = SubOrSubEnum.BOTH;
            }
            // Fetch episodes
            const episodesResponse = yield fetch(`${config.baseUrl}/ajax/v2/episode/list/${id.split('-').pop()}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': `${config.baseUrl}/watch/${id}`,
                },
            });
            const episodesData = yield episodesResponse.json();
            const $$ = load(episodesData.html);
            const episodeElements = $$('div.detail-infor-content > div > a');
            const subCount = parseInt($('div.film-stats div.tick div.tick-item.tick-sub').text().trim()) || 0;
            const dubCount = parseInt($('div.film-stats div.tick div.tick-item.tick-dub').text().trim()) || 0;
            info.totalEpisodes = episodeElements.length;
            info.episodes = [];
            episodeElements.each((i, el) => {
                var _a, _b;
                const $el = $$(el);
                const href = $el.attr('href') || '';
                const number = parseInt($el.attr('data-number') || '0');
                (_a = info.episodes) === null || _a === void 0 ? void 0 : _a.push({
                    id: ((_b = href.split('/')[2]) === null || _b === void 0 ? void 0 : _b.replace('?ep=', '$episode$')) || '',
                    number: number,
                    title: $el.attr('title'),
                    isFiller: $el.hasClass('ssl-item-filler'),
                    isSubbed: number <= subCount,
                    isDubbed: number <= dubCount,
                    url: config.baseUrl + href,
                });
            });
            return info;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    const fetchEpisodeSources = (episodeId_1, ...args_1) => __awaiter(this, [episodeId_1, ...args_1], void 0, function* (episodeId, server = StreamingServersEnum.VidCloud, subOrDub = SubOrSubEnum.SUB) {
        if (episodeId.startsWith('http')) {
            const serverUrl = new URL(episodeId);
            switch (server) {
                case StreamingServersEnum.VidCloud:
                    return Object.assign({ headers: { Referer: serverUrl.href } }, (yield MegaCloud({
                        axios: fetch,
                        load,
                        USER_AGENT: ctx.USER_AGENT,
                        logger: ctx.logger,
                    }).extract(serverUrl, config.baseUrl)));
                case StreamingServersEnum.StreamSB:
                    return {
                        headers: {
                            'Referer': serverUrl.href,
                            'watchsb': 'streamsb',
                            'User-Agent': ctx.USER_AGENT,
                        },
                        sources: yield new StreamSB({
                            axios: fetch,
                            load,
                            USER_AGENT: ctx.USER_AGENT,
                            logger: ctx.logger,
                        }).extract(serverUrl, true),
                    };
                case StreamingServersEnum.StreamTape:
                    if (!StreamTape) {
                        throw new Error('StreamTape extractor is not available');
                    }
                    return {
                        headers: { 'Referer': serverUrl.href, 'User-Agent': ctx.USER_AGENT },
                        sources: yield new StreamTape({
                            axios: fetch,
                            load,
                            USER_AGENT: ctx.USER_AGENT,
                            logger: ctx.logger,
                        }).extract(serverUrl),
                    };
                default:
                case StreamingServersEnum.VidCloud:
                    return Object.assign({ headers: { Referer: serverUrl.href } }, (yield MegaCloud({
                        axios: fetch,
                        load,
                        USER_AGENT: ctx.USER_AGENT,
                        logger: ctx.logger,
                    }).extract(serverUrl, config.baseUrl)));
            }
        }
        if (!episodeId.includes('$episode$'))
            throw new Error('Invalid episode id');
        episodeId = `${config.baseUrl}/watch/${episodeId.replace('$episode$', '?ep=').replace(/\$auto|\$sub|\$dub/gi, '')}`;
        try {
            const response = yield fetch(`${config.baseUrl}/ajax/v2/episode/servers?episodeId=${episodeId.split('?ep=')[1]}`);
            const data = yield response.json();
            const $ = load(data.html);
            let serverId = '';
            try {
                switch (server) {
                    case StreamingServersEnum.VidCloud:
                        serverId = retrieveServerId($, 1, subOrDub);
                        if (!serverId)
                            throw new Error('RapidCloud not found');
                        break;
                    case StreamingServersEnum.VidStreaming:
                        serverId = retrieveServerId($, 4, subOrDub);
                        if (!serverId)
                            throw new Error('vidtreaming not found');
                        break;
                    case StreamingServersEnum.StreamSB:
                        serverId = retrieveServerId($, 5, subOrDub);
                        if (!serverId)
                            throw new Error('StreamSB not found');
                        break;
                    case StreamingServersEnum.StreamTape:
                        serverId = retrieveServerId($, 3, subOrDub);
                        if (!serverId)
                            throw new Error('StreamTape not found');
                        break;
                }
            }
            catch (err) {
                throw new Error("Couldn't find server. Try another server");
            }
            const sourcesResponse = yield fetch(`${config.baseUrl}/ajax/v2/episode/sources?id=${serverId}`);
            const sourcesData = yield sourcesResponse.json();
            const { link } = sourcesData;
            return yield fetchEpisodeSources(link, server, SubOrSubEnum.SUB);
        }
        catch (err) {
            throw err;
        }
    });
    const fetchEpisodeServers = (episodeId) => __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${config.baseUrl}/ajax/v2/episode/servers?episodeId=${episodeId}`);
            const data = yield response.json();
            const $ = load(data.html);
            const servers = [];
            $('.server-item').each((_, element) => {
                const name = $(element).text().trim();
                const url = $(element).attr('data-id') || '';
                servers.push({
                    name: name,
                    url,
                });
            });
            return servers;
        }
        catch (error) {
            throw new Error(`Failed to fetch episode servers: ${error}`);
        }
    });
    const verifyLoginState = (connectSid) => __awaiter(this, void 0, void 0, function* () {
        try {
            const headers = {};
            if (connectSid) {
                headers.Cookie = `connect.sid=${connectSid}`;
            }
            const response = yield fetch(`${config.baseUrl}/ajax/login-state`, { headers });
            const data = yield response.json();
            return data.is_login;
        }
        catch (err) {
            return false;
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
        // Core methods
        search,
        fetchAdvancedSearch,
        fetchTopAiring,
        fetchMostPopular,
        fetchMostFavorite,
        fetchLatestCompleted,
        fetchRecentlyUpdated,
        fetchRecentlyAdded,
        fetchTopUpcoming,
        fetchStudio,
        fetchSubbedAnime,
        fetchDubbedAnime,
        fetchMovie,
        fetchTV,
        fetchOVA,
        fetchONA,
        fetchSpecial,
        fetchGenres,
        genreSearch,
        fetchSchedule,
        fetchSpotlight,
        fetchSearchSuggestions,
        fetchContinueWatching,
        fetchWatchList,
        fetchAnimeInfo,
        fetchEpisodeSources,
        fetchEpisodeServers,
        verifyLoginState,
        retrieveServerId,
        scrapeCardPage,
        scrapeCard,
    };
}
// Default export for backward compatibility
exports.default = createZoro;
//# sourceMappingURL=create-zoro.js.map