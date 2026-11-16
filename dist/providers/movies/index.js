"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOVIES = void 0;
const multimovies_1 = require("./multimovies/multimovies");
const create_multimovies_1 = require("./multimovies/create-multimovies");
const netflixmirror_1 = require("./netflixmirror/netflixmirror");
const create_netflixmirror_1 = require("./netflixmirror/create-netflixmirror");
const multistream_1 = require("./multistream/multistream");
const create_multistream_1 = require("./multistream/create-multistream");
const himovies_1 = require("./himovies/himovies");
const create_himovies_1 = require("./himovies/create-himovies");
const vegamovies_1 = require("./vegamovies/vegamovies");
const create_vegamovies_1 = require("./vegamovies/create-vegamovies");
exports.MOVIES = {
    MultiMovies: multimovies_1.MultiMovies,
    NetflixMirror: netflixmirror_1.NetflixMirror,
    PrimeMirror: netflixmirror_1.PrimeMirror,
    DisneyMirror: netflixmirror_1.DisneyMirror,
    HiMovies: himovies_1.HiMovies,
    VegaMovies: vegamovies_1.VegaMovies,
    MultiStream: multistream_1.MultiStream,
    createHiMovies: create_himovies_1.createHiMovies,
    createMultiMovies: create_multimovies_1.createMultiMovies,
    createNetflixMirror: create_netflixmirror_1.createNetflixMirror,
    createPrimeMirror: create_netflixmirror_1.createPrimeMirror,
    createDisneyMirror: create_netflixmirror_1.createDisneyMirror,
    createVegaMovies: create_vegamovies_1.createVegaMovies,
    createMultiStream: create_multistream_1.createMultiStream,
};
//# sourceMappingURL=index.js.map