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
    const { MegaPlay } = extractors;
    const { StreamingServers: StreamingServersEnum, SubOrDub: SubOrDubEnum, MediaStatus: MediaStatusEnum, } = enums;
    // Provider configuration
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
    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    const ajaxHeaders = (referer) => (Object.assign(Object.assign({}, defaultHeaders), { 'X-Requested-With': 'XMLHttpRequest', 'Referer': referer || config.baseUrl }));
    const normalizePageNumber = (page) => {
        return page <= 0 ? 1 : page;
    };
    // Helper to scrape card lists across search, types, genres, statuses
    const scrapeCardPage = (url_1, ...args_1) => __awaiter(this, [url_1, ...args_1], void 0, function* (url, page = 1) {
        try {
            const { data } = yield axios.get(url, { headers: defaultHeaders });
            const $ = load(data);
            const results = [];
            $('.item').each((_, el) => {
                const item = $(el);
                const nameEl = item.find('.name.d-title, .name').first();
                const title = nameEl.text().trim();
                const japaneseTitle = nameEl.attr('data-jp') || undefined;
                const href = item.find('a.name, .poster a').first().attr('href') || '';
                const match = href.match(/\/watch\/([^/?#]+)/);
                const id = match ? match[1] : href.replace(/^.*\/watch\//, '').replace(/\/.*$/, '');
                const image = item.find('.poster img, img').attr('src') || '';
                const subText = item.find('.ep-status.sub').first().text().trim();
                const sub = parseInt(subText, 10) || 0;
                const dubText = item.find('.ep-status.dub').first().text().trim();
                const dub = parseInt(dubText, 10) || 0;
                const type = (item.find('.meta .right').first().text().trim() || 'TV');
                const ratingStr = item.find('.m-item.rated span').first().text().trim();
                const rating = ratingStr ? parseFloat(ratingStr) : undefined;
                if (id && title) {
                    results.push({
                        id,
                        title,
                        japaneseTitle,
                        image,
                        url: href.startsWith('http') ? href : `${config.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`,
                        type,
                        sub,
                        dub,
                        rating,
                    });
                }
            });
            const hasNextPage = $('.pagination .page-item .page-link[rel="next"]').length > 0 ||
                $('.pagination .page-item.active').next('.page-item').find('.page-link').length > 0;
            const lastPageHref = $('.pagination .page-item a[title="Last"]').attr('href') || '';
            const lastPageMatch = lastPageHref.match(/page=(\d+)/);
            const totalPages = lastPageMatch ? parseInt(lastPageMatch[1], 10) : undefined;
            return {
                currentPage: page,
                hasNextPage,
                totalPages,
                results,
            };
        }
        catch (err) {
            throw new Error(`[AniKoto] Failed to scrape card page: ${err.message}`);
        }
    });
    // Main provider functions
    const search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${normalizedPage}`, normalizedPage);
    });
    const fetchAdvancedSearch = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1, type, status, rated, score, season, language, _startDate, _endDate, sort, genres) {
        const normalizedPage = normalizePageNumber(page);
        const params = new URLSearchParams();
        params.set('page', String(normalizedPage));
        if (type)
            params.set('type', type);
        if (status)
            params.set('status', status);
        if (rated)
            params.set('rated', rated);
        if (score)
            params.set('score', String(score));
        if (season)
            params.set('season', season);
        if (language)
            params.set('language', language);
        if (sort)
            params.set('sort', sort);
        if (genres && genres.length > 0) {
            for (const g of genres) {
                params.append('genres[]', g);
            }
        }
        return scrapeCardPage(`${config.baseUrl}/filter?${params.toString()}`, normalizedPage);
    });
    const fetchTopAiring = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/status/currently-airing?page=${normalizedPage}`, normalizedPage);
    });
    const fetchMostPopular = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/most-viewed?page=${normalizedPage}`, normalizedPage);
    });
    const fetchMostFavorite = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/filter?sort=most_favorite&page=${normalizedPage}`, normalizedPage);
    });
    const fetchLatestCompleted = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/status/finished-airing?page=${normalizedPage}`, normalizedPage);
    });
    const fetchRecentlyUpdated = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/latest-updated?page=${normalizedPage}`, normalizedPage);
    });
    const fetchRecentlyAdded = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/new-release?page=${normalizedPage}`, normalizedPage);
    });
    const fetchTopUpcoming = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/status/not-yet-aired?page=${normalizedPage}`, normalizedPage);
    });
    const fetchStudio = (studioId_1, ...args_1) => __awaiter(this, [studioId_1, ...args_1], void 0, function* (studioId, page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/studio/${studioId}?page=${normalizedPage}`, normalizedPage);
    });
    const fetchSubbedAnime = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/filter?language=1&page=${normalizedPage}`, normalizedPage);
    });
    const fetchDubbedAnime = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/filter?language=2&page=${normalizedPage}`, normalizedPage);
    });
    const fetchMovie = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/type/movie?page=${normalizedPage}`, normalizedPage);
    });
    const fetchTV = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/type/tv?page=${normalizedPage}`, normalizedPage);
    });
    const fetchOVA = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/type/ova?page=${normalizedPage}`, normalizedPage);
    });
    const fetchONA = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/type/ona?page=${normalizedPage}`, normalizedPage);
    });
    const fetchSpecial = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/type/special?page=${normalizedPage}`, normalizedPage);
    });
    const fetchGenres = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield axios.get(`${config.baseUrl}/home`, { headers: defaultHeaders });
            const $ = load(data);
            const genres = [];
            $('a[href*="/genre/"]').each((_, el) => {
                const g = $(el).text().trim();
                if (g && !genres.includes(g)) {
                    genres.push(g);
                }
            });
            return genres.length > 0
                ? genres
                : [
                    'Action',
                    'Adventure',
                    'Comedy',
                    'Drama',
                    'Fantasy',
                    'Horror',
                    'Mystery',
                    'Romance',
                    'Sci-Fi',
                    'Slice of Life',
                    'Supernatural',
                ];
        }
        catch (_a) {
            return [
                'Action',
                'Adventure',
                'Comedy',
                'Drama',
                'Fantasy',
                'Horror',
                'Mystery',
                'Romance',
                'Sci-Fi',
                'Slice of Life',
                'Supernatural',
            ];
        }
    });
    const genreSearch = (genre_1, ...args_1) => __awaiter(this, [genre_1, ...args_1], void 0, function* (genre, page = 1) {
        const normalizedPage = normalizePageNumber(page);
        const cleanGenre = genre.toLowerCase().replace(/\s+/g, '-');
        return scrapeCardPage(`${config.baseUrl}/genre/${cleanGenre}?page=${normalizedPage}`, normalizedPage);
    });
    const fetchSchedule = (date) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const res = yield axios.get(`${config.baseUrl}/ajax/schedule/date?date=${date}&tzOffset=-330`, { headers: ajaxHeaders() });
            const html = ((_a = res.data) === null || _a === void 0 ? void 0 : _a.result) || res.data;
            const $ = load(html);
            const results = [];
            $('a.item').each((_, el) => {
                const item = $(el);
                const href = item.attr('href') || '';
                const match = href.match(/\/watch\/([^/?#]+)/);
                const id = match ? match[1] : href;
                const title = item.find('.title.d-title, .title').text().trim();
                const time = item.find('.time').text().trim();
                const episodeText = item.find('.ep span').text().trim();
                if (id && title) {
                    results.push({
                        id,
                        title,
                        url: href,
                        time,
                        episodeText,
                    });
                }
            });
            return results;
        }
        catch (err) {
            throw new Error(`[AniKoto] Failed to fetch schedule: ${err.message}`);
        }
    });
    const fetchSpotlight = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield axios.get(`${config.baseUrl}/home`, { headers: defaultHeaders });
            const $ = load(data);
            const results = [];
            $('.swiper-slide.item').each((_, el) => {
                const slide = $(el);
                const title = slide.find('.title.d-title, .title').text().trim();
                const japaneseTitle = slide.find('.title.d-title').attr('data-jp') || undefined;
                const href = slide.find('a[href*="/watch/"]').first().attr('href') || '';
                const match = href.match(/\/watch\/([^/?#]+)/);
                const id = match ? match[1] : '';
                const description = slide.find('.synopsis').text().trim() || undefined;
                const image = slide.find('img').attr('src') || '';
                if (id && title) {
                    results.push({
                        id,
                        title,
                        japaneseTitle,
                        description,
                        image,
                        url: href.startsWith('http') ? href : `${config.baseUrl}${href}`,
                    });
                }
            });
            return results;
        }
        catch (err) {
            throw new Error(`[AniKoto] Failed to fetch spotlight: ${err.message}`);
        }
    });
    const fetchSearchSuggestions = (query) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const res = yield axios.get(`${config.baseUrl}/ajax/anime/search?keyword=${encodeURIComponent(query)}`, { headers: ajaxHeaders() });
            const html = ((_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.result) === null || _b === void 0 ? void 0 : _b.html) || ((_c = res.data) === null || _c === void 0 ? void 0 : _c.result) || res.data;
            const $ = load(html);
            const suggestions = [];
            $('a.item').each((_, el) => {
                const item = $(el);
                const href = item.attr('href') || '';
                const match = href.match(/\/watch\/([^/?#]+)/);
                const id = match ? match[1] : '';
                const title = item.find('.name.d-title, .name').text().trim();
                const japaneseTitle = item.find('.name.d-title').attr('data-jp') || undefined;
                const image = item.find('.poster img, img').attr('src') || '';
                if (id && title) {
                    suggestions.push({
                        id,
                        title,
                        japaneseTitle,
                        image,
                        url: href,
                    });
                }
            });
            return suggestions;
        }
        catch (_d) {
            return [];
        }
    });
    const fetchAnimeInfo = (id) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const animeSlug = id.replace(/^\/watch\//, '').replace(/\/.*$/, '');
            const watchUrl = `${config.baseUrl}/watch/${animeSlug}`;
            const { data: pageHtml } = yield axios.get(watchUrl, { headers: defaultHeaders });
            const $ = load(pageHtml);
            const title = $('#w-info .title.d-title, h1.title').first().text().trim();
            const japaneseTitle = $('#w-info .title.d-title').attr('data-jp') ||
                ((_a = $('#w-info .names').text().split(';')[1]) === null || _a === void 0 ? void 0 : _a.trim()) ||
                title;
            const image = $('#w-info .poster img').attr('src') || $('meta[property="og:image"]').attr('content') || '';
            const description = $('#w-info .synopsis .content, .synopsis').text().replace(/\[more\]/g, '').trim();
            // Extract anime ID (data-id e.g. 7174)
            const dataId = $('#watch-main').attr('data-id') ||
                $('.layout-page-watchtv').attr('data-id') ||
                $('#w-rating').attr('data-id') ||
                $('[data-id]').first().attr('data-id');
            // Extract metadata
            let type = 'TV';
            let premiered;
            let aired;
            let status = MediaStatusEnum.UNKNOWN;
            const genres = [];
            const studios = [];
            const producers = [];
            let duration;
            let rating;
            $('#w-info .bmeta .meta div').each((_, el) => {
                const text = $(el).text();
                if (text.includes('Type:')) {
                    type = $(el).find('span').text().trim();
                }
                else if (text.includes('Premiered:')) {
                    premiered = $(el).find('span').text().trim();
                }
                else if (text.includes('Aired:')) {
                    aired = $(el).find('span').text().trim();
                }
                else if (text.includes('Status:')) {
                    const s = $(el).find('span').text().trim().toLowerCase();
                    if (s.includes('finished'))
                        status = MediaStatusEnum.COMPLETED;
                    else if (s.includes('airing') || s.includes('ongoing'))
                        status = MediaStatusEnum.ONGOING;
                    else if (s.includes('not yet'))
                        status = MediaStatusEnum.NOT_YET_AIRED;
                }
                else if (text.includes('Genres:')) {
                    $(el).find('a').each((_, a) => {
                        const g = $(a).text().trim();
                        if (g && !genres.includes(g))
                            genres.push(g);
                    });
                }
                else if (text.includes('Studios:')) {
                    $(el).find('a').each((_, a) => {
                        const st = $(a).text().trim();
                        if (st && !studios.includes(st))
                            studios.push(st);
                    });
                }
                else if (text.includes('Producers:')) {
                    $(el).find('a').each((_, a) => {
                        const pr = $(a).text().trim();
                        if (pr && pr !== 'unknown' && !producers.includes(pr))
                            producers.push(pr);
                    });
                }
                else if (text.includes('Duration:')) {
                    duration = $(el).find('span').text().trim();
                }
                else if (text.includes('MAL:')) {
                    const r = $(el).find('span').text().trim();
                    rating = r ? parseFloat(r) : undefined;
                }
            });
            // Fetch episodes from /ajax/episode/list/${dataId}
            const episodes = [];
            if (dataId) {
                try {
                    const epRes = yield axios.get(`${config.baseUrl}/ajax/episode/list/${dataId}`, {
                        headers: ajaxHeaders(watchUrl),
                    });
                    const epHtml = ((_b = epRes.data) === null || _b === void 0 ? void 0 : _b.result) || epRes.data;
                    const $ep = load(epHtml);
                    $ep('li a').each((_, a) => {
                        const anchor = $ep(a);
                        const dataIds = anchor.attr('data-ids') || anchor.attr('data-id') || '';
                        const numAttr = anchor.attr('data-num') || anchor.attr('data-slug') || anchor.find('b').text().trim();
                        const num = parseInt(numAttr, 10) || 1;
                        const epTitle = anchor.find('.d-title').text().trim() || `Episode ${num}`;
                        if (dataIds) {
                            episodes.push({
                                id: `${animeSlug}$episode$${dataIds}`,
                                number: num,
                                title: epTitle,
                                url: `${config.baseUrl}/watch/${animeSlug}/ep-${num}`,
                            });
                        }
                    });
                }
                catch (_c) {
                    // Keep empty episodes if request fails
                }
            }
            return {
                id: animeSlug,
                title,
                japaneseTitle,
                image,
                description,
                type,
                status,
                genres,
                studios,
                producers,
                duration,
                rating,
                aired,
                season: premiered,
                totalEpisodes: episodes.length > 0 ? episodes.length : undefined,
                episodes,
            };
        }
        catch (err) {
            throw new Error(`[AniKoto] Failed to fetch anime info: ${err.message}`);
        }
    });
    const fetchEpisodeServers = (episodeId_1, ...args_1) => __awaiter(this, [episodeId_1, ...args_1], void 0, function* (episodeId, subOrDub = SubOrDubEnum.SUB) {
        var _a, _b;
        try {
            const dataIds = episodeId.includes('$episode$') ? episodeId.split('$episode$')[1] : episodeId;
            const targetSubDub = subOrDub === SubOrDubEnum.DUB ? 'dub' : 'sub';
            const res = yield axios.get(`${config.baseUrl}/ajax/server/list?servers=${encodeURIComponent(dataIds)}`, { headers: ajaxHeaders() });
            const html = ((_a = res.data) === null || _a === void 0 ? void 0 : _a.result) || res.data;
            const $ = load(html);
            const rawServers = [];
            let serverList = $(`.servers .type[data-type="${targetSubDub}"] li[data-link-id]`);
            if (!serverList.length) {
                // Fallback to any available type
                serverList = $('.servers li[data-link-id]');
            }
            serverList.each((_, el) => {
                const item = $(el);
                const name = item.text().trim();
                const linkId = item.attr('data-link-id');
                if (linkId) {
                    rawServers.push({ name, linkId });
                }
            });
            // Resolve each server link to its embed URL via /ajax/server?get=
            const servers = [];
            for (const s of rawServers) {
                try {
                    const { data: linkData } = yield axios.get(`${config.baseUrl}/ajax/server?get=${encodeURIComponent(s.linkId)}`, { headers: ajaxHeaders() });
                    const embedUrl = (_b = linkData === null || linkData === void 0 ? void 0 : linkData.result) === null || _b === void 0 ? void 0 : _b.url;
                    if (embedUrl) {
                        servers.push({
                            name: `megaplay-${s.name.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`,
                            url: embedUrl,
                        });
                    }
                }
                catch (_c) {
                    // Continue to next server
                }
            }
            return servers;
        }
        catch (err) {
            throw new Error(`[AniKoto] Failed to fetch episode servers: ${err.message}`);
        }
    });
    const fetchEpisodeSources = (episodeId_1, ...args_1) => __awaiter(this, [episodeId_1, ...args_1], void 0, function* (episodeId, server = StreamingServersEnum.MegaPlay, subOrDub = SubOrDubEnum.SUB) {
        if (episodeId.startsWith('http')) {
            const serverUrl = new PolyURL(episodeId);
            switch (server) {
                case StreamingServersEnum.MegaPlay:
                default:
                    return Object.assign({ headers: { Referer: serverUrl.href } }, (yield MegaPlay().extract(serverUrl, config.baseUrl)));
            }
        }
        try {
            const servers = yield fetchEpisodeServers(episodeId, subOrDub);
            if (!servers.length) {
                throw new Error(`[AniKoto] No servers available for episode: ${episodeId}`);
            }
            const matchedServer = servers.find((s) => s.name.toLowerCase().includes(String(server).toLowerCase())) || servers[0];
            const serverUrl = new PolyURL(matchedServer.url);
            return Object.assign({ headers: { Referer: serverUrl.href } }, (yield MegaPlay().extract(serverUrl, config.baseUrl)));
        }
        catch (err) {
            throw new Error(`[AniKoto] Failed to fetch episode sources: ${err.message}`);
        }
    });
    return Object.assign(Object.assign({}, config), { search,
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
        fetchAnimeInfo,
        fetchEpisodeServers,
        fetchEpisodeSources });
}
exports.default = createAniKoto;
//# sourceMappingURL=create-anikoto.js.map