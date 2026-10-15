"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extensionEnums = exports.UTILS_MODULE = exports.MODELS_MODULE = void 0;
exports.createExtensionRequire = createExtensionRequire;
const types_1 = require("../models/types");
/** Module names registry bundles import from the runtime (see scripts/build-extensions.js). */
exports.MODELS_MODULE = 'react-native-consumet/models';
exports.UTILS_MODULE = 'react-native-consumet/utils';
// Paths tsc-built extensions used for the same modules, at any depth (`../models`, `../../../models/index.js`).
const LEGACY_MODELS = /^(\.\.\/)+models(\/index)?(\.js)?$/;
const LEGACY_UTILS = /^(\.\.\/)+utils(\/index|\/create-provider-context|\/create-extractor-context)?(\.js)?$/;
/** The library's enums, handed to extensions as-is so their values always match. */
exports.extensionEnums = {
    StreamingServers: types_1.StreamingServers,
    MediaFormat: types_1.MediaFormat,
    MediaStatus: types_1.MediaStatus,
    SubOrDub: types_1.SubOrDub,
    WatchListType: types_1.WatchListType,
    TvType: types_1.TvType,
    Genres: types_1.Genres,
    Topics: types_1.Topics,
};
/**
 * Builds the `require` extension code runs with. Only the modules passed in resolve; anything
 * else throws, so a bundle that depends on a file the runtime can't provide fails at load
 * instead of getting `{}` and losing features silently.
 */
function createExtensionRequire(extensionId, modules) {
    return (specifier) => {
        const key = LEGACY_MODELS.test(specifier) ? exports.MODELS_MODULE : LEGACY_UTILS.test(specifier) ? exports.UTILS_MODULE : specifier;
        if (Object.prototype.hasOwnProperty.call(modules, key))
            return modules[key];
        throw new Error(`Extension '${extensionId}' requires '${specifier}', which the extension runtime does not provide. ` +
            'Registry code must be a single-file bundle (yarn build).');
    };
}
//# sourceMappingURL=extension-modules.js.map