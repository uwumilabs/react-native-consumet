import type { AxiosInstance } from 'axios';
import type { CheerioAPI } from 'cheerio';
import type CryptoJS from 'crypto-js';
import type { NativeMethods } from '../NativeConsumet';
import type { PolyURL, PolyURLSearchParams } from '../utils/url-polyfill';

/**
 * What every extractor runs with: the app's HTTP client and user agent, and the libraries extension
 * code can't import (registry bundles only `require` what the runtime provides).
 */
export interface ExtractorContext {
  axios: AxiosInstance;
  load: (html: string) => CheerioAPI;
  CryptoJS: typeof CryptoJS;
  USER_AGENT: string;
  PolyURL: typeof PolyURL;
  PolyURLSearchParams: typeof PolyURLSearchParams;
  NativeConsumet: NativeMethods;
}
