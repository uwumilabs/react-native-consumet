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
const NativeConsumet_1 = require("../../NativeConsumet");
class AnimePahe extends models_1.AnimeParser {
    constructor() {
        super();
        this.name = 'AnimePahe';
        this.baseUrl = 'https://animepahe.ru';
        this.logo = 'https://animepahe.com/pikacon.ico';
        this.classPath = 'ANIME.AnimePahe';
        this.ddgCookie = null;
        /**
         * @param query Search query
         */
        this.search = (query) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.ddgCookie) {
                    yield this.initDdgCookie();
                }
                const { data } = yield axios_1.default.get(`${this.baseUrl}/api?m=search&q=${encodeURIComponent(query)}`, {
                    headers: this.Headers(false),
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
        /**
         * @param id id format id/session
         * @param episodePage Episode page number (optional) default: -1 to get all episodes. number of episode pages can be found in the anime info object
         */
        this.fetchAnimeInfo = (id_1, ...args_1) => __awaiter(this, [id_1, ...args_1], void 0, function* (id, episodePage = -1) {
            const animeInfo = {
                id: id,
                title: '',
            };
            try {
                if (!this.ddgCookie) {
                    yield this.initDdgCookie();
                }
                const res = yield fetch(`${this.baseUrl}/anime/${id}`, {
                    headers: this.Headers(id),
                });
                const data = yield res.text();
                const $ = (0, cheerio_1.load)(data);
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
                        animeInfo.status = models_1.MediaStatus.ONGOING;
                        break;
                    case 'Finished Airing':
                        animeInfo.status = models_1.MediaStatus.COMPLETED;
                        break;
                    default:
                        animeInfo.status = models_1.MediaStatus.UNKNOWN;
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
                        url: `${this.baseUrl}/anime/${(_c = $(el).find('.col-2 > a').attr('href')) === null || _c === void 0 ? void 0 : _c.split('/')[2]}`,
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
                        url: `${this.baseUrl}/anime/${(_c = $(el).find('.col-2 > a').attr('href')) === null || _c === void 0 ? void 0 : _c.split('/')[2]}`,
                        releaseDate: $(el).find('div.col-9 > a').text().trim(),
                        status: $(el).find('div.col-9 > strong').text().trim(),
                        relationType: $(el).find('h4 > span').text().trim(),
                    });
                });
                animeInfo.episodes = [];
                if (episodePage < 0) {
                    const { data: { last_page, data }, } = yield axios_1.default.get(`${this.baseUrl}/api?m=release&id=${id}&sort=episode_asc&page=1`, {
                        headers: this.Headers(id),
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
                        url: `${this.baseUrl}/play/${id}/${item.session}`,
                    })));
                    for (let i = 1; i < last_page; i++) {
                        animeInfo.episodes.push(...(yield this.fetchEpisodes(id, i + 1)));
                    }
                }
                else {
                    animeInfo.episodes.push(...(yield this.fetchEpisodes(id, episodePage)));
                }
                return animeInfo;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param episodeId Episode id
         * @param subOrDub sub or dub (default `SubOrSub.SUB`) (optional)
         */
        this.fetchEpisodeSources = (episodeId_1, ...args_1) => __awaiter(this, [episodeId_1, ...args_1], void 0, function* (episodeId, subOrDub = models_1.SubOrSub.SUB) {
            try {
                if (!this.ddgCookie) {
                    yield this.initDdgCookie();
                }
                const { data } = yield axios_1.default.get(`${this.baseUrl}/play/${episodeId}`, {
                    headers: this.Headers(episodeId.split('/')[0]),
                });
                const $ = (0, cheerio_1.load)(data);
                const links = $('div#resolutionMenu > button').map((i, el) => ({
                    url: $(el).attr('data-src'),
                    quality: $(el).text(),
                    audio: $(el).attr('data-audio'),
                }));
                const downloads = $('div#pickDownload > a')
                    .map((i, el) => ({
                    url: $(el).attr('href'),
                    quality: $(el).text(),
                }))
                    .get();
                const iSource = {
                    headers: {
                        Referer: 'https://kwik.cx/',
                    },
                    sources: [],
                };
                for (const link of links) {
                    const res = yield new extractors_1.Kwik().extract(new URL(link.url));
                    res[0].quality = link.quality;
                    res[0].isDub = link.audio === 'eng';
                    // Only include sources that match the requested SubOrSub type
                    if ((subOrDub === models_1.SubOrSub.DUB && res[0].isDub) || (subOrDub === models_1.SubOrSub.SUB && !res[0].isDub)) {
                        iSource.sources.push(res[0]);
                    }
                }
                // If no sources were found after filtering, include all sources as fallback
                // if (iSource.sources.length === 0) {
                //   for (const link of links) {
                //     const res = await new Kwik(this.proxyConfig).extract(new URL(link.url));
                //     res[0]!.quality = link.quality;
                //     res[0]!.isDub = link.audio === 'eng';
                //     iSource.sources.push(res[0]!);
                //   }
                // }
                iSource.download = downloads;
                return iSource;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        this.fetchEpisodes = (session, page) => __awaiter(this, void 0, void 0, function* () {
            const res = yield axios_1.default.get(`${this.baseUrl}/api?m=release&id=${session}&sort=episode_asc&page=${page}`, {
                headers: this.Headers(session),
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
                    url: `${this.baseUrl}/play/${session}/${item.session}`,
                })),
            ];
        });
        /**
         * @deprecated
         * @attention AnimePahe doesn't support this method
         */
        this.fetchEpisodeServers = (episodeLink) => {
            throw new Error('Method not implemented.');
        };
        this.initDdgCookie();
    }
    initDdgCookie() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                try {
                    this.ddgCookie = yield (0, NativeConsumet_1.getDdosGuardCookiesWithWebView)(this.baseUrl);
                    // console.log('DDoS-Guard cookie obtained (WebView):', this.ddgCookie);
                }
                catch (err) {
                    console.error('Failed to bypass DDoS-Guard with WebView:', err);
                    // this.ddgCookie = await bypassDdosGuard(this.baseUrl);
                    // console.log('DDoS-Guard cookie obtained (fallback):', this.ddgCookie);
                }
            }
            catch (error) {
                console.error('Failed to initialize DDoS-Guard cookie:', error);
            }
        });
    }
    Headers(sessionId) {
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
            'Referer': sessionId ? `${this.baseUrl}/anime/${sessionId}` : `${this.baseUrl}`,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        };
        if (this.ddgCookie) {
            headers.Cookie =
                typeof this.ddgCookie === 'object' && this.ddgCookie !== null ? this.ddgCookie.cookie : this.ddgCookie || '';
        }
        return headers;
    }
}
exports.default = AnimePahe;
// (async () => {
//   const animepahe = new AnimePahe();
//   const anime = await animepahe.search('Classroom of the elite');
//   const info = await animepahe.fetchAnimeInfo(anime.results[0].id);
//   // console.log(info);
//   const sources = await animepahe.fetchEpisodeSources(info.episodes![0].id);
//   console.log(sources);
// })();
//# sourceMappingURL=animepahe.js.map