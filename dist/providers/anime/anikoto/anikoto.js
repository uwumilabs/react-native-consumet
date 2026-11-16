"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AniKoto = void 0;
const models_1 = require("../../../models");
const provider_class_1 = require("../../provider-class");
const create_anikoto_1 = require("./create-anikoto");
exports.AniKoto = (0, provider_class_1.providerClass)(models_1.AnimeParser, create_anikoto_1.createAniKoto);
//# sourceMappingURL=anikoto.js.map