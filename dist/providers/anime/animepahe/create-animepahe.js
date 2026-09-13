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
function createAnimePahe(ctx, customBaseURL) {
    const { load, extractors, enums, createCustomBaseUrl, PolyURL, NativeConsumet, CryptoJS, axios } = ctx;
    const { Kwik } = extractors;
    const { makeGetRequestWithWebView } = NativeConsumet;
    const extractorCtx = {
        axios,
        load,
        CryptoJS,
        USER_AGENT: ctx.USER_AGENT,
        PolyURL: ctx.PolyURL,
        PolyURLSearchParams: ctx.PolyURLSearchParams,
        NativeConsumet,
    };
    const { StreamingServers: StreamingServersEnum, SubOrDub: SubOrDubEnum, MediaStatus: MediaStatusEnum } = enums;
    const baseUrl = createCustomBaseUrl('https://animepahe.pw', customBaseURL);
    const config = {
        name: 'AnimePahe',
        languages: 'en',
        classPath: 'ANIME.AnimePahe',
        logo: 'https://animepahe.pw/web-app-manifest-512x512.png',
        baseUrl,
        isNSFW: false,
        isWorking: true,
        isDubAvailableSeparately: true,
    };
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
    // ── WebView helpers ────────────────────────────────────────────────────────
    let _challengePassed = false;
    const ensureChallengePassed = () => __awaiter(this, void 0, void 0, function* () {
        if (_challengePassed)
            return;
        yield makeGetRequestWithWebView(config.baseUrl, { 'User-Agent': UA });
        _challengePassed = true;
    });
    const withRetry = (fn_1, ...args_1) => __awaiter(this, [fn_1, ...args_1], void 0, function* (fn, retries = 2) {
        var _a;
        try {
            return yield fn();
        }
        catch (err) {
            const msg = String((_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err);
            const isQuic = msg.includes('QUIC') || msg.includes('ERR_QUIC');
            const isJsonOrEmpty = msg.includes('JSON Parse error') ||
                msg.includes('Unexpected token') ||
                msg.includes('Unexpected character') ||
                msg.includes('Empty response');
            if (retries > 0 && (isQuic || isJsonOrEmpty)) {
                if (isJsonOrEmpty)
                    yield new Promise((r) => setTimeout(r, 800));
                return withRetry(fn, retries - 1);
            }
            throw err;
        }
    });
    // Fetches an HTML page through the WebView (bypasses DDoS-Guard JS challenge).
    const webViewGet = (url, referer) => __awaiter(this, void 0, void 0, function* () {
        return withRetry(() => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const res = yield makeGetRequestWithWebView(url, {
                'User-Agent': UA,
                'Referer': referer !== null && referer !== void 0 ? referer : config.baseUrl,
            });
            return (_a = res.html) !== null && _a !== void 0 ? _a : '';
        }));
    });
    const webViewGetJson = (url, referer) => __awaiter(this, void 0, void 0, function* () {
        return withRetry(() => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const res = yield makeGetRequestWithWebView(url, {
                'User-Agent': UA,
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': referer !== null && referer !== void 0 ? referer : config.baseUrl,
            });
            const raw = ((_a = res.html) !== null && _a !== void 0 ? _a : '').replace(/<[^>]*>/g, '').trim();
            console.log(raw);
            if (!raw)
                throw new Error(`[AnimePahe] Empty response from ${url}`);
            return JSON.parse(raw);
        }));
    });
    // ── Episode list ───────────────────────────────────────────────────────────
    const mapEpisode = (session, item) => ({
        id: `${session}/${item.session}`,
        number: item.episode,
        title: item.title,
        image: item.snapshot,
        duration: item.duration,
        isSubbed: item.audio === 'jpn' || item.audio === 'eng',
        isDubbed: item.audio === 'eng',
        releaseDate: item.created_at,
        url: `${config.baseUrl}/play/${session}/${item.session}`,
    });
    const fetchEpisodePage = (session, page) => __awaiter(this, void 0, void 0, function* () {
        const data = yield webViewGetJson(`${config.baseUrl}/api?m=release&id=${session}&sort=episode_asc&page=${page}`, `${config.baseUrl}/anime/${session}`);
        return data.data.map((item) => mapEpisode(session, item));
    });
    // ── Public methods ─────────────────────────────────────────────────────────
    const search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1) {
        try {
            yield ensureChallengePassed();
            const data = yield webViewGetJson(`${config.baseUrl}/api?m=search&q=${encodeURIComponent(query)}`);
            return {
                results: data.data.map((item) => ({
                    id: item.session,
                    title: item.title,
                    image: item.poster,
                    rating: item.score,
                    releaseDate: item.year,
                    type: item.type,
                })),
            };
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    const fetchAnimeInfo = (id_1, ...args_1) => __awaiter(this, [id_1, ...args_1], void 0, function* (id, episodePage = -1) {
        const animeInfo = { id, title: '' };
        try {
            const html = yield webViewGet(`${config.baseUrl}/anime/${id}`);
            const $ = load(html);
            animeInfo.title = $('div.title-wrapper > h1 > span').first().text();
            animeInfo.image = $('div.anime-poster a').attr('href');
            animeInfo.cover = `https:${$('div.anime-cover').attr('data-src')}`;
            animeInfo.description = $('div.anime-summary').text().trim();
            animeInfo.genres = $('div.anime-genre ul li')
                .map((_, el) => $(el).find('a').attr('title'))
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
            $('div.anime-recommendation .col-sm-6').each((_, el) => {
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
            $('div.anime-relation .col-sm-6').each((_, el) => {
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
                const firstPage = yield webViewGetJson(`${config.baseUrl}/api?m=release&id=${id}&sort=episode_asc&page=1`, `${config.baseUrl}/anime/${id}`);
                animeInfo.episodePages = firstPage.last_page;
                animeInfo.episodes.push(...firstPage.data.map((item) => mapEpisode(id, item)));
                for (let i = 2; i <= firstPage.last_page; i++) {
                    animeInfo.episodes.push(...(yield fetchEpisodePage(id, i)));
                }
            }
            else {
                animeInfo.episodes.push(...(yield fetchEpisodePage(id, episodePage)));
            }
            return animeInfo;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    const fetchEpisodeSources = (episodeId_1, ...args_1) => __awaiter(this, [episodeId_1, ...args_1], void 0, function* (episodeId, server = StreamingServersEnum.Kwik, subOrDub = SubOrDubEnum.SUB) {
        var _a;
        try {
            const html = yield webViewGet(`${config.baseUrl}/play/${episodeId}`);
            const $ = load(html);
            const links = $('div#resolutionMenu > button')
                .map((_, el) => ({
                url: $(el).attr('data-src'),
                quality: $(el).text(),
                audio: $(el).attr('data-audio'),
            }))
                .get();
            const downloads = $('div#pickDownload > a')
                .map((_, el) => ({ url: $(el).attr('href'), quality: $(el).text() }))
                .get();
            const iSource = { headers: { Referer: 'https://kwik.cx/' }, sources: [] };
            iSource.download = downloads;
            const filteredLinks = links.filter((link) => {
                const isDub = link.audio === 'eng';
                if (subOrDub === SubOrDubEnum.DUB)
                    return isDub;
                if (subOrDub === SubOrDubEnum.SUB)
                    return !isDub;
                return true;
            });
            for (const link of filteredLinks) {
                const res = yield Kwik(extractorCtx).extract(new PolyURL(link.url), `${config.baseUrl}/`);
                if ((_a = res === null || res === void 0 ? void 0 : res.sources) === null || _a === void 0 ? void 0 : _a.length) {
                    res.sources.forEach((source) => {
                        iSource.sources.push(Object.assign(Object.assign({}, source), { quality: (link.quality.match(/(\d{3,4})p/) || [])[0] }));
                    });
                }
            }
            return iSource;
        }
        catch (err) {
            console.log(err);
            throw new Error(err.message);
        }
    });
    const fetchEpisodeServers = (episodeId, subOrDub) => __awaiter(this, void 0, void 0, function* () {
        try {
            const html = yield webViewGet(`${config.baseUrl}/play/${episodeId}`);
            const $ = load(html);
            const servers = [];
            $('div#resolutionMenu > button').each((_, el) => {
                const audio = $(el).attr('data-audio');
                const fansub = $(el).attr('data-fansub');
                const src = $(el).attr('data-src');
                const resolution = $(el).attr('data-resolution');
                if ((subOrDub === SubOrDubEnum.DUB && audio === 'eng') || (subOrDub === SubOrDubEnum.SUB && audio !== 'eng')) {
                    servers.push({ url: src, name: `kwik-${fansub}-${resolution}` });
                }
            });
            return servers;
        }
        catch (err) {
            console.log(err);
            throw new Error(err.message);
        }
    });
    return Object.assign(Object.assign({}, config), { search,
        fetchAnimeInfo,
        fetchEpisodeSources,
        fetchEpisodeServers });
}
exports.default = createAnimePahe;
//# sourceMappingURL=create-animepahe.js.map