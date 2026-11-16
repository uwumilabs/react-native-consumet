import axios, { type AxiosInstance } from 'axios';
import { load, type CheerioAPI } from 'cheerio';
import CryptoJS from 'crypto-js';
import type { ExtractorContext } from '../models';
import * as BundledExtractors from '../extractors';
import { nativeMethods } from '../NativeConsumet';
import { USER_AGENT } from './constants';
import { PolyURL, PolyURLSearchParams } from './url-polyfill';

export interface ExtractorContextConfig {
  /** HTTP client for every request; defaults to `defaultAxios` */
  axios?: AxiosInstance;
  /** Defaults to cheerio's `load` */
  load?: (html: string) => CheerioAPI;
  /** `USER_AGENT` of the context; defaults to the library's. Doesn't change the headers of `axios`. */
  userAgent?: string;
}

/** The HTTP client contexts use unless the app passes its own: a 15 s timeout and browser-like headers. */
export const defaultAxios = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});

export function createExtractorContext(config: ExtractorContextConfig = {}): ExtractorContext {
  return {
    axios: config.axios || defaultAxios,
    load: config.load || load,
    CryptoJS,
    USER_AGENT: config.userAgent || USER_AGENT,
    PolyURL,
    PolyURLSearchParams,
    NativeConsumet: nativeMethods,
  };
}

/** The extractors the library bundles, by name. */
export const defaultExtractors: typeof BundledExtractors = { ...BundledExtractors };

/** `createExtractorContext()`: the library's axios, cheerio and user agent. */
export const defaultExtractorContext: ExtractorContext = createExtractorContext();
