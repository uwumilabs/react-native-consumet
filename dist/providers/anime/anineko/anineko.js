"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AniNeko = void 0;
const models_1 = require("../../../models");
const provider_class_1 = require("../../provider-class");
const create_anineko_1 = require("./create-anineko");
exports.AniNeko = (0, provider_class_1.providerClass)(models_1.AnimeParser, create_anineko_1.createAniNeko);
//# sourceMappingURL=anineko.js.map