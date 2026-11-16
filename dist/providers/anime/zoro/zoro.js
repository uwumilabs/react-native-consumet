"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Zoro = void 0;
const models_1 = require("../../../models");
const provider_class_1 = require("../../provider-class");
const create_zoro_1 = require("./create-zoro");
exports.Zoro = (0, provider_class_1.providerClass)(models_1.AnimeParser, create_zoro_1.createZoro);
//# sourceMappingURL=zoro.js.map