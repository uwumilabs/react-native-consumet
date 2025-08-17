"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const animepahe_1 = __importDefault(require("./animepahe/animepahe"));
const create_animepahe_1 = require("./animepahe/create-animepahe");
const zoro_1 = __importDefault(require("./zoro/zoro"));
const create_zoro_1 = require("./zoro/create-zoro");
const animedrive_1 = __importDefault(require("./animedrive"));
const anify_1 = __importDefault(require("./anify"));
const marin_1 = __importDefault(require("./marin"));
const animeunity_1 = __importDefault(require("./animeunity"));
const animekai_1 = __importDefault(require("./animekai"));
exports.default = {
    AnimePahe: animepahe_1.default,
    createAnimePahe: create_animepahe_1.createAnimePahe,
    Zoro: zoro_1.default,
    createZoro: create_zoro_1.createZoro,
    AnimeDrive: animedrive_1.default,
    Anify: anify_1.default,
    Marin: marin_1.default,
    AnimeUnity: animeunity_1.default,
    AnimeKai: animekai_1.default,
};
//# sourceMappingURL=index.js.map