import axios from "axios";
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
   * Optional Logger (can be console or a custom wrapper)
   */
  logger?: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
}
