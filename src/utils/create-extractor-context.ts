import { load } from 'cheerio';
import type { ExtractorContext } from '../models';
import { defaultAxios } from './extension-utils';
import { PolyURL, PolyURLSearchParams } from './url-polyfill';
/**
 * Configuration options for creating a provider context
 */
export interface ExtractorContextConfig {
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
}

/**
 * Create extractor context for context-aware extractors
 */
export function createExtractorContext(config: ExtractorContextConfig = {}): ExtractorContext {
  return {
    axios: config.axios || defaultAxios,
    load: config.load || load,
    USER_AGENT:
      config.userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    URL: PolyURL,
    URLSearchParams: PolyURLSearchParams,
  };
}
