"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultStaticExtractors = exports.defaultExtractorContext = exports.defaultAxios = exports.PolyURLSearchParams = exports.PolyURL = exports.createExtractorContext = exports.ExtractorManager = exports.ProviderManager = exports.createProviderContext = exports.ExtensionRegistry = exports.Voe = exports.VidHide = exports.MegaCloud = exports.Mp4Player = exports.MegaUp = exports.VidMoly = exports.StreamWish = exports.Mp4Upload = exports.Filemoon = exports.AsianLoad = exports.VizCloud = exports.StreamHub = exports.StreamLare = exports.StreamTape = exports.RapidCloud = exports.Kwik = exports.MixDrop = exports.StreamSB = exports.GogoCDN = exports.MediaFormat = exports.TvType = exports.MediaStatus = exports.StreamingServers = exports.SubOrDub = exports.Genres = exports.Topics = exports.PROVIDERS_LIST = exports.META = exports.MOVIES = exports.LIGHT_NOVELS = exports.MANGA = exports.ANIME = void 0;
const url_polyfill_1 = require("./utils/url-polyfill");
Object.defineProperty(exports, "PolyURL", { enumerable: true, get: function () { return url_polyfill_1.URL; } });
Object.defineProperty(exports, "PolyURLSearchParams", { enumerable: true, get: function () { return url_polyfill_1.URLSearchParams; } });
// Polyfill global scope if they don't exist
if (typeof globalThis !== 'undefined') {
    // @ts-ignore
    if (!globalThis.URL) {
        globalThis.URL = url_polyfill_1.URL;
    }
    // @ts-ignore
    if (!globalThis.URLSearchParams) {
        globalThis.URLSearchParams = url_polyfill_1.URLSearchParams;
    }
}
// Providers (namespaced provider groups)
const providers_1 = require("./providers");
Object.defineProperty(exports, "ANIME", { enumerable: true, get: function () { return providers_1.ANIME; } });
Object.defineProperty(exports, "LIGHT_NOVELS", { enumerable: true, get: function () { return providers_1.LIGHT_NOVELS; } });
Object.defineProperty(exports, "MANGA", { enumerable: true, get: function () { return providers_1.MANGA; } });
Object.defineProperty(exports, "MOVIES", { enumerable: true, get: function () { return providers_1.MOVIES; } });
Object.defineProperty(exports, "META", { enumerable: true, get: function () { return providers_1.META; } });
// Provider metadata (catalog of built-in providers)
const providers_list_1 = require("./utils/providers-list");
Object.defineProperty(exports, "PROVIDERS_LIST", { enumerable: true, get: function () { return providers_list_1.PROVIDERS_LIST; } });
const extension_registry_json_1 = __importDefault(require("./extension-registry.json"));
exports.ExtensionRegistry = extension_registry_json_1.default;
// Utils (contexts, and provider management)
const utils_1 = require("./utils");
Object.defineProperty(exports, "createProviderContext", { enumerable: true, get: function () { return utils_1.createProviderContext; } });
Object.defineProperty(exports, "ProviderManager", { enumerable: true, get: function () { return utils_1.ProviderManager; } });
Object.defineProperty(exports, "ExtractorManager", { enumerable: true, get: function () { return utils_1.ExtractorManager; } });
Object.defineProperty(exports, "createExtractorContext", { enumerable: true, get: function () { return utils_1.createExtractorContext; } });
Object.defineProperty(exports, "defaultAxios", { enumerable: true, get: function () { return utils_1.defaultAxios; } });
Object.defineProperty(exports, "defaultExtractorContext", { enumerable: true, get: function () { return utils_1.defaultExtractorContext; } });
Object.defineProperty(exports, "defaultStaticExtractors", { enumerable: true, get: function () { return utils_1.defaultStaticExtractors; } });
// Extractors (video/file hosters and scrapers)
const extractors_1 = require("./extractors");
Object.defineProperty(exports, "AsianLoad", { enumerable: true, get: function () { return extractors_1.AsianLoad; } });
Object.defineProperty(exports, "Filemoon", { enumerable: true, get: function () { return extractors_1.Filemoon; } });
Object.defineProperty(exports, "GogoCDN", { enumerable: true, get: function () { return extractors_1.GogoCDN; } });
Object.defineProperty(exports, "Kwik", { enumerable: true, get: function () { return extractors_1.Kwik; } });
Object.defineProperty(exports, "MixDrop", { enumerable: true, get: function () { return extractors_1.MixDrop; } });
Object.defineProperty(exports, "Mp4Upload", { enumerable: true, get: function () { return extractors_1.Mp4Upload; } });
Object.defineProperty(exports, "RapidCloud", { enumerable: true, get: function () { return extractors_1.RapidCloud; } });
Object.defineProperty(exports, "StreamHub", { enumerable: true, get: function () { return extractors_1.StreamHub; } });
Object.defineProperty(exports, "StreamLare", { enumerable: true, get: function () { return extractors_1.StreamLare; } });
Object.defineProperty(exports, "StreamSB", { enumerable: true, get: function () { return extractors_1.StreamSB; } });
Object.defineProperty(exports, "StreamTape", { enumerable: true, get: function () { return extractors_1.StreamTape; } });
Object.defineProperty(exports, "StreamWish", { enumerable: true, get: function () { return extractors_1.StreamWish; } });
Object.defineProperty(exports, "VidMoly", { enumerable: true, get: function () { return extractors_1.VidMoly; } });
Object.defineProperty(exports, "VizCloud", { enumerable: true, get: function () { return extractors_1.VizCloud; } });
Object.defineProperty(exports, "Mp4Player", { enumerable: true, get: function () { return extractors_1.Mp4Player; } });
Object.defineProperty(exports, "MegaCloud", { enumerable: true, get: function () { return extractors_1.MegaCloud; } });
Object.defineProperty(exports, "VidHide", { enumerable: true, get: function () { return extractors_1.VidHide; } });
Object.defineProperty(exports, "Voe", { enumerable: true, get: function () { return extractors_1.Voe; } });
Object.defineProperty(exports, "MegaUp", { enumerable: true, get: function () { return extractors_1.MegaUp; } });
// Models (domain types, enums, and constants)
const models_1 = require("./models");
Object.defineProperty(exports, "StreamingServers", { enumerable: true, get: function () { return models_1.StreamingServers; } });
Object.defineProperty(exports, "MediaStatus", { enumerable: true, get: function () { return models_1.MediaStatus; } });
Object.defineProperty(exports, "SubOrDub", { enumerable: true, get: function () { return models_1.SubOrDub; } });
Object.defineProperty(exports, "TvType", { enumerable: true, get: function () { return models_1.TvType; } });
Object.defineProperty(exports, "Genres", { enumerable: true, get: function () { return models_1.Genres; } });
Object.defineProperty(exports, "Topics", { enumerable: true, get: function () { return models_1.Topics; } });
Object.defineProperty(exports, "MediaFormat", { enumerable: true, get: function () { return models_1.MediaFormat; } });
//# sourceMappingURL=index.js.map