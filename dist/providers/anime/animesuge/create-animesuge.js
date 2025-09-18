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
function createAnimeSuge(ctx, customBaseURL) {
    const { axios, load, extractors, enums, createCustomBaseUrl, PolyURL } = ctx;
    const { MegaCloud } = extractors;
    const { StreamingServers: StreamingServersEnum, SubOrDub: SubOrDubEnum, MediaStatus: MediaStatusEnum } = enums;
    // Provider configuration - use the standardized base URL creation
    const baseUrl = createCustomBaseUrl('https://hianime.to', customBaseURL);
    const config = {
        name: 'AnimeSuge',
        languages: 'en',
        classPath: 'ANIME.AnimeSuge',
        logo: 'https://animesuge.bz/assets/images/favicon.png',
        baseUrl,
        isNSFW: false,
        isWorking: true,
        isDubAvailableSeparately: true,
    };
    // Helper functions
    const normalizePageNumber = (page) => {
        return page <= 0 ? 1 : page;
    };
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Referer': 'https://animesuge.bz/',
        'X-Requested-With': 'XMLHttpRequest',
    };
    // Main provider functions
    const search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1) {
        const normalizedPage = normalizePageNumber(page);
        return scrapeCardPage(`${config.baseUrl}/filter?keyword=${decodeURIComponent(query)}&page=${normalizedPage}`);
    });
    const fetchAnimeInfo = (id) => __awaiter(this, void 0, void 0, function* () {
        try {
            const animeUrl = `${config.baseUrl}/${id}`;
            const { data } = yield axios.get(animeUrl);
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
            const dataId = $('.container').attr('data-id');
            // Fetch episodes
            const { data: epData } = yield axios.get(`${config.baseUrl}/ajax/episode/list/${dataId}`, {
                headers: headers,
            });
            const $$ = load(epData.html);
            console.log($$.html());
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
            console.log(data);
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
                const { data } = yield axios.get(`https://hianime.to/ajax/v2/episode/sources?id=${server.sourcesId}`);
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
            $('.item').each((i, ele) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                const card = $(ele);
                const atag = card.find('.item-top a');
                const id = (_a = atag.attr('href')) === null || _a === void 0 ? void 0 : _a.split('/')[1].split('?')[0];
                const type = (_c = (_b = card.find('.item-status')) === null || _b === void 0 ? void 0 : _b.first()) === null || _c === void 0 ? void 0 : _c.text();
                results.push({
                    id: id,
                    title: atag.text(),
                    url: `${config.baseUrl}${atag.attr('href')}`,
                    image: (_d = card.find('img')) === null || _d === void 0 ? void 0 : _d.attr('data-src'),
                    duration: (_e = card.find('.fdi-duration')) === null || _e === void 0 ? void 0 : _e.text(),
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
            //console.log(err);
            throw new Error(`Failed to scrape card: ${err}`);
        }
    });
    const scrapeCardPage = (url) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const res = {
                currentPage: 0,
                hasNextPage: false,
                totalPages: 0,
                results: [],
            };
            const { data } = yield axios.get(url);
            const $ = load(data);
            const pagination = $('ul.pagination');
            res.currentPage = parseInt((_a = pagination.find('.page-item.active')) === null || _a === void 0 ? void 0 : _a.text());
            const nextPage = (_b = pagination.find('a[title=next]')) === null || _b === void 0 ? void 0 : _b.attr('href');
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
        // Core methods, pass only the necessary methods, dont pass helpers or unused methods
        search,
        fetchAnimeInfo,
        fetchEpisodeSources,
        fetchEpisodeServers,
    };
}
// Default export for backward compatibility
exports.default = createAnimeSuge;
//# sourceMappingURL=create-animesuge.js.map