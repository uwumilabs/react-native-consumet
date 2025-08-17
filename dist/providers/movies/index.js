"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dramacool_1 = __importDefault(require("./dramacool"));
const multimovies_1 = __importDefault(require("./multimovies"));
const netflixmirror_1 = __importDefault(require("./netflixmirror"));
const multistream_1 = __importDefault(require("./multistream"));
const himovies_1 = __importDefault(require("./himovies/himovies"));
const create_himovies_1 = require("./himovies/create-himovies");
exports.default = {
    DramaCool: dramacool_1.default,
    MultiMovies: multimovies_1.default,
    NetflixMirror: netflixmirror_1.default,
    HiMovies: himovies_1.default,
    MultiStream: multistream_1.default,
    createHiMovies: create_himovies_1.createHiMovies,
};
//# sourceMappingURL=index.js.map