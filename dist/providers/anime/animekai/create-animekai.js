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
function createAnimeKai(ctx, customBaseURL) {
    const { axios, load, enums, createCustomBaseUrl, USER_AGENT, PolyURL, extractors } = ctx;
    const { StreamingServers: StreamingServersEnum, MediaStatus: MediaStatusEnum, SubOrDub: SubOrDubEnum } = enums;
    const { MegaUp } = extractors;
    const baseUrl = createCustomBaseUrl('https://anikai.to', customBaseURL);
    const apiBase = 'https://enc-dec.app/api';
    const config = {
        name: 'AnimeKai',
        languages: 'en',
        classPath: 'ANIME.AnimeKai',
        logo: 'https://anikai.to/assets/uploads/37585a3ffa8ec292ee9e2255f3f63b48ceca17e5241280b3dc21.png',
        baseUrl,
        isNSFW: false,
        isWorking: true,
        isDubAvailableSeparately: true,
    };
    const buildHeaders = () => ({
        'User-Agent': USER_AGENT ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Connection': 'keep-alive',
        'Accept': 'text/html, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.5',
        'Sec-GPC': '1',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'Priority': 'u=0',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Referer': `${config.baseUrl}/`,
        'Cookie': '__p_mov=1; usertype=guest; session=vLrU4aKItp0QltI2asH83yugyWDsSSQtyl9sxWKO',
    });
    const normalizePage = (page = 1) => (page <= 0 ? 1 : page);
    const scrapeCard = ($) => __awaiter(this, void 0, void 0, function* () {
        const results = [];
        $('.aitem').each((_, element) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            const card = $(element);
            const anchor = card.find('div.inner > a');
            const id = (_a = anchor.attr('href')) === null || _a === void 0 ? void 0 : _a.replace('/watch/', '');
            if (!id)
                return;
            const infoElements = card.find('.info').children();
            const type = (_b = infoElements.last()) === null || _b === void 0 ? void 0 : _b.text().trim();
            results.push({
                id,
                title: anchor.text().trim(),
                url: `${config.baseUrl}${anchor.attr('href')}`,
                image: (_f = (_d = (_c = card.find('img')) === null || _c === void 0 ? void 0 : _c.attr('data-src')) !== null && _d !== void 0 ? _d : (_e = card.find('img')) === null || _e === void 0 ? void 0 : _e.attr('src')) !== null && _f !== void 0 ? _f : undefined,
                japaneseTitle: (_h = (_g = card.find('a.title')) === null || _g === void 0 ? void 0 : _g.attr('data-jp')) === null || _h === void 0 ? void 0 : _h.trim(),
                type: (_j = type) !== null && _j !== void 0 ? _j : undefined,
                sub: parseInt(((_k = card.find('.info span.sub')) === null || _k === void 0 ? void 0 : _k.text()) || '0', 10),
                dub: parseInt(((_l = card.find('.info span.dub')) === null || _l === void 0 ? void 0 : _l.text()) || '0', 10),
                episodes: parseInt(infoElements.eq(-2).text().trim() || ((_m = card.find('.info span.sub')) === null || _m === void 0 ? void 0 : _m.text()) || '0', 10) || 0,
            });
        });
        return results;
    });
    const scrapeCardPage = (url) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const res = {
            currentPage: 0,
            hasNextPage: false,
            totalPages: 0,
            results: [],
        };
        const { data } = yield axios.get(url, { headers: buildHeaders() });
        const $ = load(data);
        const pagination = $('ul.pagination');
        res.currentPage = parseInt(pagination.find('.page-item.active span.page-link').text().trim(), 10) || 0;
        const nextHref = pagination.find('.page-item.active').next().find('a.page-link').attr('href');
        res.hasNextPage = Boolean(nextHref && nextHref.includes('page='));
        const totalHref = pagination.find('.page-item:last-child a.page-link').attr('href');
        res.totalPages =
            totalHref && totalHref.includes('page=')
                ? parseInt((_a = totalHref.split('page=')[1]) !== null && _a !== void 0 ? _a : '0', 10) || 0
                : res.currentPage;
        res.results = yield scrapeCard($);
        if (res.results.length === 0) {
            res.currentPage = 0;
            res.hasNextPage = false;
            res.totalPages = 0;
        }
        return res;
    });
    const search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1) {
        const normalizedPage = normalizePage(page);
        const sanitizedQuery = query.replace(/[^\w]+/g, '+');
        return scrapeCardPage(`${config.baseUrl}/browser?keyword=${sanitizedQuery}&page=${normalizedPage}`);
    });
    const fetchLatestCompleted = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        return scrapeCardPage(`${config.baseUrl}/completed?page=${normalizePage(page)}`);
    });
    const fetchRecentlyAdded = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        return scrapeCardPage(`${config.baseUrl}/recent?page=${normalizePage(page)}`);
    });
    const fetchRecentlyUpdated = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        return scrapeCardPage(`${config.baseUrl}/updates?page=${normalizePage(page)}`);
    });
    const fetchNewReleases = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        return scrapeCardPage(`${config.baseUrl}/new-releases?page=${normalizePage(page)}`);
    });
    const fetchMovie = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        return scrapeCardPage(`${config.baseUrl}/movie?page=${normalizePage(page)}`);
    });
    const fetchTV = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        return scrapeCardPage(`${config.baseUrl}/tv?page=${normalizePage(page)}`);
    });
    const fetchOVA = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        return scrapeCardPage(`${config.baseUrl}/ova?page=${normalizePage(page)}`);
    });
    const fetchONA = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        return scrapeCardPage(`${config.baseUrl}/ona?page=${normalizePage(page)}`);
    });
    const fetchSpecial = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1) {
        return scrapeCardPage(`${config.baseUrl}/special?page=${normalizePage(page)}`);
    });
    const fetchGenres = () => __awaiter(this, void 0, void 0, function* () {
        const genres = [];
        const { data } = yield axios.get(`${config.baseUrl}/home`, { headers: buildHeaders() });
        const $ = load(data);
        $('#menu')
            .find('ul.c4 li a')
            .each((_, element) => {
            const genreText = $(element).text().toLowerCase();
            if (genreText)
                genres.push(genreText);
        });
        return genres;
    });
    const genreSearch = (genre_1, ...args_1) => __awaiter(this, [genre_1, ...args_1], void 0, function* (genre, page = 1) {
        if (!genre) {
            throw new Error('genre is empty');
        }
        return scrapeCardPage(`${config.baseUrl}/genres/${genre}?page=${normalizePage(page)}`);
    });
    const fetchSchedule = (...args_1) => __awaiter(this, [...args_1], void 0, function* (date = new Date().toISOString().split('T')[0]) {
        const res = { results: [] };
        const scheduleUnix = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
        const { data } = yield axios.get(`${config.baseUrl}/ajax/schedule/items?tz=5.5&time=${scheduleUnix}`, {
            headers: buildHeaders(),
        });
        const $ = load(data.result);
        $('ul.collapsed li').each((_, element) => {
            var _a, _b;
            const card = $(element);
            const titleElement = card.find('span.title');
            const episodeText = card.find('span').last().text().trim();
            const id = (_b = (_a = card.find('a').attr('href')) === null || _a === void 0 ? void 0 : _a.split('/')[2]) !== null && _b !== void 0 ? _b : '';
            if (!id)
                return;
            res.results.push({
                id,
                title: titleElement.text().trim(),
                japaneseTitle: titleElement.attr('data-jp') || undefined,
                airingTime: card.find('span.time').text().trim(),
                airingEpisode: episodeText.replace('EP ', ''),
            });
        });
        return res;
    });
    const fetchSpotlight = () => __awaiter(this, void 0, void 0, function* () {
        const res = { results: [] };
        const { data } = yield axios.get(`${config.baseUrl}/home`, { headers: buildHeaders() });
        const $ = load(data);
        $('div.swiper-wrapper > div.swiper-slide').each((_, element) => {
            var _a, _b, _c;
            const card = $(element);
            const titleElement = card.find('div.detail > p.title');
            const id = ((_a = card.find('div.swiper-ctrl > a.btn').attr('href')) === null || _a === void 0 ? void 0 : _a.replace('/watch/', '')) || '';
            if (!id)
                return;
            const infoElements = card.find('div.detail > div.info').children();
            res.results.push({
                id,
                title: titleElement.text(),
                japaneseTitle: titleElement.attr('data-jp') || undefined,
                banner: ((_c = (_b = card.attr('style')) === null || _b === void 0 ? void 0 : _b.match(/background-image:\s*url\(["']?(.+?)["']?\)/)) === null || _c === void 0 ? void 0 : _c[1]) || null,
                url: `${config.baseUrl}/watch/${id}`,
                type: infoElements.eq(-2).text().trim(),
                genres: infoElements
                    .last()
                    .text()
                    .trim()
                    .split(',')
                    .map((genre) => genre.trim()),
                releaseDate: card.find('div.detail > div.mics > div:contains("Release") span').text().trim(),
                quality: card.find('div.detail > div.mics > div:contains("Quality") span').text().trim(),
                sub: parseInt(card.find('div.detail > div.info > span.sub').text().trim() || '0', 10),
                dub: parseInt(card.find('div.detail > div.info > span.dub').text().trim() || '0', 10),
                description: card.find('div.detail > p.desc').text().trim(),
            });
        });
        return res;
    });
    const fetchSearchSuggestions = (query) => __awaiter(this, void 0, void 0, function* () {
        const { data } = yield axios.get(`${config.baseUrl}/ajax/anime/search?keyword=${query.replace(/[^\w]+/g, '+')}`, {
            headers: buildHeaders(),
        });
        const $ = load(data.result.html);
        const res = { results: [] };
        $('a.aitem').each((_, element) => {
            var _a, _b, _c, _d;
            const card = $(element);
            const id = (_a = card.attr('href')) === null || _a === void 0 ? void 0 : _a.split('/')[2];
            if (!id)
                return;
            const infoElements = card.find('.info').children();
            const titleElement = card.find('.title');
            res.results.push({
                id,
                title: titleElement.text().trim(),
                url: `${config.baseUrl}/watch/${id}`,
                image: card.find('.poster img').attr('src') || undefined,
                japaneseTitle: titleElement.attr('data-jp') || undefined,
                type: infoElements.eq(-3).text().trim(),
                year: infoElements.eq(-2).text().trim(),
                sub: parseInt(((_b = card.find('.info span.sub')) === null || _b === void 0 ? void 0 : _b.text()) || '0', 10),
                dub: parseInt(((_c = card.find('.info span.dub')) === null || _c === void 0 ? void 0 : _c.text()) || '0', 10),
                episodes: parseInt(infoElements.eq(-4).text().trim() || ((_d = card.find('.info span.sub')) === null || _d === void 0 ? void 0 : _d.text()) || '0', 10) || 0,
            });
        });
        return res;
    });
    const fetchAnimeInfo = (id) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const info = { id, title: '' };
        const { data } = yield axios.get(`${config.baseUrl}/watch/${id}`, { headers: buildHeaders() });
        const $ = load(data);
        info.title = $('.entity-scroll > .title').text().trim();
        info.japaneseTitle = (_a = $('.entity-scroll > .title').attr('data-jp')) === null || _a === void 0 ? void 0 : _a.trim();
        info.image = $('div.poster > div > img').attr('src');
        info.description = $('.entity-scroll > .desc').text().trim();
        info.type = $('.entity-scroll > .info').children().last().text().trim().toUpperCase();
        info.url = `${config.baseUrl}/watch/${id}`;
        info.recommendations = [];
        $('section.sidebar-section:not(#related-anime) .aitem-col .aitem').each((_, element) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const card = $(element);
            const recommendationId = (_a = card.attr('href')) === null || _a === void 0 ? void 0 : _a.replace('/watch/', '');
            if (!recommendationId)
                return;
            (_b = info.recommendations) === null || _b === void 0 ? void 0 : _b.push({
                id: recommendationId,
                title: card.find('.title').text().trim(),
                url: `${config.baseUrl}${card.attr('href')}`,
                image: (_e = (_d = (_c = card.attr('style')) === null || _c === void 0 ? void 0 : _c.match(/background-image:\s*url\('(.+?)'\)/)) === null || _d === void 0 ? void 0 : _d[1]) !== null && _e !== void 0 ? _e : undefined,
                japaneseTitle: (_f = card.find('.title').attr('data-jp')) === null || _f === void 0 ? void 0 : _f.trim(),
                type: card.find('.info').children().last().text().trim(),
                sub: parseInt(((_g = card.find('.info span.sub')) === null || _g === void 0 ? void 0 : _g.text()) || '0', 10),
                dub: parseInt(((_h = card.find('.info span.dub')) === null || _h === void 0 ? void 0 : _h.text()) || '0', 10),
                episodes: parseInt(card.find('.info').children().eq(-2).text().trim() || ((_j = card.find('.info span.sub')) === null || _j === void 0 ? void 0 : _j.text()) || '0', 10) || 0,
            });
        });
        info.relations = [];
        $('section#related-anime .tab-body .aitem-col').each((_, element) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const card = $(element);
            const relationAnchor = card.find('a.aitem');
            const relationId = (_a = relationAnchor.attr('href')) === null || _a === void 0 ? void 0 : _a.replace('/watch/', '');
            if (!relationId)
                return;
            (_b = info.relations) === null || _b === void 0 ? void 0 : _b.push({
                id: relationId,
                title: relationAnchor.find('.title').text().trim(),
                url: `${config.baseUrl}${relationAnchor.attr('href')}`,
                image: (_e = (_d = (_c = relationAnchor.attr('style')) === null || _c === void 0 ? void 0 : _c.match(/background-image:\s*url\('(.+?)'\)/)) === null || _d === void 0 ? void 0 : _d[1]) !== null && _e !== void 0 ? _e : undefined,
                japaneseTitle: (_f = relationAnchor.find('.title').attr('data-jp')) === null || _f === void 0 ? void 0 : _f.trim(),
                type: card.find('.info').children().eq(-2).text().trim(),
                sub: parseInt(((_g = card.find('.info span.sub')) === null || _g === void 0 ? void 0 : _g.text()) || '0', 10),
                dub: parseInt(((_h = card.find('.info span.dub')) === null || _h === void 0 ? void 0 : _h.text()) || '0', 10),
                relationType: card.find('.info').children().last().text().trim(),
                episodes: parseInt(card.find('.info').children().eq(-3).text().trim() || ((_j = card.find('.info span.sub')) === null || _j === void 0 ? void 0 : _j.text()) || '0', 10) || 0,
            });
        });
        const hasSub = $('.entity-scroll > .info > span.sub').length > 0;
        const hasDub = $('.entity-scroll > .info > span.dub').length > 0;
        if (hasSub && hasDub) {
            info.subOrDub = SubOrDubEnum.BOTH;
        }
        else if (hasSub) {
            info.subOrDub = SubOrDubEnum.SUB;
        }
        else if (hasDub) {
            info.subOrDub = SubOrDubEnum.DUB;
        }
        info.hasSub = hasSub;
        info.hasDub = hasDub;
        info.genres = [];
        $('.entity-scroll > .detail')
            .find("div:contains('Genres')")
            .each(function () {
            var _a;
            const genre = $(this).text().trim();
            if (genre)
                (_a = info.genres) === null || _a === void 0 ? void 0 : _a.push(genre);
        });
        const statusText = $('.entity-scroll > .detail').find("div:contains('Status') > span").text().trim();
        switch (statusText) {
            case 'Completed':
                info.status = MediaStatusEnum.COMPLETED;
                break;
            case 'Releasing':
                info.status = MediaStatusEnum.ONGOING;
                break;
            case 'Not yet aired':
                info.status = MediaStatusEnum.NOT_YET_AIRED;
                break;
            default:
                info.status = MediaStatusEnum.UNKNOWN;
                break;
        }
        info.season = $('.entity-scroll > .detail').find("div:contains('Premiered') > span").text().trim();
        const totalEpisodes = $('div.eplist > ul > li').length;
        info.totalEpisodes = totalEpisodes;
        const aniId = $('.rate-box#anime-rating').attr('data-id');
        if (!aniId) {
            throw new Error('Failed to locate anime id');
        }
        const episodeToken = yield GenerateToken(aniId);
        const episodesResponse = yield axios.get(`${config.baseUrl}/ajax/episodes/list?ani_id=${aniId}&_=${episodeToken}`, {
            headers: Object.assign({ 'X-Requested-With': 'XMLHttpRequest', 'Referer': `${config.baseUrl}/watch/${id}` }, buildHeaders()),
        });
        const $$ = load(episodesResponse.data.result);
        const subCount = parseInt($('.entity-scroll > .info > span.sub').text().trim() || '0', 10);
        const dubCount = parseInt($('.entity-scroll > .info > span.dub').text().trim() || '0', 10);
        info.episodes = [];
        $$('div.eplist > ul > li > a').each((_, element) => {
            var _a;
            const el = $$(element);
            const href = `${el.attr('href')}ep=${el.attr('num')}` || '';
            const number = parseInt(el.attr('data-number') || '0', 10);
            const token = el.attr('token');
            if (!token)
                return;
            const epId = `${info.id}$ep=${el.attr('num')}$token=${token}`;
            (_a = info.episodes) === null || _a === void 0 ? void 0 : _a.push({
                id: epId,
                number,
                title: el.children('span').text().trim(),
                isFiller: el.hasClass('filler'),
                isSubbed: number <= subCount,
                isDubbed: number <= dubCount,
                url: `${config.baseUrl}${href}`,
            });
        });
        return info;
    });
    const fetchEpisodeServers = (episodeId_1, ...args_1) => __awaiter(this, [episodeId_1, ...args_1], void 0, function* (episodeId, subOrDub = SubOrDubEnum.SUB) {
        let requestUrl = episodeId;
        if (!episodeId.startsWith(`${config.baseUrl}/ajax`)) {
            const token = episodeId.split('$token=')[1];
            if (!token) {
                throw new Error('Invalid episodeId format: missing token');
            }
            const listToken = yield GenerateToken(token);
            requestUrl = `${config.baseUrl}/ajax/links/list?token=${token}&_=${listToken}`;
        }
        const { data } = yield axios.get(requestUrl, { headers: buildHeaders() });
        const $ = load(data.result);
        const servers = [];
        const subOrDubKey = subOrDub === SubOrDubEnum.SUB ? 'softsub' : 'dub';
        const serverItems = $(`.server-items.lang-group[data-id="${subOrDubKey}"] .server`);
        yield Promise.all(serverItems.map((_, server) => __awaiter(this, void 0, void 0, function* () {
            const serverId = $(server).attr('data-lid');
            if (!serverId)
                return;
            const viewToken = yield GenerateToken(serverId);
            const { data: linkData } = yield axios.get(`${config.baseUrl}/ajax/links/view?id=${serverId}&_=${viewToken}`, {
                headers: buildHeaders(),
            });
            const decoded = yield DecodeIframeData(linkData.result);
            servers.push({
                name: `MegaUp ${$(server).text().trim()}`.toLowerCase(),
                url: decoded.url,
                intro: {
                    start: decoded.skip.intro[0],
                    end: decoded.skip.intro[1],
                },
                outro: {
                    start: decoded.skip.outro[0],
                    end: decoded.skip.outro[1],
                },
            });
        })));
        return servers;
    });
    const fetchEpisodeSources = (episodeId_1, ...args_1) => __awaiter(this, [episodeId_1, ...args_1], void 0, function* (episodeId, server = StreamingServersEnum.MegaUp, subOrDub = SubOrDubEnum.SUB) {
        var _a, _b;
        if (episodeId.startsWith('http')) {
            const serverUrl = new PolyURL(episodeId);
            switch (server) {
                case StreamingServersEnum.MegaUp:
                    return Object.assign(Object.assign({ headers: { Referer: serverUrl.href } }, (yield MegaUp().extract(serverUrl))), { download: serverUrl.href.replace(/\/e\//, '/download/') });
                default:
                    return Object.assign(Object.assign({ headers: { Referer: serverUrl.href } }, (yield MegaUp().extract(serverUrl))), { download: serverUrl.href.replace(/\/e\//, '/download/') });
            }
        }
        try {
            const servers = yield fetchEpisodeServers(episodeId, subOrDub);
            const i = servers.findIndex((s) => s.name.toLowerCase().includes(server)); //for now only megaup is available, hence directly using it
            if (i === -1) {
                throw new Error(`Server ${server} not found`);
            }
            const serverUrl = new URL(servers[i].url);
            const sources = yield fetchEpisodeSources(serverUrl.href, server, subOrDub);
            sources.intro = (_a = servers[i]) === null || _a === void 0 ? void 0 : _a.intro;
            sources.outro = (_b = servers[i]) === null || _b === void 0 ? void 0 : _b.outro;
            return sources;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    const GenerateToken = (text) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield axios.get(`${apiBase}/enc-kai`, {
                params: { text },
            });
            return data.result;
        }
        catch (error) {
            throw new Error(error.message);
        }
    });
    const DecodeIframeData = (payload) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield axios.post(`${apiBase}/dec-kai`, { text: payload });
            return data.result;
        }
        catch (error) {
            throw new Error(error.message);
        }
    });
    return {
        name: config.name,
        get baseUrl() {
            return config.baseUrl;
        },
        set baseUrl(value) {
            config.baseUrl = value.startsWith('http') ? value : `http://${value}`;
        },
        logo: config.logo,
        classPath: config.classPath,
        search,
        fetchLatestCompleted,
        fetchRecentlyAdded,
        fetchRecentlyUpdated,
        fetchNewReleases,
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
        fetchEpisodeSources,
        fetchEpisodeServers,
    };
}
exports.default = createAnimeKai;
//# sourceMappingURL=create-animekai.js.map