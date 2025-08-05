import axios from 'axios';
import { load } from 'cheerio';
import type { ProviderContext } from '../models/provider-context';
import { AnimeParser, MovieParser } from '../models';

// Import extractors
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
   * Custom extractors (optional) - defaults to built-in extractors
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

  // Default extractors - all the important ones pre-configured
  const defaultExtractors = {
    AsianLoad: AsianLoad,
    Filemoon: Filemoon,
    GogoCDN: GogoCDN,
    Kwik: Kwik,
    MixDrop: MixDrop,
    Mp4Player: Mp4Player,
    Mp4Upload: Mp4Upload,
    RapidCloud: RapidCloud,
    MegaCloud: MegaCloud,
    StreamHub: StreamHub,
    StreamLare: StreamLare,
    StreamSB: StreamSB,
    StreamTape: StreamTape,
    StreamWish: StreamWish,
    VidCloud: VidCloud,
    VidMoly: VidMoly,
    VizCloud: VizCloud,
    VidHide: VidHide,
    Voe: Voe,
    MegaUp: MegaUp,
  };

  // Default logger
  const defaultLogger = {
    log: console.log,
    error: console.error,
  };

  return {
    axios: config.axios || defaultAxios,
    load: config.load || load,
    USER_AGENT:
      config.userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    AnimeParser: config.AnimeParser || AnimeParser,
    MovieParser: config.MovieParser || MovieParser,
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
export function createReactNativeProviderContext(config: ProviderContextConfig = {}): ProviderContext {
  // React Native specific axios configuration
  const reactNativeAxios = axios.create({
    timeout: 30000, // Longer timeout for mobile networks
    headers: {
      'User-Agent':
        config.userAgent ||
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
    userAgent:
      config.userAgent ||
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
  });
}

/**
 * Quick helper to create a context with just custom axios
 */
export function createProviderContextWithAxios(axiosInstance: any): ProviderContext {
  return createProviderContext({ axios: axiosInstance });
}

export default createProviderContext;
