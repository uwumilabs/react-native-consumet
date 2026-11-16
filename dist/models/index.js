"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaError = exports.LightNovelParser = exports.MangaParser = exports.MovieParser = exports.AnimeParser = exports.BaseParser = exports.BaseProvider = void 0;
var base_provider_1 = require("./base-provider");
Object.defineProperty(exports, "BaseProvider", { enumerable: true, get: function () { return __importDefault(base_provider_1).default; } });
var base_parser_1 = require("./base-parser");
Object.defineProperty(exports, "BaseParser", { enumerable: true, get: function () { return __importDefault(base_parser_1).default; } });
var anime_parser_1 = require("./anime-parser");
Object.defineProperty(exports, "AnimeParser", { enumerable: true, get: function () { return __importDefault(anime_parser_1).default; } });
var movie_parser_1 = require("./movie-parser");
Object.defineProperty(exports, "MovieParser", { enumerable: true, get: function () { return __importDefault(movie_parser_1).default; } });
var manga_parser_1 = require("./manga-parser");
Object.defineProperty(exports, "MangaParser", { enumerable: true, get: function () { return __importDefault(manga_parser_1).default; } });
var lightnovel_parser_1 = require("./lightnovel-parser");
Object.defineProperty(exports, "LightNovelParser", { enumerable: true, get: function () { return __importDefault(lightnovel_parser_1).default; } });
var meta_error_1 = require("./meta-error");
Object.defineProperty(exports, "MetaError", { enumerable: true, get: function () { return meta_error_1.MetaError; } });
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map