import { load } from 'cheerio';
import type { ExtractorContext } from '../models';
import { defaultAxios } from './extension-utils';
import { PolyURL, PolyURLSearchParams } from './url-polyfill';
import type { ExtractorContextConfig } from '../models/extractor-context';
import {
  bypassDdosGuard,
  getDdosGuardCookiesWithWebView,
  makeGetRequestWithWebView,
  multiply,
  deobfuscateScript,
} from '../NativeConsumet';

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
    PolyURL: PolyURL,
    PolyURLSearchParams: PolyURLSearchParams,
    NativeConsumet: {
      getDdosGuardCookiesWithWebView,
      makeGetRequestWithWebView,
      multiply,
      bypassDdosGuard,
      deobfuscateScript,
    },
  };
}

export default createExtractorContext;
