"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import DramaCool from './dramacool';
const multimovies_1 = __importDefault(require("./multimovies/multimovies"));
const create_multimovies_1 = require("./multimovies/create-multimovies");
const netflixmirror_1 = __importDefault(require("./netflixmirror/netflixmirror"));
const primemirror_1 = __importDefault(require("./netflixmirror/primemirror"));
const disneymirror_1 = __importDefault(require("./netflixmirror/disneymirror"));
const create_netflixmirror_1 = require("./netflixmirror/create-netflixmirror");
const multistream_1 = __importDefault(require("./multistream"));
const himovies_1 = __importDefault(require("./himovies/himovies"));
const create_himovies_1 = require("./himovies/create-himovies");
const yflix_1 = __importDefault(require("./yflix/yflix"));
const create_yflix_1 = require("./yflix/create-yflix");
const vegamovies_1 = __importDefault(require("./vegamovies/vegamovies"));
const create_vegamovies_1 = require("./vegamovies/create-vegamovies");
exports.default = {
    // DramaCool,
    MultiMovies: multimovies_1.default,
    NetflixMirror: netflixmirror_1.default,
    PrimeMirror: primemirror_1.default,
    DisneyMirror: disneymirror_1.default,
    HiMovies: himovies_1.default,
    YFlix: yflix_1.default,
    VegaMovies: vegamovies_1.default,
    MultiStream: multistream_1.default,
    createHiMovies: create_himovies_1.createHiMovies,
    createMultiMovies: create_multimovies_1.createMultiMovies,
    createNetflixMirror: create_netflixmirror_1.createNetflixMirror,
    createPrimeMirror: create_netflixmirror_1.createPrimeMirror,
    createDisneyMirror: create_netflixmirror_1.createDisneyMirror,
    createYFlix: create_yflix_1.createYFlix,
    createVegaMovies: create_vegamovies_1.createVegaMovies,
};
//# sourceMappingURL=index.js.map