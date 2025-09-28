"use strict";
/**
 * This file is used to map the providers to their respective keys.
 * It is a separate file to avoid circular dependencies between the providers and the utils.
 * The circular dependency is caused by the fact that the providers need to be imported in the utils
 * to be used in the ProviderManager, but the providers also need to import the utils to use the
 * createProviderContext function.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.movieProviders = exports.animeProviders = void 0;
const providers_1 = require("../providers");
exports.animeProviders = {
    Zoro: providers_1.ANIME.Zoro,
    AnimePahe: providers_1.ANIME.AnimePahe,
};
exports.movieProviders = {
    HiMovies: providers_1.MOVIES.HiMovies,
    MultiMovies: providers_1.MOVIES.MultiMovies,
    MultiStream: providers_1.MOVIES.MultiStream,
};
const metaProviders = {
    Anilist: providers_1.META.Anilist,
    TMDB: providers_1.META.TMDB,
    MAL: providers_1.META.Myanimelist,
};
//# sourceMappingURL=provider-maps.js.map