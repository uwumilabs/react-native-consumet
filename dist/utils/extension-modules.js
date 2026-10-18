"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extensionEnums = exports.UTILS_MODULE = exports.MODELS_MODULE = void 0;
exports.createExtensionRequire = createExtensionRequire;
exports.evaluateExtensionCode = evaluateExtensionCode;
exports.memoiseLoad = memoiseLoad;
exports.deleteEntriesOf = deleteEntriesOf;
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
/**
 * Run single-file extension code and return the function it provides as `name`: `exports[name]`,
 * `module.exports[name]`, a top-level `function name` (code without exports), or its default
 * export. Undefined when it provides none. `name` must be a valid identifier (assertValidIdentifier).
 */
function evaluateExtensionCode(code, name, globals, kind) {
    const label = kind === 'provider' ? 'Provider' : 'Extractor';
    let run;
    try {
        run = new Function('context', `
      ${Object.keys(globals)
            .map((key) => `const ${key} = context.${key};`)
            .join('\n      ')}

      try {
        ${code}
      } catch (execError) {
        console.error('Error during ${kind} code execution:', execError);
        throw new Error('${label} code execution failed: ' + execError.message);
      }

      return typeof ${name} !== 'undefined' ? ${name} : undefined;
      `);
    }
    catch (syntaxError) {
        console.error(`Syntax error in ${kind} code:`, syntaxError);
        throw new Error(`Failed to parse ${kind} code: ${syntaxError.message}`);
    }
    // The top-level declaration comes first: it always binds its own name, while bundle export
    // getters built without block scoping can point at another export on Hermes (see
    // scripts/hermes-safe-dist.js). Exports cover code without a top-level declaration, and the
    // default export (`export default`) is the last resort.
    const declared = run(globals);
    const { exports, module } = globals;
    return [declared, exports[name], module.exports?.[name], exports.default, module.exports?.default].find((candidate) => typeof candidate === 'function');
}
/**
 * Share one load per key: concurrent callers get the same promise, later callers the result.
 * A failed load is forgotten, so the next call tries again.
 */
function memoiseLoad(cache, key, load) {
    const cached = cache.get(key);
    if (cached)
        return cached;
    const pending = load();
    cache.set(key, pending);
    pending.catch(() => {
        if (cache.get(key) === pending)
            cache.delete(key);
    });
    return pending;
}
/** Delete the entries of one extension or extractor: keys `${id}` and `${id}|…`. */
function deleteEntriesOf(cache, id) {
    for (const key of Array.from(cache.keys())) {
        if (key === id || key.startsWith(`${id}|`))
            cache.delete(key);
    }
}
//# sourceMappingURL=extension-modules.js.map