"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortChaptersForReading = exports.parseVolumeNumber = exports.parseChapterNumber = exports.parseSignedRegistry = exports.verifyRegistrySignature = exports.RegistrySignatureError = exports.REGISTRY_SIGNING_KEYS = exports.assertCompatibleEntry = exports.isCompatibleEntry = exports.validateRegistry = exports.RegistryError = exports.REGISTRY_SCHEMA_VERSION = exports.CONTEXT_VERSION = exports.IntegrityError = exports.verifyExtensionCode = exports.RegistryFetchError = exports.ExtractorManager = exports.REQUIRED_PROVIDER_METHODS = exports.ProviderManager = exports.defaultExtractors = exports.createProviderContext = exports.defaultExtractorContext = exports.defaultAxios = exports.createExtractorContext = exports.MetaError = exports.MovieParser = exports.AnimeParser = exports.WatchListType = exports.MediaFormat = exports.TvType = exports.MediaStatus = exports.StreamingServers = exports.SubOrDub = exports.Genres = exports.Topics = exports.PolyURLSearchParams = exports.PolyURL = exports.META = exports.MOVIES = exports.MANGA = exports.LIGHT_NOVELS = exports.ANIME = exports.ExtensionRegistry = void 0;
require("react-native-get-random-values");
const url_polyfill_1 = require("./utils/url-polyfill");
Object.defineProperty(exports, "PolyURL", { enumerable: true, get: function () { return url_polyfill_1.PolyURL; } });
Object.defineProperty(exports, "PolyURLSearchParams", { enumerable: true, get: function () { return url_polyfill_1.PolyURLSearchParams; } });
// React Native's URL and URLSearchParams are incomplete or missing; fill in only what's absent.
const scope = globalThis;
if (scope && !scope.URL)
    scope.URL = url_polyfill_1.PolyURL;
if (scope && !scope.URLSearchParams)
    scope.URLSearchParams = url_polyfill_1.PolyURLSearchParams;
var extension_registry_json_1 = require("./extension-registry.json");
Object.defineProperty(exports, "ExtensionRegistry", { enumerable: true, get: function () { return __importDefault(extension_registry_json_1).default; } });
var providers_1 = require("./providers");
Object.defineProperty(exports, "ANIME", { enumerable: true, get: function () { return providers_1.ANIME; } });
Object.defineProperty(exports, "LIGHT_NOVELS", { enumerable: true, get: function () { return providers_1.LIGHT_NOVELS; } });
Object.defineProperty(exports, "MANGA", { enumerable: true, get: function () { return providers_1.MANGA; } });
Object.defineProperty(exports, "MOVIES", { enumerable: true, get: function () { return providers_1.MOVIES; } });
Object.defineProperty(exports, "META", { enumerable: true, get: function () { return providers_1.META; } });
__exportStar(require("./extractors"), exports);
var models_1 = require("./models");
Object.defineProperty(exports, "Topics", { enumerable: true, get: function () { return models_1.Topics; } });
Object.defineProperty(exports, "Genres", { enumerable: true, get: function () { return models_1.Genres; } });
Object.defineProperty(exports, "SubOrDub", { enumerable: true, get: function () { return models_1.SubOrDub; } });
Object.defineProperty(exports, "StreamingServers", { enumerable: true, get: function () { return models_1.StreamingServers; } });
Object.defineProperty(exports, "MediaStatus", { enumerable: true, get: function () { return models_1.MediaStatus; } });
Object.defineProperty(exports, "TvType", { enumerable: true, get: function () { return models_1.TvType; } });
Object.defineProperty(exports, "MediaFormat", { enumerable: true, get: function () { return models_1.MediaFormat; } });
Object.defineProperty(exports, "WatchListType", { enumerable: true, get: function () { return models_1.WatchListType; } });
Object.defineProperty(exports, "AnimeParser", { enumerable: true, get: function () { return models_1.AnimeParser; } });
Object.defineProperty(exports, "MovieParser", { enumerable: true, get: function () { return models_1.MovieParser; } });
Object.defineProperty(exports, "MetaError", { enumerable: true, get: function () { return models_1.MetaError; } });
var create_extractor_context_1 = require("./utils/create-extractor-context");
Object.defineProperty(exports, "createExtractorContext", { enumerable: true, get: function () { return create_extractor_context_1.createExtractorContext; } });
Object.defineProperty(exports, "defaultAxios", { enumerable: true, get: function () { return create_extractor_context_1.defaultAxios; } });
Object.defineProperty(exports, "defaultExtractorContext", { enumerable: true, get: function () { return create_extractor_context_1.defaultExtractorContext; } });
var create_provider_context_1 = require("./utils/create-provider-context");
Object.defineProperty(exports, "createProviderContext", { enumerable: true, get: function () { return create_provider_context_1.createProviderContext; } });
Object.defineProperty(exports, "defaultExtractors", { enumerable: true, get: function () { return create_provider_context_1.defaultExtractors; } });
var ProviderManager_1 = require("./utils/ProviderManager");
Object.defineProperty(exports, "ProviderManager", { enumerable: true, get: function () { return ProviderManager_1.ProviderManager; } });
Object.defineProperty(exports, "REQUIRED_PROVIDER_METHODS", { enumerable: true, get: function () { return ProviderManager_1.REQUIRED_PROVIDER_METHODS; } });
var ExtractorManager_1 = require("./utils/ExtractorManager");
Object.defineProperty(exports, "ExtractorManager", { enumerable: true, get: function () { return ExtractorManager_1.ExtractorManager; } });
var extension_modules_1 = require("./utils/extension-modules");
Object.defineProperty(exports, "RegistryFetchError", { enumerable: true, get: function () { return extension_modules_1.RegistryFetchError; } });
var extension_integrity_1 = require("./utils/extension-integrity");
Object.defineProperty(exports, "verifyExtensionCode", { enumerable: true, get: function () { return extension_integrity_1.verifyExtensionCode; } });
Object.defineProperty(exports, "IntegrityError", { enumerable: true, get: function () { return extension_integrity_1.IntegrityError; } });
var registry_schema_1 = require("./utils/registry-schema");
Object.defineProperty(exports, "CONTEXT_VERSION", { enumerable: true, get: function () { return registry_schema_1.CONTEXT_VERSION; } });
Object.defineProperty(exports, "REGISTRY_SCHEMA_VERSION", { enumerable: true, get: function () { return registry_schema_1.REGISTRY_SCHEMA_VERSION; } });
Object.defineProperty(exports, "RegistryError", { enumerable: true, get: function () { return registry_schema_1.RegistryError; } });
Object.defineProperty(exports, "validateRegistry", { enumerable: true, get: function () { return registry_schema_1.validateRegistry; } });
Object.defineProperty(exports, "isCompatibleEntry", { enumerable: true, get: function () { return registry_schema_1.isCompatibleEntry; } });
Object.defineProperty(exports, "assertCompatibleEntry", { enumerable: true, get: function () { return registry_schema_1.assertCompatibleEntry; } });
var registry_signature_1 = require("./utils/registry-signature");
Object.defineProperty(exports, "REGISTRY_SIGNING_KEYS", { enumerable: true, get: function () { return registry_signature_1.REGISTRY_SIGNING_KEYS; } });
Object.defineProperty(exports, "RegistrySignatureError", { enumerable: true, get: function () { return registry_signature_1.RegistrySignatureError; } });
Object.defineProperty(exports, "verifyRegistrySignature", { enumerable: true, get: function () { return registry_signature_1.verifyRegistrySignature; } });
Object.defineProperty(exports, "parseSignedRegistry", { enumerable: true, get: function () { return registry_signature_1.parseSignedRegistry; } });
var manga_1 = require("./utils/manga");
Object.defineProperty(exports, "parseChapterNumber", { enumerable: true, get: function () { return manga_1.parseChapterNumber; } });
Object.defineProperty(exports, "parseVolumeNumber", { enumerable: true, get: function () { return manga_1.parseVolumeNumber; } });
Object.defineProperty(exports, "sortChaptersForReading", { enumerable: true, get: function () { return manga_1.sortChaptersForReading; } });
//# sourceMappingURL=index.js.map