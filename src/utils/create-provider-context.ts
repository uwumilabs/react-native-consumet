import axios from 'axios';
import { load } from 'cheerio';
import type { ProviderContext } from '../models/provider-context';
import { AnimeParser, MovieParser, MangaParser } from '../models';

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
    MangaParser: config.MangaParser || MangaParser,
    extractors: { ...defaultExtractors, ...config.extractors },
    logger: config.logger || defaultLogger,
  };
}


export default createProviderContext;
