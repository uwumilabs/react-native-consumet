"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CompiledCodeCache = exports.RegistryFetchError = exports.extensionEnums = exports.UTILS_MODULE = exports.MODELS_MODULE = void 0;
exports.createExtensionRequire = createExtensionRequire;
exports.extensionGlobals = extensionGlobals;
exports.evaluateExtensionCode = evaluateExtensionCode;
exports.fetchEntryCode = fetchEntryCode;
exports.memoiseLoad = memoiseLoad;
exports.deleteEntriesOf = deleteEntriesOf;
const types_1 = require("../models/types");
const extension_integrity_1 = require("./extension-integrity");
const fetch_with_timeout_1 = require("./fetch-with-timeout");
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
  Topics: types_1.Topics
};
/**
 * Builds the `require` extension code runs with. Only the modules passed in resolve; anything
 * else throws, so a bundle that depends on a file the runtime can't provide fails at load
 * instead of getting `{}` and losing features silently.
 */
function createExtensionRequire(extensionId, modules) {
  return specifier => {
    const key = LEGACY_MODELS.test(specifier) ? exports.MODELS_MODULE : LEGACY_UTILS.test(specifier) ? exports.UTILS_MODULE : specifier;
    if (Object.prototype.hasOwnProperty.call(modules, key)) return modules[key];
    throw new Error(`Extension '${extensionId}' requires '${specifier}', which the extension runtime does not provide. ` + 'Registry code must be a single-file bundle (yarn build).');
  };
}
const isProviderContext = ctx => 'enums' in ctx;
/**
 * The globals and `require`-able modules registry code of `kind` runs with, built from the context it
 * gets. Extractor code also sees axios, cheerio's load, CryptoJS and the URL classes as globals;
 * provider code reaches them through `require` or its context.
 */
function extensionGlobals(kind, id, ctx) {
  const parsers = isProviderContext(ctx) ? {
    AnimeParser: ctx.AnimeParser,
    MovieParser: ctx.MovieParser,
    MangaParser: ctx.MangaParser
  } : {};
  const utils = isProviderContext(ctx) ? {
    createProviderContext: () => ctx,
    createExtractorContext: () => ctx
  } : {
    createExtractorContext: () => ctx
  };
  // The only modules registry code can require; anything else throws (EXT-5).
  const modules = {
    'cheerio': {
      load: ctx.load
    },
    'axios': ctx.axios,
    'crypto-js': ctx.CryptoJS,
    [exports.MODELS_MODULE]: {
      ...parsers,
      ...exports.extensionEnums
    },
    [exports.UTILS_MODULE]: utils,
    'URL': ctx.PolyURL,
    'URLSearchParams': ctx.PolyURLSearchParams,
    'NativeConsumet': ctx.NativeConsumet
  };
  const globals = {
    exports: {},
    module: {
      exports: {}
    },
    require: createExtensionRequire(id, modules),
    console,
    Promise,
    Object,
    fetch: (0, fetch_with_timeout_1.createExtensionFetch)(ctx.axios)
  };
  if (kind === 'extractor') {
    Object.assign(globals, {
      axios: ctx.axios,
      load: ctx.load,
      CryptoJS: ctx.CryptoJS,
      URL: ctx.PolyURL,
      URLSearchParams: ctx.PolyURLSearchParams
    });
  }
  return globals;
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
      ${Object.keys(globals).map(key => `const ${key} = context.${key};`).join('\n      ')}

      try {
        ${code}
      } catch (execError) {
        console.error('Error during ${kind} code execution:', execError);
        throw new Error('${label} code execution failed: ' + execError.message);
      }

      return typeof ${name} !== 'undefined' ? ${name} : undefined;
      `);
  } catch (syntaxError) {
    throw new Error(`Failed to parse ${kind} code: ${syntaxError.message}`);
  }
  // The top-level declaration comes first: it always binds its own name, while bundle export
  // getters built without block scoping can point at another export on Hermes (see
  // scripts/hermes-safe-dist.js). Exports cover code without a top-level declaration, and the
  // default export (`export default`) is the last resort.
  const declared = run(globals);
  const {
    exports,
    module
  } = globals;
  return [declared, exports[name], module.exports?.[name], exports.default, module.exports?.default].find(candidate => typeof candidate === 'function');
}
/** Thrown when a registry entry's code can't be downloaded; `status` is the HTTP status, if any. */
class RegistryFetchError extends Error {
  kind;
  url;
  status;
  constructor(kind, url, message, status) {
    super(message);
    this.name = 'RegistryFetchError';
    this.kind = kind;
    this.url = url;
    this.status = status;
    Object.setPrototypeOf(this, RegistryFetchError.prototype);
  }
}
exports.RegistryFetchError = RegistryFetchError;
/** Download the code a registry entry's `main` points at. */
async function fetchEntryCode(kind, main) {
  const what = kind === 'provider' ? 'extension' : 'extractor';
  let response;
  try {
    response = await (0, fetch_with_timeout_1.fetchTextWithTimeout)(main, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain, application/javascript, */*',
        'User-Agent': 'React-Native-Consumet/1.0.0'
      }
    });
  } catch (error) {
    throw new RegistryFetchError(kind, main, `Failed to fetch ${what}: ${error?.message ?? error}`);
  }
  if (!response.ok) {
    throw new RegistryFetchError(kind, main, `Failed to fetch ${what}: ${response.status} ${response.statusText}`, response.status);
  }
  return response.text;
}
/**
 * Turns verified registry code into the function it provides. The same code verified against the
 * same hash runs from its compiled copy; unverified code is checked again on every call.
 */
class CompiledCodeCache {
  integrityOptions;
  compiled = new Map();
  constructor() {
    let integrityOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    this.integrityOptions = integrityOptions;
  }
  compile(key, request) {
    const {
      kind,
      id,
      name,
      code,
      entry,
      skipIntegrity
    } = request;
    (0, extension_integrity_1.assertValidIdentifier)(name, kind === 'provider' ? 'factoryName' : 'extractor name', id);
    const label = kind === 'provider' ? 'extension' : 'extractor code';
    const sha256 = entry.sha256 ?? '';
    const cached = this.compiled.get(key);
    if (cached?.sha256 === sha256 && cached.code === code) return cached.factory;
    if (!skipIntegrity) (0, extension_integrity_1.verifyExtensionCode)(code, entry, this.integrityOptions);
    const factory = evaluateExtensionCode(code, name, request.globals(), kind);
    if (!factory) {
      throw new Error(`Factory function '${name}' not found in ${label}`);
    }
    if (!skipIntegrity) this.compiled.set(key, {
      sha256,
      code,
      factory
    });
    return factory;
  }
  /** Forget the compiled code of one extension or extractor: keys `${id}` and `${id}|…`. */
  forget(id) {
    deleteEntriesOf(this.compiled, id);
  }
}
exports.CompiledCodeCache = CompiledCodeCache;
/**
 * Share one load per key: concurrent callers get the same promise, later callers the result.
 * A failed load is forgotten, so the next call tries again.
 */
function memoiseLoad(cache, key, load) {
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = load();
  cache.set(key, pending);
  pending.catch(() => {
    if (cache.get(key) === pending) cache.delete(key);
  });
  return pending;
}
/** Delete the entries of one extension or extractor: keys `${id}` and `${id}|…`. */
function deleteEntriesOf(cache, id) {
  for (const key of Array.from(cache.keys())) {
    if (key === id || key.startsWith(`${id}|`)) cache.delete(key);
  }
}
//# sourceMappingURL=extension-modules.js.map