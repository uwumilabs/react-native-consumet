"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisneyMirror = exports.PrimeMirror = exports.NetflixMirror = void 0;
const models_1 = require("../../../models");
const provider_class_1 = require("../../provider-class");
const create_netflixmirror_1 = require("./create-netflixmirror");
exports.NetflixMirror = (0, provider_class_1.providerClass)(models_1.MovieParser, create_netflixmirror_1.createNetflixMirror);
exports.PrimeMirror = (0, provider_class_1.providerClass)(models_1.MovieParser, create_netflixmirror_1.createPrimeMirror);
exports.DisneyMirror = (0, provider_class_1.providerClass)(models_1.MovieParser, create_netflixmirror_1.createDisneyMirror);
//# sourceMappingURL=netflixmirror.js.map