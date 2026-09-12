"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVegaMovies = exports.VegaMovies = void 0;
// import DramaCool from './dramacool';
const multimovies_1 = __importDefault(require("./multimovies/multimovies"));
const create_multimovies_1 = require("./multimovies/create-multimovies");
const netflixmirror_1 = __importDefault(require("./netflixmirror/netflixmirror"));
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
    HiMovies: himovies_1.default,
    YFlix: yflix_1.default,
    VegaMovies: vegamovies_1.default,
    MultiStream: multistream_1.default,
    createHiMovies: create_himovies_1.createHiMovies,
    createMultiMovies: create_multimovies_1.createMultiMovies,
    createNetflixMirror: create_netflixmirror_1.createNetflixMirror,
    createYFlix: create_yflix_1.createYFlix,
    createVegaMovies: create_vegamovies_1.createVegaMovies,
};
var vegamovies_2 = require("./vegamovies/vegamovies");
Object.defineProperty(exports, "VegaMovies", { enumerable: true, get: function () { return vegamovies_2.VegaMovies; } });
Object.defineProperty(exports, "createVegaMovies", { enumerable: true, get: function () { return vegamovies_2.createVegaMovies; } });
//# sourceMappingURL=index.js.map