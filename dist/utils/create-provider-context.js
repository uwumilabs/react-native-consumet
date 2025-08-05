"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProviderContext = createProviderContext;
exports.createProviderContextWithAxios = createProviderContextWithAxios;
exports.createReactNativeProviderContext = createReactNativeProviderContext;
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
        StreamSB: extractors_1.StreamSB,
        MegaCloud: extractors_1.MegaCloud,
        StreamTape: extractors_1.StreamTape,
        // Add more extractors as they become available
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
 * Quick helper to create a context with just custom axios
 */
function createProviderContextWithAxios(axiosInstance) {
    return createProviderContext({ axios: axiosInstance });
}
/**
 * Quick helper to create a context for React Native environments
 */
function createReactNativeProviderContext(config = {}) {
    // React Native optimized axios settings
    const rnAxios = axios_1.default.create({
        timeout: 20000, // Longer timeout for mobile networks
        headers: {
            'User-Agent': config.userAgent ||
                'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        },
    });
    return createProviderContext({
        ...config,
        axios: config.axios || rnAxios,
    });
}
exports.default = createProviderContext;
//# sourceMappingURL=create-provider-context.js.map