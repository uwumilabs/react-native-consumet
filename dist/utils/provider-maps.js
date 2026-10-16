"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movieProviders = exports.animeProviders = void 0;
// Use lazy getters to avoid circular dependency issues
// Providers are loaded only when accessed, after all modules are initialized
exports.animeProviders = {
    get Zoro() {
        return require('../providers/anime/zoro/zoro').Zoro;
    },
    get AnimePahe() {
        return require('../providers/anime/animepahe/animepahe').AnimePahe;
    },
    get AnimeKai() {
        return require('../providers/anime/animekai/animekai').AnimeKai;
    },
    get AniKoto() {
        return require('../providers/anime/anikoto/anikoto').AniKoto;
    },
};
exports.movieProviders = {
    get HiMovies() {
        return require('../providers/movies/himovies/himovies').HiMovies;
    },
    get MultiMovies() {
        return require('../providers/movies/multimovies/multimovies').MultiMovies;
    },
    get MultiStream() {
        return require('../providers/movies/multistream').MultiStream;
    },
    get YFlix() {
        return require('../providers/movies/yflix/yflix').YFlix;
    },
    get VegaMovies() {
        return require('../providers/movies/vegamovies/vegamovies').VegaMovies;
    },
    get NetflixMirror() {
        return require('../providers/movies/netflixmirror/netflixmirror').NetflixMirror;
    },
    get PrimeMirror() {
        return require('../providers/movies/netflixmirror/primemirror').PrimeMirror;
    },
    get DisneyMirror() {
        return require('../providers/movies/netflixmirror/disneymirror').DisneyMirror;
    },
};
//# sourceMappingURL=provider-maps.js.map