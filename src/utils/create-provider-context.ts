import {
  AnimeParser,
  MovieParser,
  MangaParser,
  extensionEnums,
  type ExtractorFactory,
  type ProviderContext,
} from '../models';
import { createExtractorContext, defaultExtractors, type ExtractorContextConfig } from './create-extractor-context';
import type { ExtractorManager } from './ExtractorManager';

export interface ProviderContextConfig extends ExtractorContextConfig {
  /** Extractors to use instead of the bundled and registry ones, by name. */
  extractors?: Record<string, ExtractorFactory>;
  /**
   * Supplies registry versions of extractors: `ctx.extractors.X` runs X's hash-verified registry
   * version when the manager's registry lists X, falling back to the bundled X.
   */
  extractorManager?: ExtractorManager;
}

const createCustomBaseUrl = (defaultUrl: string, customUrl?: string): string => {
  if (!customUrl) return defaultUrl;
  return /^https?:\/\//.test(customUrl) ? customUrl : `http://${customUrl}`;
};

export function createProviderContext(config: ProviderContextConfig = {}): ProviderContext {
  const { extractorManager } = config;
  const bundled = defaultExtractors as unknown as Record<string, ExtractorFactory | undefined>;

  // The manager falls back to the bundled version itself when the registry one can't be used.
  const registryBacked =
    (name: string): ExtractorFactory =>
    (callerCtx) => ({
      extract: async (videoUrl, ...args) =>
        (await extractorManager!.loadExtractorFactory(name))(callerCtx ?? ctx).extract(videoUrl, ...args),
    });

  const missing =
    (name: string): ExtractorFactory =>
    () => ({
      extract: async () => {
        throw new Error(`Extractor '${name}' not found in the registry or the bundled extractors`);
      },
    });

  const extractors = new Proxy(bundled, {
    get: (target, prop) => {
      if (typeof prop !== 'string') return Reflect.get(target, prop);
      const custom = config.extractors?.[prop];
      if (custom) return custom;
      const own = target[prop];
      if (extractorManager?.getExtractorMetadata(prop)) return registryBacked(prop);
      if (own) return ((callerCtx) => own(callerCtx ?? ctx)) as ExtractorFactory;
      return missing(prop);
    },
  }) as unknown as ProviderContext['extractors'];

  const ctx: ProviderContext = {
    ...createExtractorContext(config),
    AnimeParser,
    MovieParser,
    MangaParser,
    extractors,
    createCustomBaseUrl,
    enums: extensionEnums,
  };
  return ctx;
}
