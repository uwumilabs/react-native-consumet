"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const animepahe_1 = __importDefault(require("./animepahe/animepahe"));
const create_animepahe_1 = __importDefault(require("./animepahe/create-animepahe"));
const zoro_1 = __importDefault(require("./zoro/zoro"));
const create_zoro_1 = __importDefault(require("./zoro/create-zoro"));
const animekai_1 = __importDefault(require("./animekai/animekai"));
const create_animekai_1 = __importDefault(require("./animekai/create-animekai"));
const anikoto_1 = __importDefault(require("./anikoto/anikoto"));
const create_anikoto_1 = __importDefault(require("./anikoto/create-anikoto"));
const reanime_1 = __importDefault(require("./reanime/reanime"));
const create_reanime_1 = __importDefault(require("./reanime/create-reanime"));
const anineko_1 = __importDefault(require("./anineko/anineko"));
const create_anineko_1 = __importDefault(require("./anineko/create-anineko"));
exports.default = {
    AnimePahe: animepahe_1.default,
    createAnimePahe: create_animepahe_1.default,
    Zoro: zoro_1.default,
    createZoro: create_zoro_1.default,
    AnimeKai: animekai_1.default,
    createAnimeKai: create_animekai_1.default,
    AniKoto: anikoto_1.default,
    createAniKoto: create_anikoto_1.default,
    ReAnime: reanime_1.default,
    createReanime: create_reanime_1.default,
    AniNeko: anineko_1.default,
    createAniNeko: create_anineko_1.default,
};
//# sourceMappingURL=index.js.map