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
function createAniKoto(ctx, customBaseURL) {
    const { axios, load, extractors, enums, createCustomBaseUrl, PolyURL } = ctx;
    const { StreamSB, MegaCloud, StreamTape } = extractors;
    const { StreamingServers: StreamingServersEnum, SubOrDub: SubOrDubEnum, MediaStatus: MediaStatusEnum, WatchListType: WatchListTypeEnum, } = enums;
    // Provider configuration - use the standardized base URL creation
    const baseUrl = createCustomBaseUrl('https://anikototv.to', customBaseURL);
    const config = {
        name: 'AniKoto',
        languages: 'en',
        classPath: 'ANIME.AniKoto',
        logo: 'https://anikototv.to/favicon-32x32.png',
        baseUrl,
        isNSFW: false,
        isWorking: true,
        isDubAvailableSeparately: true,
    };
    // Helper functions
    const normalizePageNumber = (page) => {
        return page <= 0 ? 1 : page;
    };
    // Main provider functions
    const search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/filter?keyword=${decodeURIComponent(query)}&page=${normalizedPage}`);
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
            const animeUrl = `${config.baseUrl}/watch/${id}`;
            const response = yield fetch(animeUrl);
            const data = yield response.text();
            const $ = load(data);
            const info = {
                id: id,
                title: $('.binfo .info h1.title').text().trim(),
                url: animeUrl,
                genres: [],
                totalEpisodes: 0,
            };
            info.japaneseTitle = $('.binfo .info h1.title').attr('data-jp');
            info.image = $('.binfo .poster img').attr('src');
            info.description = $('.binfo .info .synopsis .content').text().trim();
            // Extract other info from the info list
            $('.binfo .bmeta .meta > div').each((_, item) => {
                var _a;
                const text = $(item).text().trim().toLowerCase();
                let value = $(item).find('span').text().trim();
                // Fallback for simple "Label: Value"
                if (!value) {
                    value = ((_a = $(item).text().split(':')[1]) === null || _a === void 0 ? void 0 : _a.trim()) || '';
                }
                if (text.startsWith('studios:')) {
                    info.studios = $(item)
                        .find('a')
                        .map((_, el) => $(el).text().trim())
                        .get();
                }
                else if (text.startsWith('duration:')) {
                    info.duration = value;
                }
                else if (text.startsWith('status:')) {
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
                else if (text.startsWith('type:')) {
                    info.type = value;
                }
                else if (text.startsWith('mal:')) {
                    info.rating = parseFloat(value);
                }
                else if (text.startsWith('premiered:')) {
                    info.releaseDate = value;
                }
                else if (text.startsWith('genres:')) {
                    info.genres = $(item)
                        .find('a')
                        .map((_, el) => $(el).text().trim())
                        .get();
                }
            });
            // Check for sub/dub availability
            const hasSub = $('.binfo .meta.icons .sub').length > 0;
            const hasDub = $('.binfo .meta.icons .dub').length > 0;
            if (hasSub) {
                info.subOrDub = SubOrDubEnum.SUB;
                info.hasSub = hasSub;
            }
            if (hasDub) {
                info.subOrDub = SubOrDubEnum.DUB;
                info.hasDub = hasDub;
            }
            if (hasSub && hasDub) {
                info.subOrDub = SubOrDubEnum.BOTH;
            }
            //stop execution for 2 seconds
            setTimeout(() => { }, 2000);
            const episodeElements = $('#w-episodes');
            console.log(episodeElements.html());
            // Sub/dub count can be stored on other elements as well for ep count, update if possible if it matches the DOM
            const subCount = parseInt($('.binfo .meta.icons .sub').text().trim() || '0') || 0;
            const dubCount = parseInt($('.binfo .meta.icons .dub').text().trim() || '0') || 0;
            info.totalEpisodes = episodeElements.length;
            info.episodes = [];
            episodeElements.each((i, el) => {
                var _a;
                const $el = $(el);
                const $li = $el.parent();
                const href = $el.attr('href') || '';
                const number = parseInt($el.attr('data-num') || '0');
                (_a = info.episodes) === null || _a === void 0 ? void 0 : _a.push({
                    id: "href.split('/watch/')[1]!",
                    number: number,
                    title: $li.attr('title'),
                    isFiller: $el.hasClass('filler'),
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
    const fetchEpisodeSources = (episodeId_1, ...args_1) => __awaiter(this, [episodeId_1, ...args_1], void 0, function* (episodeId, server = StreamingServersEnum.MegaCloud, subOrDub = SubOrDubEnum.SUB) {
        if (episodeId.startsWith('http')) {
            const serverUrl = new PolyURL(episodeId);
            switch (server) {
                case StreamingServersEnum.MegaCloud:
                    return Object.assign({ headers: { Referer: serverUrl.href } }, (yield MegaCloud().extract(serverUrl, config.baseUrl)));
                default:
                    return Object.assign({ headers: { Referer: serverUrl.href } }, (yield MegaCloud().extract(serverUrl, config.baseUrl)));
            }
        }
        if (!episodeId.includes('$episode$'))
            throw new Error('Invalid episode id');
        episodeId = `${config.baseUrl}/watch/${episodeId.replace('$episode$', '?ep=').replace(/\$auto|\$sub|\$dub/gi, '')}`;
        try {
            const servers = yield fetchEpisodeServers(episodeId.split('?ep=')[1], subOrDub);
            const i = servers.findIndex((s) => s.name.toLowerCase().includes(server));
            if (i === -1) {
                throw new Error(`Server ${server} not found`);
            }
            const serverUrl = new URL(servers[i].url);
            return yield fetchEpisodeSources(serverUrl.href, server, SubOrDubEnum.SUB);
        }
        catch (err) {
            throw err;
        }
    });
    const fetchEpisodeServers = (episodeId, subOrDub) => __awaiter(this, void 0, void 0, function* () {
        try {
            if (episodeId.includes('$episode$'))
                episodeId = episodeId.split('$episode$')[1];
            const response = yield fetch(`${config.baseUrl}/ajax/v2/episode/servers?episodeId=${episodeId}`);
            const data = yield response.json();
            const $ = load(data.html);
            const scrapedServers = [];
            let selector;
            try {
                selector = `.ps_-block.ps_-block-sub.servers-${false ? 'raw' : subOrDub} > .ps__-list .server-item`;
            }
            catch (_a) {
                selector = `.ps_-block.ps_-block-sub.servers-${true ? 'raw' : subOrDub} > .ps__-list .server-item`;
            }
            $(selector).each((_, element) => {
                const name = $(element).text().trim();
                const sourcesId = $(element).attr('data-id') || '';
                const subOrDubValue = $(element).attr('data-type') === 'sub' ? SubOrDubEnum.SUB : SubOrDubEnum.DUB;
                scrapedServers.push({
                    name,
                    sourcesId,
                    subOrDub: subOrDubValue,
                });
            });
            const servers = yield Promise.all(scrapedServers.map((server) => __awaiter(this, void 0, void 0, function* () {
                const { data } = yield axios.get(`https://aniwatchtv.to/ajax/v2/episode/sources?id=${server.sourcesId}`);
                return {
                    name: `megacloud-${server.name.toLowerCase()}`,
                    url: data.link,
                };
            })));
            return servers;
        }
        catch (error) {
            throw new Error(`Failed to fetch episode servers: ${error}`);
        }
    });
    const scrapeCard = ($) => __awaiter(this, void 0, void 0, function* () {
        try {
            const results = [];
            $('#list-items .item').each((i, ele) => {
                const card = $(ele);
                const atag = card.find('.name.d-title');
                const href = atag.attr('href') || card.find('.ani.poster a').attr('href');
                let type = 'Unknown';
                let eps = 0;
                const metaItem = card.find('.m-item').eq(1);
                if (metaItem.find('label').length > 0) {
                    type = metaItem.find('label').text().trim();
                }
                if (metaItem.find('span').length > 0) {
                    eps = parseInt(metaItem.find('span').text().trim(), 10) || 0;
                }
                const subText = card.find('.ep-status.sub span').text().trim();
                const dubText = card.find('.ep-status.dub span').text().trim();
                const totalText = card.find('.ep-status.total span').text().trim();
                results.push({
                    id: href === null || href === void 0 ? void 0 : href.split('/watch/')[1],
                    title: atag.text().trim(),
                    url: href ? (href.startsWith('http') ? href : `${config.baseUrl}${href}`) : '',
                    image: card.find('.ani.poster img').attr('src') || card.find('.ani.poster img').attr('data-src'),
                    japaneseTitle: atag.attr('data-jp'),
                    type: type,
                    sub: parseInt(subText, 10) || 0,
                    dub: parseInt(dubText, 10) || 0,
                    episodes: parseInt(totalText, 10) || eps || 0,
                });
            });
            return results;
        }
        catch (err) {
            //console.log(err);
            throw new Error(`Failed to scrape card: ${err}`);
        }
    });
    const scrapeCardPage = (url, headers) => __awaiter(this, void 0, void 0, function* () {
        var _a;
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
            res.currentPage = parseInt(pagination.find('.page-item.active').text().trim(), 10) || 1;
            const nextPage = pagination.find('a[rel=next]').attr('href') || pagination.find('a[title=Next]').attr('href');
            if (nextPage !== undefined && nextPage !== '') {
                res.hasNextPage = true;
            }
            const totalPages = (_a = pagination.find('a[title=Last]').attr('href')) === null || _a === void 0 ? void 0 : _a.split('=').pop();
            if (totalPages === undefined || totalPages === '') {
                res.totalPages = res.currentPage;
            }
            else {
                res.totalPages = parseInt(totalPages, 10);
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
    // Return the functional provider object
    return Object.assign(Object.assign({}, config), { 
        // Core methods, pass only the necessary methods, dont pass helpers or unused methods
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
        fetchEpisodeServers });
}
// Default export for backward compatibility
exports.default = createAniKoto;
//# sourceMappingURL=create-anikoto.js.map