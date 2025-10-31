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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const models_1 = require("../../models");
const utils_1 = require("../../utils");
const anify_1 = __importDefault(require("../anime/anify"));
const zoro_1 = __importDefault(require("../anime/zoro/zoro"));
const animekai_1 = __importDefault(require("../anime/animekai/animekai"));
const animepahe_1 = __importDefault(require("../anime/animepahe/animepahe"));
const mangasee123_1 = __importDefault(require("../manga/mangasee123"));
const utils_2 = require("../../utils/utils");
class Anilist extends models_1.AnimeParser {
    /**
     * This class maps anilist to kitsu with any other anime provider.
     * kitsu is used for episode images, titles and description.
     * @param provider anime provider (optional) default: Gogoanime
     * @param proxyConfig proxy config (optional)
     * @param adapter axios adapter (optional)
     */
    constructor(provider, proxyConfig, adapter, customBaseURL) {
        super();
        this.proxyConfig = proxyConfig;
        this.name = 'Anilist';
        this.baseUrl = 'https://anilist.co';
        this.logo = 'https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg';
        this.classPath = 'META.Anilist';
        this.anilistGraphqlUrl = 'https://graphql.anilist.co';
        this.kitsuGraphqlUrl = 'https://kitsu.io/api/graphql';
        this.malSyncUrl = 'https://api.malsync.moe';
        this.anifyUrl = utils_2.ANIFY_URL;
        /**
         * @param query Search query
         * @param page Page number (optional)
         * @param perPage Number of results per page (optional) (default: 15) (max: 50)
         */
        this.search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1, perPage = 15) {
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: (0, utils_1.anilistSearchQuery)(query, page, perPage),
            };
            try {
                let { data, status } = yield axios_1.default.post(this.anilistGraphqlUrl, options, {
                    validateStatus: () => true,
                });
                if (status >= 500 || status === 429)
                    data = yield new anify_1.default().rawSearch(query, page);
                const res = {
                    currentPage: (_d = (_c = (_b = data.data.Page) === null || _b === void 0 ? void 0 : _b.pageInfo) === null || _c === void 0 ? void 0 : _c.currentPage) !== null && _d !== void 0 ? _d : (_e = data.meta) === null || _e === void 0 ? void 0 : _e.currentPage,
                    hasNextPage: (_h = (_g = (_f = data.data.Page) === null || _f === void 0 ? void 0 : _f.pageInfo) === null || _g === void 0 ? void 0 : _g.hasNextPage) !== null && _h !== void 0 ? _h : ((_j = data.meta) === null || _j === void 0 ? void 0 : _j.currentPage) !== ((_k = data.meta) === null || _k === void 0 ? void 0 : _k.lastPage),
                    results: (_p = (_o = (_m = (_l = data.data) === null || _l === void 0 ? void 0 : _l.Page) === null || _m === void 0 ? void 0 : _m.media) === null || _o === void 0 ? void 0 : _o.map((item) => {
                        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
                        return ({
                            id: item.id.toString(),
                            malId: item.idMal,
                            title: item.title
                                ? {
                                    romaji: item.title.romaji,
                                    english: item.title.english,
                                    native: item.title.native,
                                    userPreferred: item.title.userPreferred,
                                }
                                : item.title.romaji,
                            status: item.status === 'RELEASING'
                                ? models_1.MediaStatus.ONGOING
                                : item.status === 'FINISHED'
                                    ? models_1.MediaStatus.COMPLETED
                                    : item.status === 'NOT_YET_RELEASED'
                                        ? models_1.MediaStatus.NOT_YET_AIRED
                                        : item.status === 'CANCELLED'
                                            ? models_1.MediaStatus.CANCELLED
                                            : item.status === 'HIATUS'
                                                ? models_1.MediaStatus.HIATUS
                                                : models_1.MediaStatus.UNKNOWN,
                            image: (_e = (_c = (_b = item.coverImage) === null || _b === void 0 ? void 0 : _b.extraLarge) !== null && _c !== void 0 ? _c : (_d = item.coverImage) === null || _d === void 0 ? void 0 : _d.large) !== null && _e !== void 0 ? _e : (_f = item.coverImage) === null || _f === void 0 ? void 0 : _f.medium,
                            imageHash: (0, utils_2.getHashFromImage)((_k = (_h = (_g = item.coverImage) === null || _g === void 0 ? void 0 : _g.extraLarge) !== null && _h !== void 0 ? _h : (_j = item.coverImage) === null || _j === void 0 ? void 0 : _j.large) !== null && _k !== void 0 ? _k : (_l = item.coverImage) === null || _l === void 0 ? void 0 : _l.medium),
                            cover: item.bannerImage,
                            coverHash: (0, utils_2.getHashFromImage)(item.bannerImage),
                            popularity: item.popularity,
                            description: item.description,
                            rating: item.averageScore,
                            genres: item.genres,
                            color: (_m = item.coverImage) === null || _m === void 0 ? void 0 : _m.color,
                            totalEpisodes: (_o = item.episodes) !== null && _o !== void 0 ? _o : ((_p = item.nextAiringEpisode) === null || _p === void 0 ? void 0 : _p.episode) - 1,
                            currentEpisodeCount: (item === null || item === void 0 ? void 0 : item.nextAiringEpisode) ? ((_q = item === null || item === void 0 ? void 0 : item.nextAiringEpisode) === null || _q === void 0 ? void 0 : _q.episode) - 1 : item.episodes,
                            type: item.format,
                            releaseDate: item.seasonYear,
                        });
                    })) !== null && _p !== void 0 ? _p : data.data.map((item) => {
                        var _b, _c, _d;
                        return ({
                            id: item.anilistId.toString(),
                            malId: item.mappings.mal,
                            title: item.title,
                            status: item.status === 'RELEASING'
                                ? models_1.MediaStatus.ONGOING
                                : item.status === 'FINISHED'
                                    ? models_1.MediaStatus.COMPLETED
                                    : item.status === 'NOT_YET_RELEASED'
                                        ? models_1.MediaStatus.NOT_YET_AIRED
                                        : item.status === 'CANCELLED'
                                            ? models_1.MediaStatus.CANCELLED
                                            : item.status === 'HIATUS'
                                                ? models_1.MediaStatus.HIATUS
                                                : models_1.MediaStatus.UNKNOWN,
                            image: (_b = item.coverImage) !== null && _b !== void 0 ? _b : item.bannerImage,
                            imageHash: (0, utils_2.getHashFromImage)((_c = item.coverImage) !== null && _c !== void 0 ? _c : item.bannerImage),
                            cover: item.bannerImage,
                            coverHash: (0, utils_2.getHashFromImage)(item.bannerImage),
                            popularity: item.popularity,
                            description: item.description,
                            rating: item.averageScore,
                            genres: item.genre,
                            color: item.color,
                            totalEpisodes: item.currentEpisode,
                            currentEpisodeCount: (item === null || item === void 0 ? void 0 : item.nextAiringEpisode) ? ((_d = item === null || item === void 0 ? void 0 : item.nextAiringEpisode) === null || _d === void 0 ? void 0 : _d.episode) - 1 : item.currentEpisode,
                            type: item.format,
                            releaseDate: item.year,
                        });
                    }),
                };
                return res;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param query Search query (optional)
         * @param type Media type (optional) (default: `ANIME`) (options: `ANIME`, `MANGA`)
         * @param page Page number (optional)
         * @param perPage Number of results per page (optional) (default: `20`) (max: `50`)
         * @param format Format (optional) (options: `TV`, `TV_SHORT`, `MOVIE`, `SPECIAL`, `OVA`, `ONA`, `MUSIC`)
         * @param sort Sort (optional) (Default: `[POPULARITY_DESC, SCORE_DESC]`) (options: `POPULARITY_DESC`, `POPULARITY`, `TRENDING_DESC`, `TRENDING`, `UPDATED_AT_DESC`, `UPDATED_AT`, `START_DATE_DESC`, `START_DATE`, `END_DATE_DESC`, `END_DATE`, `FAVOURITES_DESC`, `FAVOURITES`, `SCORE_DESC`, `SCORE`, `TITLE_ROMAJI_DESC`, `TITLE_ROMAJI`, `TITLE_ENGLISH_DESC`, `TITLE_ENGLISH`, `TITLE_NATIVE_DESC`, `TITLE_NATIVE`, `EPISODES_DESC`, `EPISODES`, `ID`, `ID_DESC`)
         * @param genres Genres (optional) (options: `Action`, `Adventure`, `Cars`, `Comedy`, `Drama`, `Fantasy`, `Horror`, `Mahou Shoujo`, `Mecha`, `Music`, `Mystery`, `Psychological`, `Romance`, `Sci-Fi`, `Slice of Life`, `Sports`, `Supernatural`, `Thriller`)
         * @param id anilist Id (optional)
         * @param year Year (optional) e.g. `2022`
         * @param status Status (optional) (options: `RELEASING`, `FINISHED`, `NOT_YET_RELEASED`, `CANCELLED`, `HIATUS`)
         * @param season Season (optional) (options: `WINTER`, `SPRING`, `SUMMER`, `FALL`)
         */
        this.advancedSearch = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, type = 'ANIME', page = 1, perPage = 20, format, sort, genres, id, year, status, season) {
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: (0, utils_1.anilistAdvancedQuery)(),
                variables: {
                    search: query,
                    type: type,
                    page: page,
                    size: perPage,
                    format: format,
                    sort: sort,
                    genres: genres,
                    id: id,
                    year: year ? `${year}%` : undefined,
                    status: status,
                    season: season,
                },
            };
            if (genres) {
                genres.forEach((genre) => {
                    if (!Object.values(models_1.Genres).includes(genre)) {
                        throw new Error(`genre ${genre} is not valid`);
                    }
                });
            }
            try {
                let { data, status } = yield axios_1.default.post(this.anilistGraphqlUrl, options, {
                    validateStatus: () => true,
                });
                if (status >= 500 && !query)
                    throw new Error('No results found');
                if (status >= 500)
                    data = yield new anify_1.default().rawSearch(query, page);
                const res = {
                    currentPage: (_e = (_d = (_c = (_b = data.data) === null || _b === void 0 ? void 0 : _b.Page) === null || _c === void 0 ? void 0 : _c.pageInfo) === null || _d === void 0 ? void 0 : _d.currentPage) !== null && _e !== void 0 ? _e : (_f = data.meta) === null || _f === void 0 ? void 0 : _f.currentPage,
                    hasNextPage: (_k = (_j = (_h = (_g = data.data) === null || _g === void 0 ? void 0 : _g.Page) === null || _h === void 0 ? void 0 : _h.pageInfo) === null || _j === void 0 ? void 0 : _j.hasNextPage) !== null && _k !== void 0 ? _k : ((_l = data.meta) === null || _l === void 0 ? void 0 : _l.currentPage) !== ((_m = data.meta) === null || _m === void 0 ? void 0 : _m.lastPage),
                    totalPages: (_q = (_p = (_o = data.data) === null || _o === void 0 ? void 0 : _o.Page) === null || _p === void 0 ? void 0 : _p.pageInfo) === null || _q === void 0 ? void 0 : _q.lastPage,
                    totalResults: (_t = (_s = (_r = data.data) === null || _r === void 0 ? void 0 : _r.Page) === null || _s === void 0 ? void 0 : _s.pageInfo) === null || _t === void 0 ? void 0 : _t.total,
                    results: [],
                };
                res.results.push(...((_x = (_w = (_v = (_u = data.data) === null || _u === void 0 ? void 0 : _u.Page) === null || _v === void 0 ? void 0 : _v.media) === null || _w === void 0 ? void 0 : _w.map((item) => {
                    var _b, _c, _d, _e, _f, _g, _h, _j;
                    return ({
                        id: item.id.toString(),
                        malId: item.idMal,
                        title: item.title
                            ? {
                                romaji: item.title.romaji,
                                english: item.title.english,
                                native: item.title.native,
                                userPreferred: item.title.userPreferred,
                            }
                            : item.title.romaji,
                        status: item.status === 'RELEASING'
                            ? models_1.MediaStatus.ONGOING
                            : item.status === 'FINISHED'
                                ? models_1.MediaStatus.COMPLETED
                                : item.status === 'NOT_YET_RELEASED'
                                    ? models_1.MediaStatus.NOT_YET_AIRED
                                    : item.status === 'CANCELLED'
                                        ? models_1.MediaStatus.CANCELLED
                                        : item.status === 'HIATUS'
                                            ? models_1.MediaStatus.HIATUS
                                            : models_1.MediaStatus.UNKNOWN,
                        image: (_c = (_b = item.coverImage.extraLarge) !== null && _b !== void 0 ? _b : item.coverImage.large) !== null && _c !== void 0 ? _c : item.coverImage.medium,
                        imageHash: (0, utils_2.getHashFromImage)((_e = (_d = item.coverImage.extraLarge) !== null && _d !== void 0 ? _d : item.coverImage.large) !== null && _e !== void 0 ? _e : item.coverImage.medium),
                        cover: item.bannerImage,
                        coverHash: (0, utils_2.getHashFromImage)(item.bannerImage),
                        popularity: item.popularity,
                        totalEpisodes: (_f = item.episodes) !== null && _f !== void 0 ? _f : ((_g = item.nextAiringEpisode) === null || _g === void 0 ? void 0 : _g.episode) - 1,
                        currentEpisode: ((_h = item.nextAiringEpisode) === null || _h === void 0 ? void 0 : _h.episode) - 1 || item.episodes,
                        countryOfOrigin: item.countryOfOrigin,
                        description: item.description,
                        genres: item.genres,
                        rating: item.averageScore,
                        color: (_j = item.coverImage) === null || _j === void 0 ? void 0 : _j.color,
                        type: item.format,
                        releaseDate: item.seasonYear,
                    });
                })) !== null && _x !== void 0 ? _x : (_y = data.data) === null || _y === void 0 ? void 0 : _y.map((item) => {
                    var _b, _c;
                    return ({
                        id: item.anilistId.toString(),
                        malId: item.mappings.mal,
                        title: item.title,
                        status: item.status === 'RELEASING'
                            ? models_1.MediaStatus.ONGOING
                            : item.status === 'FINISHED'
                                ? models_1.MediaStatus.COMPLETED
                                : item.status === 'NOT_YET_RELEASED'
                                    ? models_1.MediaStatus.NOT_YET_AIRED
                                    : item.status === 'CANCELLED'
                                        ? models_1.MediaStatus.CANCELLED
                                        : item.status === 'HIATUS'
                                            ? models_1.MediaStatus.HIATUS
                                            : models_1.MediaStatus.UNKNOWN,
                        image: (_b = item.coverImage) !== null && _b !== void 0 ? _b : item.bannerImage,
                        imageHash: (0, utils_2.getHashFromImage)((_c = item.coverImage) !== null && _c !== void 0 ? _c : item.bannerImage),
                        cover: item.bannerImage,
                        coverHash: (0, utils_2.getHashFromImage)(item.bannerImage),
                        popularity: item.popularity,
                        description: item.description,
                        rating: item.averageScore,
                        genres: item.genre,
                        color: item.color,
                        totalEpisodes: item.currentEpisode,
                        type: item.format,
                        releaseDate: item.year,
                    });
                })));
                return res;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param id Anime id
         * @param dub to get dubbed episodes (optional) set to `true` to get dubbed episodes. **ONLY WORKS FOR GOGOANIME**
         * @param fetchFiller to get filler boolean on the episode object (optional) set to `true` to get filler boolean on the episode object.
         */
        this.fetchAnimeInfo = (id_1, ...args_1) => __awaiter(this, [id_1, ...args_1], void 0, function* (id, fetchFiller = false) {
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52, _53, _54, _55, _56, _57, _58, _59, _60, _61, _62, _63, _64, _65, _66, _67, _68, _69, _70, _71, _72, _73, _74, _75, _76, _77, _78, _79, _80, _81, _82;
            const animeInfo = {
                id: id,
                title: '',
            };
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: (0, utils_1.anilistMediaDetailQuery)(id),
            };
            let fillerEpisodes;
            try {
                let { data, status } = yield axios_1.default.post(this.anilistGraphqlUrl, options, {
                    validateStatus: () => true,
                });
                if (status === 404)
                    throw new Error('Media not found. Perhaps the id is invalid or the anime is not in anilist');
                if (status === 429)
                    throw new Error('You have been ratelimited by anilist. Please try again later');
                // if (status >= 500) throw new Error('Anilist seems to be down. Please try again later');
                if (status !== 200 && status < 429)
                    throw Error('Media not found. If the problem persists, please contact the developer');
                if (status >= 500)
                    data = yield new anify_1.default().fetchAnimeInfoByIdRaw(id);
                animeInfo.malId = (_d = (_c = (_b = data.data) === null || _b === void 0 ? void 0 : _b.Media) === null || _c === void 0 ? void 0 : _c.idMal) !== null && _d !== void 0 ? _d : (_e = data === null || data === void 0 ? void 0 : data.mappings) === null || _e === void 0 ? void 0 : _e.mal;
                animeInfo.title = data.data.Media
                    ? {
                        romaji: data.data.Media.title.romaji,
                        english: data.data.Media.title.english,
                        native: data.data.Media.title.native,
                        userPreferred: data.data.Media.title.userPreferred,
                    }
                    : data.data.title;
                animeInfo.synonyms = (_h = (_g = (_f = data.data) === null || _f === void 0 ? void 0 : _f.Media) === null || _g === void 0 ? void 0 : _g.synonyms) !== null && _h !== void 0 ? _h : data === null || data === void 0 ? void 0 : data.synonyms;
                animeInfo.isLicensed = (_l = (_k = (_j = data.data) === null || _j === void 0 ? void 0 : _j.Media) === null || _k === void 0 ? void 0 : _k.isLicensed) !== null && _l !== void 0 ? _l : undefined;
                animeInfo.isAdult = (_p = (_o = (_m = data.data) === null || _m === void 0 ? void 0 : _m.Media) === null || _o === void 0 ? void 0 : _o.isAdult) !== null && _p !== void 0 ? _p : undefined;
                animeInfo.countryOfOrigin = (_s = (_r = (_q = data.data) === null || _q === void 0 ? void 0 : _q.Media) === null || _r === void 0 ? void 0 : _r.countryOfOrigin) !== null && _s !== void 0 ? _s : undefined;
                if ((_v = (_u = (_t = data.data) === null || _t === void 0 ? void 0 : _t.Media) === null || _u === void 0 ? void 0 : _u.trailer) === null || _v === void 0 ? void 0 : _v.id) {
                    animeInfo.trailer = {
                        id: data.data.Media.trailer.id,
                        site: (_w = data.data.Media.trailer) === null || _w === void 0 ? void 0 : _w.site,
                        thumbnail: (_x = data.data.Media.trailer) === null || _x === void 0 ? void 0 : _x.thumbnail,
                        thumbnailHash: (0, utils_2.getHashFromImage)((_y = data.data.Media.trailer) === null || _y === void 0 ? void 0 : _y.thumbnail),
                    };
                }
                animeInfo.image =
                    (_11 = (_10 = (_6 = (_2 = (_1 = (_0 = (_z = data.data) === null || _z === void 0 ? void 0 : _z.Media) === null || _0 === void 0 ? void 0 : _0.coverImage) === null || _1 === void 0 ? void 0 : _1.extraLarge) !== null && _2 !== void 0 ? _2 : (_5 = (_4 = (_3 = data.data) === null || _3 === void 0 ? void 0 : _3.Media) === null || _4 === void 0 ? void 0 : _4.coverImage) === null || _5 === void 0 ? void 0 : _5.large) !== null && _6 !== void 0 ? _6 : (_9 = (_8 = (_7 = data.data) === null || _7 === void 0 ? void 0 : _7.Media) === null || _8 === void 0 ? void 0 : _8.coverImage) === null || _9 === void 0 ? void 0 : _9.medium) !== null && _10 !== void 0 ? _10 : data.coverImage) !== null && _11 !== void 0 ? _11 : data.bannerImage;
                animeInfo.imageHash = (0, utils_2.getHashFromImage)((_24 = (_23 = (_19 = (_15 = (_14 = (_13 = (_12 = data.data) === null || _12 === void 0 ? void 0 : _12.Media) === null || _13 === void 0 ? void 0 : _13.coverImage) === null || _14 === void 0 ? void 0 : _14.extraLarge) !== null && _15 !== void 0 ? _15 : (_18 = (_17 = (_16 = data.data) === null || _16 === void 0 ? void 0 : _16.Media) === null || _17 === void 0 ? void 0 : _17.coverImage) === null || _18 === void 0 ? void 0 : _18.large) !== null && _19 !== void 0 ? _19 : (_22 = (_21 = (_20 = data.data) === null || _20 === void 0 ? void 0 : _20.Media) === null || _21 === void 0 ? void 0 : _21.coverImage) === null || _22 === void 0 ? void 0 : _22.medium) !== null && _23 !== void 0 ? _23 : data.coverImage) !== null && _24 !== void 0 ? _24 : data.bannerImage);
                animeInfo.popularity = (_27 = (_26 = (_25 = data.data) === null || _25 === void 0 ? void 0 : _25.Media) === null || _26 === void 0 ? void 0 : _26.popularity) !== null && _27 !== void 0 ? _27 : data === null || data === void 0 ? void 0 : data.popularity;
                animeInfo.color = (_31 = (_30 = (_29 = (_28 = data.data) === null || _28 === void 0 ? void 0 : _28.Media) === null || _29 === void 0 ? void 0 : _29.coverImage) === null || _30 === void 0 ? void 0 : _30.color) !== null && _31 !== void 0 ? _31 : data === null || data === void 0 ? void 0 : data.color;
                animeInfo.cover = (_35 = (_34 = (_33 = (_32 = data.data) === null || _32 === void 0 ? void 0 : _32.Media) === null || _33 === void 0 ? void 0 : _33.bannerImage) !== null && _34 !== void 0 ? _34 : data === null || data === void 0 ? void 0 : data.bannerImage) !== null && _35 !== void 0 ? _35 : animeInfo.image;
                animeInfo.coverHash = (0, utils_2.getHashFromImage)((_39 = (_38 = (_37 = (_36 = data.data) === null || _36 === void 0 ? void 0 : _36.Media) === null || _37 === void 0 ? void 0 : _37.bannerImage) !== null && _38 !== void 0 ? _38 : data === null || data === void 0 ? void 0 : data.bannerImage) !== null && _39 !== void 0 ? _39 : animeInfo.image);
                animeInfo.description = (_42 = (_41 = (_40 = data.data) === null || _40 === void 0 ? void 0 : _40.Media) === null || _41 === void 0 ? void 0 : _41.description) !== null && _42 !== void 0 ? _42 : data === null || data === void 0 ? void 0 : data.description;
                switch ((_45 = (_44 = (_43 = data.data) === null || _43 === void 0 ? void 0 : _43.Media) === null || _44 === void 0 ? void 0 : _44.status) !== null && _45 !== void 0 ? _45 : data === null || data === void 0 ? void 0 : data.status) {
                    case 'RELEASING':
                        animeInfo.status = models_1.MediaStatus.ONGOING;
                        break;
                    case 'FINISHED':
                        animeInfo.status = models_1.MediaStatus.COMPLETED;
                        break;
                    case 'NOT_YET_RELEASED':
                        animeInfo.status = models_1.MediaStatus.NOT_YET_AIRED;
                        break;
                    case 'CANCELLED':
                        animeInfo.status = models_1.MediaStatus.CANCELLED;
                        break;
                    case 'HIATUS':
                        animeInfo.status = models_1.MediaStatus.HIATUS;
                        break;
                    default:
                        animeInfo.status = models_1.MediaStatus.UNKNOWN;
                }
                animeInfo.releaseDate = (_49 = (_48 = (_47 = (_46 = data.data) === null || _46 === void 0 ? void 0 : _46.Media) === null || _47 === void 0 ? void 0 : _47.startDate) === null || _48 === void 0 ? void 0 : _48.year) !== null && _49 !== void 0 ? _49 : data.year;
                animeInfo.startDate = {
                    year: data.data.Media.startDate.year,
                    month: data.data.Media.startDate.month,
                    day: data.data.Media.startDate.day,
                };
                animeInfo.endDate = {
                    year: data.data.Media.endDate.year,
                    month: data.data.Media.endDate.month,
                    day: data.data.Media.endDate.day,
                };
                if ((_50 = data.data.Media.nextAiringEpisode) === null || _50 === void 0 ? void 0 : _50.airingAt)
                    animeInfo.nextAiringEpisode = {
                        airingTime: (_51 = data.data.Media.nextAiringEpisode) === null || _51 === void 0 ? void 0 : _51.airingAt,
                        timeUntilAiring: (_52 = data.data.Media.nextAiringEpisode) === null || _52 === void 0 ? void 0 : _52.timeUntilAiring,
                        episode: (_53 = data.data.Media.nextAiringEpisode) === null || _53 === void 0 ? void 0 : _53.episode,
                    };
                animeInfo.totalEpisodes = (_55 = (_54 = data.data.Media) === null || _54 === void 0 ? void 0 : _54.episodes) !== null && _55 !== void 0 ? _55 : ((_56 = data.data.Media.nextAiringEpisode) === null || _56 === void 0 ? void 0 : _56.episode) - 1;
                animeInfo.currentEpisode = ((_58 = (_57 = data.data.Media) === null || _57 === void 0 ? void 0 : _57.nextAiringEpisode) === null || _58 === void 0 ? void 0 : _58.episode)
                    ? ((_59 = data.data.Media.nextAiringEpisode) === null || _59 === void 0 ? void 0 : _59.episode) - 1
                    : (_60 = data.data.Media) === null || _60 === void 0 ? void 0 : _60.episodes;
                animeInfo.rating = data.data.Media.averageScore;
                animeInfo.duration = data.data.Media.duration;
                animeInfo.genres = data.data.Media.genres;
                animeInfo.season = data.data.Media.season;
                animeInfo.studios = data.data.Media.studios.edges.map((item) => item.node.name);
                animeInfo.type = data.data.Media.format;
                animeInfo.recommendations = (_63 = (_62 = (_61 = data.data.Media) === null || _61 === void 0 ? void 0 : _61.recommendations) === null || _62 === void 0 ? void 0 : _62.edges) === null || _63 === void 0 ? void 0 : _63.map((item) => {
                    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30;
                    return ({
                        id: (_b = item.node.mediaRecommendation) === null || _b === void 0 ? void 0 : _b.id,
                        malId: (_c = item.node.mediaRecommendation) === null || _c === void 0 ? void 0 : _c.idMal,
                        title: {
                            romaji: (_e = (_d = item.node.mediaRecommendation) === null || _d === void 0 ? void 0 : _d.title) === null || _e === void 0 ? void 0 : _e.romaji,
                            english: (_g = (_f = item.node.mediaRecommendation) === null || _f === void 0 ? void 0 : _f.title) === null || _g === void 0 ? void 0 : _g.english,
                            native: (_j = (_h = item.node.mediaRecommendation) === null || _h === void 0 ? void 0 : _h.title) === null || _j === void 0 ? void 0 : _j.native,
                            userPreferred: (_l = (_k = item.node.mediaRecommendation) === null || _k === void 0 ? void 0 : _k.title) === null || _l === void 0 ? void 0 : _l.userPreferred,
                        },
                        status: ((_m = item.node.mediaRecommendation) === null || _m === void 0 ? void 0 : _m.status) === 'RELEASING'
                            ? models_1.MediaStatus.ONGOING
                            : ((_o = item.node.mediaRecommendation) === null || _o === void 0 ? void 0 : _o.status) === 'FINISHED'
                                ? models_1.MediaStatus.COMPLETED
                                : ((_p = item.node.mediaRecommendation) === null || _p === void 0 ? void 0 : _p.status) === 'NOT_YET_RELEASED'
                                    ? models_1.MediaStatus.NOT_YET_AIRED
                                    : ((_q = item.node.mediaRecommendation) === null || _q === void 0 ? void 0 : _q.status) === 'CANCELLED'
                                        ? models_1.MediaStatus.CANCELLED
                                        : ((_r = item.node.mediaRecommendation) === null || _r === void 0 ? void 0 : _r.status) === 'HIATUS'
                                            ? models_1.MediaStatus.HIATUS
                                            : models_1.MediaStatus.UNKNOWN,
                        episodes: (_s = item.node.mediaRecommendation) === null || _s === void 0 ? void 0 : _s.episodes,
                        image: (_y = (_v = (_u = (_t = item.node.mediaRecommendation) === null || _t === void 0 ? void 0 : _t.coverImage) === null || _u === void 0 ? void 0 : _u.extraLarge) !== null && _v !== void 0 ? _v : (_x = (_w = item.node.mediaRecommendation) === null || _w === void 0 ? void 0 : _w.coverImage) === null || _x === void 0 ? void 0 : _x.large) !== null && _y !== void 0 ? _y : (_0 = (_z = item.node.mediaRecommendation) === null || _z === void 0 ? void 0 : _z.coverImage) === null || _0 === void 0 ? void 0 : _0.medium,
                        imageHash: (0, utils_2.getHashFromImage)((_6 = (_3 = (_2 = (_1 = item.node.mediaRecommendation) === null || _1 === void 0 ? void 0 : _1.coverImage) === null || _2 === void 0 ? void 0 : _2.extraLarge) !== null && _3 !== void 0 ? _3 : (_5 = (_4 = item.node.mediaRecommendation) === null || _4 === void 0 ? void 0 : _4.coverImage) === null || _5 === void 0 ? void 0 : _5.large) !== null && _6 !== void 0 ? _6 : (_8 = (_7 = item.node.mediaRecommendation) === null || _7 === void 0 ? void 0 : _7.coverImage) === null || _8 === void 0 ? void 0 : _8.medium),
                        cover: (_16 = (_13 = (_10 = (_9 = item.node.mediaRecommendation) === null || _9 === void 0 ? void 0 : _9.bannerImage) !== null && _10 !== void 0 ? _10 : (_12 = (_11 = item.node.mediaRecommendation) === null || _11 === void 0 ? void 0 : _11.coverImage) === null || _12 === void 0 ? void 0 : _12.extraLarge) !== null && _13 !== void 0 ? _13 : (_15 = (_14 = item.node.mediaRecommendation) === null || _14 === void 0 ? void 0 : _14.coverImage) === null || _15 === void 0 ? void 0 : _15.large) !== null && _16 !== void 0 ? _16 : (_18 = (_17 = item.node.mediaRecommendation) === null || _17 === void 0 ? void 0 : _17.coverImage) === null || _18 === void 0 ? void 0 : _18.medium,
                        coverHash: (0, utils_2.getHashFromImage)((_26 = (_23 = (_20 = (_19 = item.node.mediaRecommendation) === null || _19 === void 0 ? void 0 : _19.bannerImage) !== null && _20 !== void 0 ? _20 : (_22 = (_21 = item.node.mediaRecommendation) === null || _21 === void 0 ? void 0 : _21.coverImage) === null || _22 === void 0 ? void 0 : _22.extraLarge) !== null && _23 !== void 0 ? _23 : (_25 = (_24 = item.node.mediaRecommendation) === null || _24 === void 0 ? void 0 : _24.coverImage) === null || _25 === void 0 ? void 0 : _25.large) !== null && _26 !== void 0 ? _26 : (_28 = (_27 = item.node.mediaRecommendation) === null || _27 === void 0 ? void 0 : _27.coverImage) === null || _28 === void 0 ? void 0 : _28.medium),
                        rating: (_29 = item.node.mediaRecommendation) === null || _29 === void 0 ? void 0 : _29.meanScore,
                        type: (_30 = item.node.mediaRecommendation) === null || _30 === void 0 ? void 0 : _30.format,
                    });
                });
                animeInfo.characters = (_67 = (_66 = (_65 = (_64 = data.data) === null || _64 === void 0 ? void 0 : _64.Media) === null || _65 === void 0 ? void 0 : _65.characters) === null || _66 === void 0 ? void 0 : _66.edges) === null || _67 === void 0 ? void 0 : _67.map((item) => {
                    var _b, _c, _d;
                    return ({
                        id: (_b = item.node) === null || _b === void 0 ? void 0 : _b.id,
                        role: item.role,
                        name: {
                            first: item.node.name.first,
                            last: item.node.name.last,
                            full: item.node.name.full,
                            native: item.node.name.native,
                            userPreferred: item.node.name.userPreferred,
                        },
                        image: (_c = item.node.image.large) !== null && _c !== void 0 ? _c : item.node.image.medium,
                        imageHash: (0, utils_2.getHashFromImage)((_d = item.node.image.large) !== null && _d !== void 0 ? _d : item.node.image.medium),
                        voiceActors: item.voiceActors.map((voiceActor) => {
                            var _b, _c;
                            return ({
                                id: voiceActor.id,
                                language: voiceActor.languageV2,
                                name: {
                                    first: voiceActor.name.first,
                                    last: voiceActor.name.last,
                                    full: voiceActor.name.full,
                                    native: voiceActor.name.native,
                                    userPreferred: voiceActor.name.userPreferred,
                                },
                                image: (_b = voiceActor.image.large) !== null && _b !== void 0 ? _b : voiceActor.image.medium,
                                imageHash: (0, utils_2.getHashFromImage)((_c = voiceActor.image.large) !== null && _c !== void 0 ? _c : voiceActor.image.medium),
                            });
                        }),
                    });
                });
                animeInfo.relations = (_71 = (_70 = (_69 = (_68 = data.data) === null || _68 === void 0 ? void 0 : _68.Media) === null || _69 === void 0 ? void 0 : _69.relations) === null || _70 === void 0 ? void 0 : _70.edges) === null || _71 === void 0 ? void 0 : _71.map((item) => {
                    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                    return ({
                        id: item.node.id,
                        relationType: item.relationType,
                        malId: item.node.idMal,
                        title: {
                            romaji: item.node.title.romaji,
                            english: item.node.title.english,
                            native: item.node.title.native,
                            userPreferred: item.node.title.userPreferred,
                        },
                        status: item.node.status === 'RELEASING'
                            ? models_1.MediaStatus.ONGOING
                            : item.node.status === 'FINISHED'
                                ? models_1.MediaStatus.COMPLETED
                                : item.node.status === 'NOT_YET_RELEASED'
                                    ? models_1.MediaStatus.NOT_YET_AIRED
                                    : item.node.status === 'CANCELLED'
                                        ? models_1.MediaStatus.CANCELLED
                                        : item.node.status === 'HIATUS'
                                            ? models_1.MediaStatus.HIATUS
                                            : models_1.MediaStatus.UNKNOWN,
                        episodes: item.node.episodes,
                        image: (_c = (_b = item.node.coverImage.extraLarge) !== null && _b !== void 0 ? _b : item.node.coverImage.large) !== null && _c !== void 0 ? _c : item.node.coverImage.medium,
                        imageHash: (0, utils_2.getHashFromImage)((_e = (_d = item.node.coverImage.extraLarge) !== null && _d !== void 0 ? _d : item.node.coverImage.large) !== null && _e !== void 0 ? _e : item.node.coverImage.medium),
                        color: (_f = item.node.coverImage) === null || _f === void 0 ? void 0 : _f.color,
                        type: item.node.format,
                        cover: (_j = (_h = (_g = item.node.bannerImage) !== null && _g !== void 0 ? _g : item.node.coverImage.extraLarge) !== null && _h !== void 0 ? _h : item.node.coverImage.large) !== null && _j !== void 0 ? _j : item.node.coverImage.medium,
                        coverHash: (0, utils_2.getHashFromImage)((_m = (_l = (_k = item.node.bannerImage) !== null && _k !== void 0 ? _k : item.node.coverImage.extraLarge) !== null && _l !== void 0 ? _l : item.node.coverImage.large) !== null && _m !== void 0 ? _m : item.node.coverImage.medium),
                        rating: item.node.meanScore,
                    });
                });
                if (this.provider instanceof zoro_1.default) {
                    try {
                        const anifyInfo = yield new anify_1.default(this.proxyConfig, undefined, this.provider.name.toLowerCase()).fetchAnimeInfo(id);
                        animeInfo.mappings = anifyInfo.mappings;
                        animeInfo.artwork = anifyInfo.artwork;
                        animeInfo.episodes = (_72 = anifyInfo.episodes) === null || _72 === void 0 ? void 0 : _72.map((item) => {
                            var _b;
                            return ({
                                id: item.id,
                                title: item.title,
                                description: item.description,
                                number: item.number,
                                image: item.image,
                                imageHash: (0, utils_2.getHashFromImage)(item.image),
                                airDate: (_b = item.airDate) !== null && _b !== void 0 ? _b : null,
                            });
                        });
                        if (!((_73 = animeInfo.episodes) === null || _73 === void 0 ? void 0 : _73.length)) {
                            animeInfo.episodes = yield this.fetchDefaultEpisodeList({
                                idMal: animeInfo.malId,
                                season: data.data.Media.season,
                                startDate: { year: parseInt(animeInfo.releaseDate) },
                                title: {
                                    english: (_74 = animeInfo.title) === null || _74 === void 0 ? void 0 : _74.english,
                                    romaji: (_75 = animeInfo.title) === null || _75 === void 0 ? void 0 : _75.romaji,
                                },
                            });
                            animeInfo.episodes = (_76 = animeInfo.episodes) === null || _76 === void 0 ? void 0 : _76.map((episode) => {
                                if (!episode.image) {
                                    episode.image = animeInfo.image;
                                    episode.imageHash = animeInfo.imageHash;
                                }
                                return episode;
                            });
                        }
                    }
                    catch (err) {
                        animeInfo.episodes = yield this.fetchDefaultEpisodeList({
                            idMal: animeInfo.malId,
                            season: data.data.Media.season,
                            startDate: { year: parseInt(animeInfo.releaseDate) },
                            title: {
                                english: (_77 = animeInfo.title) === null || _77 === void 0 ? void 0 : _77.english,
                                romaji: (_78 = animeInfo.title) === null || _78 === void 0 ? void 0 : _78.romaji,
                            },
                        });
                        animeInfo.episodes = (_79 = animeInfo.episodes) === null || _79 === void 0 ? void 0 : _79.map((episode) => {
                            if (!episode.image) {
                                episode.image = animeInfo.image;
                                episode.imageHash = animeInfo.imageHash;
                            }
                            return episode;
                        });
                        return animeInfo;
                    }
                }
                else
                    animeInfo.episodes = yield this.fetchDefaultEpisodeList({
                        idMal: animeInfo.malId,
                        season: data.data.Media.season,
                        startDate: { year: parseInt(animeInfo.releaseDate) },
                        title: {
                            english: (_80 = animeInfo.title) === null || _80 === void 0 ? void 0 : _80.english,
                            romaji: (_81 = animeInfo.title) === null || _81 === void 0 ? void 0 : _81.romaji,
                        },
                        externalLinks: data.data.Media.externalLinks.filter((link) => link.type === 'STREAMING'),
                    });
                if (fetchFiller) {
                    const { data: fillerData } = yield axios_1.default.get(`https://raw.githubusercontent.com/saikou-app/mal-id-filler-list/main/fillers/${animeInfo.malId}.json`, { validateStatus: () => true });
                    if (!fillerData.toString().startsWith('404')) {
                        fillerEpisodes = [];
                        fillerEpisodes === null || fillerEpisodes === void 0 ? void 0 : fillerEpisodes.push(...fillerData.episodes);
                    }
                }
                animeInfo.episodes = (_82 = animeInfo.episodes) === null || _82 === void 0 ? void 0 : _82.map((episode) => {
                    if (!episode.image) {
                        episode.image = animeInfo.image;
                        episode.imageHash = animeInfo.imageHash;
                    }
                    if (fetchFiller && (fillerEpisodes === null || fillerEpisodes === void 0 ? void 0 : fillerEpisodes.length) > 0 && (fillerEpisodes === null || fillerEpisodes === void 0 ? void 0 : fillerEpisodes.length) >= animeInfo.episodes.length) {
                        if (fillerEpisodes[episode.number - 1])
                            episode.isFiller = new Boolean(fillerEpisodes === null || fillerEpisodes === void 0 ? void 0 : fillerEpisodes[episode.number - 1]['filler-bool']).valueOf();
                    }
                    return episode;
                });
                return animeInfo;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param episodeId Episode id
         */
        this.fetchEpisodeSources = (episodeId, ...args) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.provider instanceof anify_1.default)
                    return new anify_1.default().fetchEpisodeSources(episodeId, args[0], args[1]);
                return this.provider.fetchEpisodeSources(episodeId, ...args);
            }
            catch (err) {
                throw new Error(`Failed to fetch episode sources from ${this.provider.name}: ${err}`);
            }
        });
        /**
         *
         * @param episodeId Episode id
         */
        this.fetchEpisodeServers = (episodeId) => __awaiter(this, void 0, void 0, function* () {
            try {
                return this.provider.fetchEpisodeServers(episodeId);
            }
            catch (err) {
                throw new Error(`Failed to fetch episode servers from ${this.provider.name}: ${err}`);
            }
        });
        /**
         * @param page page number to search for (optional)
         * @param perPage number of results per page (optional)
         */
        this.fetchTrendingAnime = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1, perPage = 10) {
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: (0, utils_1.anilistTrendingQuery)(page, perPage),
            };
            try {
                const { data } = yield axios_1.default.post(this.anilistGraphqlUrl, options);
                const res = {
                    currentPage: data.data.Page.pageInfo.currentPage,
                    hasNextPage: data.data.Page.pageInfo.hasNextPage,
                    results: data.data.Page.media.map((item) => {
                        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
                        return ({
                            id: item.id.toString(),
                            malId: item.idMal,
                            title: item.title
                                ? {
                                    romaji: item.title.romaji,
                                    english: item.title.english,
                                    native: item.title.native,
                                    userPreferred: item.title.userPreferred,
                                }
                                : item.title.romaji,
                            image: (_c = (_b = item.coverImage.extraLarge) !== null && _b !== void 0 ? _b : item.coverImage.large) !== null && _c !== void 0 ? _c : item.coverImage.medium,
                            imageHash: (0, utils_2.getHashFromImage)((_e = (_d = item.coverImage.extraLarge) !== null && _d !== void 0 ? _d : item.coverImage.large) !== null && _e !== void 0 ? _e : item.coverImage.medium),
                            trailer: {
                                id: (_f = item.trailer) === null || _f === void 0 ? void 0 : _f.id,
                                site: (_g = item.trailer) === null || _g === void 0 ? void 0 : _g.site,
                                thumbnail: (_h = item.trailer) === null || _h === void 0 ? void 0 : _h.thumbnail,
                                thumbnailHash: (0, utils_2.getHashFromImage)((_j = item.trailer) === null || _j === void 0 ? void 0 : _j.thumbnail),
                            },
                            description: item.description,
                            status: item.status === 'RELEASING'
                                ? models_1.MediaStatus.ONGOING
                                : item.status === 'FINISHED'
                                    ? models_1.MediaStatus.COMPLETED
                                    : item.status === 'NOT_YET_RELEASED'
                                        ? models_1.MediaStatus.NOT_YET_AIRED
                                        : item.status === 'CANCELLED'
                                            ? models_1.MediaStatus.CANCELLED
                                            : item.status === 'HIATUS'
                                                ? models_1.MediaStatus.HIATUS
                                                : models_1.MediaStatus.UNKNOWN,
                            cover: (_m = (_l = (_k = item.bannerImage) !== null && _k !== void 0 ? _k : item.coverImage.extraLarge) !== null && _l !== void 0 ? _l : item.coverImage.large) !== null && _m !== void 0 ? _m : item.coverImage.medium,
                            coverHash: (0, utils_2.getHashFromImage)((_q = (_p = (_o = item.bannerImage) !== null && _o !== void 0 ? _o : item.coverImage.extraLarge) !== null && _p !== void 0 ? _p : item.coverImage.large) !== null && _q !== void 0 ? _q : item.coverImage.medium),
                            rating: item.averageScore,
                            releaseDate: item.seasonYear,
                            color: (_r = item.coverImage) === null || _r === void 0 ? void 0 : _r.color,
                            genres: item.genres,
                            totalEpisodes: isNaN(item.episodes)
                                ? 0
                                : ((_s = item.episodes) !== null && _s !== void 0 ? _s : (((_t = item.nextAiringEpisode) === null || _t === void 0 ? void 0 : _t.episode) ? item.nextAiringEpisode.episode - 1 : 0)),
                            duration: item.duration,
                            type: item.format,
                        });
                    }),
                };
                return res;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param page page number to search for (optional)
         * @param perPage number of results per page (optional)
         */
        this.fetchPopularAnime = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1, perPage = 10) {
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: (0, utils_1.anilistPopularQuery)(page, perPage),
            };
            try {
                const { data } = yield axios_1.default.post(this.anilistGraphqlUrl, options);
                const res = {
                    currentPage: data.data.Page.pageInfo.currentPage,
                    hasNextPage: data.data.Page.pageInfo.hasNextPage,
                    results: data.data.Page.media.map((item) => {
                        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
                        return ({
                            id: item.id.toString(),
                            malId: item.idMal,
                            title: item.title
                                ? {
                                    romaji: item.title.romaji,
                                    english: item.title.english,
                                    native: item.title.native,
                                    userPreferred: item.title.userPreferred,
                                }
                                : item.title.romaji,
                            image: (_c = (_b = item.coverImage.extraLarge) !== null && _b !== void 0 ? _b : item.coverImage.large) !== null && _c !== void 0 ? _c : item.coverImage.medium,
                            imageHash: (0, utils_2.getHashFromImage)((_e = (_d = item.coverImage.extraLarge) !== null && _d !== void 0 ? _d : item.coverImage.large) !== null && _e !== void 0 ? _e : item.coverImage.medium),
                            trailer: {
                                id: (_f = item.trailer) === null || _f === void 0 ? void 0 : _f.id,
                                site: (_g = item.trailer) === null || _g === void 0 ? void 0 : _g.site,
                                thumbnail: (_h = item.trailer) === null || _h === void 0 ? void 0 : _h.thumbnail,
                                thumbnailHash: (0, utils_2.getHashFromImage)((_j = item.trailer) === null || _j === void 0 ? void 0 : _j.thumbnail),
                            },
                            description: item.description,
                            status: item.status === 'RELEASING'
                                ? models_1.MediaStatus.ONGOING
                                : item.status === 'FINISHED'
                                    ? models_1.MediaStatus.COMPLETED
                                    : item.status === 'NOT_YET_RELEASED'
                                        ? models_1.MediaStatus.NOT_YET_AIRED
                                        : item.status === 'CANCELLED'
                                            ? models_1.MediaStatus.CANCELLED
                                            : item.status === 'HIATUS'
                                                ? models_1.MediaStatus.HIATUS
                                                : models_1.MediaStatus.UNKNOWN,
                            cover: (_m = (_l = (_k = item.bannerImage) !== null && _k !== void 0 ? _k : item.coverImage.extraLarge) !== null && _l !== void 0 ? _l : item.coverImage.large) !== null && _m !== void 0 ? _m : item.coverImage.medium,
                            coverHash: (0, utils_2.getHashFromImage)((_q = (_p = (_o = item.bannerImage) !== null && _o !== void 0 ? _o : item.coverImage.extraLarge) !== null && _p !== void 0 ? _p : item.coverImage.large) !== null && _q !== void 0 ? _q : item.coverImage.medium),
                            rating: item.averageScore,
                            releaseDate: item.seasonYear,
                            color: (_r = item.coverImage) === null || _r === void 0 ? void 0 : _r.color,
                            genres: item.genres,
                            totalEpisodes: isNaN(item.episodes)
                                ? 0
                                : ((_s = item.episodes) !== null && _s !== void 0 ? _s : (((_t = item.nextAiringEpisode) === null || _t === void 0 ? void 0 : _t.episode) ? item.nextAiringEpisode.episode - 1 : 0)),
                            duration: item.duration,
                            type: item.format,
                        });
                    }),
                };
                return res;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param page page number (optional)
         * @param perPage number of results per page (optional)
         * @param weekStart Filter by the start of the week (optional) (default: todays date) (options: 2 = Monday, 3 = Tuesday, 4 = Wednesday, 5 = Thursday, 6 = Friday, 0 = Saturday, 1 = Sunday) you can use either the number or the string
         * @param weekEnd Filter by the end of the week (optional) similar to weekStart
         * @param notYetAired if true will return anime that have not yet aired (optional)
         * @returns the next airing episodes
         */
        this.fetchAiringSchedule = (...args_1) => __awaiter(this, [...args_1], void 0, function* (page = 1, perPage = 20, weekStart = (new Date().getDay() + 1) % 7, weekEnd = (new Date().getDay() + 7) % 7, notYetAired = false) {
            let day1, day2;
            if (typeof weekStart === 'string' && typeof weekEnd === 'string')
                [day1, day2] = (0, utils_1.getDays)((0, utils_1.capitalizeFirstLetter)(weekStart.toLowerCase()), (0, utils_1.capitalizeFirstLetter)(weekEnd.toLowerCase()));
            else if (typeof weekStart === 'number' && typeof weekEnd === 'number')
                [day1, day2] = [weekStart, weekEnd];
            else
                throw new Error('Invalid weekStart or weekEnd');
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: (0, utils_1.anilistAiringScheduleQuery)(page, perPage, day1, day2, notYetAired),
            };
            try {
                const { data } = yield axios_1.default.post(this.anilistGraphqlUrl, options);
                const res = {
                    currentPage: data.data.Page.pageInfo.currentPage,
                    hasNextPage: data.data.Page.pageInfo.hasNextPage,
                    results: data.data.Page.airingSchedules.map((item) => {
                        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                        return ({
                            id: item.media.id.toString(),
                            malId: item.media.idMal,
                            episode: item.episode,
                            airingAt: item.airingAt,
                            title: item.media.title
                                ? {
                                    romaji: item.media.title.romaji,
                                    english: item.media.title.english,
                                    native: item.media.title.native,
                                    userPreferred: item.media.title.userPreferred,
                                }
                                : item.media.title.romaji,
                            country: item.media.countryOfOrigin,
                            image: (_c = (_b = item.media.coverImage.extraLarge) !== null && _b !== void 0 ? _b : item.media.coverImage.large) !== null && _c !== void 0 ? _c : item.media.coverImage.medium,
                            imageHash: (0, utils_2.getHashFromImage)((_e = (_d = item.media.coverImage.extraLarge) !== null && _d !== void 0 ? _d : item.media.coverImage.large) !== null && _e !== void 0 ? _e : item.media.coverImage.medium),
                            description: item.media.description,
                            cover: (_h = (_g = (_f = item.media.bannerImage) !== null && _f !== void 0 ? _f : item.media.coverImage.extraLarge) !== null && _g !== void 0 ? _g : item.media.coverImage.large) !== null && _h !== void 0 ? _h : item.media.coverImage.medium,
                            coverHash: (0, utils_2.getHashFromImage)((_l = (_k = (_j = item.media.bannerImage) !== null && _j !== void 0 ? _j : item.media.coverImage.extraLarge) !== null && _k !== void 0 ? _k : item.media.coverImage.large) !== null && _l !== void 0 ? _l : item.media.coverImage.medium),
                            genres: item.media.genres,
                            color: (_m = item.media.coverImage) === null || _m === void 0 ? void 0 : _m.color,
                            rating: item.media.averageScore,
                            releaseDate: item.media.seasonYear,
                            type: item.media.format,
                        });
                    }),
                };
                return res;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param genres An array of genres to filter by (optional) genres: [`Action`, `Adventure`, `Cars`, `Comedy`, `Drama`, `Fantasy`, `Horror`, `Mahou Shoujo`, `Mecha`, `Music`, `Mystery`, `Psychological`, `Romance`, `Sci-Fi`, `Slice of Life`, `Sports`, `Supernatural`, `Thriller`]
         * @param page page number (optional)
         * @param perPage number of results per page (optional)
         */
        this.fetchAnimeGenres = (genres_1, ...args_1) => __awaiter(this, [genres_1, ...args_1], void 0, function* (genres, page = 1, perPage = 20) {
            if (genres.length === 0)
                throw new Error('No genres specified');
            for (const genre of genres)
                if (!Object.values(models_1.Genres).includes(genre))
                    throw new Error('Invalid genre');
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: (0, utils_1.anilistGenresQuery)(genres, page, perPage),
            };
            try {
                const { data } = yield axios_1.default.post(this.anilistGraphqlUrl, options);
                const res = {
                    currentPage: data.data.Page.pageInfo.currentPage,
                    hasNextPage: data.data.Page.pageInfo.hasNextPage,
                    results: data.data.Page.media.map((item) => {
                        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
                        return ({
                            id: item.id.toString(),
                            malId: item.idMal,
                            title: item.title
                                ? {
                                    romaji: item.title.romaji,
                                    english: item.title.english,
                                    native: item.title.native,
                                    userPreferred: item.title.userPreferred,
                                }
                                : item.title.romaji,
                            image: (_c = (_b = item.coverImage.extraLarge) !== null && _b !== void 0 ? _b : item.coverImage.large) !== null && _c !== void 0 ? _c : item.coverImage.medium,
                            imageHash: (0, utils_2.getHashFromImage)((_e = (_d = item.coverImage.extraLarge) !== null && _d !== void 0 ? _d : item.coverImage.large) !== null && _e !== void 0 ? _e : item.coverImage.medium),
                            trailer: {
                                id: (_f = item.trailer) === null || _f === void 0 ? void 0 : _f.id,
                                site: (_g = item.trailer) === null || _g === void 0 ? void 0 : _g.site,
                                thumbnail: (_h = item.trailer) === null || _h === void 0 ? void 0 : _h.thumbnail,
                                thumbnailHash: (0, utils_2.getHashFromImage)((_j = item.trailer) === null || _j === void 0 ? void 0 : _j.thumbnail),
                            },
                            description: item.description,
                            cover: (_m = (_l = (_k = item.bannerImage) !== null && _k !== void 0 ? _k : item.coverImage.extraLarge) !== null && _l !== void 0 ? _l : item.coverImage.large) !== null && _m !== void 0 ? _m : item.coverImage.medium,
                            coverHash: (0, utils_2.getHashFromImage)((_q = (_p = (_o = item.bannerImage) !== null && _o !== void 0 ? _o : item.coverImage.extraLarge) !== null && _p !== void 0 ? _p : item.coverImage.large) !== null && _q !== void 0 ? _q : item.coverImage.medium),
                            rating: item.averageScore,
                            releaseDate: item.seasonYear,
                            color: (_r = item.coverImage) === null || _r === void 0 ? void 0 : _r.color,
                            genres: item.genres,
                            totalEpisodes: isNaN(item.episodes)
                                ? 0
                                : ((_s = item.episodes) !== null && _s !== void 0 ? _s : (((_t = item.nextAiringEpisode) === null || _t === void 0 ? void 0 : _t.episode) ? item.nextAiringEpisode.episode - 1 : 0)),
                            duration: item.duration,
                            type: item.format,
                        });
                    }),
                };
                return res;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        this.findAnimeRaw = (title) => __awaiter(this, void 0, void 0, function* () {
            const searchTerm = (title === null || title === void 0 ? void 0 : title.romaji) || (title === null || title === void 0 ? void 0 : title.english) || (title === null || title === void 0 ? void 0 : title.userPreferred) || '';
            const findAnime = (yield this.provider.search(searchTerm));
            if (!(findAnime === null || findAnime === void 0 ? void 0 : findAnime.results)) {
                return {};
            }
            // Run similar title searches in parallel
            const [mappedEng, mappedRom] = yield Promise.all([
                Promise.resolve((0, utils_2.findSimilarTitles)((title === null || title === void 0 ? void 0 : title.english) || '', findAnime.results)),
                Promise.resolve((0, utils_2.findSimilarTitles)((title === null || title === void 0 ? void 0 : title.romaji) || '', findAnime.results)),
            ]);
            // Use Set for efficient deduplication
            const uniqueResults = Array.from(new Set([...mappedEng, ...mappedRom].map((item) => JSON.stringify(item)))).map((str) => JSON.parse(str));
            // Sort by similarity score
            uniqueResults.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
            const mappings = {};
            for (const obj of uniqueResults) {
                const match = obj.title.replace(/\(TV\)/g, '').match(/\(([^)0-9]+)\)/);
                const key = match ? match[1].replace(/\s+/g, '-').toLowerCase() : 'sub';
                if (!mappings[key]) {
                    mappings[key] = obj.id;
                }
                // Early return if we have both sub and dub
                if (mappings.sub && mappings.dub)
                    break;
            }
            // console.log('mappings', mappings);
            // console.time('animeinfo');
            const animeInfo = yield this.provider.fetchAnimeInfo(mappings.sub || mappings.dub);
            // console.timeEnd('animeinfo');
            return animeInfo.episodes;
        });
        /**
         * @returns a random anime
         */
        this.fetchRandomAnime = () => __awaiter(this, void 0, void 0, function* () {
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: (0, utils_1.anilistSiteStatisticsQuery)(),
            };
            try {
                // const {
                //   data: { data },
                // } = await axios.post(this.anilistGraphqlUrl, options);
                // const selectedAnime = Math.floor(
                //   Math.random() * data.SiteStatistics.anime.nodes[data.SiteStatistics.anime.nodes.length - 1].count
                // );
                // const { results } = await this.advancedSearch(undefined, 'ANIME', Math.ceil(selectedAnime / 50), 50);
                const { data: data } = yield axios_1.default.get('https://raw.githubusercontent.com/5H4D0WILA/IDFetch/main/ids.txt');
                const ids = data === null || data === void 0 ? void 0 : data.trim().split('\n');
                const selectedAnime = Math.floor(Math.random() * ids.length);
                return yield this.fetchAnimeInfo(ids[selectedAnime]);
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         * @param provider The provider to get the episode Ids from (optional) default: `gogoanime` (options: `gogoanime`, `zoro`)
         * @param page page number (optional)
         * @param perPage number of results per page (optional)
         */
        this.fetchRecentEpisodes = (...args_1) => __awaiter(this, [...args_1], void 0, function* (provider = 'gogoanime', page = 1, perPage = 25) {
            try {
                const { data } = yield axios_1.default.get(`${this.anifyUrl}/recent?page=${page}&perPage=${perPage}&type=anime`);
                const results = data === null || data === void 0 ? void 0 : data.map((item) => {
                    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
                    return {
                        id: item.id.toString(),
                        malId: (_b = item.mappings.find((item) => item.providerType === 'META' && item.providerId === 'mal')) === null || _b === void 0 ? void 0 : _b.id,
                        title: {
                            romaji: (_c = item.title) === null || _c === void 0 ? void 0 : _c.romaji,
                            english: (_d = item.title) === null || _d === void 0 ? void 0 : _d.english,
                            native: (_e = item.title) === null || _e === void 0 ? void 0 : _e.native,
                            // userPreferred: (_f = item.title) === null || _f === void 0 ? void 0 : _f.userPreferred,
                        },
                        image: (_f = item.coverImage) !== null && _f !== void 0 ? _f : item.bannerImage,
                        imageHash: (0, utils_2.getHashFromImage)((_g = item.coverImage) !== null && _g !== void 0 ? _g : item.bannerImage),
                        rating: item.averageScore,
                        color: (_h = item.anime) === null || _h === void 0 ? void 0 : _h.color,
                        episodeId: `${provider === 'gogoanime'
                            ? (_k = (_j = item.episodes.data
                                .find((source) => source.providerId.toLowerCase() === 'gogoanime')) === null || _j === void 0 ? void 0 : _j.episodes.pop()) === null || _k === void 0 ? void 0 : _k.id
                            : (_m = (_l = item.episodes.data.find((source) => source.providerId.toLowerCase() === 'zoro')) === null || _l === void 0 ? void 0 : _l.episodes.pop()) === null || _m === void 0 ? void 0 : _m.id}`,
                        episodeTitle: (_o = item.episodes.latest.latestTitle) !== null && _o !== void 0 ? _o : `Episode ${item.currentEpisode}`,
                        episodeNumber: item.currentEpisode,
                        genres: item.genre,
                        type: item.format,
                    };
                });
                // results = results.filter((item) => item.episodeNumber !== 0 &&
                //     item.episodeId.replace('-enime', '').length > 0 &&
                //     item.episodeId.replace('-enime', '') !== 'undefined');
                return {
                    currentPage: page,
                    // hasNextPage: meta.lastPage !== page,
                    // totalPages: meta.lastPage,
                    totalResults: results === null || results === void 0 ? void 0 : results.length,
                    results: results,
                };
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        this.fetchDefaultEpisodeList = (Media) => __awaiter(this, void 0, void 0, function* () {
            var _b, _c;
            let episodes = [];
            episodes = yield this.findAnimeRaw({ english: (_b = Media.title) === null || _b === void 0 ? void 0 : _b.english, romaji: (_c = Media.title) === null || _c === void 0 ? void 0 : _c.romaji });
            // console.log('fetchDefaultEpisodeList', episodes);
            return episodes;
        });
        /**
         * @param id anilist id
         * @param fetchFiller to get filler boolean on the episode object (optional) set to `true` to get filler boolean on the episode object.
         * @returns episode list **(without anime info)**
         */
        this.fetchEpisodesListById = (id_1, ...args_1) => __awaiter(this, [id_1, ...args_1], void 0, function* (id, fetchFiller = false) {
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: `query($id: Int = ${id}){ Media(id: $id){ idMal externalLinks { site url } title { romaji english } status season episodes startDate { year month day } endDate { year month day }  coverImage {extraLarge large medium} } }`,
            };
            const { data: { data: { Media }, }, } = yield axios_1.default.post(this.anilistGraphqlUrl, options);
            let possibleAnimeEpisodes = [];
            let fillerEpisodes = [];
            if (this.provider instanceof zoro_1.default || this.provider instanceof animekai_1.default || this.provider instanceof animepahe_1.default) {
                try {
                    // console.time('fetchEpisodesListById');
                    const [animeMetaData, providerEpisodes] = yield Promise.all([
                        axios_1.default.get(`https://api.ani.zip/mappings?anilist_id=${id}`).then((res) => res.data),
                        this.fetchDefaultEpisodeList(Media),
                    ]);
                    // console.timeEnd('fetchEpisodesListById');
                    //to get the actual episode ids we make use of fetchDefaultEpisodeList
                    const normalizedEpisodes = Object.entries(animeMetaData.episodes || {}).map(([key, item]) => {
                        var _b, _c, _d, _e, _f, _g;
                        return ({
                            title: (_b = item.title.en) !== null && _b !== void 0 ? _b : item.title['x-jat'],
                            uniqueId: `${id}$ep=${(_c = item.episodeNumber) !== null && _c !== void 0 ? _c : item.episode}`,
                            description: (_d = item.overview) !== null && _d !== void 0 ? _d : item.summary,
                            number: (_e = item.episodeNumber) !== null && _e !== void 0 ? _e : parseInt(item.episode),
                            image: item.image,
                            imageHash: (0, utils_2.getHashFromImage)(item.image),
                            releaseDate: (_g = (_f = item.airDate) !== null && _f !== void 0 ? _f : item.airdate) !== null && _g !== void 0 ? _g : item.airDateUtc,
                        });
                    });
                    function mergeEpisodes(normalizedEpisodes, providerEpisodes) {
                        const numberMap = new Map();
                        const dateMap = new Map();
                        const usedNormalized = new Set();
                        normalizedEpisodes.forEach((ep) => {
                            if (ep.number)
                                numberMap.set(ep.number, ep);
                            if (ep.releaseDate) {
                                const ts = new Date(ep.releaseDate).getTime();
                                dateMap.set(ts, ep);
                            }
                        });
                        return providerEpisodes.map((providerEp, index) => {
                            let normalizedEp = null;
                            const matchIfNotUsed = (ep) => ep && !usedNormalized.has(ep.uniqueId);
                            // Match by release date (within ±1 day)
                            if (providerEp.releaseDate) {
                                const ts = new Date(providerEp.releaseDate).getTime();
                                for (let [normTs, normEp] of dateMap) {
                                    if (Math.abs(ts - normTs) <= 86400000 && matchIfNotUsed(normEp)) {
                                        normalizedEp = normEp;
                                        break;
                                    }
                                }
                            }
                            // Match by episode number
                            if (!normalizedEp && providerEp.number != null) {
                                const ep = numberMap.get(providerEp.number);
                                if (matchIfNotUsed(ep))
                                    normalizedEp = ep;
                            }
                            // Match by title similarity
                            if (!normalizedEp && providerEp.title) {
                                normalizedEp = normalizedEpisodes.find((normEp) => { var _b; return matchIfNotUsed(normEp) && ((_b = normEp.title) === null || _b === void 0 ? void 0 : _b.includes(providerEp.title)); });
                            }
                            // Fallback to same index
                            if (!normalizedEp && matchIfNotUsed(normalizedEpisodes[index])) {
                                normalizedEp = normalizedEpisodes[index];
                            }
                            // Mark this normalized episode as used
                            if (normalizedEp) {
                                usedNormalized.add(normalizedEp.uniqueId);
                            }
                            if (!normalizedEp)
                                return providerEp;
                            return Object.assign(Object.assign({}, providerEp), { number: normalizedEp.number || providerEp.number, uniqueId: normalizedEp.uniqueId || providerEp.uniqueId, title: normalizedEp.title || providerEp.title, description: normalizedEp.description || providerEp.description, image: normalizedEp.image || providerEp.image, imageHash: normalizedEp.imageHash || providerEp.imageHash, releaseDate: normalizedEp.releaseDate || providerEp.releaseDate });
                        });
                    }
                    // console.log({
                    //   normalizedEpisodes,
                    //   providerEpisodes,
                    //   merged: mergeEpisodes(normalizedEpisodes, providerEpisodes),
                    // });
                    possibleAnimeEpisodes = mergeEpisodes(normalizedEpisodes, providerEpisodes);
                    if (!possibleAnimeEpisodes.length) {
                        possibleAnimeEpisodes = yield this.fetchDefaultEpisodeList(Media);
                        possibleAnimeEpisodes = possibleAnimeEpisodes === null || possibleAnimeEpisodes === void 0 ? void 0 : possibleAnimeEpisodes.map((episode) => {
                            var _b, _c, _d, _e;
                            if (!episode.image) {
                                episode.image = (_c = (_b = Media.coverImage.extraLarge) !== null && _b !== void 0 ? _b : Media.coverImage.large) !== null && _c !== void 0 ? _c : Media.coverImage.medium;
                                episode.imageHash = (0, utils_2.getHashFromImage)((_e = (_d = Media.coverImage.extraLarge) !== null && _d !== void 0 ? _d : Media.coverImage.large) !== null && _e !== void 0 ? _e : Media.coverImage.medium);
                            }
                            return episode;
                        });
                    }
                }
                catch (err) {
                    possibleAnimeEpisodes = yield this.fetchDefaultEpisodeList(Media);
                    possibleAnimeEpisodes = possibleAnimeEpisodes === null || possibleAnimeEpisodes === void 0 ? void 0 : possibleAnimeEpisodes.map((episode) => {
                        var _b, _c, _d, _e;
                        if (!episode.image) {
                            episode.image = (_c = (_b = Media.coverImage.extraLarge) !== null && _b !== void 0 ? _b : Media.coverImage.large) !== null && _c !== void 0 ? _c : Media.coverImage.medium;
                            episode.imageHash = (0, utils_2.getHashFromImage)((_e = (_d = Media.coverImage.extraLarge) !== null && _d !== void 0 ? _d : Media.coverImage.large) !== null && _e !== void 0 ? _e : Media.coverImage.medium);
                        }
                        return episode;
                    });
                    return possibleAnimeEpisodes;
                }
            }
            else
                possibleAnimeEpisodes = yield this.fetchDefaultEpisodeList(Media);
            if (fetchFiller) {
                const { data: fillerData } = yield axios_1.default.get(`https://raw.githubusercontent.com/saikou-app/mal-id-filler-list/main/fillers/${Media.idMal}.json`, {
                    validateStatus: () => true,
                });
                if (!fillerData.toString().startsWith('404')) {
                    fillerEpisodes = [];
                    fillerEpisodes === null || fillerEpisodes === void 0 ? void 0 : fillerEpisodes.push(...fillerData.episodes);
                }
            }
            possibleAnimeEpisodes = possibleAnimeEpisodes === null || possibleAnimeEpisodes === void 0 ? void 0 : possibleAnimeEpisodes.map((episode) => {
                var _b, _c, _d, _e;
                if (!episode.image) {
                    episode.image = (_c = (_b = Media.coverImage.extraLarge) !== null && _b !== void 0 ? _b : Media.coverImage.large) !== null && _c !== void 0 ? _c : Media.coverImage.medium;
                    episode.imageHash = (0, utils_2.getHashFromImage)((_e = (_d = Media.coverImage.extraLarge) !== null && _d !== void 0 ? _d : Media.coverImage.large) !== null && _e !== void 0 ? _e : Media.coverImage.medium);
                }
                if (fetchFiller && (fillerEpisodes === null || fillerEpisodes === void 0 ? void 0 : fillerEpisodes.length) > 0 && (fillerEpisodes === null || fillerEpisodes === void 0 ? void 0 : fillerEpisodes.length) >= Media.episodes) {
                    if (fillerEpisodes[episode.number - 1])
                        episode.isFiller = new Boolean(fillerEpisodes[episode.number - 1]['filler-bool']).valueOf();
                }
                return episode;
            });
            return possibleAnimeEpisodes;
        });
        /**
         * @param id anilist id
         * @returns anilist data for the anime **(without episodes)** (use `fetchEpisodesListById` to get the episodes) (use `fetchAnimeInfo` to get both)
         */
        this.fetchAnilistInfoById = (id) => __awaiter(this, void 0, void 0, function* () {
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5;
            const animeInfo = {
                id: id,
                title: '',
            };
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: (0, utils_1.anilistMediaDetailQuery)(id),
            };
            try {
                const { data } = yield axios_1.default.post(this.anilistGraphqlUrl, options).catch(() => {
                    throw new Error('Media not found');
                });
                animeInfo.malId = data.data.Media.idMal;
                animeInfo.title = {
                    romaji: data.data.Media.title.romaji,
                    english: data.data.Media.title.english,
                    native: data.data.Media.title.native,
                    userPreferred: data.data.Media.title.userPreferred,
                };
                if ((_b = data.data.Media.trailer) === null || _b === void 0 ? void 0 : _b.id) {
                    animeInfo.trailer = {
                        id: (_c = data.data.Media.trailer) === null || _c === void 0 ? void 0 : _c.id,
                        site: (_d = data.data.Media.trailer) === null || _d === void 0 ? void 0 : _d.site,
                        thumbnail: (_e = data.data.Media.trailer) === null || _e === void 0 ? void 0 : _e.thumbnail,
                        thumbnailHash: (0, utils_2.getHashFromImage)((_f = data.data.Media.trailer) === null || _f === void 0 ? void 0 : _f.thumbnail),
                    };
                }
                animeInfo.synonyms = data.data.Media.synonyms;
                animeInfo.isLicensed = data.data.Media.isLicensed;
                animeInfo.isAdult = data.data.Media.isAdult;
                animeInfo.countryOfOrigin = data.data.Media.countryOfOrigin;
                animeInfo.image =
                    (_h = (_g = data.data.Media.coverImage.extraLarge) !== null && _g !== void 0 ? _g : data.data.Media.coverImage.large) !== null && _h !== void 0 ? _h : data.data.Media.coverImage.medium;
                animeInfo.imageHash = (0, utils_2.getHashFromImage)((_k = (_j = data.data.Media.coverImage.extraLarge) !== null && _j !== void 0 ? _j : data.data.Media.coverImage.large) !== null && _k !== void 0 ? _k : data.data.Media.coverImage.medium);
                animeInfo.cover = (_l = data.data.Media.bannerImage) !== null && _l !== void 0 ? _l : animeInfo.image;
                animeInfo.coverHash = (0, utils_2.getHashFromImage)((_m = data.data.Media.bannerImage) !== null && _m !== void 0 ? _m : animeInfo.image);
                animeInfo.description = data.data.Media.description;
                switch (data.data.Media.status) {
                    case 'RELEASING':
                        animeInfo.status = models_1.MediaStatus.ONGOING;
                        break;
                    case 'FINISHED':
                        animeInfo.status = models_1.MediaStatus.COMPLETED;
                        break;
                    case 'NOT_YET_RELEASED':
                        animeInfo.status = models_1.MediaStatus.NOT_YET_AIRED;
                        break;
                    case 'CANCELLED':
                        animeInfo.status = models_1.MediaStatus.CANCELLED;
                        break;
                    case 'HIATUS':
                        animeInfo.status = models_1.MediaStatus.HIATUS;
                        break;
                    default:
                        animeInfo.status = models_1.MediaStatus.UNKNOWN;
                }
                animeInfo.releaseDate = data.data.Media.startDate.year;
                if ((_o = data.data.Media.nextAiringEpisode) === null || _o === void 0 ? void 0 : _o.airingAt)
                    animeInfo.nextAiringEpisode = {
                        airingTime: (_p = data.data.Media.nextAiringEpisode) === null || _p === void 0 ? void 0 : _p.airingAt,
                        timeUntilAiring: (_q = data.data.Media.nextAiringEpisode) === null || _q === void 0 ? void 0 : _q.timeUntilAiring,
                        episode: (_r = data.data.Media.nextAiringEpisode) === null || _r === void 0 ? void 0 : _r.episode,
                    };
                animeInfo.totalEpisodes = (_t = (_s = data.data.Media) === null || _s === void 0 ? void 0 : _s.episodes) !== null && _t !== void 0 ? _t : ((_u = data.data.Media.nextAiringEpisode) === null || _u === void 0 ? void 0 : _u.episode) - 1;
                animeInfo.currentEpisode = ((_w = (_v = data.data.Media) === null || _v === void 0 ? void 0 : _v.nextAiringEpisode) === null || _w === void 0 ? void 0 : _w.episode)
                    ? ((_x = data.data.Media.nextAiringEpisode) === null || _x === void 0 ? void 0 : _x.episode) - 1
                    : ((_y = data.data.Media) === null || _y === void 0 ? void 0 : _y.episodes) || undefined;
                animeInfo.rating = data.data.Media.averageScore;
                animeInfo.duration = data.data.Media.duration;
                animeInfo.genres = data.data.Media.genres;
                animeInfo.studios = data.data.Media.studios.edges.map((item) => item.node.name);
                animeInfo.season = data.data.Media.season;
                animeInfo.popularity = data.data.Media.popularity;
                animeInfo.type = data.data.Media.format;
                animeInfo.startDate = {
                    year: (_z = data.data.Media.startDate) === null || _z === void 0 ? void 0 : _z.year,
                    month: (_0 = data.data.Media.startDate) === null || _0 === void 0 ? void 0 : _0.month,
                    day: (_1 = data.data.Media.startDate) === null || _1 === void 0 ? void 0 : _1.day,
                };
                animeInfo.endDate = {
                    year: (_2 = data.data.Media.endDate) === null || _2 === void 0 ? void 0 : _2.year,
                    month: (_3 = data.data.Media.endDate) === null || _3 === void 0 ? void 0 : _3.month,
                    day: (_4 = data.data.Media.endDate) === null || _4 === void 0 ? void 0 : _4.day,
                };
                animeInfo.recommendations = data.data.Media.recommendations.edges.map((item) => {
                    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
                    return ({
                        id: item.node.mediaRecommendation.id,
                        malId: item.node.mediaRecommendation.idMal,
                        title: {
                            romaji: item.node.mediaRecommendation.title.romaji,
                            english: item.node.mediaRecommendation.title.english,
                            native: item.node.mediaRecommendation.title.native,
                            userPreferred: item.node.mediaRecommendation.title.userPreferred,
                        },
                        status: item.node.mediaRecommendation.status === 'RELEASING'
                            ? models_1.MediaStatus.ONGOING
                            : item.node.mediaRecommendation.status === 'FINISHED'
                                ? models_1.MediaStatus.COMPLETED
                                : item.node.mediaRecommendation.status === 'NOT_YET_RELEASED'
                                    ? models_1.MediaStatus.NOT_YET_AIRED
                                    : item.node.mediaRecommendation.status === 'CANCELLED'
                                        ? models_1.MediaStatus.CANCELLED
                                        : item.node.mediaRecommendation.status === 'HIATUS'
                                            ? models_1.MediaStatus.HIATUS
                                            : models_1.MediaStatus.UNKNOWN,
                        episodes: item.node.mediaRecommendation.episodes,
                        image: (_c = (_b = item.node.mediaRecommendation.coverImage.extraLarge) !== null && _b !== void 0 ? _b : item.node.mediaRecommendation.coverImage.large) !== null && _c !== void 0 ? _c : item.node.mediaRecommendation.coverImage.medium,
                        imageHash: (0, utils_2.getHashFromImage)((_e = (_d = item.node.mediaRecommendation.coverImage.extraLarge) !== null && _d !== void 0 ? _d : item.node.mediaRecommendation.coverImage.large) !== null && _e !== void 0 ? _e : item.node.mediaRecommendation.coverImage.medium),
                        cover: (_h = (_g = (_f = item.node.mediaRecommendation.bannerImage) !== null && _f !== void 0 ? _f : item.node.mediaRecommendation.coverImage.extraLarge) !== null && _g !== void 0 ? _g : item.node.mediaRecommendation.coverImage.large) !== null && _h !== void 0 ? _h : item.node.mediaRecommendation.coverImage.medium,
                        coverHash: (_l = (_k = (_j = item.node.mediaRecommendation.bannerImage) !== null && _j !== void 0 ? _j : item.node.mediaRecommendation.coverImage.extraLarge) !== null && _k !== void 0 ? _k : item.node.mediaRecommendation.coverImage.large) !== null && _l !== void 0 ? _l : item.node.mediaRecommendation.coverImage.medium,
                        rating: item.node.mediaRecommendation.meanScore,
                        type: item.node.mediaRecommendation.format,
                    });
                });
                animeInfo.characters = data.data.Media.characters.edges.map((item) => {
                    var _b, _c;
                    return ({
                        id: item.node.id,
                        role: item.role,
                        name: {
                            first: item.node.name.first,
                            last: item.node.name.last,
                            full: item.node.name.full,
                            native: item.node.name.native,
                            userPreferred: item.node.name.userPreferred,
                        },
                        image: (_b = item.node.image.large) !== null && _b !== void 0 ? _b : item.node.image.medium,
                        imageHash: (0, utils_2.getHashFromImage)((_c = item.node.image.large) !== null && _c !== void 0 ? _c : item.node.image.medium),
                        voiceActors: item.voiceActors.map((voiceActor) => {
                            var _b, _c;
                            return ({
                                id: voiceActor.id,
                                language: voiceActor.languageV2,
                                name: {
                                    first: voiceActor.name.first,
                                    last: voiceActor.name.last,
                                    full: voiceActor.name.full,
                                    native: voiceActor.name.native,
                                    userPreferred: voiceActor.name.userPreferred,
                                },
                                image: (_b = voiceActor.image.large) !== null && _b !== void 0 ? _b : voiceActor.image.medium,
                                imageHash: (0, utils_2.getHashFromImage)((_c = voiceActor.image.large) !== null && _c !== void 0 ? _c : voiceActor.image.medium),
                            });
                        }),
                    });
                });
                animeInfo.color = (_5 = data.data.Media.coverImage) === null || _5 === void 0 ? void 0 : _5.color;
                animeInfo.relations = data.data.Media.relations.edges.map((item) => {
                    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
                    return ({
                        id: item.node.id,
                        malId: item.node.idMal,
                        relationType: item.relationType,
                        title: {
                            romaji: item.node.title.romaji,
                            english: item.node.title.english,
                            native: item.node.title.native,
                            userPreferred: item.node.title.userPreferred,
                        },
                        status: item.node.status === 'RELEASING'
                            ? models_1.MediaStatus.ONGOING
                            : item.node.status === 'FINISHED'
                                ? models_1.MediaStatus.COMPLETED
                                : item.node.status === 'NOT_YET_RELEASED'
                                    ? models_1.MediaStatus.NOT_YET_AIRED
                                    : item.node.status === 'CANCELLED'
                                        ? models_1.MediaStatus.CANCELLED
                                        : item.node.status === 'HIATUS'
                                            ? models_1.MediaStatus.HIATUS
                                            : models_1.MediaStatus.UNKNOWN,
                        episodes: item.node.episodes,
                        image: (_c = (_b = item.node.coverImage.extraLarge) !== null && _b !== void 0 ? _b : item.node.coverImage.large) !== null && _c !== void 0 ? _c : item.node.coverImage.medium,
                        imageHash: (0, utils_2.getHashFromImage)((_e = (_d = item.node.coverImage.extraLarge) !== null && _d !== void 0 ? _d : item.node.coverImage.large) !== null && _e !== void 0 ? _e : item.node.coverImage.medium),
                        cover: (_h = (_g = (_f = item.node.bannerImage) !== null && _f !== void 0 ? _f : item.node.coverImage.extraLarge) !== null && _g !== void 0 ? _g : item.node.coverImage.large) !== null && _h !== void 0 ? _h : item.node.coverImage.medium,
                        coverHash: (0, utils_2.getHashFromImage)((_l = (_k = (_j = item.node.bannerImage) !== null && _j !== void 0 ? _j : item.node.coverImage.extraLarge) !== null && _k !== void 0 ? _k : item.node.coverImage.large) !== null && _l !== void 0 ? _l : item.node.coverImage.medium),
                        rating: item.node.meanScore,
                        type: item.node.format,
                    });
                });
                return animeInfo;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         * To get Staff details by anilistId
         * @param id staff id from anilist
         *
         */
        this.fetchStaffById = (id) => __awaiter(this, void 0, void 0, function* () {
            const staffInfo = {
                id: String(id),
                name: { first: '', last: '', native: '', full: '' },
            };
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: (0, utils_1.anilistStaffInfoQuery)(id),
            };
            try {
                const { data } = yield axios_1.default.post(this.anilistGraphqlUrl, options).catch((err) => {
                    throw new Error(err.message);
                });
                const staff = data.data.Staff;
                staffInfo.id = staff === null || staff === void 0 ? void 0 : staff.id;
                staffInfo.name = staff === null || staff === void 0 ? void 0 : staff.name;
                staffInfo.image = staff === null || staff === void 0 ? void 0 : staff.image;
                staffInfo.description = staff === null || staff === void 0 ? void 0 : staff.description;
                staffInfo.siteUrl = staff === null || staff === void 0 ? void 0 : staff.siteUrl;
                staffInfo.roles = staff === null || staff === void 0 ? void 0 : staff.staffMedia.edges.map((media) => {
                    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                    return ({
                        id: (_b = media === null || media === void 0 ? void 0 : media.node) === null || _b === void 0 ? void 0 : _b.id,
                        title: (_c = media === null || media === void 0 ? void 0 : media.node) === null || _c === void 0 ? void 0 : _c.title,
                        type: (_d = media === null || media === void 0 ? void 0 : media.node) === null || _d === void 0 ? void 0 : _d.type,
                        image: {
                            extraLarge: (_f = (_e = media === null || media === void 0 ? void 0 : media.node) === null || _e === void 0 ? void 0 : _e.coverImage) === null || _f === void 0 ? void 0 : _f.extraLarge,
                            large: (_h = (_g = media === null || media === void 0 ? void 0 : media.node) === null || _g === void 0 ? void 0 : _g.coverImage) === null || _h === void 0 ? void 0 : _h.large,
                            medium: (_k = (_j = media === null || media === void 0 ? void 0 : media.node) === null || _j === void 0 ? void 0 : _j.coverImage) === null || _k === void 0 ? void 0 : _k.medium,
                        },
                        color: (_m = (_l = media === null || media === void 0 ? void 0 : media.node) === null || _l === void 0 ? void 0 : _l.coverImage) === null || _m === void 0 ? void 0 : _m.color,
                    });
                });
                return staffInfo;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param id character id from anilist
         */
        this.fetchCharacterInfoById = (id) => __awaiter(this, void 0, void 0, function* () {
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12;
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: (0, utils_1.anilistCharacterQuery)(),
                variables: {
                    id: id,
                },
            };
            try {
                const { data: { data: { Character }, }, } = yield axios_1.default.post(this.anilistGraphqlUrl, options);
                const height = (_b = Character.description.match(/__Height:__(.*)/)) === null || _b === void 0 ? void 0 : _b[1].trim();
                const weight = (_c = Character.description.match(/__Weight:__(.*)/)) === null || _c === void 0 ? void 0 : _c[1].trim();
                const hairColor = (_d = Character.description.match(/__Hair Color:__(.*)/)) === null || _d === void 0 ? void 0 : _d[1].trim();
                const eyeColor = (_e = Character.description.match(/__Eye Color:__(.*)/)) === null || _e === void 0 ? void 0 : _e[1].trim();
                const relatives = (_f = Character.description
                    .match(/__Relatives:__(.*)/)) === null || _f === void 0 ? void 0 : _f[1].trim().split(/(, \[)/g).filter((g) => !g.includes(', [')).map((r) => {
                    var _b, _c, _d;
                    return ({
                        id: (_b = r.match(/\/(\d+)/)) === null || _b === void 0 ? void 0 : _b[1],
                        name: (_c = r.match(/([^)]+)\]/)) === null || _c === void 0 ? void 0 : _c[1].replace(/\[/g, ''),
                        relationship: (_d = r.match(/\(([^)]+)\).*?(\(([^)]+)\))/)) === null || _d === void 0 ? void 0 : _d[3],
                    });
                });
                const race = (_g = Character.description
                    .match(/__Race:__(.*)/)) === null || _g === void 0 ? void 0 : _g[1].split(', ').map((r) => r.trim());
                const rank = (_h = Character.description.match(/__Rank:__(.*)/)) === null || _h === void 0 ? void 0 : _h[1];
                const occupation = (_j = Character.description.match(/__Occupation:__(.*)/)) === null || _j === void 0 ? void 0 : _j[1];
                const previousPosition = (_l = (_k = Character.description.match(/__Previous Position:__(.*)/)) === null || _k === void 0 ? void 0 : _k[1]) === null || _l === void 0 ? void 0 : _l.trim();
                const partner = (_m = Character.description
                    .match(/__Partner:__(.*)/)) === null || _m === void 0 ? void 0 : _m[1].split(/(, \[)/g).filter((g) => !g.includes(', [')).map((r) => {
                    var _b, _c;
                    return ({
                        id: (_b = r.match(/\/(\d+)/)) === null || _b === void 0 ? void 0 : _b[1],
                        name: (_c = r.match(/([^)]+)\]/)) === null || _c === void 0 ? void 0 : _c[1].replace(/\[/g, ''),
                    });
                });
                const dislikes = (_o = Character.description.match(/__Dislikes:__(.*)/)) === null || _o === void 0 ? void 0 : _o[1];
                const sign = (_p = Character.description.match(/__Sign:__(.*)/)) === null || _p === void 0 ? void 0 : _p[1];
                const zodicSign = (_r = (_q = Character.description.match(/__Zodiac sign:__(.*)/)) === null || _q === void 0 ? void 0 : _q[1]) === null || _r === void 0 ? void 0 : _r.trim();
                const zodicAnimal = (_t = (_s = Character.description.match(/__Zodiac Animal:__(.*)/)) === null || _s === void 0 ? void 0 : _s[1]) === null || _t === void 0 ? void 0 : _t.trim();
                const themeSong = (_v = (_u = Character.description.match(/__Theme Song:__(.*)/)) === null || _u === void 0 ? void 0 : _u[1]) === null || _v === void 0 ? void 0 : _v.trim();
                Character.description = Character.description.replace(/__Theme Song:__(.*)\n|__Race:__(.*)\n|__Height:__(.*)\n|__Relatives:__(.*)\n|__Rank:__(.*)\n|__Zodiac sign:__(.*)\n|__Zodiac Animal:__(.*)\n|__Weight:__(.*)\n|__Eye Color:__(.*)\n|__Hair Color:__(.*)\n|__Dislikes:__(.*)\n|__Sign:__(.*)\n|__Partner:__(.*)\n|__Previous Position:__(.*)\n|__Occupation:__(.*)\n/gm, '');
                const characterInfo = {
                    id: Character.id,
                    name: {
                        first: (_w = Character.name) === null || _w === void 0 ? void 0 : _w.first,
                        last: (_x = Character.name) === null || _x === void 0 ? void 0 : _x.last,
                        full: (_y = Character.name) === null || _y === void 0 ? void 0 : _y.full,
                        native: (_z = Character.name) === null || _z === void 0 ? void 0 : _z.native,
                        userPreferred: (_0 = Character.name) === null || _0 === void 0 ? void 0 : _0.userPreferred,
                        alternative: (_1 = Character.name) === null || _1 === void 0 ? void 0 : _1.alternative,
                        alternativeSpoiler: (_2 = Character.name) === null || _2 === void 0 ? void 0 : _2.alternativeSpoiler,
                    },
                    image: (_4 = (_3 = Character.image) === null || _3 === void 0 ? void 0 : _3.large) !== null && _4 !== void 0 ? _4 : (_5 = Character.image) === null || _5 === void 0 ? void 0 : _5.medium,
                    imageHash: (0, utils_2.getHashFromImage)((_7 = (_6 = Character.image) === null || _6 === void 0 ? void 0 : _6.large) !== null && _7 !== void 0 ? _7 : (_8 = Character.image) === null || _8 === void 0 ? void 0 : _8.medium),
                    description: Character.description,
                    gender: Character.gender,
                    dateOfBirth: {
                        year: (_9 = Character.dateOfBirth) === null || _9 === void 0 ? void 0 : _9.year,
                        month: (_10 = Character.dateOfBirth) === null || _10 === void 0 ? void 0 : _10.month,
                        day: (_11 = Character.dateOfBirth) === null || _11 === void 0 ? void 0 : _11.day,
                    },
                    bloodType: Character.bloodType,
                    age: Character.age,
                    hairColor: hairColor,
                    eyeColor: eyeColor,
                    height: height,
                    weight: weight,
                    occupation: occupation,
                    partner: partner,
                    relatives: relatives,
                    race: race,
                    rank: rank,
                    previousPosition: previousPosition,
                    dislikes: dislikes,
                    sign: sign,
                    zodicSign: zodicSign,
                    zodicAnimal: zodicAnimal,
                    themeSong: themeSong,
                    relations: (_12 = Character.media.edges) === null || _12 === void 0 ? void 0 : _12.map((v) => {
                        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
                        return ({
                            id: v.node.id,
                            malId: v.node.idMal,
                            role: v.characterRole,
                            title: {
                                romaji: (_b = v.node.title) === null || _b === void 0 ? void 0 : _b.romaji,
                                english: (_c = v.node.title) === null || _c === void 0 ? void 0 : _c.english,
                                native: (_d = v.node.title) === null || _d === void 0 ? void 0 : _d.native,
                                userPreferred: (_e = v.node.title) === null || _e === void 0 ? void 0 : _e.userPreferred,
                            },
                            status: v.node.status === 'RELEASING'
                                ? models_1.MediaStatus.ONGOING
                                : v.node.status === 'FINISHED'
                                    ? models_1.MediaStatus.COMPLETED
                                    : v.node.status === 'NOT_YET_RELEASED'
                                        ? models_1.MediaStatus.NOT_YET_AIRED
                                        : v.node.status === 'CANCELLED'
                                            ? models_1.MediaStatus.CANCELLED
                                            : v.node.status === 'HIATUS'
                                                ? models_1.MediaStatus.HIATUS
                                                : models_1.MediaStatus.UNKNOWN,
                            episodes: v.node.episodes,
                            image: (_j = (_g = (_f = v.node.coverImage) === null || _f === void 0 ? void 0 : _f.extraLarge) !== null && _g !== void 0 ? _g : (_h = v.node.coverImage) === null || _h === void 0 ? void 0 : _h.large) !== null && _j !== void 0 ? _j : (_k = v.node.coverImage) === null || _k === void 0 ? void 0 : _k.medium,
                            imageHash: (0, utils_2.getHashFromImage)((_p = (_m = (_l = v.node.coverImage) === null || _l === void 0 ? void 0 : _l.extraLarge) !== null && _m !== void 0 ? _m : (_o = v.node.coverImage) === null || _o === void 0 ? void 0 : _o.large) !== null && _p !== void 0 ? _p : (_q = v.node.coverImage) === null || _q === void 0 ? void 0 : _q.medium),
                            rating: v.node.averageScore,
                            releaseDate: (_r = v.node.startDate) === null || _r === void 0 ? void 0 : _r.year,
                            type: v.node.format,
                            color: (_s = v.node.coverImage) === null || _s === void 0 ? void 0 : _s.color,
                        });
                    }),
                };
                return characterInfo;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        this.findMangaSlug = (provider, title, malId) => __awaiter(this, void 0, void 0, function* () {
            const slug = title.replace(/[^0-9a-zA-Z]+/g, ' ');
            let possibleManga;
            if (malId) {
                const malAsyncReq = yield axios_1.default.get(`${this.malSyncUrl}/mal/manga/${malId}`, {
                    validateStatus: () => true,
                });
                if (malAsyncReq.status === 200) {
                    const sitesT = malAsyncReq.data.Sites;
                    let sites = Object.values(sitesT).map((v, i) => {
                        const obj = [...Object.values(Object.values(sitesT)[i])];
                        const pages = obj.map((v) => ({
                            page: v.page,
                            url: v.url,
                            title: v.title,
                        }));
                        return pages;
                    });
                    sites = sites.flat();
                    const possibleSource = sites.find((s) => s.page.toLowerCase() === provider.name.toLowerCase());
                    if (possibleSource)
                        possibleManga = yield provider.fetchMangaInfo(possibleSource.url.split('/').pop());
                    else
                        possibleManga = yield this.findMangaRaw(provider, slug, title);
                }
                else
                    possibleManga = yield this.findMangaRaw(provider, slug, title);
            }
            else
                possibleManga = yield this.findMangaRaw(provider, slug, title);
            const possibleProviderChapters = possibleManga.chapters;
            return possibleProviderChapters;
        });
        this.findMangaRaw = (provider, slug, title) => __awaiter(this, void 0, void 0, function* () {
            const findAnime = (yield provider.search(slug));
            if (findAnime.results.length === 0)
                return [];
            // TODO: use much better way than this
            const possibleManga = findAnime.results.find((manga) => title.toLowerCase() === (typeof manga.title === 'string' ? manga.title.toLowerCase() : ''));
            if (!possibleManga)
                return (yield provider.fetchMangaInfo(findAnime.results[0].id));
            return (yield provider.fetchMangaInfo(possibleManga.id));
        });
        this.findManga = (provider, title, malId) => __awaiter(this, void 0, void 0, function* () {
            var _b, _c;
            title.english = (_b = title.english) !== null && _b !== void 0 ? _b : title.romaji;
            title.romaji = (_c = title.romaji) !== null && _c !== void 0 ? _c : title.english;
            title.english = title.english.toLowerCase();
            title.romaji = title.romaji.toLowerCase();
            if (title.english === title.romaji)
                return yield this.findMangaSlug(provider, title.english, malId);
            const romajiPossibleEpisodes = this.findMangaSlug(provider, title.romaji, malId);
            if (romajiPossibleEpisodes) {
                return romajiPossibleEpisodes;
            }
            const englishPossibleEpisodes = this.findMangaSlug(provider, title.english, malId);
            return englishPossibleEpisodes;
        });
        this.provider = provider || new zoro_1.default(customBaseURL);
    }
}
_a = Anilist;
/**
 * Anilist Anime class
 */
Anilist.Anime = _a;
/**
 * Anilist Manga Class
 */
Anilist.Manga = class Manga {
    /**
     * Maps anilist manga to any manga provider (mangadex, mangasee, etc)
     * @param provider MangaParser
     */
    constructor(provider) {
        /**
         *
         * @param query query to search for
         * @param page (optional) page number (default: `1`)
         * @param perPage (optional) number of results per page (default: `20`)
         */
        this.search = (query_1, ...args_1) => __awaiter(this, [query_1, ...args_1], void 0, function* (query, page = 1, perPage = 20) {
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: (0, utils_1.anilistSearchQuery)(query, page, perPage, 'MANGA'),
            };
            try {
                const { data } = yield axios_1.default.post(new _a().anilistGraphqlUrl, options);
                const res = {
                    currentPage: data.data.Page.pageInfo.currentPage,
                    hasNextPage: data.data.Page.pageInfo.hasNextPage,
                    results: data.data.Page.media.map((item) => {
                        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                        return ({
                            id: item.id.toString(),
                            malId: item.idMal,
                            title: item.title
                                ? {
                                    romaji: item.title.romaji,
                                    english: item.title.english,
                                    native: item.title.native,
                                    userPreferred: item.title.userPreferred,
                                }
                                : item.title.romaji,
                            status: item.status === 'RELEASING'
                                ? models_1.MediaStatus.ONGOING
                                : item.status === 'FINISHED'
                                    ? models_1.MediaStatus.COMPLETED
                                    : item.status === 'NOT_YET_RELEASED'
                                        ? models_1.MediaStatus.NOT_YET_AIRED
                                        : item.status === 'CANCELLED'
                                            ? models_1.MediaStatus.CANCELLED
                                            : item.status === 'HIATUS'
                                                ? models_1.MediaStatus.HIATUS
                                                : models_1.MediaStatus.UNKNOWN,
                            image: (_e = (_c = (_b = item.coverImage) === null || _b === void 0 ? void 0 : _b.extraLarge) !== null && _c !== void 0 ? _c : (_d = item.coverImage) === null || _d === void 0 ? void 0 : _d.large) !== null && _e !== void 0 ? _e : (_f = item.coverImage) === null || _f === void 0 ? void 0 : _f.medium,
                            imageHash: (0, utils_2.getHashFromImage)((_k = (_h = (_g = item.coverImage) === null || _g === void 0 ? void 0 : _g.extraLarge) !== null && _h !== void 0 ? _h : (_j = item.coverImage) === null || _j === void 0 ? void 0 : _j.large) !== null && _k !== void 0 ? _k : (_l = item.coverImage) === null || _l === void 0 ? void 0 : _l.medium),
                            cover: item.bannerImage,
                            coverHash: (0, utils_2.getHashFromImage)(item.bannerImage),
                            popularity: item.popularity,
                            description: item.description,
                            rating: item.averageScore,
                            genres: item.genres,
                            color: (_m = item.coverImage) === null || _m === void 0 ? void 0 : _m.color,
                            totalChapters: item.chapters,
                            volumes: item.volumes,
                            type: item.format,
                            releaseDate: item.seasonYear,
                        });
                    }),
                };
                return res;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
        /**
         *
         * @param chapterId chapter id
         * @param args args to pass to the provider (if any)
         * @returns
         */
        this.fetchChapterPages = (chapterId, ...args) => {
            return this.provider.fetchChapterPages(chapterId, ...args);
        };
        this.fetchMangaInfo = (id, ...args) => __awaiter(this, void 0, void 0, function* () {
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            const mangaInfo = {
                id: id,
                title: '',
            };
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                query: (0, utils_1.anilistMediaDetailQuery)(id),
            };
            try {
                const { data } = yield axios_1.default.post(new _a().anilistGraphqlUrl, options).catch((err) => {
                    throw new Error('Media not found');
                });
                mangaInfo.malId = data.data.Media.idMal;
                mangaInfo.title = {
                    romaji: data.data.Media.title.romaji,
                    english: data.data.Media.title.english,
                    native: data.data.Media.title.native,
                    userPreferred: data.data.Media.title.userPreferred,
                };
                if ((_b = data.data.Media.trailer) === null || _b === void 0 ? void 0 : _b.id) {
                    mangaInfo.trailer = {
                        id: data.data.Media.trailer.id,
                        site: (_c = data.data.Media.trailer) === null || _c === void 0 ? void 0 : _c.site,
                        thumbnail: (_d = data.data.Media.trailer) === null || _d === void 0 ? void 0 : _d.thumbnail,
                        thumbnailHash: (0, utils_2.getHashFromImage)((_e = data.data.Media.trailer) === null || _e === void 0 ? void 0 : _e.thumbnail),
                    };
                }
                mangaInfo.image =
                    (_g = (_f = data.data.Media.coverImage.extraLarge) !== null && _f !== void 0 ? _f : data.data.Media.coverImage.large) !== null && _g !== void 0 ? _g : data.data.Media.coverImage.medium;
                mangaInfo.imageHash = (0, utils_2.getHashFromImage)((_j = (_h = data.data.Media.coverImage.extraLarge) !== null && _h !== void 0 ? _h : data.data.Media.coverImage.large) !== null && _j !== void 0 ? _j : data.data.Media.coverImage.medium);
                mangaInfo.popularity = data.data.Media.popularity;
                mangaInfo.color = (_k = data.data.Media.coverImage) === null || _k === void 0 ? void 0 : _k.color;
                mangaInfo.cover = (_l = data.data.Media.bannerImage) !== null && _l !== void 0 ? _l : mangaInfo.image;
                mangaInfo.coverHash = (0, utils_2.getHashFromImage)((_m = data.data.Media.bannerImage) !== null && _m !== void 0 ? _m : mangaInfo.image);
                mangaInfo.description = data.data.Media.description;
                switch (data.data.Media.status) {
                    case 'RELEASING':
                        mangaInfo.status = models_1.MediaStatus.ONGOING;
                        break;
                    case 'FINISHED':
                        mangaInfo.status = models_1.MediaStatus.COMPLETED;
                        break;
                    case 'NOT_YET_RELEASED':
                        mangaInfo.status = models_1.MediaStatus.NOT_YET_AIRED;
                        break;
                    case 'CANCELLED':
                        mangaInfo.status = models_1.MediaStatus.CANCELLED;
                        break;
                    case 'HIATUS':
                        mangaInfo.status = models_1.MediaStatus.HIATUS;
                        break;
                    default:
                        mangaInfo.status = models_1.MediaStatus.UNKNOWN;
                }
                mangaInfo.releaseDate = data.data.Media.startDate.year;
                mangaInfo.startDate = {
                    year: data.data.Media.startDate.year,
                    month: data.data.Media.startDate.month,
                    day: data.data.Media.startDate.day,
                };
                mangaInfo.endDate = {
                    year: data.data.Media.endDate.year,
                    month: data.data.Media.endDate.month,
                    day: data.data.Media.endDate.day,
                };
                mangaInfo.rating = data.data.Media.averageScore;
                mangaInfo.genres = data.data.Media.genres;
                mangaInfo.season = data.data.Media.season;
                mangaInfo.studios = data.data.Media.studios.edges.map((item) => item.node.name);
                mangaInfo.type = data.data.Media.format;
                mangaInfo.recommendations = data.data.Media.recommendations.edges.map((item) => {
                    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30;
                    return ({
                        id: (_b = item.node.mediaRecommendation) === null || _b === void 0 ? void 0 : _b.id,
                        malId: (_c = item.node.mediaRecommendation) === null || _c === void 0 ? void 0 : _c.idMal,
                        title: {
                            romaji: (_e = (_d = item.node.mediaRecommendation) === null || _d === void 0 ? void 0 : _d.title) === null || _e === void 0 ? void 0 : _e.romaji,
                            english: (_g = (_f = item.node.mediaRecommendation) === null || _f === void 0 ? void 0 : _f.title) === null || _g === void 0 ? void 0 : _g.english,
                            native: (_j = (_h = item.node.mediaRecommendation) === null || _h === void 0 ? void 0 : _h.title) === null || _j === void 0 ? void 0 : _j.native,
                            userPreferred: (_l = (_k = item.node.mediaRecommendation) === null || _k === void 0 ? void 0 : _k.title) === null || _l === void 0 ? void 0 : _l.userPreferred,
                        },
                        status: ((_m = item.node.mediaRecommendation) === null || _m === void 0 ? void 0 : _m.status) === 'RELEASING'
                            ? models_1.MediaStatus.ONGOING
                            : ((_o = item.node.mediaRecommendation) === null || _o === void 0 ? void 0 : _o.status) === 'FINISHED'
                                ? models_1.MediaStatus.COMPLETED
                                : ((_p = item.node.mediaRecommendation) === null || _p === void 0 ? void 0 : _p.status) === 'NOT_YET_RELEASED'
                                    ? models_1.MediaStatus.NOT_YET_AIRED
                                    : ((_q = item.node.mediaRecommendation) === null || _q === void 0 ? void 0 : _q.status) === 'CANCELLED'
                                        ? models_1.MediaStatus.CANCELLED
                                        : ((_r = item.node.mediaRecommendation) === null || _r === void 0 ? void 0 : _r.status) === 'HIATUS'
                                            ? models_1.MediaStatus.HIATUS
                                            : models_1.MediaStatus.UNKNOWN,
                        chapters: (_s = item.node.mediaRecommendation) === null || _s === void 0 ? void 0 : _s.chapters,
                        image: (_y = (_v = (_u = (_t = item.node.mediaRecommendation) === null || _t === void 0 ? void 0 : _t.coverImage) === null || _u === void 0 ? void 0 : _u.extraLarge) !== null && _v !== void 0 ? _v : (_x = (_w = item.node.mediaRecommendation) === null || _w === void 0 ? void 0 : _w.coverImage) === null || _x === void 0 ? void 0 : _x.large) !== null && _y !== void 0 ? _y : (_0 = (_z = item.node.mediaRecommendation) === null || _z === void 0 ? void 0 : _z.coverImage) === null || _0 === void 0 ? void 0 : _0.medium,
                        imageHash: (0, utils_2.getHashFromImage)((_6 = (_3 = (_2 = (_1 = item.node.mediaRecommendation) === null || _1 === void 0 ? void 0 : _1.coverImage) === null || _2 === void 0 ? void 0 : _2.extraLarge) !== null && _3 !== void 0 ? _3 : (_5 = (_4 = item.node.mediaRecommendation) === null || _4 === void 0 ? void 0 : _4.coverImage) === null || _5 === void 0 ? void 0 : _5.large) !== null && _6 !== void 0 ? _6 : (_8 = (_7 = item.node.mediaRecommendation) === null || _7 === void 0 ? void 0 : _7.coverImage) === null || _8 === void 0 ? void 0 : _8.medium),
                        cover: (_16 = (_13 = (_10 = (_9 = item.node.mediaRecommendation) === null || _9 === void 0 ? void 0 : _9.bannerImage) !== null && _10 !== void 0 ? _10 : (_12 = (_11 = item.node.mediaRecommendation) === null || _11 === void 0 ? void 0 : _11.coverImage) === null || _12 === void 0 ? void 0 : _12.extraLarge) !== null && _13 !== void 0 ? _13 : (_15 = (_14 = item.node.mediaRecommendation) === null || _14 === void 0 ? void 0 : _14.coverImage) === null || _15 === void 0 ? void 0 : _15.large) !== null && _16 !== void 0 ? _16 : (_18 = (_17 = item.node.mediaRecommendation) === null || _17 === void 0 ? void 0 : _17.coverImage) === null || _18 === void 0 ? void 0 : _18.medium,
                        coverHash: (0, utils_2.getHashFromImage)((_26 = (_23 = (_20 = (_19 = item.node.mediaRecommendation) === null || _19 === void 0 ? void 0 : _19.bannerImage) !== null && _20 !== void 0 ? _20 : (_22 = (_21 = item.node.mediaRecommendation) === null || _21 === void 0 ? void 0 : _21.coverImage) === null || _22 === void 0 ? void 0 : _22.extraLarge) !== null && _23 !== void 0 ? _23 : (_25 = (_24 = item.node.mediaRecommendation) === null || _24 === void 0 ? void 0 : _24.coverImage) === null || _25 === void 0 ? void 0 : _25.large) !== null && _26 !== void 0 ? _26 : (_28 = (_27 = item.node.mediaRecommendation) === null || _27 === void 0 ? void 0 : _27.coverImage) === null || _28 === void 0 ? void 0 : _28.medium),
                        rating: (_29 = item.node.mediaRecommendation) === null || _29 === void 0 ? void 0 : _29.meanScore,
                        type: (_30 = item.node.mediaRecommendation) === null || _30 === void 0 ? void 0 : _30.format,
                    });
                });
                mangaInfo.characters = data.data.Media.characters.edges.map((item) => {
                    var _b, _c, _d;
                    return ({
                        id: (_b = item.node) === null || _b === void 0 ? void 0 : _b.id,
                        role: item.role,
                        name: {
                            first: item.node.name.first,
                            last: item.node.name.last,
                            full: item.node.name.full,
                            native: item.node.name.native,
                            userPreferred: item.node.name.userPreferred,
                        },
                        image: (_c = item.node.image.large) !== null && _c !== void 0 ? _c : item.node.image.medium,
                        imageHash: (0, utils_2.getHashFromImage)((_d = item.node.image.large) !== null && _d !== void 0 ? _d : item.node.image.medium),
                    });
                });
                mangaInfo.relations = data.data.Media.relations.edges.map((item) => {
                    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                    return ({
                        id: item.node.id,
                        relationType: item.relationType,
                        malId: item.node.idMal,
                        title: {
                            romaji: item.node.title.romaji,
                            english: item.node.title.english,
                            native: item.node.title.native,
                            userPreferred: item.node.title.userPreferred,
                        },
                        status: item.node.status === 'RELEASING'
                            ? models_1.MediaStatus.ONGOING
                            : item.node.status === 'FINISHED'
                                ? models_1.MediaStatus.COMPLETED
                                : item.node.status === 'NOT_YET_RELEASED'
                                    ? models_1.MediaStatus.NOT_YET_AIRED
                                    : item.node.status === 'CANCELLED'
                                        ? models_1.MediaStatus.CANCELLED
                                        : item.node.status === 'HIATUS'
                                            ? models_1.MediaStatus.HIATUS
                                            : models_1.MediaStatus.UNKNOWN,
                        chapters: item.node.chapters,
                        image: (_c = (_b = item.node.coverImage.extraLarge) !== null && _b !== void 0 ? _b : item.node.coverImage.large) !== null && _c !== void 0 ? _c : item.node.coverImage.medium,
                        imageHash: (0, utils_2.getHashFromImage)((_e = (_d = item.node.coverImage.extraLarge) !== null && _d !== void 0 ? _d : item.node.coverImage.large) !== null && _e !== void 0 ? _e : item.node.coverImage.medium),
                        color: (_f = item.node.coverImage) === null || _f === void 0 ? void 0 : _f.color,
                        type: item.node.format,
                        cover: (_j = (_h = (_g = item.node.bannerImage) !== null && _g !== void 0 ? _g : item.node.coverImage.extraLarge) !== null && _h !== void 0 ? _h : item.node.coverImage.large) !== null && _j !== void 0 ? _j : item.node.coverImage.medium,
                        coverHash: (0, utils_2.getHashFromImage)((_m = (_l = (_k = item.node.bannerImage) !== null && _k !== void 0 ? _k : item.node.coverImage.extraLarge) !== null && _l !== void 0 ? _l : item.node.coverImage.large) !== null && _m !== void 0 ? _m : item.node.coverImage.medium),
                        rating: item.node.meanScore,
                    });
                });
                mangaInfo.chapters = yield new _a().findManga(this.provider, {
                    english: mangaInfo.title.english,
                    romaji: mangaInfo.title.romaji,
                }, mangaInfo.malId);
                mangaInfo.chapters = mangaInfo.chapters.reverse();
                return mangaInfo;
            }
            catch (error) {
                throw Error(error.message);
            }
        });
        this.provider = provider || new mangasee123_1.default();
    }
};
// (async () => {
//   const ani = new Anilist(new Zoro());
//   const anime = await ani.fetchAnimeInfo('21');
//   console.log(anime.episodes);
//   const sources = await ani.fetchEpisodeSources(anime.episodes![0]!.id, anime.episodes![0]!.number, anime.id);
//   console.log(sources);
// })();
exports.default = Anilist;
//# sourceMappingURL=anilist.js.map