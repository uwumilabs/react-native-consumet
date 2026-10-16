import createProviderContext from './create-provider-context';
import { ExtractorManager } from './ExtractorManager';
import type { ProviderContext } from '../models/provider-context';
import {
  AnimeParser,
  MovieParser,
  type IAnimeProvider,
  type IAnimeResult,
  type IMovieProvider,
  type IMovieResult,
  type ISearch,
  type ProviderContextConfig,
} from '../models';
import extensionRegistry from '../extension-registry.json';
import type { ExtensionManifest, ExtensionRegistryData, ProviderType } from '../models/extension-manifest';
import {
  animeProviders,
  movieProviders,
  type AnimeProviderId,
  type MovieProviderId,
  type ProviderInstanceOf,
} from './provider-maps';
import {
  assertValidIdentifier,
  verifyExtensionCode,
  type ExecuteCodeOptions,
  type IntegrityOptions,
} from './extension-integrity';
import { createExtensionFetch, fetchTextWithTimeout } from './fetch-with-timeout';
import {
  createExtensionRequire,
  deleteEntriesOf,
  evaluateExtensionCode,
  memoiseLoad,
  MODELS_MODULE,
  UTILS_MODULE,
  type CompiledCode,
} from './extension-modules';
import { assertCompatibleEntry, validateRegistry } from './registry-schema';

export interface ProviderLoadOptions {
  /** Base URL for the provider; defaults to the registry entry's `baseUrl` (so domain moves are registry-only). */
  baseUrl?: string;
}

/**
 * Methods a provider must have, by category; loading a provider without one of them throws.
 * They match the base parsers (AnimeParser, MovieParser, MangaParser, LightNovelParser); meta
 * lists what anime and movie meta providers share.
 */
export const REQUIRED_PROVIDER_METHODS = {
  'anime': ['search', 'fetchAnimeInfo', 'fetchEpisodeSources', 'fetchEpisodeServers'],
  'movies': ['search', 'fetchMediaInfo', 'fetchEpisodeSources', 'fetchEpisodeServers'],
  'manga': ['search', 'fetchMangaInfo', 'fetchChapterPages'],
  'light-novels': ['search', 'fetchLightNovelInfo', 'fetchChapterContent'],
  'meta': ['search', 'fetchEpisodeSources', 'fetchEpisodeServers'],
} as const satisfies Record<ProviderType, readonly string[]>;

/** What `getProvider(category, id)` returns: the anime or movie provider type, or the category's required methods. */
export type ProviderOfCategory<C extends ProviderType> = C extends 'anime'
  ? IAnimeProvider
  : C extends 'movies'
    ? IMovieProvider
    : { readonly name: string } & {
        [M in (typeof REQUIRED_PROVIDER_METHODS)[C][number]]: (...args: any[]) => Promise<any>;
      };

// How errors name a category: "Extension 'x' is not an anime provider"
const CATEGORY_NAMES: Record<ProviderType, string> = {
  'anime': 'an anime',
  'movies': 'a movie',
  'manga': 'a manga',
  'light-novels': 'a light novel',
  'meta': 'a meta',
};

export class ProviderManager {
  private providerContext: ProviderContext;
  private extractorManager: ExtractorManager;
  // Loads by `${id}|${sha256}|${baseUrl}`, see loadExtension
  private loadedExtensions = new Map<string, Promise<any>>();
  // Compiled extension code by `${id}|${factoryName}`
  private compiledExtensions = new Map<string, CompiledCode>();
  private extensionManifest = new Map<string, ExtensionManifest>();
  private integrityOptions: IntegrityOptions;

  /**
   * @throws RegistryError if the registry is invalid or uses a newer schema than this library reads
   */
  constructor(
    registry: ExtensionRegistryData | typeof extensionRegistry,
    providerConfig: ProviderContextConfig = {},
    integrityOptions: IntegrityOptions = {}
  ) {
    const validRegistry = validateRegistry(registry);
    this.integrityOptions = integrityOptions;
    // One extractor manager for every provider this manager loads, built from the same registry,
    // so providers run the registry (hash-verified) versions of their extractors.
    this.extractorManager =
      providerConfig.extractorManager ??
      new ExtractorManager(
        validRegistry,
        { axios: providerConfig.axios, load: providerConfig.load, userAgent: providerConfig.userAgent },
        integrityOptions
      );
    this.providerContext = createProviderContext({ ...providerConfig, extractorManager: this.extractorManager });
    this.loadRegistry(validRegistry.extensions);
  }

  /**
   * Index the validated registry entries by lowercased id, for case-insensitive lookup
   */
  private loadRegistry(extensions: ExtensionManifest[]): void {
    for (const extension of extensions) {
      this.extensionManifest.set(extension.id.toLowerCase(), { ...extension });
    }
  }

  /**
   * Get all available extensions, including any that need a newer extension context
   * (see `isCompatibleEntry`); loading those throws a RegistryError.
   */
  getAvailableExtensions(): ExtensionManifest[] {
    return Array.from(this.extensionManifest.values());
  }

  /**
   * Get extensions by category
   */
  getExtensionsByCategory(category: ProviderType): ExtensionManifest[] {
    return this.getAvailableExtensions().filter((ext) => ext.category === category);
  }

  /**
   * Get extension metadata by ID/ name (case-insensitive) like 'zoro' or 'Zoro'
   */
  getExtensionMetadata(extensionId: string): ExtensionManifest {
    if (!extensionId) throw new Error('Extension id/name is required');

    const manifest = this.findExtensionMetadata(extensionId);
    if (!manifest) throw new Error(`Extension '${extensionId}' not found in extensionManifest`);
    return manifest;
  }

  private findExtensionMetadata(extensionId: string): ExtensionManifest | undefined {
    // Try direct hit (as-is and lowercase id)
    const direct = this.extensionManifest.get(extensionId) || this.extensionManifest.get(extensionId.toLowerCase());
    if (direct) return direct;

    // Fallback: search by id or name, case-insensitive
    const needle = extensionId.toLowerCase();
    for (const [key, manifest] of this.extensionManifest.entries()) {
      if (key.toLowerCase() === needle) return manifest;
      if (manifest.id && String(manifest.id).toLowerCase() === needle) return manifest;
      if (manifest.name && String(manifest.name).toLowerCase() === needle) return manifest;
    }
    return undefined;
  }

  /**
   * Load an extension by ID from the extensionManifest. Concurrent and later calls for the same
   * extension and base URL share one load; a failed load is retried on the next call.
   */
  async loadExtension<T extends string>(
    extensionId: T,
    options: ProviderLoadOptions = {}
  ): Promise<ProviderInstanceOf<T>> {
    const metadata = this.getExtensionMetadata(extensionId as unknown as string);
    // Refuse entries that need a newer extension context before downloading their code.
    assertCompatibleEntry(metadata);

    // Keyed on the hash, so a new version is loaded again, and on the base URL override, which
    // builds a different instance.
    const cacheKey = `${metadata.id.toLowerCase()}|${metadata.sha256 ?? ''}|${options.baseUrl ?? ''}`;
    return memoiseLoad(this.loadedExtensions, cacheKey, () =>
      this.fetchExtension(metadata as ExtensionManifest & { id: T }, options)
    );
  }

  /**
   * Forget a loaded extension (for every base URL) and its compiled code, so the next load
   * fetches and runs it again. Extractors have their own: `getExtractorManager().invalidate(name)`.
   */
  invalidate(extensionId: string): void {
    const id = (this.findExtensionMetadata(extensionId)?.id ?? extensionId).toLowerCase();
    deleteEntriesOf(this.loadedExtensions, id);
    deleteEntriesOf(this.compiledExtensions, id);
  }

  /**
   * Fetch an extension's code from the registry and run it
   */
  private async fetchExtension<T extends string>(
    metadata: ExtensionManifest & { id: T },
    options: ProviderLoadOptions
  ): Promise<ProviderInstanceOf<T>> {
    try {
      //console.log(`📥 Loading extension '${metadata.id}' from ${metadata.main}`);

      const response = await fetchTextWithTimeout(metadata.main, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain, application/javascript, */*',
          'User-Agent': 'React-Native-Consumet/1.0.0',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch extension: ${response.status} ${response.statusText}`);
      }

      // Verifies the code against the registry hash and the factory name, then attaches the prototype
      return await this.executeProviderCode(response.text, metadata.factoryName, metadata, {
        baseUrl: options.baseUrl,
      });
    } catch (error) {
      console.error(`❌ Failed to load extension '${metadata.id}':`, error);
      console.error(`❌ Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        url: metadata.main,
      });
      throw error;
    }
  }

  /**
   * Attach the correct prototype to the loaded provider instance so runtime instanceof checks pass
   * and developer tooling understands the shape better.
   */
  private attachProviderPrototype<T extends object>(instance: T, providerKey: string, category: ProviderType): any {
    // Use provided key directly; our maps are keyed by PascalCase names
    const key: any = providerKey;

    // Pick the correct constructor map by category
    const ctor =
      category === 'anime'
        ? (animeProviders as any)[key]
        : category === 'movies'
          ? (movieProviders as any)[key]
          : undefined;

    // Providers without a bundled class (registry-only) still get the category's base parser,
    // so `instanceof AnimeParser` / `instanceof MovieParser` hold for every loaded provider.
    const base = category === 'anime' ? AnimeParser : category === 'movies' ? MovieParser : undefined;
    const target = typeof ctor === 'function' && ctor.prototype ? ctor : base;
    if (!target) return instance;

    // If already an instance of desired ctor, skip
    if (instance instanceof target) return instance;

    // Attach the prototype so `instanceof` works at runtime
    Object.setPrototypeOf(instance as object, target.prototype);
    return instance;
  }

  /**
   * Execute provider code and create instance (extensionManifest-based).
   * The code must match `metadata.sha256` unless `options.skipIntegrity` is set. Verified code is
   * compiled once per id and sha256; each call returns a new instance.
   *
   * @throws RegistryError before running anything if the entry needs a newer extension context
   * @throws IntegrityError before running anything if the hash or factory name is invalid
   */
  public async executeProviderCode<T extends string>(
    code: string,
    factoryName: string,
    metadata: ExtensionManifest & { id: T },
    options: ExecuteCodeOptions & ProviderLoadOptions = {}
  ): Promise<ProviderInstanceOf<T>> {
    const id = String(metadata?.id ?? factoryName);
    assertCompatibleEntry(metadata);
    assertValidIdentifier(factoryName, 'factoryName', id);

    // The same code verified against the same hash before runs from its compiled copy.
    const key = `${id.toLowerCase()}|${factoryName}`;
    const sha256 = metadata.sha256 ?? '';
    const compiled = this.compiledExtensions.get(key);
    let factory = compiled?.sha256 === sha256 && compiled.code === code ? compiled.factory : undefined;
    if (!factory && !options.skipIntegrity) {
      verifyExtensionCode(code, metadata, this.integrityOptions);
    }

    try {
      if (!factory) {
        factory = evaluateExtensionCode(code, factoryName, this.createExecutionContext(id), 'provider');
        if (!factory) {
          throw new Error(`Factory function '${factoryName}' not found in extension`);
        }
        // Unverified code is never reused: the next call checks its hash again.
        if (!options.skipIntegrity) this.compiledExtensions.set(key, { sha256, code, factory });
      }

      const instance = factory(this.providerContext, options.baseUrl ?? metadata.baseUrl);
      let providerInstance = instance;
      // Validate the instance has required methods
      this.validateProviderInstance(instance, metadata.category);
      // Attempt to attach the prototype from local provider classes so instanceof works in app code
      try {
        // Prefer metadata.name (e.g., 'Zoro') to match local constructor map keys
        const lookupKey = (metadata as any).name;
        providerInstance = this.attachProviderPrototype(instance, lookupKey, metadata.category);
      } catch (protoErr) {
        // Non-fatal – if we can't attach prototype, just proceed with the plain instance
        console.warn(`⚠️  Could not attach prototype for '${metadata.name}':`, protoErr);
      }

      return providerInstance;
    } catch (error) {
      throw new Error(`Failed to execute provider code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create execution context for provider code: the globals it runs with
   */
  private createExecutionContext(extensionId: string) {
    // The only modules extension code can require; anything else throws (EXT-5).
    const modules: Record<string, unknown> = {
      'cheerio': { load: this.providerContext.load },
      'axios': this.providerContext.axios,
      'crypto-js': this.providerContext.CryptoJS,
      [MODELS_MODULE]: this.createModelsContext(),
      [UTILS_MODULE]: { createProviderContext: () => this.providerContext },
      'URL': this.providerContext.PolyURL,
      'URLSearchParams': this.providerContext.PolyURLSearchParams,
      'NativeConsumet': this.providerContext.NativeConsumet,
    };

    return {
      exports: {},
      require: createExtensionRequire(extensionId, modules),
      module: { exports: {} },
      console,
      Promise,
      Object,
      fetch: createExtensionFetch(this.providerContext.axios),
    };
  }

  /**
   * Create models context: the base parsers and the library's real enums
   */
  private createModelsContext() {
    return {
      AnimeParser: this.providerContext.AnimeParser,
      MovieParser: this.providerContext.MovieParser,
      MangaParser: this.providerContext.MangaParser,
      ...this.providerContext.enums,
    };
  }

  /**
   * Validate that the instance has the methods its category requires (REQUIRED_PROVIDER_METHODS)
   */
  private validateProviderInstance(instance: any, category: ProviderType): void {
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
      throw new Error(`Extension '${extensionId}' is not ${CATEGORY_NAMES[category] ?? `a ${category}`} provider`);
    }

    // The category was checked above, and loading checked the category's methods.
    return (await this.loadExtension(extensionId, options)) as unknown as ProviderOfCategory<C>;
  }

  /**
   * Get anime provider
   */
  async getAnimeProvider(extensionId: AnimeProviderId, options: ProviderLoadOptions = {}): Promise<IAnimeProvider> {
    return this.getProvider('anime', extensionId, options);
  }

  /**
   * Get movie provider
   */
  async getMovieProvider(extensionId: MovieProviderId, options: ProviderLoadOptions = {}): Promise<IMovieProvider> {
    return this.getProvider('movies', extensionId, options);
  }

  /**
   * Get the extractor manager shared by the providers this manager loads
   */
  getExtractorManager(): ExtractorManager {
    return this.extractorManager;
  }

  /**
   * Get the provider context
   */
  getProviderContext(): ProviderContext {
    return this.providerContext;
  }

  /**
   * Search across all loaded providers of a specific category
   */
  async searchAcrossProviders(
    category: ProviderType,
    query: string,
    page?: number
  ): Promise<Array<{ extensionId: string; results: ISearch<IAnimeResult | IMovieResult> }>> {
    const extensions = this.getExtensionsByCategory(category);
    const searchPromises = extensions.map(async (ext) => {
      try {
        const provider = await this.loadExtension(ext.id);
        const results = (await provider.search(query, page)) as ISearch<IAnimeResult | IMovieResult>;
        return { extensionId: ext.id, results };
      } catch (error) {
        console.error(`Search failed for ${ext.id}:`, error);
        return { extensionId: ext.id, results: { currentPage: page || 1, hasNextPage: false, results: [] } };
      }
    });

    return Promise.all(searchPromises);
  }
}

export default ProviderManager;
