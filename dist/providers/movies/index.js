"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import DramaCool from './dramacool';
const multimovies_1 = __importDefault(require("./multimovies/multimovies"));
const create_multimovies_1 = require("./multimovies/create-multimovies");
const netflixmirror_1 = __importDefault(require("./netflixmirror"));
const multistream_1 = __importDefault(require("./multistream"));
const himovies_1 = __importDefault(require("./himovies/himovies"));
const create_himovies_1 = require("./himovies/create-himovies");
const yflix_1 = __importDefault(require("./yflix/yflix"));
const create_yflix_1 = require("./yflix/create-yflix");
const tollywood_1 = __importDefault(require("./tollywood/tollywood"));
const create_tollywood_1 = require("./tollywood/create-tollywood");
exports.default = {
    // DramaCool,
    MultiMovies: multimovies_1.default,
    NetflixMirror: netflixmirror_1.default,
    HiMovies: himovies_1.default,
    YFlix: yflix_1.default,
    Tollywood: tollywood_1.default,
    MultiStream: multistream_1.default,
    createHiMovies: create_himovies_1.createHiMovies,
    createMultiMovies: create_multimovies_1.createMultiMovies,
    createYFlix: create_yflix_1.createYFlix,
    createTollywood: create_tollywood_1.createTollywood,
};
//# sourceMappingURL=index.js.map