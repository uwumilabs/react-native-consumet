"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.META = exports.MOVIES = exports.LIGHT_NOVELS = exports.MANGA = exports.ANIME = void 0;
const anime_1 = require("./anime");
Object.defineProperty(exports, "ANIME", { enumerable: true, get: function () { return anime_1.ANIME; } });
const manga_1 = require("./manga");
Object.defineProperty(exports, "MANGA", { enumerable: true, get: function () { return manga_1.MANGA; } });
const light_novels_1 = require("./light-novels");
Object.defineProperty(exports, "LIGHT_NOVELS", { enumerable: true, get: function () { return light_novels_1.LIGHT_NOVELS; } });
const movies_1 = require("./movies");
Object.defineProperty(exports, "MOVIES", { enumerable: true, get: function () { return movies_1.MOVIES; } });
const meta_1 = __importDefault(require("./meta"));
exports.META = meta_1.default;
//# sourceMappingURL=index.js.map