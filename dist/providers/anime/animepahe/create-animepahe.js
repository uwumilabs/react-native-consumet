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
exports.createAnimePahe = createAnimePahe;
function createAnimePahe(ctx, customBaseURL) {
    const { axios, load, extractors, enums, createCustomBaseUrl, PolyURL, NativeConsumet } = ctx;
    const { Kwik } = extractors;
    const { StreamingServers: StreamingServersEnum, SubOrDub: SubOrDubEnum, MediaStatus: MediaStatusEnum } = enums;
    const { getDdosGuardCookiesWithWebView } = NativeConsumet;
    // Provider configuration - use the standardized base URL creation
    const baseUrl = createCustomBaseUrl('https://animepahe.ru', customBaseURL);
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
    let ddgCookie = null;
    const initDdgCookie = () => __awaiter(this, void 0, void 0, function* () {
        try {
            try {
                ddgCookie = yield getDdosGuardCookiesWithWebView(config.baseUrl);
                // console.log('DDoS-Guard cookie obtained (WebView):', ddgCookie);
            }
            catch (err) {
                console.error('Failed to bypass DDoS-Guard with WebView:', err);
            }
        }
        catch (error) {
            console.error('Failed to initialize DDoS-Guard cookie:', error);
        }
    });
    function Headers(sessionId) {
        const headers = {
            'authority': 'animepahe.ru',
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'sec-ch-ua': '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'x-requested-with': 'XMLHttpRequest',
            'Referer': sessionId ? `${config.baseUrl}/anime/${sessionId}` : `${config.baseUrl}`,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        };
        if (ddgCookie) {
            headers.Cookie = typeof ddgCookie === 'object' && ddgCookie !== null ? ddgCookie.cookie : ddgCookie || '';
        }
        return headers;
    }
    const fetchEpisodes = (session, page) => __awaiter(this, void 0, void 0, function* () {
        const res = yield axios.get(`${config.baseUrl}/api?m=release&id=${session}&sort=episode_asc&page=${page}`, {
            headers: Headers(session),
        });
        const epData = res.data.data;
        return [
            ...epData.map((item) => ({
                id: `${session}/${item.session}`,
                number: item.episode,
                title: item.title,
                image: item.snapshot,
                duration: item.duration,
                isSubbed: item.audio === 'jpn' || item.audio === 'eng',
                isDubbed: item.audio === 'eng',
                releaseDate: item.created_at,
                url: `${config.baseUrl}/play/${session}/${item.session}`,
            })),
        ];
    });
    const search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1) {
        try {
            if (!ddgCookie) {
                yield initDdgCookie();
            }
            const { data } = yield axios.get(`${config.baseUrl}/api?m=search&q=${encodeURIComponent(query)}`, {
                headers: Headers(false),
            });
            const res = {
                results: data.data.map((item) => ({
                    id: item.session,
                    title: item.title,
                    image: item.poster,
                    rating: item.score,
                    releaseDate: item.year,
                    type: item.type,
                })),
            };
            return res;
        }
        catch (err) {
            //console.log(err);
            throw new Error(err.message);
        }
    });
    const fetchAnimeInfo = (id_1, ...args_1) => __awaiter(this, [id_1, ...args_1], void 0, function* (id, episodePage = -1) {
        const animeInfo = {
            id: id,
            title: '',
        };
        try {
            if (!ddgCookie) {
                yield initDdgCookie();
            }
            const res = yield fetch(`${config.baseUrl}/anime/${id}`, {
                headers: Headers(id),
            });
            const data = yield res.text();
            const $ = load(data);
            animeInfo.title = $('div.title-wrapper > h1 > span').first().text();
            animeInfo.image = $('div.anime-poster a').attr('href');
            animeInfo.cover = `https:${$('div.anime-cover').attr('data-src')}`;
            animeInfo.description = $('div.anime-summary').text().trim();
            animeInfo.genres = $('div.anime-genre ul li')
                .map((i, el) => $(el).find('a').attr('title'))
                .get();
            animeInfo.hasSub = true;
            switch ($('div.anime-info p:icontains("Status:") a').text().trim()) {
                case 'Currently Airing':
                    animeInfo.status = MediaStatusEnum.ONGOING;
                    break;
                case 'Finished Airing':
                    animeInfo.status = MediaStatusEnum.COMPLETED;
                    break;
                default:
                    animeInfo.status = MediaStatusEnum.UNKNOWN;
            }
            animeInfo.type = $('div.anime-info > p:contains("Type:") > a').text().trim().toUpperCase();
            animeInfo.releaseDate = $('div.anime-info > p:contains("Aired:")')
                .text()
                .split('to')[0]
                .replace('Aired:', '')
                .trim();
            animeInfo.studios = $('div.anime-info > p:contains("Studio:")').text().replace('Studio:', '').trim().split('\n');
            animeInfo.totalEpisodes = parseInt($('div.anime-info > p:contains("Episodes:")').text().replace('Episodes:', ''));
            animeInfo.recommendations = [];
            $('div.anime-recommendation .col-sm-6').each((i, el) => {
                var _a, _b, _c;
                (_a = animeInfo.recommendations) === null || _a === void 0 ? void 0 : _a.push({
                    id: (_b = $(el).find('.col-2 > a').attr('href')) === null || _b === void 0 ? void 0 : _b.split('/')[2],
                    title: $(el).find('.col-2 > a').attr('title'),
                    image: $(el).find('.col-2 > a > img').attr('src') || $(el).find('.col-2 > a > img').attr('data-src'),
                    url: `${config.baseUrl}/anime/${(_c = $(el).find('.col-2 > a').attr('href')) === null || _c === void 0 ? void 0 : _c.split('/')[2]}`,
                    releaseDate: $(el).find('div.col-9 > a').text().trim(),
                    status: $(el).find('div.col-9 > strong').text().trim(),
                });
            });
            animeInfo.relations = [];
            $('div.anime-relation .col-sm-6').each((i, el) => {
                var _a, _b, _c;
                (_a = animeInfo.relations) === null || _a === void 0 ? void 0 : _a.push({
                    id: (_b = $(el).find('.col-2 > a').attr('href')) === null || _b === void 0 ? void 0 : _b.split('/')[2],
                    title: $(el).find('.col-2 > a').attr('title'),
                    image: $(el).find('.col-2 > a > img').attr('src') || $(el).find('.col-2 > a > img').attr('data-src'),
                    url: `${config.baseUrl}/anime/${(_c = $(el).find('.col-2 > a').attr('href')) === null || _c === void 0 ? void 0 : _c.split('/')[2]}`,
                    releaseDate: $(el).find('div.col-9 > a').text().trim(),
                    status: $(el).find('div.col-9 > strong').text().trim(),
                    relationType: $(el).find('h4 > span').text().trim(),
                });
            });
            animeInfo.episodes = [];
            if (episodePage < 0) {
                const { data: { last_page, data }, } = yield axios.get(`${config.baseUrl}/api?m=release&id=${id}&sort=episode_asc&page=1`, {
                    headers: Headers(id),
                });
                animeInfo.episodePages = last_page;
                animeInfo.episodes.push(...data.map((item) => ({
                    id: `${id}/${item.session}`,
                    number: item.episode,
                    title: item.title,
                    image: item.snapshot,
                    duration: item.duration,
                    isSubbed: item.audio === 'jpn' || item.audio === 'eng',
                    isDubbed: item.audio === 'eng',
                    releaseDate: item.created_at,
                    url: `${config.baseUrl}/play/${id}/${item.session}`,
                })));
                for (let i = 1; i < last_page; i++) {
                    animeInfo.episodes.push(...(yield fetchEpisodes(id, i + 1)));
                }
            }
            else {
                animeInfo.episodes.push(...(yield fetchEpisodes(id, episodePage)));
            }
            return animeInfo;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    const fetchEpisodeSources = (episodeId_1, ...args_1) => __awaiter(this, [episodeId_1, ...args_1], void 0, function* (episodeId, server = StreamingServersEnum.Kwik, subOrDub = SubOrDubEnum.SUB) {
        if (episodeId.startsWith('http')) {
            const serverUrl = new PolyURL(episodeId);
            switch (server) {
                case StreamingServersEnum.Kwik:
                    return Object.assign({ headers: { Referer: serverUrl.href } }, (yield Kwik().extract(serverUrl)));
                default:
                    return Object.assign({ headers: { Referer: serverUrl.href } }, (yield Kwik().extract(serverUrl)));
            }
        }
        try {
            if (!ddgCookie) {
                yield initDdgCookie();
            }
            const { data } = yield axios.get(`${config.baseUrl}/play/${episodeId}`, {
                headers: Headers(episodeId.split('/')[0]),
            });
            const $ = load(data);
            const downloads = $('div#pickDownload > a')
                .map((i, el) => ({
                url: $(el).attr('href'),
                quality: $(el).text(),
            }))
                .get();
            const iSource = {
                headers: {
                    Referer: 'https://kwik.si/',
                },
                sources: [],
            };
            iSource.download = downloads;
            const servers = yield fetchEpisodeServers(episodeId, subOrDub);
            const i = servers.findIndex((s) => s.name.toLowerCase().includes(server));
            if (i === -1) {
                throw new Error(`Server ${server} not found`);
            }
            const serverUrl = new URL(servers[i].url);
            return yield fetchEpisodeSources(serverUrl.href, server, subOrDub);
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    const fetchEpisodeServers = (episodeId, subOrDub) => __awaiter(this, void 0, void 0, function* () {
        try {
            if (!ddgCookie) {
                yield initDdgCookie();
            }
            const { data } = yield axios.get(`${config.baseUrl}/play/${episodeId}`, {
                headers: Headers(episodeId.split('/')[0]),
            });
            const $ = load(data);
            const servers = [];
            $('div#resolutionMenu > button').each((i, el) => {
                const audio = $(el).attr('data-audio');
                const fansub = $(el).attr('data-fansub');
                const src = $(el).attr('data-src');
                const resolution = $(el).attr('data-resolution');
                if ((subOrDub === SubOrDubEnum.DUB && audio === 'eng') || (subOrDub === SubOrDubEnum.SUB && audio !== 'eng')) {
                    servers.push({
                        url: src,
                        name: `kwik-${fansub}-${resolution}`,
                    });
                }
            });
            return servers;
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
        // Core methods, pass only the necessary methods, dont pass helpers or unused methods
        search,
        fetchAnimeInfo,
        fetchEpisodeSources,
        fetchEpisodeServers,
    };
}
// Default export for backward compatibility
exports.default = createAnimePahe;
//# sourceMappingURL=create-animepahe.js.map