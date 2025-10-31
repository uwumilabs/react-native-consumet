import axios from 'axios';

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
  VidMoly,
  VizCloud,
  VidHide,
  Voe,
  MegaUp,
} from '../extractors';
import { load } from 'cheerio';
import { USER_AGENT } from './utils';
import type { ExtractorContext } from '../models';
import { PolyURL, PolyURLSearchParams } from './url-polyfill';
import {
  getDdosGuardCookiesWithWebView,
  makeGetRequestWithWebView,
  multiply,
  bypassDdosGuard,
  deobfuscateScript,
} from '../NativeConsumet';
// Default axios instance with optimized settings for scraping
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

// Create extractor context for passing to context-aware extractors
export const defaultExtractorContext: ExtractorContext = {
  axios: defaultAxios,
  load: load,
  USER_AGENT: USER_AGENT,
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

// Default static extractors (for backward compatibility)
export const defaultExtractors = {
  AsianLoad: AsianLoad,
  Filemoon: Filemoon,
  GogoCDN: GogoCDN,
  Kwik: (ctx: ExtractorContext) => Kwik(ctx || defaultExtractorContext),
  MixDrop: MixDrop,
  Mp4Player: Mp4Player,
  Mp4Upload: Mp4Upload,
  RapidCloud: RapidCloud,
  MegaCloud: (ctx: ExtractorContext) => MegaCloud(ctx || defaultExtractorContext),
  StreamHub: StreamHub,
  StreamLare: StreamLare,
  StreamSB: StreamSB,
  StreamTape: StreamTape,
  StreamWish: StreamWish,
  VidMoly: VidMoly,
  VizCloud: VizCloud,
  VidHide: VidHide,
  Voe: Voe,
  MegaUp: (ctx?: ExtractorContext) => MegaUp(ctx || defaultExtractorContext),
};

export const extractors = {
  GogoCDN: defaultExtractors.GogoCDN,
  StreamSB: defaultExtractors.StreamSB,
  StreamTape: defaultExtractors.StreamTape,
  MixDrop: defaultExtractors.MixDrop,
  Kwik: defaultExtractors.Kwik,
  RapidCloud: defaultExtractors.RapidCloud,
  StreamWish: defaultExtractors.StreamWish,
  Filemoon: defaultExtractors.Filemoon,
  Voe: defaultExtractors.Voe,
  AsianLoad: defaultExtractors.AsianLoad,
  StreamLare: defaultExtractors.StreamLare,
  VidMoly: defaultExtractors.VidMoly,
  MegaCloud: defaultExtractors.MegaCloud,
};

// Type definitions for provider and extractor instances
export type Extractor = keyof typeof extractors;
