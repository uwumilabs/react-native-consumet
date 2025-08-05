"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const models_1 = require("../../models");
const utils_1 = require("../../utils/utils");
class Anify extends models_1.AnimeParser {
    constructor(proxyConfig, adapter, providerId = 'gogoanime') {
        super();
        this.proxyConfig = proxyConfig;
        this.adapter = adapter;
        this.providerId = providerId;
        this.name = 'Anify';
        this.baseUrl = utils_1.ANIFY_URL;
        this.classPath = 'ANIME.Anify';
        this.actions = {
            'gogoanime': {
                format: (episodeId) => `/${episodeId}`,
                unformat: (episodeId) => episodeId.replace('/', ''),
            },
            'zoro': {
                format: (episodeId) => `watch/${episodeId.replace('$episode$', '?ep=')}`,
                unformat: (episodeId) => episodeId.replace('?ep=', '$episode$').split('watch/')[1] + '$sub',
            },
            'animepahe': {
                format: (episodeId) => episodeId,
                unformat: (episodeId) => episodeId,
            },
            '9anime': {
                format: (episodeId) => episodeId,
                unformat: (episodeId) => episodeId,
            },
        };
        /**
         * @param query Search query
         * @param page Page number (optional)
         */
        this.rawSearch = async (query, page = 1) => {
            const { data } = await axios_1.default.get(`${this.baseUrl}/search/anime/${query}?page=${page}`);
            return data.results;
        };
        /**
         * @param query Search query
         * @param page Page number (optional)
         */
        this.search = async (query, page = 1) => {
            const res = {
                currentPage: page,
                hasNextPage: false,
                results: [],
            };
            const { data } = await axios_1.default.get(`${this.baseUrl}/search-advanced?type=anime&query=${query}&page=${page}`);
            if (data.currentPage !== res.currentPage)
                res.hasNextPage = true;
            res.results = data?.results.map((anime) => ({
                id: anime.id,
                anilistId: anime.id,
                title: anime.title.english ?? anime.title.romaji ?? anime.title.native,
                image: anime.coverImage,
                cover: anime.bannerImage,
                releaseDate: anime.year,
                description: anime.description,
                genres: anime.genres,
                rating: anime.rating.anilist,
                status: anime.status,
                mappings: anime.mappings,
                type: anime.type,
            }));
            return res;
        };
        /**
         * @param id Anime id
         */
        this.fetchAnimeInfo = async (id) => {
            const animeInfo = {
                id: id,
                title: '',
            };
            const { data } = await axios_1.default.get(`${this.baseUrl}/info/${id}`).catch(() => {
                throw new Error('Anime not found. Please use a valid id!');
            });
            animeInfo.anilistId = data.id;
            animeInfo.title = data.title.english ?? data.title.romaji ?? data.title.native;
            animeInfo.image = data.coverImage;
            animeInfo.cover = data.bannerImage;
            animeInfo.season = data.season;
            animeInfo.releaseDate = data.year;
            animeInfo.duration = data.duration;
            animeInfo.popularity = data.popularity.anilist;
            animeInfo.description = data.description;
            animeInfo.genres = data.genres;
            animeInfo.rating = data.rating.anilist;
            animeInfo.status = data.status;
            animeInfo.synonyms = data.synonyms;
            animeInfo.mappings = data.mappings;
            animeInfo.type = data.type;
            animeInfo.artwork = data.artwork;
            const providerData = data.episodes.data.filter((e) => e.providerId === this.providerId)[0];
            animeInfo.episodes = providerData.episodes.map((episode) => ({
                id: this.actions[this.providerId].unformat(episode.id),
                number: episode.number,
                isFiller: episode.isFiller,
                title: episode.title,
                description: episode.description,
                image: episode.img,
                rating: episode.rating,
            }));
            return animeInfo;
        };
        this.fetchAnimeInfoByIdRaw = async (id) => {
            const { data } = await axios_1.default.get(`${this.baseUrl}/info/${id}`).catch((err) => {
                throw new Error("Backup api seems to be down! Can't fetch anime info");
            });
            return data;
        };
        /**
         * @param id anilist id
         */
        this.fetchAnimeInfoByAnilistId = async (id, providerId = 'gogoanime') => {
            const animeInfo = {
                id: id,
                title: '',
            };
            const { data } = await axios_1.default.get(`${this.baseUrl}/media?providerId=${providerId}&id=${id}`);
            animeInfo.anilistId = data.id;
            animeInfo.title = data.title.english ?? data.title.romaji ?? data.title.native;
            animeInfo.image = data.coverImage;
            animeInfo.cover = data.bannerImage;
            animeInfo.season = data.season;
            animeInfo.releaseDate = data.year;
            animeInfo.duration = data.duration;
            animeInfo.popularity = data.popularity.anilist;
            animeInfo.description = data.description;
            animeInfo.genres = data.genres;
            animeInfo.rating = data.rating.anilist;
            animeInfo.status = data.status;
            animeInfo.synonyms = data.synonyms;
            animeInfo.mappings = data.mappings;
            animeInfo.type = data.type;
            animeInfo.artwork = data.artwork;
            const providerData = data.episodes.data.filter((e) => e.providerId === this.providerId)[0];
            animeInfo.episodes = providerData.episodes.map((episode) => ({
                id: this.actions[this.providerId].unformat(episode.id),
                number: episode.number,
                isFiller: episode.isFiller,
                title: episode.title,
                description: episode.description,
                image: episode.img,
                rating: episode.rating,
            }));
            return animeInfo;
        };
        this.fetchEpisodeSources = async (episodeId, episodeNumber, id) => {
            try {
                const { data } = await axios_1.default.get(`${this.baseUrl}/sources?providerId=${this.providerId}&watchId=${this.actions[this.providerId].format(episodeId)}&episodeNumber=${episodeNumber}&id=${id}&subType=sub`);
                return data;
            }
            catch (err) {
                throw new Error('Episode not found!\n' + err);
            }
        };
    }
    /**
     * @deprecated
     */
    fetchEpisodeServers(episodeId) {
        throw new Error('Method not implemented.');
    }
}
exports.default = Anify;
// (async () => {
//   const anify = new Anify();
//   const res = await anify.fetchAnimeInfo('1');
//   console.log(res);
//   const souces = await anify.fetchEpisodeSources(res.episodes![0].id, 1, 1);
//   console.log(souces);
// })();
//# sourceMappingURL=anify.js.map