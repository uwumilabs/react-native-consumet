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
  VidCloud,
  VidMoly,
  VizCloud,
  VidHide,
  Voe,
  MegaUp,
} from '../extractors';
import { load } from 'cheerio';
import { USER_AGENT } from './utils';
import type { ExtractorContext } from '../models';
import { getSources } from '../extractors/megacloud/megacloud.getsrcs';

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
export const extractorContext: ExtractorContext = {
  axios: defaultAxios,
  load: load,
  USER_AGENT: USER_AGENT,
  sharedUtils: {
    getSources,
  },
};

// Default static extractors (for backward compatibility)
export const defaultStaticExtractors = {
  AsianLoad: AsianLoad,
  Filemoon: Filemoon,
  GogoCDN: GogoCDN,
  Kwik: Kwik,
  MixDrop: MixDrop,
  Mp4Player: Mp4Player,
  Mp4Upload: Mp4Upload,
  RapidCloud: RapidCloud,
  MegaCloud: (ctx?: any) => MegaCloud(ctx || extractorContext),
  StreamHub: StreamHub,
  StreamLare: StreamLare,
  StreamSB: StreamSB,
  StreamTape: StreamTape,
  StreamWish: StreamWish,
  VidCloud: (ctx?: any) => VidCloud(ctx || extractorContext),
  VidMoly: VidMoly,
  VizCloud: VizCloud,
  VidHide: VidHide,
  Voe: Voe,
  MegaUp: MegaUp,
};
