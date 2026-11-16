import { createProviderContext, type ProviderContextConfig } from './create-provider-context';
import { ExtractorManager } from './ExtractorManager';
import {
  AnimeParser,
  LightNovelParser,
  MangaParser,
  MovieParser,
  type IAnimeProvider,
  type IAnimeResult,
  type IMovieProvider,
  type IMovieResult,
  type ISearch,
  type ProviderContext,
} from '../models';
import type {
  BundledRegistry,
  ExtensionManifest,
  ExtensionRegistryData,
  ProviderType,
} from '../models/extension-manifest';
import { IntegrityError, type ExecuteCodeOptions, type IntegrityOptions } from './extension-integrity';
import { CompiledCodeCache, deleteEntriesOf, extensionGlobals, fetchEntryCode, memoiseLoad } from './extension-modules';
import { assertCompatibleEntry, validateRegistry } from './registry-schema';

export interface ProviderLoadOptions {
  /** Base URL for the provider; defaults to the registry entry's `baseUrl` (so domain moves are registry-only). */
  baseUrl?: string;
}

type MethodsOf<T> = { [K in keyof T]-?: T[K] extends (...args: any[]) => any ? K : never }[keyof T];
type MethodList<T> = readonly MethodsOf<T>[];

/**
 * Methods a provider must have, by category; loading a provider without one of them throws. Each
 * list names methods of the category's base parser (or, for meta, what anime and movie meta
 * providers share), so a renamed method fails to compile here.
 */
export const REQUIRED_PROVIDER_METHODS = {
  'anime': [
    'search',
    'fetchAnimeInfo',
    'fetchEpisodeSources',
    'fetchEpisodeServers',
  ] satisfies MethodList<IAnimeProvider>,
  'movies': [
    'search',
    'fetchMediaInfo',
    'fetchEpisodeSources',
    'fetchEpisodeServers',
  ] satisfies MethodList<IMovieProvider>,
  'manga': ['search', 'fetchMangaInfo', 'fetchChapterPages'] satisfies MethodList<MangaParser>,
  'light-novels': ['search', 'fetchLightNovelInfo', 'fetchChapterContent'] satisfies MethodList<LightNovelParser>,
  'meta': ['search', 'fetchEpisodeSources', 'fetchEpisodeServers'] satisfies MethodList<
    IAnimeProvider & IMovieProvider
  >,
} as const satisfies Record<ProviderType, readonly string[]>;

/** How errors name a category ("is not an anime provider"), and the base parser its providers are instances of. */
const CATEGORIES: Record<ProviderType, { article: string; base?: abstract new () => object }> = {
  'anime': { article: 'an anime', base: AnimeParser },
  'movies': { article: 'a movie', base: MovieParser },
  'manga': { article: 'a manga', base: MangaParser },
  'light-novels': { article: 'a light novel', base: LightNovelParser },
  'meta': { article: 'a meta' },
};

/** Registry ids of the providers in the bundled registry (test/unit/provider-manager.test.ts checks the lists). */
export type KnownAnimeProviderId = 'animepahe' | 'anikoto' | 'anineko';
export type KnownMovieProviderId = 'vegamovies' | 'netflixmirror' | 'primemirror' | 'disneymirror';

/** Any registry id; known ids autocomplete, and providers added to a registry later still type-check. */
export type AnimeProviderId = KnownAnimeProviderId | (string & {});
export type MovieProviderId = KnownMovieProviderId | (string & {});

/** The provider type for an id: anime or movie when the id says so, otherwise either. */
export type ProviderInstanceOf<T> = T extends KnownAnimeProviderId
  ? IAnimeProvider
  : T extends KnownMovieProviderId
    ? IMovieProvider
    : IAnimeProvider | IMovieProvider;

/** What `getProvider(category, id)` returns: the anime or movie provider type, or the category's required methods. */
export type ProviderOfCategory<C extends ProviderType> = C extends 'anime'
  ? IAnimeProvider
  : C extends 'movies'
    ? IMovieProvider
    : { readonly name: string } & {
        [M in (typeof REQUIRED_PROVIDER_METHODS)[C][number]]: (...args: any[]) => Promise<any>;
      };

export class ProviderManager {
  private providerContext: ProviderContext;
  private extractorManager: ExtractorManager;
  // Loads by `${id}|${sha256}|${baseUrl}`, see loadExtension
  private loads = new Map<string, Promise<any>>();
  private compiled: CompiledCodeCache;
  private extensions: ExtensionManifest[];
  // Entries by lowercased id, and by lowercased name where no id is the same
  private byKey = new Map<string, ExtensionManifest>();

  /**
   * @throws RegistryError if the registry is invalid or uses a newer schema than this library reads
   */
  constructor(
    registry: ExtensionRegistryData | BundledRegistry,
    providerConfig: ProviderContextConfig = {},
    integrityOptions: IntegrityOptions = {}
  ) {
    const validRegistry = validateRegistry(registry);
    this.compiled = new CompiledCodeCache(integrityOptions);
    // One extractor manager for every provider this manager loads, built from the same registry,
    // so providers run the registry (hash-verified) versions of their extractors.
    this.extractorManager =
      providerConfig.extractorManager ?? new ExtractorManager(validRegistry, providerConfig, integrityOptions);
    this.providerContext = createProviderContext({ ...providerConfig, extractorManager: this.extractorManager });
    this.extensions = validRegistry.extensions.map((extension) => ({ ...extension }));
    for (const extension of this.extensions) this.byKey.set(extension.id.toLowerCase(), extension);
    for (const extension of this.extensions) {
      const name = String(extension.name ?? '').toLowerCase();
      if (name && !this.byKey.has(name)) this.byKey.set(name, extension);
    }
  }

  /**
   * Get all available extensions, including any that need a newer extension context
   * (see `isCompatibleEntry`); loading those throws a RegistryError.
   */
  getAvailableExtensions(): ExtensionManifest[] {
    return [...this.extensions];
  }

  getExtensionsByCategory(category: ProviderType): ExtensionManifest[] {
    return this.extensions.filter((ext) => ext.category === category);
  }

  /** The registry entry for an id or name, case-insensitive ('zoro' or 'Zoro'). */
  getExtensionMetadata(extensionId: string): ExtensionManifest {
    if (!extensionId) throw new Error('Extension id/name is required');
    const manifest = this.byKey.get(extensionId.toLowerCase());
    if (!manifest) throw new Error(`Extension '${extensionId}' not found in extensionManifest`);
    return manifest;
  }

  /**
   * Load an extension by id or name. Concurrent and later calls for the same extension and base URL
   * share one load; a failed load is retried on the next call.
   */
  async loadExtension<T extends string>(
    extensionId: T,
    options: ProviderLoadOptions = {}
  ): Promise<ProviderInstanceOf<T>> {
    const metadata = this.getExtensionMetadata(extensionId);
    // Refuse entries that need a newer extension context before downloading their code.
    assertCompatibleEntry(metadata);

    // Keyed on the hash, so a new version is loaded again, and on the base URL override, which
    // builds a different instance.
    const key = `${metadata.id.toLowerCase()}|${metadata.sha256 ?? ''}|${options.baseUrl ?? ''}`;
    return memoiseLoad(this.loads, key, async () =>
      this.executeProviderCode(await fetchEntryCode('provider', metadata.main), metadata, options)
    );
  }

  /**
   * Forget a loaded extension (for every base URL) and its compiled code, so the next load
   * fetches and runs it again. Extractors have their own: `getExtractorManager().invalidate(name)`.
   */
  invalidate(extensionId: string): void {
    const id = (this.byKey.get(extensionId.toLowerCase())?.id ?? extensionId).toLowerCase();
    deleteEntriesOf(this.loads, id);
    this.compiled.forget(id);
  }

  /**
   * Run an entry's provider code and build the provider with this manager's context. The code must
   * match `metadata.sha256` unless `options.skipIntegrity` is set. Verified code is compiled once per
   * id and sha256; each call returns a new instance, an instance of its category's base parser.
   *
   * @throws RegistryError before running anything if the entry needs a newer extension context
   * @throws IntegrityError before running anything if the hash or factory name is invalid
   */
  public async executeProviderCode<T extends string>(
    code: string,
    metadata: ExtensionManifest & { id: T },
    options: ExecuteCodeOptions & ProviderLoadOptions = {}
  ): Promise<ProviderInstanceOf<T>> {
    const id = String(metadata?.id ?? metadata?.factoryName);
    assertCompatibleEntry(metadata);
    try {
      const factory = this.compiled.compile(`${id.toLowerCase()}|${metadata.factoryName}`, {
        kind: 'provider',
        id,
        name: metadata.factoryName,
        code,
        entry: metadata,
        globals: () => extensionGlobals('provider', id, this.providerContext),
        skipIntegrity: options.skipIntegrity,
      });
      const instance = factory(this.providerContext, options.baseUrl ?? metadata.baseUrl);
      this.assertProviderOf(instance, metadata.category);
      const base = CATEGORIES[metadata.category].base;
      if (base && !(instance instanceof base)) Object.setPrototypeOf(instance, base.prototype);
      return instance;
    } catch (error) {
      if (error instanceof IntegrityError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to execute provider code: ${message}`, { cause: error });
    }
  }

  /** Throws unless the instance has the methods its category requires (REQUIRED_PROVIDER_METHODS). */
  private assertProviderOf(instance: any, category: ProviderType): void {
    const requiredMethods = (REQUIRED_PROVIDER_METHODS as Record<string, readonly string[] | undefined>)[category];
    if (!requiredMethods) {
      throw new Error(`Unknown provider category '${category}'`);
    }
    const missing = requiredMethods.filter((method) => typeof instance?.[method] !== 'function');
    if (missing.length) {
      const methods = missing.length === 1 ? 'method' : 'methods';
      throw new Error(`Provider is missing required ${category} ${methods}: ${missing.join(', ')}`);
    }
  }

  /**
   * Get a provider of a category, e.g. `getProvider('manga', 'mangadex')`
   *
   * @throws if the extension's registry entry is of another category
   */
  async getProvider<C extends ProviderType>(
    category: C,
    extensionId: string,
    options: ProviderLoadOptions = {}
  ): Promise<ProviderOfCategory<C>> {
    const metadata = this.getExtensionMetadata(extensionId);
    if (metadata.category !== category) {
      throw new Error(`Extension '${extensionId}' is not ${CATEGORIES[category]?.article ?? `a ${category}`} provider`);
    }
    // Loading checks the category's methods.
    return (await this.loadExtension(extensionId, options)) as unknown as ProviderOfCategory<C>;
  }

  async getAnimeProvider(extensionId: AnimeProviderId, options: ProviderLoadOptions = {}): Promise<IAnimeProvider> {
    return this.getProvider('anime', extensionId, options);
  }

  async getMovieProvider(extensionId: MovieProviderId, options: ProviderLoadOptions = {}): Promise<IMovieProvider> {
    return this.getProvider('movies', extensionId, options);
  }

  /** The extractor manager shared by the providers this manager loads */
  getExtractorManager(): ExtractorManager {
    return this.extractorManager;
  }

  getProviderContext(): ProviderContext {
    return this.providerContext;
  }

  /**
   * Search every provider of a category. A provider that fails to load or search gives an empty page
   * and its `error`, so one broken provider doesn't hide the others' results.
   */
  async searchAcrossProviders(
    category: ProviderType,
    query: string,
    page?: number
  ): Promise<Array<{ extensionId: string; results: ISearch<IAnimeResult | IMovieResult>; error?: unknown }>> {
    return Promise.all(
      this.getExtensionsByCategory(category).map(async (ext) => {
        try {
          const provider = await this.loadExtension(ext.id);
          const results = (await provider.search(query, page)) as ISearch<IAnimeResult | IMovieResult>;
          return { extensionId: ext.id, results };
        } catch (error) {
          return { extensionId: ext.id, results: { currentPage: page || 1, hasNextPage: false, results: [] }, error };
        }
      })
    );
  }
}

export default ProviderManager;
