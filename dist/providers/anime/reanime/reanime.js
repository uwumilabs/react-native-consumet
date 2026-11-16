"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReAnime = void 0;
const models_1 = require("../../../models");
const provider_class_1 = require("../../provider-class");
const create_reanime_1 = require("./create-reanime");
exports.ReAnime = (0, provider_class_1.providerClass)(models_1.AnimeParser, create_reanime_1.createReanime);
//# sourceMappingURL=reanime.js.map