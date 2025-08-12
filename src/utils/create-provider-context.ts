import { load } from 'cheerio';
import type { ProviderContext, ProviderContextConfig } from '../models/provider-context';
import {
  AnimeParser,
  MovieParser,
  MangaParser,
  StreamingServers,
  MediaFormat,
  MediaStatus,
  SubOrDub,
  WatchListType,
  TvType,
  Genres,
  Topics,
} from '../models';

import { defaultAxios, defaultStaticExtractors, defaultExtractorContext } from './extension-utils';
import { PolyURL, PolyURLSearchParams } from './url-polyfill';

/**
 * Creates a provider context with sensible defaults for extensions
 *
 * @param config Optional configuration to override defaults
 * @returns Complete ProviderContext ready for use with extensions
 */
export function createProviderContext(config: ProviderContextConfig = {}): ProviderContext {
  // Create dynamic extractor proxy
  const finalExtractors = new Proxy(defaultStaticExtractors, {
    get: (target: any, prop: string) => {
      // If it's a custom extractor, return it directly
      if (config.extractors && config.extractors[prop]) {
        return config.extractors[prop];
      }

      // If it's a static extractor, return it directly for immediate access
      if (target[prop]) {
        return target[prop];
      }

      // For dynamic extractors, return an async loader
      return async (...args: any[]) => {
        try {
          // Dynamically import and create ExtractorManager to avoid circular dependency
          const { ExtractorManager } = await import('./ExtractorManager');
          const extractorManager = new ExtractorManager({
            axios: config.axios || defaultExtractorContext.axios,
            load: config.load || defaultExtractorContext.load,
            userAgent: config.userAgent || defaultExtractorContext.USER_AGENT,
          });
          const extractor = await extractorManager.loadExtractor(prop.toLowerCase() as StreamingServers);
          return typeof extractor === 'function' ? extractor(...args) : extractor;
        } catch (error) {
          console.warn(`⚠️ Failed to load dynamic extractor '${prop}', falling back to static:`, error);
          // Fallback to static if available
          if (target[prop]) {
            return target[prop](...args);
          }
          throw new Error(`Extractor '${prop}' not found in dynamic or static extractors`);
        }
      };
    },
  });

  // Create base URL normalization utility
  const createCustomBaseUrl = (defaultUrl: string, customUrl?: string): string => {
    if (!customUrl) {
      return defaultUrl;
    }

    if (customUrl.startsWith('http://') || customUrl.startsWith('https://')) {
      return customUrl;
    } else {
      return `http://${customUrl}`;
    }
  };

  return {
    axios: config.axios || defaultAxios,
    load: config.load || load,
    USER_AGENT:
      config.userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    AnimeParser: config.AnimeParser || AnimeParser,
    MovieParser: config.MovieParser || MovieParser,
    MangaParser: config.MangaParser || MangaParser,
    extractors: finalExtractors,
    URL: PolyURL,
    URLSearchParams: PolyURLSearchParams,
    createCustomBaseUrl,
    enums: {
      StreamingServers,
      MediaFormat,
      MediaStatus,
      SubOrDub,
      WatchListType,
      TvType,
      Genres,
      Topics,
    },
  };
}
export default createProviderContext;
