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
// Use lazy getters to break circular dependency
let _PROVIDERS = null;
const getProviders = () => {
    if (_PROVIDERS === null) {
        // Import providers only when needed to break circular dependency
        const providers = require('../providers');
        _PROVIDERS = providers;
    }
    return _PROVIDERS;
};
// Create lazy getters for provider objects
exports.animeProviders = {
    get Zoro() {
        const { ANIME } = getProviders();
        return ANIME.Zoro;
    },
    get AnimePahe() {
        const { ANIME } = getProviders();
        return ANIME.AnimePahe;
    },
};
exports.movieProviders = {
    get HiMovies() {
        const { MOVIES } = getProviders();
        return MOVIES.HiMovies;
    },
    get MultiMovies() {
        const { MOVIES } = getProviders();
        return MOVIES.MultiMovies;
    },
    get MultiStream() {
        const { MOVIES } = getProviders();
        return MOVIES.MultiStream;
    },
};
const metaProviders = {
    get Anilist() {
        const { META } = getProviders();
        return META.Anilist;
    },
    get TMDB() {
        const { META } = getProviders();
        return META.TMDB;
    },
    get MAL() {
        const { META } = getProviders();
        return META.Myanimelist;
    },
};
//# sourceMappingURL=provider-maps.js.map