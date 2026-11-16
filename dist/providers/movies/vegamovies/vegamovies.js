"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VegaMovies = void 0;
const models_1 = require("../../../models");
const provider_class_1 = require("../../provider-class");
const create_vegamovies_1 = require("./create-vegamovies");
exports.VegaMovies = (0, provider_class_1.providerClass)(models_1.MovieParser, create_vegamovies_1.createVegaMovies);
//# sourceMappingURL=vegamovies.js.map