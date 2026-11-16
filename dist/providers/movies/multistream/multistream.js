"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiStream = void 0;
const models_1 = require("../../../models");
const provider_class_1 = require("../../provider-class");
const create_multistream_1 = require("./create-multistream");
/** `new MOVIES.MultiStream(ctx?, customBaseURL?, apiKey?)`: pass your TMDB API key; without one a shared key is used, with a warning. */
exports.MultiStream = (0, provider_class_1.providerClass)(models_1.MovieParser, create_multistream_1.createMultiStream);
//# sourceMappingURL=multistream.js.map