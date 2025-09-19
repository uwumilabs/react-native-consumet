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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
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
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProviderContext = createProviderContext;
const cheerio_1 = require("cheerio");
const models_1 = require("../models");
const extension_utils_1 = require("./extension-utils");
const url_polyfill_1 = require("./url-polyfill");
const NativeConsumet_1 = require("../NativeConsumet");
const extension_registry_json_1 = __importDefault(require("../extension-registry.json"));
/**
 * Creates a provider context with sensible defaults for extensions
 *
 * @param config Optional configuration to override defaults
 * @returns Complete ProviderContext ready for use with extensions
 */
function createProviderContext(config = {}) {
    // Create dynamic extractor proxy
    const finalExtractors = new Proxy(extension_utils_1.defaultExtractors, {
        get: (target, prop) => {
            // If it's a custom extractor, return it directly
            if (config.extractors && config.extractors[prop]) {
                return config.extractors[prop];
            }
            // If it's a static extractor, return it directly for immediate access
            if (target[prop]) {
                return target[prop];
            }
            // For dynamic extractors, return an async loader
            return (...args) => __awaiter(this, void 0, void 0, function* () {
                try {
                    // Dynamically import and create ExtractorManager to avoid circular dependency
                    const { ExtractorManager } = yield Promise.resolve().then(() => __importStar(require('./ExtractorManager')));
                    const extractorManager = new ExtractorManager(extension_registry_json_1.default, {
                        axios: config.axios || extension_utils_1.defaultExtractorContext.axios,
                        load: config.load || extension_utils_1.defaultExtractorContext.load,
                        userAgent: config.userAgent || extension_utils_1.defaultExtractorContext.USER_AGENT,
                    });
                    const extractor = yield extractorManager.loadExtractor(prop.toLowerCase());
                    return extractor.extract(args[0], ...args.slice(1));
                }
                catch (error) {
                    console.warn(`⚠️ Failed to load dynamic extractor '${prop}', falling back to static:`, error);
                    // Fallback to static if available
                    if (target[prop]) {
                        return target[prop](...args);
                    }
                    throw new Error(`Extractor '${prop}' not found in dynamic or static extractors`);
                }
            });
        },
    });
    // Create base URL normalization utility
    const createCustomBaseUrl = (defaultUrl, customUrl) => {
        if (!customUrl) {
            return defaultUrl;
        }
        if (customUrl.startsWith('http://') || customUrl.startsWith('https://')) {
            return customUrl;
        }
        else {
            return `http://${customUrl}`;
        }
    };
    return {
        axios: config.axios || extension_utils_1.defaultAxios,
        load: config.load || cheerio_1.load,
        USER_AGENT: config.userAgent ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        AnimeParser: config.AnimeParser || models_1.AnimeParser,
        MovieParser: config.MovieParser || models_1.MovieParser,
        MangaParser: config.MangaParser || models_1.MangaParser,
        extractors: finalExtractors,
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
            Topics: models_1.Topics,
        },
        NativeConsumet: {
            getDdosGuardCookiesWithWebView: NativeConsumet_1.getDdosGuardCookiesWithWebView,
            makeGetRequestWithWebView: NativeConsumet_1.makeGetRequestWithWebView,
            multiply: NativeConsumet_1.multiply,
            bypassDdosGuard: NativeConsumet_1.bypassDdosGuard,
            deobfuscateScript: NativeConsumet_1.deobfuscateScript,
        },
    };
}
exports.default = createProviderContext;
//# sourceMappingURL=create-provider-context.js.map