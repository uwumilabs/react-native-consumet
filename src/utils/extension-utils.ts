import axios from 'axios';
import CryptoJS from 'crypto-js';

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
  MegaPlay,
  GDFlix,
  Gofile,
  HubCloud,
  FlixCloud,
} from '../extractors';
import { load } from 'cheerio';
import { USER_AGENT } from './utils';
import type { ExtractorContext } from '../models';
import { PolyURL, PolyURLSearchParams } from './url-polyfill';
import {
  getDdosGuardCookiesWithWebView,
  makeGetRequestWithWebView,
  makePostRequestWithWebView,
  makePostRequest,
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
  CryptoJS,
  USER_AGENT: USER_AGENT,
  PolyURL: PolyURL,
  PolyURLSearchParams: PolyURLSearchParams,
  NativeConsumet: {
    getDdosGuardCookiesWithWebView,
    makeGetRequestWithWebView,
    makePostRequestWithWebView,
    makePostRequest,
    bypassDdosGuard,
    deobfuscateScript,
  },
};

// Default static extractors (for backward compatibility). The class-based extractors default to
// defaultExtractorContext, so they import this module while it imports them. Getters read each class
// when it's used, after both modules have loaded, whichever of them loaded first.
export const defaultExtractors = {
  get AsianLoad() {
    return AsianLoad;
  },
  get Filemoon() {
    return Filemoon;
  },
  get GogoCDN() {
    return GogoCDN;
  },
  Kwik: (ctx: ExtractorContext) => Kwik(ctx || defaultExtractorContext),
  get MixDrop() {
    return MixDrop;
  },
  get Mp4Player() {
    return Mp4Player;
  },
  get Mp4Upload() {
    return Mp4Upload;
  },
  get RapidCloud() {
    return RapidCloud;
  },
  MegaCloud: (ctx: ExtractorContext) => MegaCloud(ctx || defaultExtractorContext),
  get StreamHub() {
    return StreamHub;
  },
  get StreamLare() {
    return StreamLare;
  },
  get StreamSB() {
    return StreamSB;
  },
  get StreamTape() {
    return StreamTape;
  },
  StreamWish: (ctx?: ExtractorContext) => StreamWish(ctx || defaultExtractorContext),
  get VidMoly() {
    return VidMoly;
  },
  get VizCloud() {
    return VizCloud;
  },
  VidHide: (ctx?: ExtractorContext) => VidHide(ctx || defaultExtractorContext),
  get Voe() {
    return Voe;
  },
  MegaUp: (ctx?: ExtractorContext) => MegaUp(ctx || defaultExtractorContext),
  MegaPlay: (ctx?: ExtractorContext) => MegaPlay(ctx || defaultExtractorContext),
  GDFlix: (ctx?: ExtractorContext) => GDFlix(ctx || defaultExtractorContext),
  Gofile: (ctx?: ExtractorContext) => Gofile(ctx || defaultExtractorContext),
  HubCloud: (ctx?: ExtractorContext) => HubCloud(ctx || defaultExtractorContext),
  FlixCloud: (ctx?: ExtractorContext) => FlixCloud(ctx || defaultExtractorContext),
};
