"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProviderContext = createProviderContext;
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
        MegaCloud: (ctx) => new extractors_1.MegaCloud(ctx || extractorContext),
        StreamHub: extractors_1.StreamHub,
        StreamLare: extractors_1.StreamLare,
        StreamSB: extractors_1.StreamSB,
        StreamTape: extractors_1.StreamTape,
        StreamWish: extractors_1.StreamWish,
        VidCloud: (ctx) => new extractors_1.VidCloud(ctx || extractorContext),
        VidMoly: extractors_1.VidMoly,
        VizCloud: extractors_1.VizCloud,
        VidHide: extractors_1.VidHide,
        Voe: extractors_1.Voe,
        MegaUp: extractors_1.MegaUp,
    };
    return {
        axios: config.axios || defaultAxios,
        load: config.load || cheerio_1.load,
        USER_AGENT: config.userAgent ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        AnimeParser: config.AnimeParser || models_1.AnimeParser,
        MovieParser: config.MovieParser || models_1.MovieParser,
        MangaParser: config.MangaParser || models_1.MangaParser,
        extractors: { ...defaultExtractors, ...config.extractors },
        logger: config.logger || defaultLogger,
    };
}
exports.default = createProviderContext;
//# sourceMappingURL=create-provider-context.js.map