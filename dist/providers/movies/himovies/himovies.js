"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HiMovies = void 0;
const models_1 = require("../../../models");
const provider_class_1 = require("../../provider-class");
const create_himovies_1 = require("./create-himovies");
exports.HiMovies = (0, provider_class_1.providerClass)(models_1.MovieParser, create_himovies_1.createHiMovies);
//# sourceMappingURL=himovies.js.map