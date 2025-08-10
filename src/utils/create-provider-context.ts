import axios from 'axios';
import { load } from 'cheerio';
import type { ProviderContext } from '../models/provider-context';
import {
  AnimeParser,
  MovieParser,
  MangaParser,
  StreamingServers,
  MediaFormat,
  MediaStatus,
  SubOrSub,
  WatchListType,
  TvType,
  Genres,
  Topics,
} from '../models';

// Import extractors for fallback compatibility
import {
  AsianLoad,
  Filemoon,
  GogoCDN,
  Kwik,
  MixDrop,
  Mp4Player,
  Mp4Upload,
  RapidCloud,
  MegaCloud,
  StreamHub,
  StreamLare,
  StreamSB,
  StreamTape,
  StreamWish,
  VidCloud,
  VidMoly,
  VizCloud,
  VidHide,
  Voe,
  MegaUp,
} from '../extractors';

/**
 * Configuration options for creating a provider context
 */
export interface ProviderContextConfig {
  /**
   * Custom axios instance (optional) - if not provided, a default one is created
   */
  axios?: any;

  /**
   * Custom cheerio load function (optional) - defaults to cheerio.load
   */
  load?: (html: string) => any;

  /**
   * Custom user agent (optional) - defaults to a standard browser user agent
   */
  userAgent?: string;

  /**
   * Custom extractors (optional) - defaults to dynamic extractors
   */
  extractors?: any;

  /**
   * Custom logger (optional) - defaults to console
   */
  logger?: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };

  /**
   * Custom AnimeParser base class (optional) - for advanced use cases
   */
  AnimeParser?: typeof AnimeParser;

  /**
   * Custom MovieParser base class (optional) - for advanced use cases
   */
  MovieParser?: typeof MovieParser;

  /**
   * Custom MangaParser base class (optional) - for advanced use cases
   */
  MangaParser?: typeof MangaParser;
}

/**
 * Creates a provider context with sensible defaults for extensions
 *
 * @param config Optional configuration to override defaults
 * @returns Complete ProviderContext ready for use with extensions
 */
export function createProviderContext(config: ProviderContextConfig = {}): ProviderContext {
  // Default axios instance with optimized settings for scraping
  const defaultAxios = axios.create({
    timeout: 15000,
    headers: {
      'User-Agent':
        config.userAgent ||
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
    load: config.load || load,
    USER_AGENT:
      config.userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    logger: config.logger || defaultLogger,
  };

  // Default static extractors (for backward compatibility)
  const defaultStaticExtractors = {
    AsianLoad: AsianLoad,
    Filemoon: Filemoon,
    GogoCDN: GogoCDN,
    Kwik: Kwik,
    MixDrop: MixDrop,
    Mp4Player: Mp4Player,
    Mp4Upload: Mp4Upload,
    RapidCloud: RapidCloud,
    MegaCloud: (ctx?: any) => MegaCloud(ctx || extractorContext),
    StreamHub: StreamHub,
    StreamLare: StreamLare,
    StreamSB: StreamSB,
    StreamTape: StreamTape,
    StreamWish: StreamWish,
    VidCloud: (ctx?: any) => VidCloud(ctx || extractorContext),
    VidMoly: VidMoly,
    VizCloud: VizCloud,
    VidHide: VidHide,
    Voe: Voe,
    MegaUp: MegaUp,
  };


  // Create dynamic extractor proxy
  const finalExtractors = new Proxy(defaultStaticExtractors, {
    get: (target: any, prop: string) => {
      // If it's a custom extractor, return it directly
      if (config.extractors && config.extractors[prop]) {
        return config.extractors[prop];
      }

      // If it's a static extractor, return it directly for immediate access
      if (target[prop]) {
        return target[prop];
      }

      // For dynamic extractors, return an async loader
      return async (...args: any[]) => {
        try {
          // Dynamically import and create ExtractorManager to avoid circular dependency
          const { ExtractorManager } = await import('./ExtractorManager');
          const extractorManager = new ExtractorManager({
            axios: config.axios || extractorContext.axios,
            load: config.load || extractorContext.load,
            userAgent: config.userAgent || extractorContext.USER_AGENT,
            logger: config.logger || extractorContext.logger,
          });
          const extractor = await extractorManager.loadExtractor(prop.toLowerCase());
          return typeof extractor === 'function' ? extractor(...args) : extractor;
        } catch (error) {
          console.warn(`⚠️ Failed to load dynamic extractor '${prop}', falling back to static:`, error);
          // Fallback to static if available
          if (target[prop]) {
            return target[prop](...args);
          }
          throw new Error(`Extractor '${prop}' not found in dynamic or static extractors`);
        }
      };
    },
  });

  // Create base URL normalization utility
  const createCustomBaseUrl = (defaultUrl: string, customUrl?: string): string => {
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
    axios: config.axios || defaultAxios,
    load: config.load || load,
    USER_AGENT:
      config.userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    AnimeParser: config.AnimeParser || AnimeParser,
    MovieParser: config.MovieParser || MovieParser,
    MangaParser: config.MangaParser || MangaParser,
    extractors: finalExtractors,
    logger: config.logger || defaultLogger,
    createCustomBaseUrl,
    enums: {
      StreamingServers,
      MediaFormat,
      MediaStatus,
      SubOrSub,
      WatchListType,
      TvType,
      Genres,
      Topics,
    },
  };
}

export default createProviderContext;
