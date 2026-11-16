"use strict";

var __createBinding = this && this.__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = {
      enumerable: true,
      get: function () {
        return m[k];
      }
    };
  }
  Object.defineProperty(o, k2, desc);
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});
var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});
var __importStar = this && this.__importStar || function () {
  var ownKeys = function (o) {
    ownKeys = Object.getOwnPropertyNames || function (o) {
      var ar = [];
      for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
      return ar;
    };
    return ownKeys(o);
  };
  return function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
    __setModuleDefault(result, mod);
    return result;
  };
}();
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultExtractors = void 0;
exports.createProviderContext = createProviderContext;
const models_1 = require("../models");
const BundledExtractors = __importStar(require("../extractors"));
const create_extractor_context_1 = require("./create-extractor-context");
const extension_modules_1 = require("./extension-modules");
/** The extractors the library bundles, by name. */
exports.defaultExtractors = {
  ...BundledExtractors
};
const createCustomBaseUrl = (defaultUrl, customUrl) => {
  if (!customUrl) return defaultUrl;
  return /^https?:\/\//.test(customUrl) ? customUrl : `http://${customUrl}`;
};
function createProviderContext() {
  let config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const {
    extractorManager
  } = config;
  const bundled = exports.defaultExtractors;
  const registryBacked = (name, fallback) => callerCtx => ({
    extract: async function (videoUrl) {
      let factory = fallback;
      try {
        factory = await extractorManager.loadExtractorFactory(name);
      } catch (error) {
        // The registry entry can't be used here (e.g. it needs a newer context): run the bundled one.
        if (!fallback) throw error;
      }
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      return factory(callerCtx ?? ctx).extract(videoUrl, ...args);
    }
  });
  const missing = name => () => ({
    extract: async () => {
      throw new Error(`Extractor '${name}' not found in the registry or the bundled extractors`);
    }
  });
  const extractors = new Proxy(bundled, {
    get: (target, prop) => {
      if (typeof prop !== 'string') return Reflect.get(target, prop);
      const custom = config.extractors?.[prop];
      if (custom) return custom;
      const own = target[prop];
      if (extractorManager?.getExtractorMetadata(prop)) return registryBacked(prop, own);
      if (own) return callerCtx => own(callerCtx ?? ctx);
      return missing(prop);
    }
  });
  const ctx = {
    ...(0, create_extractor_context_1.createExtractorContext)(config),
    AnimeParser: models_1.AnimeParser,
    MovieParser: models_1.MovieParser,
    MangaParser: models_1.MangaParser,
    extractors,
    createCustomBaseUrl,
    enums: extension_modules_1.extensionEnums
  };
  return ctx;
}
exports.default = createProviderContext;
//# sourceMappingURL=create-provider-context.js.map