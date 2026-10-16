"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movieProviders = exports.animeProviders = void 0;
// Use lazy getters to avoid circular dependency issues
// Providers are loaded only when accessed, after all modules are initialized
exports.animeProviders = {
    get Zoro() {
        return require('../providers/anime/zoro/zoro').default;
    },
    get AnimePahe() {
        return require('../providers/anime/animepahe/animepahe').default;
    },
    get AnimeKai() {
        return require('../providers/anime/animekai/animekai').default;
    },
    get AniKoto() {
        return require('../providers/anime/anikoto/anikoto').default;
    },
};
exports.movieProviders = {
    get HiMovies() {
        return require('../providers/movies/himovies/himovies').default;
    },
    get MultiMovies() {
        return require('../providers/movies/multimovies/multimovies').default;
    },
    get MultiStream() {
        return require('../providers/movies/multistream').default;
    },
    get YFlix() {
        return require('../providers/movies/yflix/yflix').default;
    },
    get VegaMovies() {
        return require('../providers/movies/vegamovies/vegamovies').default;
    },
    get NetflixMirror() {
        return require('../providers/movies/netflixmirror/netflixmirror').default;
    },
    get PrimeMirror() {
        return require('../providers/movies/netflixmirror/primemirror').default;
    },
    get DisneyMirror() {
        return require('../providers/movies/netflixmirror/disneymirror').default;
    },
};
//# sourceMappingURL=provider-maps.js.map