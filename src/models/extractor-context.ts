import type { AxiosStatic } from 'axios';
import type { CheerioAPI } from 'cheerio';

/**
 * ExtractorContext:
 * This context is injected into each extractor to provide core utilities.
 */
export interface ExtractorContext {
  axios: AxiosStatic;
  load: (html: string) => CheerioAPI;
  USER_AGENT?: string;
  /**
   * Shared utilities and code that can be used by extractors
   * This allows extractors to access common functions without requiring individual modules
   */
  sharedUtils?: {
    [key: string]: any;
  };
}
