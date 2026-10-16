"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOVIES = void 0;
const multimovies_1 = require("./multimovies/multimovies");
const create_multimovies_1 = require("./multimovies/create-multimovies");
const netflixmirror_1 = require("./netflixmirror/netflixmirror");
const primemirror_1 = require("./netflixmirror/primemirror");
const disneymirror_1 = require("./netflixmirror/disneymirror");
const create_netflixmirror_1 = require("./netflixmirror/create-netflixmirror");
const multistream_1 = require("./multistream");
const himovies_1 = require("./himovies/himovies");
const create_himovies_1 = require("./himovies/create-himovies");
const yflix_1 = require("./yflix/yflix");
const create_yflix_1 = require("./yflix/create-yflix");
const vegamovies_1 = require("./vegamovies/vegamovies");
const create_vegamovies_1 = require("./vegamovies/create-vegamovies");
exports.MOVIES = {
    MultiMovies: multimovies_1.MultiMovies,
    NetflixMirror: netflixmirror_1.NetflixMirror,
    PrimeMirror: primemirror_1.PrimeMirror,
    DisneyMirror: disneymirror_1.DisneyMirror,
    HiMovies: himovies_1.HiMovies,
    YFlix: yflix_1.YFlix,
    VegaMovies: vegamovies_1.VegaMovies,
    MultiStream: multistream_1.MultiStream,
    createHiMovies: create_himovies_1.createHiMovies,
    createMultiMovies: create_multimovies_1.createMultiMovies,
    createNetflixMirror: create_netflixmirror_1.createNetflixMirror,
    createPrimeMirror: create_netflixmirror_1.createPrimeMirror,
    createDisneyMirror: create_netflixmirror_1.createDisneyMirror,
    createYFlix: create_yflix_1.createYFlix,
    createVegaMovies: create_vegamovies_1.createVegaMovies,
};
//# sourceMappingURL=index.js.map