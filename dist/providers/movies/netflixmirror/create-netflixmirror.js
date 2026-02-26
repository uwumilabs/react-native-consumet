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
exports.createNetflixMirror = createNetflixMirror;
const OTT_PLATFORMS = [
    { code: 'nf', label: 'Netflix' },
    { code: 'pv', label: 'Prime Video' },
    { code: 'dp', label: 'Disney+' },
    { code: 'lg', label: 'Lionsgate' },
];
function createNetflixMirror(ctx, customBaseURL) {
    const { enums, axios, createCustomBaseUrl, NativeConsumet } = ctx;
    const { TvType: TvTypeEnum } = enums;
    const { getDdosGuardCookiesWithWebView } = NativeConsumet;
    const baseUrl = createCustomBaseUrl('https://net20.cc', customBaseURL);
    const config = {
        name: 'NetMirror',
        languages: 'all',
        classPath: 'MOVIES.NetMirror',
        logo: 'https://net20.cc/img/nf2/icon_x192.png',
        baseUrl,
        isNSFW: false,
        isWorking: true,
    };
    const supportedTypes = new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);
    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.baseUrl}/home`,
    };
    const getCookies = (...args_1) => __awaiter(this, [...args_1], void 0, function* (ottCode = 'nf') {
        const res = yield fetch(config.baseUrl + '/p.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'init=1',
        });
        const setCookie = res.headers.get('set-cookie');
        if (!setCookie)
            throw new Error('No Set-Cookie header found');
        // Define the hardcoded t_hash_t as requested
        const t_hash_t = '988a734da1152ddea2c25c8904eede20%3A%3A0cb4f3935641c828678b8946867997e5%3A%3A1768993531%3A%3Ani';
        // Extract t_hash from the p.php response
        const tHashMatch = /t_hash=([^;]+)/.exec(setCookie);
        const t_hash = tHashMatch ? tHashMatch[1] : '';
        return `t_hash_t=${t_hash_t}; t_hash=${t_hash}; ott=${ottCode}`;
    });
    const search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1) {
        try {
            const resultSets = yield Promise.allSettled(OTT_PLATFORMS.map((_a) => __awaiter(this, [_a], void 0, function* ({ code, label }) {
                const { data } = yield axios.get(`${config.baseUrl}/search.php?s=${encodeURIComponent(query)}&t=x`, { headers: Object.assign(Object.assign({}, headers), { Cookie: yield getCookies(code) }) });
                if (!data.searchResult || !Array.isArray(data.searchResult))
                    return [];
                return data.searchResult.map((item) => ({ id: item.id, title: item.t, label }));
            })));
            // Merge results: deduplicate by id, collect all platform labels
            const map = new Map();
            for (const settled of resultSets) {
                if (settled.status !== 'fulfilled')
                    continue;
                for (const item of settled.value) {
                    if (map.has(item.id)) {
                        map.get(item.id).otherNames.push(item.label);
                    }
                    else {
                        map.set(item.id, {
                            id: item.id,
                            title: item.title,
                            image: `https://imgcdn.kim/poster/342/${item.id}.jpg`,
                            type: TvTypeEnum.MOVIE,
                            otherNames: [item.label],
                        });
                    }
                }
            }
            return { currentPage: page, hasNextPage: false, results: [...map.values()] };
        }
        catch (err) {
            throw new Error(`NetMirror search failed: ${err.message}`);
        }
    });
    const fetchPostData = (id) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield axios.get(`${config.baseUrl}/post.php?id=${id}&t=x`, {
                headers: Object.assign(Object.assign({}, headers), { Cookie: yield getCookies() }),
            });
            return data;
        }
        catch (err) {
            throw new Error(`NetMirror fetchPostData failed: ${err.message}`);
        }
    });
    const fetchMediaInfo = (mediaId) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const postData = yield fetchPostData(mediaId);
            const isTvShow = postData.type === 't';
            const movieInfo = {
                id: mediaId,
                title: postData.title || '',
                type: isTvShow ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE,
                image: `https://imgcdn.kim/poster/780/${mediaId}.jpg`,
                cover: `https://imgcdn.kim/poster/1920/${mediaId}.jpg`,
                genres: ((_a = postData.genre) === null || _a === void 0 ? void 0 : _a.split(',').map((g) => g.trim())) || [],
                duration: postData.runtime,
                description: postData.desc || postData.m_desc || '',
                // rating is a string in the response, but IMovieInfo expects a number.
                // We'll leave it undefined since we can't convert it reliably.
                rating: undefined,
                year: postData.year || undefined,
            };
            // Handle episodes for TV shows
            if (isTvShow) {
                // Check if episodes array exists and has valid entries
                if (postData.episodes && postData.episodes.length > 0 && postData.episodes[0] !== null) {
                    movieInfo.episodes = postData.episodes.map((ep) => ({
                        id: ep.id,
                        title: ep.t,
                        number: parseInt(ep.ep),
                        season: parseInt(ep.s.replace('S', '')),
                        description: ep.ep_desc,
                        duration: ep.time,
                    }));
                }
                else if (postData.season && postData.season.length > 0) {
                    // Fallback: Create episodes based on seasons if episodes array is empty
                    movieInfo.episodes = postData.season.flatMap((season) => {
                        const episodes = [];
                        for (let i = 1; i <= parseInt(season.ep); i++) {
                            episodes.push({
                                id: season.id,
                                title: `Season ${season.s} Episode ${i}`,
                                number: i,
                                season: parseInt(season.s),
                            });
                        }
                        return episodes;
                    });
                }
                else {
                    // Fallback: Single episode for the entire show
                    movieInfo.episodes = [
                        {
                            id: mediaId,
                            title: 'Full Content',
                        },
                    ];
                }
            }
            else {
                // Handle movies
                movieInfo.episodes = [
                    {
                        id: mediaId,
                        title: postData.title || 'Full Movie',
                    },
                ];
            }
            return movieInfo;
        }
        catch (err) {
            throw new Error(`NetMirror fetchMediaInfo failed: ${err.message}`);
        }
    });
    const fetchEpisodeServers = (episodeId, mediaId) => __awaiter(this, void 0, void 0, function* () {
        return [
            {
                name: 'NetMirror',
                url: `${config.baseUrl}/playlist.php?id=${episodeId}`,
            },
        ];
    });
    const fetchEpisodeSources = (episodeId, mediaId) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const { data } = yield axios.get(`${config.baseUrl}/playlist.php?id=${episodeId}&t=Video&tm=${Date.now()}`, {
                headers: Object.assign(Object.assign({}, headers), { Cookie: yield getCookies() }),
            });
            if (!data || !Array.isArray(data) || data.length === 0) {
                throw new Error('No playlist data received');
            }
            const playlist = data[0];
            if (!(playlist === null || playlist === void 0 ? void 0 : playlist.sources) || !Array.isArray(playlist.sources)) {
                throw new Error('No sources in playlist');
            }
            const sources = playlist.sources.map((s) => {
                let quality = '480p';
                if (s.label === 'Full HD')
                    quality = '1080p';
                else if (s.label === 'Mid HD')
                    quality = '720p';
                else if (s.label === 'Low HD')
                    quality = '480p';
                return {
                    url: `${config.baseUrl}${s.file}`,
                    quality,
                    isM3U8: true,
                };
            });
            const subtitles = (_a = playlist.tracks) === null || _a === void 0 ? void 0 : _a.filter((t) => t.kind === 'captions').map((t) => ({
                url: t.file.startsWith('//') ? `https:${t.file}` : t.file,
                lang: t.label || t.language || 'Unknown',
            }));
            return {
                headers: { Referer: `${config.baseUrl}/` },
                sources,
                subtitles,
            };
        }
        catch (err) {
            throw new Error(`NetMirror fetchEpisodeSources failed: ${err.message}`);
        }
    });
    const fetchHlsPlaylist = (episodeId) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield axios.get(`${config.baseUrl}/hls/${episodeId}`, {
                headers: Object.assign(Object.assign({}, headers), { Cookie: yield getCookies() }),
            });
            return data;
        }
        catch (err) {
            throw new Error(`NetMirror fetchHlsPlaylist failed: ${err.message}`);
        }
    });
    return Object.assign(Object.assign({}, config), { supportedTypes,
        search,
        fetchMediaInfo,
        fetchEpisodeServers,
        fetchEpisodeSources,
        fetchHlsPlaylist });
}
//# sourceMappingURL=create-netflixmirror.js.map