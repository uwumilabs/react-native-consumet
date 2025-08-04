import type { AxiosInstance, AxiosStatic } from 'axios';
import type { CheerioAPI } from 'cheerio';
import type AnimeParser from './anime-parser';
import type MovieParser from './movie-parser';
import type { ExtractorContext } from './extractor-context';
/**
 * Extractor registry type based on your registered extractors
 */
export interface ExtractorRegistry {
  StreamSB: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL, isAlt?: boolean) => Promise<any>;
  };
  MegaCloud: new (ctx: ExtractorContext) => {
    extract: (url: URL, referer?: string) => Promise<any>;
  };
  StreamTape?: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  // Add more as needed
}

/**
 * ProviderContext:
 * Passed into each provider factory function. Gives full access to platform-wide utils and extractors.
 */
export interface ProviderContext {
  axios: AxiosInstance;
  load: (html: string) => CheerioAPI;
  USER_AGENT: string;
  AnimeParser: typeof AnimeParser | typeof MovieParser;
  extractors: ExtractorRegistry;
  logger?: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
}
