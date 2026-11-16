"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiMovies = void 0;
const models_1 = require("../../../models");
const provider_class_1 = require("../../provider-class");
const create_multimovies_1 = require("./create-multimovies");
exports.MultiMovies = (0, provider_class_1.providerClass)(models_1.MovieParser, create_multimovies_1.createMultiMovies);
//# sourceMappingURL=multimovies.js.map