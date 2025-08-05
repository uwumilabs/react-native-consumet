"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProviderContext = createProviderContext;
exports.createReactNativeProviderContext = createReactNativeProviderContext;
exports.createProviderContextWithAxios = createProviderContextWithAxios;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = require("cheerio");
const models_1 = require("../models");
// Import extractors
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
    // Default extractors - all the important ones pre-configured
    const defaultExtractors = {
        AsianLoad: extractors_1.AsianLoad,
        Filemoon: extractors_1.Filemoon,
        GogoCDN: extractors_1.GogoCDN,
        Kwik: extractors_1.Kwik,
        MixDrop: extractors_1.MixDrop,
        Mp4Player: extractors_1.Mp4Player,
        Mp4Upload: extractors_1.Mp4Upload,
        RapidCloud: extractors_1.RapidCloud,
        MegaCloud: extractors_1.MegaCloud,
        StreamHub: extractors_1.StreamHub,
        StreamLare: extractors_1.StreamLare,
        StreamSB: extractors_1.StreamSB,
        StreamTape: extractors_1.StreamTape,
        StreamWish: extractors_1.StreamWish,
        VidCloud: extractors_1.VidCloud,
        VidMoly: extractors_1.VidMoly,
        VizCloud: extractors_1.VizCloud,
        VidHide: extractors_1.VidHide,
        Voe: extractors_1.Voe,
        MegaUp: extractors_1.MegaUp,
    };
    // Default logger
    const defaultLogger = {
        log: console.log,
        error: console.error,
    };
    return {
        axios: config.axios || defaultAxios,
        load: config.load || cheerio_1.load,
        USER_AGENT: config.userAgent ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        AnimeParser: config.AnimeParser || models_1.AnimeParser,
        MovieParser: config.MovieParser || models_1.MovieParser,
        extractors: { ...defaultExtractors, ...config.extractors },
        logger: config.logger || defaultLogger,
    };
}
/**
 * Creates a React Native optimized provider context
 * This version is specifically tuned for React Native environments
 *
 * @param config Optional configuration to override defaults
 * @returns Complete ProviderContext optimized for React Native
 */
function createReactNativeProviderContext(config = {}) {
    // React Native specific axios configuration
    const reactNativeAxios = axios_1.default.create({
        timeout: 30000, // Longer timeout for mobile networks
        headers: {
            'User-Agent': config.userAgent ||
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Upgrade-Insecure-Requests': '1',
        },
    });
    return createProviderContext({
        ...config,
        axios: config.axios || reactNativeAxios,
        userAgent: config.userAgent ||
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    });
}
/**
 * Quick helper to create a context with just custom axios
 */
function createProviderContextWithAxios(axiosInstance) {
    return createProviderContext({ axios: axiosInstance });
}
exports.default = createProviderContext;
//# sourceMappingURL=create-provider-context.js.map