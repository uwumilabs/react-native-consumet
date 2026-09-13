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
const models_1 = require("../../../models");
const url_polyfill_1 = require("../../../utils/url-polyfill");
function createReanime(ctx, customBaseURL) {
    const { axios, load, enums, createCustomBaseUrl, extractors, NativeConsumet } = ctx;
    const { makeGetRequestWithWebView } = NativeConsumet;
    const { MediaStatus: MediaStatusEnum, SubOrDub: SubOrDubEnum } = enums;
    const baseUrl = createCustomBaseUrl('https://reanime.to', customBaseURL);
    const apiBase = `${baseUrl}/api/v1`;
    const config = {
        name: 'ReAnime',
        languages: 'en',
        classPath: 'ANIME.ReAnime',
        logo: 'https://reanime.to/favicon-32x32.png',
        baseUrl,
        isNSFW: false,
        isWorking: true,
        isDubAvailableSeparately: true,
    };
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
    const extractorCtx = {
        axios,
        load,
        CryptoJS: ctx.CryptoJS,
        USER_AGENT: UA,
        PolyURL: ctx.PolyURL,
        PolyURLSearchParams: ctx.PolyURLSearchParams,
        NativeConsumet: ctx.NativeConsumet,
    };
    const hdrs = (referer) => ({
        'User-Agent': UA,
        'Accept': 'application/json',
        'Referer': referer !== null && referer !== void 0 ? referer : `${baseUrl}/`,
    });
    const toMediaStatus = (s) => {
        switch (s === null || s === void 0 ? void 0 : s.toLowerCase()) {
            case 'releasing':
                return MediaStatusEnum.ONGOING;
            case 'finished':
                return MediaStatusEnum.COMPLETED;
            case 'not_yet_released':
                return MediaStatusEnum.NOT_YET_AIRED;
            case 'cancelled':
                return MediaStatusEnum.CANCELLED;
            default:
                return MediaStatusEnum.UNKNOWN;
        }
    };
    const pickTitle = (t) => (t === null || t === void 0 ? void 0 : t.english) || (t === null || t === void 0 ? void 0 : t.romaji) || (t === null || t === void 0 ? void 0 : t.native) || '';
    const pickCover = (c) => (c === null || c === void 0 ? void 0 : c.extra_large) || (c === null || c === void 0 ? void 0 : c.large) || (c === null || c === void 0 ? void 0 : c.medium) || '';
    const watchPageHtml = (animeId, epNumber, lang) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const url = `${baseUrl}/watch/${animeId}?ep=${epNumber}&lang=${lang}`;
        const res = yield makeGetRequestWithWebView(url, { 'User-Agent': UA, 'Referer': `${baseUrl}/` });
        return (_a = res.html) !== null && _a !== void 0 ? _a : '';
    });
    const fetchEpisodeLinks = (animeId, epNumber) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const tz = encodeURIComponent('America/New_York');
        const apiUrl = `${apiBase}/watch/${animeId}?ep=${epNumber}&tz=${tz}`;
        const res = yield makeGetRequestWithWebView(apiUrl, {
            'User-Agent': UA,
            'Accept': 'application/json',
            'Referer': `${baseUrl}/watch/${animeId}?ep=${epNumber}`,
        });
        // Strip any HTML scaffolding the WebView adds around the JSON body
        const jsonText = ((_a = res.html) !== null && _a !== void 0 ? _a : '').replace(/<[^>]*>/g, '').trim();
        if (!jsonText)
            return [];
        try {
            const parsed = JSON.parse(jsonText);
            return Array.isArray(parsed.episode_links) ? parsed.episode_links : [];
        }
        catch (_b) {
            return [];
        }
    });
    const parseServersWithUrls = (html, subOrDub) => {
        var _a;
        const $ = load(html);
        const seen = new Set();
        const servers = [];
        const targetLabel = subOrDub === SubOrDubEnum.DUB ? 'DUB:' : 'SUB:';
        // iframe src is decoded by cheerio (html entities → chars)
        const iframeSrc = (_a = $('#video-player').attr('src')) !== null && _a !== void 0 ? _a : '';
        $('span').each((_, spanEl) => {
            if ($(spanEl).text().trim() === targetLabel) {
                $(spanEl)
                    .parent()
                    .find('button.server-btn-enhanced')
                    .each((_, btn) => {
                    const name = $(btn).text().trim();
                    if (!name || seen.has(name))
                        return;
                    seen.add(name);
                    // Active server has "bg-primary" class; its URL is already in the iframe
                    const url = $(btn).hasClass('bg-primary') ? iframeSrc : '';
                    // Normalise to "flixcloud-hd-2" / "flixcloud-hd-1" so server selection works
                    servers.push({ name: `flixcloud-${name.toLowerCase().replace(/\s+/g, '-')}`, url });
                });
            }
        });
        return servers;
    };
    const search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1, limit = 20) {
        var _a, _b;
        const offset = (page - 1) * limit;
        const { data } = yield axios.get(`${apiBase}/search`, {
            params: { q: query, limit, offset },
            headers: hdrs(),
        });
        const total = (_a = data.total) !== null && _a !== void 0 ? _a : 0;
        const results = ((_b = data.results) !== null && _b !== void 0 ? _b : []).map((item) => {
            var _a, _b, _c;
            return ({
                id: item.anime_id,
                title: pickTitle(item.title),
                url: `${baseUrl}/anime/${item.anime_id}`,
                image: pickCover(item.cover_image),
                type: item.format,
                status: toMediaStatus(item.status),
                genres: (_a = item.genres) !== null && _a !== void 0 ? _a : [],
                sub: (_b = item.subbed) !== null && _b !== void 0 ? _b : 0,
                dub: (_c = item.dubbed) !== null && _c !== void 0 ? _c : 0,
            });
        });
        return {
            currentPage: page,
            hasNextPage: offset + limit < total,
            totalResults: total,
            results,
        };
    });
    const fetchEpisodes = (animeId) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const episodes = [];
        let page = 1;
        const limit = 100;
        while (true) {
            const { data } = yield axios.get(`${apiBase}/anime/${animeId}/episodes`, {
                params: { page, limit },
                headers: hdrs(`${baseUrl}/anime/${animeId}`),
            });
            const batch = (_a = data.data) !== null && _a !== void 0 ? _a : [];
            for (const ep of batch) {
                episodes.push({
                    id: `${animeId}/${ep.episode_number}`,
                    number: ep.episode_number,
                    title: ep.title || `Episode ${ep.episode_number}`,
                    image: ep.thumbnail || undefined,
                    releaseDate: ep.aired || undefined,
                    isFiller: (_b = ep.is_filler) !== null && _b !== void 0 ? _b : false,
                    isSubbed: (_c = ep.subbed) !== null && _c !== void 0 ? _c : false,
                    isDubbed: (_d = ep.dubbed) !== null && _d !== void 0 ? _d : false,
                    url: `${baseUrl}/watch/${animeId}?ep=${ep.episode_number}`,
                });
            }
            if (batch.length < limit)
                break;
            page++;
        }
        return episodes;
    });
    const fetchAnimeInfo = (id) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const { data: anime } = yield axios.get(`${apiBase}/anime/${id}`, {
            headers: hdrs(`${baseUrl}/anime/${id}`),
        });
        const info = {
            id: (_a = anime.anime_id) !== null && _a !== void 0 ? _a : id,
            title: pickTitle(anime.title),
            url: `${baseUrl}/anime/${id}`,
            image: pickCover(anime.cover_image),
            cover: anime.banner_image || undefined,
            description: (_b = anime.description) === null || _b === void 0 ? void 0 : _b.replace(/<[^>]*>/g, '').trim(),
            status: toMediaStatus(anime.status),
            type: anime.format,
            releaseDate: anime.season_year ? String(anime.season_year) : undefined,
            genres: (_c = anime.genres) !== null && _c !== void 0 ? _c : [],
            studios: ((_d = anime.studios) !== null && _d !== void 0 ? _d : []).filter((s) => s.is_main).map((s) => s.name),
            totalEpisodes: anime.episodes || anime.subbed || 0,
            sub: (_e = anime.subbed) !== null && _e !== void 0 ? _e : 0,
            dub: (_f = anime.dubbed) !== null && _f !== void 0 ? _f : 0,
            hasSub: ((_g = anime.subbed) !== null && _g !== void 0 ? _g : 0) > 0,
            hasDub: ((_h = anime.dubbed) !== null && _h !== void 0 ? _h : 0) > 0,
        };
        info.episodes = yield fetchEpisodes(id);
        return info;
    });
    const fetchEpisodeServers = (episodeId_1, ...args_1) => __awaiter(this, [episodeId_1, ...args_1], void 0, function* (episodeId, subOrDub = SubOrDubEnum.SUB) {
        const parts = episodeId.split('/');
        const animeId = parts[0];
        const epNumber = Number(parts[1]);
        const isDub = subOrDub === SubOrDubEnum.DUB;
        const episodeLinks = yield fetchEpisodeLinks(animeId, epNumber);
        if (episodeLinks.length > 0) {
            return episodeLinks
                .filter((l) => l.serverName && l.dataLink)
                .map((l) => ({
                // e.g. "HD-2" → "flixcloud-hd-2", "HD-1" → "flixcloud-hd-1"
                name: `flixcloud-${l.serverName.toLowerCase().replace(/\s+/g, '-')}`,
                // Site appends &a=1 to the FlixCloud URL for dub
                url: isDub ? `${l.dataLink}&a=1` : l.dataLink,
            }));
        }
        const lang = isDub ? 'dub' : 'sub';
        const html = yield watchPageHtml(animeId, epNumber, lang);
        const servers = parseServersWithUrls(html, subOrDub);
        if (!servers.length)
            throw new Error('[ReAnime] No servers found — user may not be logged in');
        return servers;
    });
    const fetchEpisodeSources = (episodeId_1, ...args_1) => __awaiter(this, [episodeId_1, ...args_1], void 0, function* (episodeId, server = models_1.StreamingServers.FlixCloud, subOrDub = SubOrDubEnum.SUB) {
        const parts = episodeId.split('/');
        const animeId = parts[0];
        const epNumber = parts[1];
        const lang = subOrDub === SubOrDubEnum.DUB ? 'dub' : 'sub';
        const watchUrl = `${baseUrl}/watch/${animeId}?ep=${epNumber}&lang=${lang}`;
        const servers = yield fetchEpisodeServers(episodeId, subOrDub);
        const idx = servers.findIndex((s) => s.name.includes(server.toLowerCase()));
        if (idx === -1) {
            throw new Error(`[ReAnime] Server "${server}" not found. Available: ${servers.map((s) => s.name).join(', ')}`);
        }
        const picked = servers[idx];
        if (!picked.url)
            throw new Error(`[ReAnime] No embed URL for server "${picked.name}" — user may not be logged in`);
        return extractors.FlixCloud(extractorCtx).extract(new url_polyfill_1.PolyURL(picked.url), watchUrl);
    });
    return Object.assign(Object.assign({}, config), { search,
        fetchAnimeInfo,
        fetchEpisodeServers,
        fetchEpisodeSources });
}
exports.default = createReanime;
//# sourceMappingURL=create-reanime.js.map