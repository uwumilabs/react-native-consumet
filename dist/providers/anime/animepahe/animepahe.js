"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimePahe = void 0;
const models_1 = require("../../../models");
const provider_class_1 = require("../../provider-class");
const create_animepahe_1 = require("./create-animepahe");
exports.AnimePahe = (0, provider_class_1.providerClass)(models_1.AnimeParser, create_animepahe_1.createAnimePahe);
//# sourceMappingURL=animepahe.js.map