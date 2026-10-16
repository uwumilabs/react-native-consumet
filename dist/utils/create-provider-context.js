"use strict";

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createProviderContext = createProviderContext;
const cheerio_1 = require("cheerio");
const crypto_js_1 = __importDefault(require("crypto-js"));
const models_1 = require("../models");
const extension_utils_1 = require("./extension-utils");
const url_polyfill_1 = require("./url-polyfill");
const NativeConsumet_1 = require("../NativeConsumet");
/**
 * Creates a provider context with sensible defaults for extensions
 *
 * @param config Optional configuration to override defaults
 * @returns Complete ProviderContext ready for use with extensions
 */
function createProviderContext() {
  let config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const extractorManager = config.extractorManager;
  // A factory shaped like the bundled ones (`X(ctx).extract(url)`) that runs the registry version of
  // the extractor, verified and cached by the shared manager, falling back to the bundled version.
  const registryBacked = (name, bundled) => callerCtx => ({
    serverName: name,
    sources: [],
    extract: async function () {
      let extractor;
      try {
        extractor = await extractorManager.loadExtractor(name);
      } catch (error) {
        if (!bundled) throw error;
      }
      // loadExtractor returns the bundled extractor itself when the registry code fails; it throws
      // when the entry can't be used at all (e.g. it needs a newer context), so build it here.
      if (typeof extractor?.extract !== 'function') {
        if (!bundled) throw new Error(`Extractor '${name}' is not available`);
        extractor = bundled(callerCtx);
      }
      return extractor.extract(...arguments);
    }
  });
  const finalExtractors = new Proxy(extension_utils_1.defaultExtractors, {
    get: (target, prop) => {
      if (typeof prop !== 'string') return target[prop];
      // Custom extractors from the config always win
      if (config.extractors && config.extractors[prop]) {
        return config.extractors[prop];
      }
      // Extractors in the app's registry run their registry version
      if (extractorManager?.getExtractorMetadata(prop)) {
        return registryBacked(prop, target[prop]);
      }
      if (target[prop]) {
        return target[prop];
      }
      return () => ({
        serverName: prop,
        sources: [],
        extract: async () => {
          throw new Error(`Extractor '${prop}' not found in the registry or the bundled extractors`);
        }
      });
    }
  });
  // Create base URL normalization utility
  const createCustomBaseUrl = (defaultUrl, customUrl) => {
    if (!customUrl) {
      return defaultUrl;
    }
    if (customUrl.startsWith('http://') || customUrl.startsWith('https://')) {
      return customUrl;
    } else {
      return `http://${customUrl}`;
    }
  };
  return {
    axios: config.axios || extension_utils_1.defaultAxios,
    load: config.load || cheerio_1.load,
    CryptoJS: crypto_js_1.default,
    USER_AGENT: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    AnimeParser: config.AnimeParser || models_1.AnimeParser,
    MovieParser: config.MovieParser || models_1.MovieParser,
    MangaParser: config.MangaParser || models_1.MangaParser,
    extractors: finalExtractors,
    extractorManager,
    PolyURL: url_polyfill_1.PolyURL,
    PolyURLSearchParams: url_polyfill_1.PolyURLSearchParams,
    createCustomBaseUrl,
    enums: {
      StreamingServers: models_1.StreamingServers,
      MediaFormat: models_1.MediaFormat,
      MediaStatus: models_1.MediaStatus,
      SubOrDub: models_1.SubOrDub,
      WatchListType: models_1.WatchListType,
      TvType: models_1.TvType,
      Genres: models_1.Genres,
      Topics: models_1.Topics
    },
    NativeConsumet: {
      getDdosGuardCookiesWithWebView: NativeConsumet_1.getDdosGuardCookiesWithWebView,
      makeGetRequestWithWebView: NativeConsumet_1.makeGetRequestWithWebView,
      makePostRequestWithWebView: NativeConsumet_1.makePostRequestWithWebView,
      makePostRequest: NativeConsumet_1.makePostRequest,
      multiply: NativeConsumet_1.multiply,
      bypassDdosGuard: NativeConsumet_1.bypassDdosGuard,
      deobfuscateScript: NativeConsumet_1.deobfuscateScript
    }
  };
}
exports.default = createProviderContext;
//# sourceMappingURL=create-provider-context.js.map