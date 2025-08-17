import axios from 'axios';
import { ANIME, MOVIES, META } from '../providers';

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
};

// Default static extractors (for backward compatibility)
export const defaultStaticExtractors = {
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
  MegaUp: MegaUp,
};

// Define provider and extractor maps
export const animeProviders = {
  Zoro: ANIME.Zoro,
  AnimePahe: ANIME.AnimePahe,
};

export const movieProviders = {
  HiMovies: MOVIES.HiMovies,
  MultiMovies: MOVIES.MultiMovies,
  DramaCool: MOVIES.DramaCool,
  MultiStream: MOVIES.MultiStream,
};

const metaProviders = {
  Anilist: META.Anilist,
  TMDB: META.TMDB,
  MAL: META.Myanimelist,
};

export const extractors = {
  GogoCDN: defaultStaticExtractors.GogoCDN,
  StreamSB: defaultStaticExtractors.StreamSB,
  StreamTape: defaultStaticExtractors.StreamTape,
  MixDrop: defaultStaticExtractors.MixDrop,
  Kwik: defaultStaticExtractors.Kwik,
  RapidCloud: defaultStaticExtractors.RapidCloud,
  StreamWish: defaultStaticExtractors.StreamWish,
  Filemoon: defaultStaticExtractors.Filemoon,
  Voe: defaultStaticExtractors.Voe,
  AsianLoad: defaultStaticExtractors.AsianLoad,
  StreamLare: defaultStaticExtractors.StreamLare,
  VidMoly: defaultStaticExtractors.VidMoly,
  MegaCloud: defaultStaticExtractors.MegaCloud,
};

// Type definitions for provider and extractor instances
export type AnimeProvider = keyof typeof animeProviders;
export type MovieProvider = keyof typeof movieProviders;
export type MetaProvider = keyof typeof metaProviders;
export type Extractor = keyof typeof extractors;
