import type { AxiosInstance } from 'axios';
import type { CheerioAPI } from 'cheerio';
import type AnimeParser from './anime-parser';
import type MovieParser from './movie-parser';
import type { ExtractorContext } from './extractor-context';
import type MangaParser from './manga-parser';
import { StreamingServers, MediaFormat, MediaStatus, SubOrSub, WatchListType, TvType, Genres, Topics } from './types';
import type { ExtractorManager } from '../utils';
/**
 * Extractor registry type based on your registered extractors
 */
export interface ExtractorRegistry {
  AsianLoad: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL, isAlt?: boolean) => Promise<any>;
  };
  Filemoon: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  GogoCDN: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  Kwik: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  MixDrop: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  Mp4Player: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  Mp4Upload: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  RapidCloud: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL, referer?: string) => Promise<any>;
  };
  MegaCloud: (ctx?: ExtractorContext) => {
    extract: (url: URL, referer?: string) => Promise<any>;
  };
  StreamHub: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  StreamLare: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  StreamSB: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL, isAlt?: boolean) => Promise<any>;
  };
  StreamTape?: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  StreamWish: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  VidCloud: (ctx?: ExtractorContext) => {
    extract: (url: URL, referer?: string) => Promise<any>;
  };
  VidMoly: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  VizCloud: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  VidHide: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  Voe: new (
    proxyConfig?: any,
    adapter?: any
  ) => {
    extract: (url: URL) => Promise<any>;
  };
  MegaUp: new (ctx: ExtractorContext) => {
    extract: (url: URL) => Promise<any>;
  };
}

export type ProviderConfig = {
  name: string;
  languages: string[] | string;
  classPath: string;
  baseUrl: string;
  isNSFW: boolean;
  logo: string;
  isWorking?: boolean;
  isDubAvailableSeparately?: boolean;
};

/**
 * ProviderContext:
 * Passed into each provider factory function. Gives full access to platform-wide utils and extractors.
 */
export interface ProviderContext {
  axios: AxiosInstance;
  load: (html: string) => CheerioAPI;
  USER_AGENT: string;
  AnimeParser: typeof AnimeParser;
  MovieParser: typeof MovieParser;
  MangaParser: typeof MangaParser;
  extractors: ExtractorRegistry;
  extractorManager?: ExtractorManager;
  // Utility function to create normalized base URL
  createCustomBaseUrl: (defaultUrl: string, customUrl?: string) => string;
  // Enums included directly in context to avoid require statements in bundled providers
  enums: {
    StreamingServers: typeof StreamingServers;
    MediaFormat: typeof MediaFormat;
    MediaStatus: typeof MediaStatus;
    SubOrSub: typeof SubOrSub;
    WatchListType: typeof WatchListType;
    TvType: typeof TvType;
    Genres: typeof Genres;
    Topics: typeof Topics;
  };
}
