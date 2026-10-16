"use strict";

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ProviderManager = void 0;
const create_provider_context_1 = __importDefault(require("./create-provider-context"));
const ExtractorManager_1 = require("./ExtractorManager");
const models_1 = require("../models");
const provider_maps_1 = require("./provider-maps");
const extension_integrity_1 = require("./extension-integrity");
const fetch_with_timeout_1 = require("./fetch-with-timeout");
const extension_modules_1 = require("./extension-modules");
const registry_schema_1 = require("./registry-schema");
class ProviderManager {
  providerContext;
  extractorManager;
  // Loads by `${id}|${sha256}|${baseUrl}`, see loadExtension
  loadedExtensions = new Map();
  // Compiled extension code by `${id}|${factoryName}`
  compiledExtensions = new Map();
  extensionManifest = new Map();
  integrityOptions;
  /**
   * @throws RegistryError if the registry is invalid or uses a newer schema than this library reads
   */
  constructor(registry) {
    let providerConfig = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let integrityOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const validRegistry = (0, registry_schema_1.validateRegistry)(registry);
    this.integrityOptions = integrityOptions;
    // One extractor manager for every provider this manager loads, built from the same registry,
    // so providers run the registry (hash-verified) versions of their extractors.
    this.extractorManager = providerConfig.extractorManager ?? new ExtractorManager_1.ExtractorManager(validRegistry, {
      axios: providerConfig.axios,
      load: providerConfig.load,
      userAgent: providerConfig.userAgent
    }, integrityOptions);
    this.providerContext = (0, create_provider_context_1.default)({
      ...providerConfig,
      extractorManager: this.extractorManager
    });
    this.loadRegistry(validRegistry.extensions);
  }
  /**
   * Index the validated registry entries by lowercased id, for case-insensitive lookup
   */
  loadRegistry(extensions) {
    for (const extension of extensions) {
      this.extensionManifest.set(extension.id.toLowerCase(), {
        ...extension
      });
    }
  }
  /**
   * Get all available extensions, including any that need a newer extension context
   * (see `isCompatibleEntry`); loading those throws a RegistryError.
   */
  getAvailableExtensions() {
    return Array.from(this.extensionManifest.values());
  }
  /**
   * Get extensions by category
   */
  getExtensionsByCategory(category) {
    return this.getAvailableExtensions().filter(ext => ext.category === category);
  }
  /**
   * Get extension metadata by ID/ name (case-insensitive) like 'zoro' or 'Zoro'
   */
  getExtensionMetadata(extensionId) {
    if (!extensionId) throw new Error('Extension id/name is required');
    const manifest = this.findExtensionMetadata(extensionId);
    if (!manifest) throw new Error(`Extension '${extensionId}' not found in extensionManifest`);
    return manifest;
  }
  findExtensionMetadata(extensionId) {
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
  async loadExtension(extensionId) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    const metadata = this.getExtensionMetadata(extensionId);
    // Refuse entries that need a newer extension context before downloading their code.
    (0, registry_schema_1.assertCompatibleEntry)(metadata);
    // Keyed on the hash, so a new version is loaded again, and on the base URL override, which
    // builds a different instance.
    const cacheKey = `${metadata.id.toLowerCase()}|${metadata.sha256 ?? ''}|${options.baseUrl ?? ''}`;
    return (0, extension_modules_1.memoiseLoad)(this.loadedExtensions, cacheKey, () => this.fetchExtension(metadata, options));
  }
  /**
   * Forget a loaded extension (for every base URL) and its compiled code, so the next load
   * fetches and runs it again. Extractors have their own: `getExtractorManager().invalidate(name)`.
   */
  invalidate(extensionId) {
    const id = (this.findExtensionMetadata(extensionId)?.id ?? extensionId).toLowerCase();
    (0, extension_modules_1.deleteEntriesOf)(this.loadedExtensions, id);
    (0, extension_modules_1.deleteEntriesOf)(this.compiledExtensions, id);
  }
  /**
   * Fetch an extension's code from the registry and run it
   */
  async fetchExtension(metadata, options) {
    try {
      //console.log(`📥 Loading extension '${metadata.id}' from ${metadata.main}`);
      const response = await (0, fetch_with_timeout_1.fetchTextWithTimeout)(metadata.main, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain, application/javascript, */*',
          'User-Agent': 'React-Native-Consumet/1.0.0'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch extension: ${response.status} ${response.statusText}`);
      }
      // Verifies the code against the registry hash and the factory name, then attaches the prototype
      return await this.executeProviderCode(response.text, metadata.factoryName, metadata, {
        baseUrl: options.baseUrl
      });
    } catch (error) {
      console.error(`❌ Failed to load extension '${metadata.id}':`, error);
      console.error(`❌ Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        url: metadata.main
      });
      throw error;
    }
  }
  /**
   * Attach the correct prototype to the loaded provider instance so runtime instanceof checks pass
   * and developer tooling understands the shape better.
   */
  attachProviderPrototype(instance, providerKey, category) {
    // Use provided key directly; our maps are keyed by PascalCase names
    const key = providerKey;
    // Pick the correct constructor map by category
    const ctor = category === 'anime' ? provider_maps_1.animeProviders[key] : category === 'movies' ? provider_maps_1.movieProviders[key] : undefined;
    // Providers without a bundled class (registry-only) still get the category's base parser,
    // so `instanceof AnimeParser` / `instanceof MovieParser` hold for every loaded provider.
    const base = category === 'anime' ? models_1.AnimeParser : category === 'movies' ? models_1.MovieParser : undefined;
    const target = typeof ctor === 'function' && ctor.prototype ? ctor : base;
    if (!target) return instance;
    // If already an instance of desired ctor, skip
    if (instance instanceof target) return instance;
    // Attach the prototype so `instanceof` works at runtime
    Object.setPrototypeOf(instance, target.prototype);
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
  async executeProviderCode(code, factoryName, metadata) {
    let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    const id = String(metadata?.id ?? factoryName);
    (0, registry_schema_1.assertCompatibleEntry)(metadata);
    (0, extension_integrity_1.assertValidIdentifier)(factoryName, 'factoryName', id);
    // The same code verified against the same hash before runs from its compiled copy.
    const key = `${id.toLowerCase()}|${factoryName}`;
    const sha256 = metadata.sha256 ?? '';
    const compiled = this.compiledExtensions.get(key);
    let factory = compiled?.sha256 === sha256 && compiled.code === code ? compiled.factory : undefined;
    if (!factory && !options.skipIntegrity) {
      (0, extension_integrity_1.verifyExtensionCode)(code, metadata, this.integrityOptions);
    }
    try {
      if (!factory) {
        factory = (0, extension_modules_1.evaluateExtensionCode)(code, factoryName, this.createExecutionContext(id), 'provider');
        if (!factory) {
          throw new Error(`Factory function '${factoryName}' not found in extension`);
        }
        // Unverified code is never reused: the next call checks its hash again.
        if (!options.skipIntegrity) this.compiledExtensions.set(key, {
          sha256,
          code,
          factory
        });
      }
      const instance = factory(this.providerContext, options.baseUrl ?? metadata.baseUrl);
      let providerInstance = instance;
      // Validate the instance has required methods
      this.validateProviderInstance(instance, metadata.category);
      // Attempt to attach the prototype from local provider classes so instanceof works in app code
      try {
        // Prefer metadata.name (e.g., 'Zoro') to match local constructor map keys
        const lookupKey = metadata.name;
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
  createExecutionContext(extensionId) {
    // The only modules extension code can require; anything else throws (EXT-5).
    const modules = {
      'cheerio': {
        load: this.providerContext.load
      },
      'axios': this.providerContext.axios,
      'crypto-js': this.providerContext.CryptoJS,
      [extension_modules_1.MODELS_MODULE]: this.createModelsContext(),
      [extension_modules_1.UTILS_MODULE]: {
        createProviderContext: () => this.providerContext
      },
      'URL': this.providerContext.PolyURL,
      'URLSearchParams': this.providerContext.PolyURLSearchParams,
      'NativeConsumet': this.providerContext.NativeConsumet
    };
    return {
      exports: {},
      require: (0, extension_modules_1.createExtensionRequire)(extensionId, modules),
      module: {
        exports: {}
      },
      console,
      Promise,
      Object,
      fetch: (0, fetch_with_timeout_1.createExtensionFetch)(this.providerContext.axios)
    };
  }
  /**
   * Create models context: the base parsers and the library's real enums
   */
  createModelsContext() {
    return {
      AnimeParser: this.providerContext.AnimeParser,
      MovieParser: this.providerContext.MovieParser,
      MangaParser: this.providerContext.MangaParser,
      ...this.providerContext.enums
    };
  }
  /**
   * Validate provider instance based on category
   */
  validateProviderInstance(instance, category) {
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
  async getAnimeProvider(extensionId) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    const metadata = this.getExtensionMetadata(extensionId);
    if (!metadata) {
      throw new Error(`Extension '${extensionId}' not found`);
    }
    if (metadata.category !== 'anime') {
      throw new Error(`Extension '${extensionId}' is not an anime provider`);
    }
    // The category was checked above, so the loaded provider is an anime provider.
    return await this.loadExtension(extensionId, options);
  }
  /**
   * Get movie provider
   */
  async getMovieProvider(extensionId) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    const metadata = this.getExtensionMetadata(extensionId);
    if (!metadata) {
      throw new Error(`Extension '${extensionId}' not found`);
    }
    if (metadata.category !== 'movies') {
      throw new Error(`Extension '${extensionId}' is not a movie provider`);
    }
    // The category was checked above, so the loaded provider is a movie provider.
    return await this.loadExtension(extensionId, options);
  }
  /**
   * Get the extractor manager shared by the providers this manager loads
   */
  getExtractorManager() {
    return this.extractorManager;
  }
  /**
   * Get the provider context
   */
  getProviderContext() {
    return this.providerContext;
  }
  /**
   * Search across all loaded providers of a specific category
   */
  async searchAcrossProviders(category, query, page) {
    const extensions = this.getExtensionsByCategory(category);
    const searchPromises = extensions.map(async ext => {
      try {
        const provider = await this.loadExtension(ext.id);
        const results = await provider.search(query, page);
        return {
          extensionId: ext.id,
          results
        };
      } catch (error) {
        console.error(`Search failed for ${ext.id}:`, error);
        return {
          extensionId: ext.id,
          results: {
            currentPage: page || 1,
            hasNextPage: false,
            results: []
          }
        };
      }
    });
    return Promise.all(searchPromises);
  }
}
exports.ProviderManager = ProviderManager;
exports.default = ProviderManager;
//# sourceMappingURL=ProviderManager.js.map