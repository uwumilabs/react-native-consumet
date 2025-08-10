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
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = require("cheerio");
const models_1 = require("../models");
// Import extractors for fallback compatibility
const extractors_1 = require("../extractors");
/**
 * Creates a provider context with sensible defaults for extensions
 *
 * @param config Optional configuration to override defaults
 * @returns Complete ProviderContext ready for use with extensions
 */
function createProviderContext(config = {}) {
    // Default axios instance with optimized settings for scraping
    const defaultAxios = axios_1.default.create({
        timeout: 15000,
        headers: {
            'User-Agent': config.userAgent ||
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
        },
    });
    // Default logger
    const defaultLogger = {
        log: console.log,
        error: console.error,
    };
    // Create extractor context for passing to context-aware extractors
    const extractorContext = {
        axios: config.axios || defaultAxios,
        load: config.load || cheerio_1.load,
        USER_AGENT: config.userAgent ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        logger: config.logger || defaultLogger,
    };
    // Default static extractors (for backward compatibility)
    const defaultStaticExtractors = {
        AsianLoad: extractors_1.AsianLoad,
        Filemoon: extractors_1.Filemoon,
        GogoCDN: extractors_1.GogoCDN,
        Kwik: extractors_1.Kwik,
        MixDrop: extractors_1.MixDrop,
        Mp4Player: extractors_1.Mp4Player,
        Mp4Upload: extractors_1.Mp4Upload,
        RapidCloud: extractors_1.RapidCloud,
        MegaCloud: (ctx) => (0, extractors_1.MegaCloud)(ctx || extractorContext),
        StreamHub: extractors_1.StreamHub,
        StreamLare: extractors_1.StreamLare,
        StreamSB: extractors_1.StreamSB,
        StreamTape: extractors_1.StreamTape,
        StreamWish: extractors_1.StreamWish,
        VidCloud: (ctx) => (0, extractors_1.VidCloud)(ctx || extractorContext),
        VidMoly: extractors_1.VidMoly,
        VizCloud: extractors_1.VizCloud,
        VidHide: extractors_1.VidHide,
        Voe: extractors_1.Voe,
        MegaUp: extractors_1.MegaUp,
    };
    // Note: ExtractorManager is not created here to avoid circular dependency
    // It should be created separately when needed
    // Create dynamic extractor proxy
    const finalExtractors = new Proxy(defaultStaticExtractors, {
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
                    const extractorManager = new ExtractorManager({
                        axios: config.axios || extractorContext.axios,
                        load: config.load || extractorContext.load,
                        userAgent: config.userAgent || extractorContext.USER_AGENT,
                        logger: config.logger || extractorContext.logger,
                    });
                    const extractor = yield extractorManager.loadExtractor(prop.toLowerCase());
                    return typeof extractor === 'function' ? extractor(...args) : extractor;
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
        axios: config.axios || defaultAxios,
        load: config.load || cheerio_1.load,
        USER_AGENT: config.userAgent ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        AnimeParser: config.AnimeParser || models_1.AnimeParser,
        MovieParser: config.MovieParser || models_1.MovieParser,
        MangaParser: config.MangaParser || models_1.MangaParser,
        extractors: finalExtractors,
        logger: config.logger || defaultLogger,
        createCustomBaseUrl,
        enums: {
            StreamingServers: models_1.StreamingServers,
            MediaFormat: models_1.MediaFormat,
            MediaStatus: models_1.MediaStatus,
            SubOrSub: models_1.SubOrSub,
            WatchListType: models_1.WatchListType,
            TvType: models_1.TvType,
            Genres: models_1.Genres,
            Topics: models_1.Topics,
        },
    };
}
exports.default = createProviderContext;
//# sourceMappingURL=create-provider-context.js.map