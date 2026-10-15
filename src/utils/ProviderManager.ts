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
import { fetchTextWithTimeout } from './fetch-with-timeout';
import { createExtensionRequire, MODELS_MODULE, UTILS_MODULE } from './extension-modules';
import { assertCompatibleEntry, validateRegistry } from './registry-schema';

export interface ProviderLoadOptions {
  /** Base URL for the provider; defaults to the registry entry's `baseUrl` (so domain moves are registry-only). */
  baseUrl?: string;
}

export class ProviderManager {
  private providerContext: ProviderContext;
  private extractorManager: ExtractorManager;
  private loadedExtensions = new Map<string, any>();
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

    throw new Error(`Extension '${extensionId}' not found in extensionManifest`);
  }

  /**
   * Load an extension by ID from the extensionManifest
   */
  async loadExtension<T extends string>(
    extensionId: T,
    options: ProviderLoadOptions = {}
  ): Promise<ProviderInstanceOf<T>> {
    const metadata = this.getExtensionMetadata(extensionId as unknown as string);
    if (!metadata) {
      throw new Error(`Extension '${extensionId}' not found in extensionManifest`);
    }
    // Refuse entries that need a newer extension context before downloading their code.
    assertCompatibleEntry(metadata);

    // A base URL override builds a different instance, so it is part of the cache key.
    const cacheKey = `${(metadata.id || String(extensionId)).toLowerCase()}|${options.baseUrl ?? ''}`;

    // Check if already loaded
    if (this.loadedExtensions.has(cacheKey)) {
      //console.log(`📦 Extension '${extensionId}' already loaded`);
      return this.loadedExtensions.get(cacheKey);
    }

    try {
      //console.log(`📥 Loading extension '${extensionId}' from ${metadata.main}`);

      // Load the provider code
      //console.log(`🌐 Attempting to fetch from: ${metadata.main}`);

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
      const providerCode = response.text;

      // Verifies the code against the registry hash and the factory name, then attaches the prototype
      const providerInstance = await this.executeProviderCode(
        providerCode,
        metadata.factoryName,
        metadata as ExtensionManifest & { id: T },
        { baseUrl: options.baseUrl }
      );

      // Cache the loaded extension
      this.loadedExtensions.set(cacheKey, providerInstance);

      //console.log(`✅ Extension '${extensionId}' loaded successfully`);
      return providerInstance;
    } catch (error) {
      console.error(`❌ Failed to load extension '${extensionId}':`, error);
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
   * The code must match `metadata.sha256` unless `options.skipIntegrity` is set.
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
    if (!options.skipIntegrity) {
      verifyExtensionCode(code, metadata, this.integrityOptions);
    }

    const context = this.createExecutionContext(id);

    try {
      // Create and execute the provider code
      //console.log(`📝 About to execute provider code for factory: ${factoryName}`);

      // Add more robust error handling for React Native environment
      let executeFunction;
      try {
        executeFunction = new Function(
          'context',
          `
          const exports = context.exports;
          const require = context.require;
          const module = context.module;
          const console = context.console;
          const Promise = context.Promise;
          const Object = context.Object;
          const fetch = context.fetch;
          
          try {
            ${code}
          } catch (execError) {
            console.error('Error during provider code execution:', execError);
            throw new Error('Provider code execution failed: ' + execError.message);
          }
          
          return { exports, ${factoryName}: typeof ${factoryName} !== 'undefined' ? ${factoryName} : (exports.${factoryName} ?? module.exports.${factoryName}) };
          `
        );
      } catch (syntaxError: any) {
        console.error('Syntax error in provider code:', syntaxError);
        throw new Error(`Failed to parse provider code: ${syntaxError.message}`);
      }

      const result = executeFunction(context);
      const factory = result[factoryName];

      if (!factory || typeof factory !== 'function') {
        throw new Error(`Factory function '${factoryName}' not found in extension`);
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
   * Create execution context for provider code
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

    // Create fetch function using axios
    const customFetch = async (url: string, options: any = {}) => {
      try {
        const response = await this.providerContext.axios({
          url,
          method: options.method || 'GET',
          headers: options.headers || {},
          data: options.body,
          timeout: 30000,
        });

        return {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          text: async () => response.data,
          json: async () => (typeof response.data === 'string' ? JSON.parse(response.data) : response.data),
        };
      } catch (error: any) {
        throw new Error(`fetch failed: ${error.message || error}`);
      }
    };

    return {
      exports: {},
      require: createExtensionRequire(extensionId, modules),
      module: { exports: {} },
      console,
      Promise,
      Object,
      fetch: customFetch,
      URL: this.providerContext.PolyURL,
      URLSearchParams: this.providerContext.PolyURLSearchParams,
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
   * Validate provider instance based on category
   */
  private validateProviderInstance(instance: any, category: ProviderType): void {
    const requiredMethods = ['search', 'fetchEpisodeSources', 'fetchEpisodeServers'];

    for (const method of requiredMethods) {
      if (typeof instance[method] !== 'function') {
        throw new Error(`Provider missing required method: ${method}`);
      }
    }

    // Category-specific validation
    if (category === 'anime' && typeof instance.fetchAnimeInfo !== 'function') {
      throw new Error('Anime provider missing fetchAnimeInfo method');
    }

    if (category === 'movies' && typeof instance.fetchMediaInfo !== 'function') {
      throw new Error('Movie provider missing fetchMediaInfo method');
    }
  }

  /**
   * Get anime provider
   */
  async getAnimeProvider(extensionId: AnimeProviderId, options: ProviderLoadOptions = {}): Promise<IAnimeProvider> {
    const metadata = this.getExtensionMetadata(extensionId as string);
    if (!metadata) {
      throw new Error(`Extension '${extensionId}' not found`);
    }

    if (metadata.category !== 'anime') {
      throw new Error(`Extension '${extensionId}' is not an anime provider`);
    }

    // The category was checked above, so the loaded provider is an anime provider.
    return (await this.loadExtension(extensionId, options)) as IAnimeProvider;
  }

  /**
   * Get movie provider
   */
  async getMovieProvider(extensionId: MovieProviderId, options: ProviderLoadOptions = {}): Promise<IMovieProvider> {
    const metadata = this.getExtensionMetadata(extensionId as string);
    if (!metadata) {
      throw new Error(`Extension '${extensionId}' not found`);
    }

    if (metadata.category !== 'movies') {
      throw new Error(`Extension '${extensionId}' is not a movie provider`);
    }

    // The category was checked above, so the loaded provider is a movie provider.
    return (await this.loadExtension(extensionId, options)) as IMovieProvider;
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
