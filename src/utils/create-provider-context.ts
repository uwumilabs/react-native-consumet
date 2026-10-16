import { load } from 'cheerio';
import CryptoJS from 'crypto-js';
import type { ProviderContext, ProviderContextConfig } from '../models/provider-context';
import type { ExtractorContext, IVideoExtractor } from '../models';
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

import { defaultAxios, defaultExtractors } from './extension-utils';
import { PolyURL, PolyURLSearchParams } from './url-polyfill';
import {
  getDdosGuardCookiesWithWebView,
  makeGetRequestWithWebView,
  makePostRequestWithWebView,
  makePostRequest,
  multiply,
  bypassDdosGuard,
  deobfuscateScript,
} from '../NativeConsumet';

/**
 * Creates a provider context with sensible defaults for extensions
 *
 * @param config Optional configuration to override defaults
 * @returns Complete ProviderContext ready for use with extensions
 */
export function createProviderContext(config: ProviderContextConfig = {}): ProviderContext {
  const extractorManager = config.extractorManager;

  // A factory shaped like the bundled ones (`X(ctx).extract(url)`) that runs the registry version of
  // the extractor, verified and cached by the shared manager, falling back to the bundled version.
  const registryBacked =
    (name: string, bundled?: (ctx?: ExtractorContext) => IVideoExtractor) =>
    (callerCtx?: ExtractorContext): IVideoExtractor => ({
      serverName: name,
      sources: [],
      extract: async (...args: any[]) => {
        let extractor: any;
        try {
          extractor = await extractorManager!.loadExtractor(name);
        } catch (error) {
          if (!bundled) throw error;
        }
        // loadExtractor returns the bundled extractor itself when the registry code fails; it throws
        // when the entry can't be used at all (e.g. it needs a newer context), so build it here.
        if (typeof extractor?.extract !== 'function') {
          if (!bundled) throw new Error(`Extractor '${name}' is not available`);
          extractor = bundled(callerCtx);
        }
        return extractor.extract(...(args as [any]));
      },
    });

  const finalExtractors = new Proxy(defaultExtractors, {
    get: (target: any, prop: string | symbol) => {
      if (typeof prop !== 'string') return target[prop];

      // Custom extractors from the config always win
      if (config.extractors && config.extractors[prop]) {
        return config.extractors[prop];
      }

      // Extractors in the app's registry run their registry version
      if (extractorManager?.getExtractorMetadata(prop)) {
        return registryBacked(prop, target[prop]);
      }

      if (target[prop]) {
        return target[prop];
      }

      return (): IVideoExtractor => ({
        serverName: prop,
        sources: [],
        extract: async () => {
          throw new Error(`Extractor '${prop}' not found in the registry or the bundled extractors`);
        },
      });
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
    CryptoJS,
    USER_AGENT:
      config.userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    AnimeParser: config.AnimeParser || AnimeParser,
    MovieParser: config.MovieParser || MovieParser,
    MangaParser: config.MangaParser || MangaParser,
    extractors: finalExtractors,
    extractorManager,
    PolyURL: PolyURL,
    PolyURLSearchParams: PolyURLSearchParams,
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
    NativeConsumet: {
      getDdosGuardCookiesWithWebView,
      makeGetRequestWithWebView,
      makePostRequestWithWebView,
      makePostRequest,
      multiply,
      bypassDdosGuard,
      deobfuscateScript,
    },
  };
}
export default createProviderContext;
