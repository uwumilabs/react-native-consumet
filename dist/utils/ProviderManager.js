"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ProviderManager = exports.REQUIRED_PROVIDER_METHODS = void 0;
const create_provider_context_1 = require("./create-provider-context");
const ExtractorManager_1 = require("./ExtractorManager");
const models_1 = require("../models");
const extension_integrity_1 = require("./extension-integrity");
const extension_modules_1 = require("./extension-modules");
const registry_schema_1 = require("./registry-schema");
/**
 * Methods a provider must have, by category; loading a provider without one of them throws.
 * They match the base parsers (AnimeParser, MovieParser, MangaParser, LightNovelParser); meta
 * lists what anime and movie meta providers share.
 */
exports.REQUIRED_PROVIDER_METHODS = {
  'anime': ['search', 'fetchAnimeInfo', 'fetchEpisodeSources', 'fetchEpisodeServers'],
  'movies': ['search', 'fetchMediaInfo', 'fetchEpisodeSources', 'fetchEpisodeServers'],
  'manga': ['search', 'fetchMangaInfo', 'fetchChapterPages'],
  'light-novels': ['search', 'fetchLightNovelInfo', 'fetchChapterContent'],
  'meta': ['search', 'fetchEpisodeSources', 'fetchEpisodeServers']
};
/** How errors name a category ("is not an anime provider"), and the base parser its providers are instances of. */
const CATEGORIES = {
  'anime': {
    article: 'an anime',
    base: models_1.AnimeParser
  },
  'movies': {
    article: 'a movie',
    base: models_1.MovieParser
  },
  'manga': {
    article: 'a manga',
    base: models_1.MangaParser
  },
  'light-novels': {
    article: 'a light novel',
    base: models_1.LightNovelParser
  },
  'meta': {
    article: 'a meta'
  }
};
class ProviderManager {
  providerContext;
  extractorManager;
  // Loads by `${id}|${sha256}|${baseUrl}`, see loadExtension
  loads = new Map();
  compiled;
  extensions;
  // Entries by lowercased id, and by lowercased name where no id is the same
  byKey = new Map();
  /**
   * @throws RegistryError if the registry is invalid or uses a newer schema than this library reads
   */
  constructor(registry) {
    let providerConfig = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let integrityOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const validRegistry = (0, registry_schema_1.validateRegistry)(registry);
    this.compiled = new extension_modules_1.CompiledCodeCache(integrityOptions);
    // One extractor manager for every provider this manager loads, built from the same registry,
    // so providers run the registry (hash-verified) versions of their extractors.
    this.extractorManager = providerConfig.extractorManager ?? new ExtractorManager_1.ExtractorManager(validRegistry, {
      axios: providerConfig.axios,
      load: providerConfig.load,
      userAgent: providerConfig.userAgent
    }, integrityOptions);
    this.providerContext = (0, create_provider_context_1.createProviderContext)({
      ...providerConfig,
      extractorManager: this.extractorManager
    });
    this.extensions = validRegistry.extensions.map(extension => ({
      ...extension
    }));
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
  getAvailableExtensions() {
    return [...this.extensions];
  }
  getExtensionsByCategory(category) {
    return this.extensions.filter(ext => ext.category === category);
  }
  /** The registry entry for an id or name, case-insensitive ('zoro' or 'Zoro'). */
  getExtensionMetadata(extensionId) {
    if (!extensionId) throw new Error('Extension id/name is required');
    const manifest = this.byKey.get(extensionId.toLowerCase());
    if (!manifest) throw new Error(`Extension '${extensionId}' not found in extensionManifest`);
    return manifest;
  }
  /**
   * Load an extension by id or name. Concurrent and later calls for the same extension and base URL
   * share one load; a failed load is retried on the next call.
   */
  async loadExtension(extensionId) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    const metadata = this.getExtensionMetadata(extensionId);
    // Refuse entries that need a newer extension context before downloading their code.
    (0, registry_schema_1.assertCompatibleEntry)(metadata);
    // Keyed on the hash, so a new version is loaded again, and on the base URL override, which
    // builds a different instance.
    const key = `${metadata.id.toLowerCase()}|${metadata.sha256 ?? ''}|${options.baseUrl ?? ''}`;
    return (0, extension_modules_1.memoiseLoad)(this.loads, key, async () => this.executeProviderCode(await (0, extension_modules_1.fetchEntryCode)('provider', metadata.main), metadata, options));
  }
  /**
   * Forget a loaded extension (for every base URL) and its compiled code, so the next load
   * fetches and runs it again. Extractors have their own: `getExtractorManager().invalidate(name)`.
   */
  invalidate(extensionId) {
    const id = (this.byKey.get(extensionId.toLowerCase())?.id ?? extensionId).toLowerCase();
    (0, extension_modules_1.deleteEntriesOf)(this.loads, id);
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
  async executeProviderCode(code, metadata) {
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const id = String(metadata?.id ?? metadata?.factoryName);
    (0, registry_schema_1.assertCompatibleEntry)(metadata);
    try {
      const factory = this.compiled.compile(`${id.toLowerCase()}|${metadata.factoryName}`, {
        kind: 'provider',
        id,
        name: metadata.factoryName,
        code,
        entry: metadata,
        globals: () => (0, extension_modules_1.extensionGlobals)('provider', id, this.providerContext),
        skipIntegrity: options.skipIntegrity
      });
      const instance = factory(this.providerContext, options.baseUrl ?? metadata.baseUrl);
      this.assertProviderOf(instance, metadata.category);
      const base = CATEGORIES[metadata.category].base;
      if (base && !(instance instanceof base)) Object.setPrototypeOf(instance, base.prototype);
      return instance;
    } catch (error) {
      if (error instanceof extension_integrity_1.IntegrityError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to execute provider code: ${message}`, {
        cause: error
      });
    }
  }
  /** Throws unless the instance has the methods its category requires (REQUIRED_PROVIDER_METHODS). */
  assertProviderOf(instance, category) {
    const requiredMethods = exports.REQUIRED_PROVIDER_METHODS[category];
    if (!requiredMethods) {
      throw new Error(`Unknown provider category '${category}'`);
    }
    const missing = requiredMethods.filter(method => typeof instance?.[method] !== 'function');
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
  async getProvider(category, extensionId) {
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const metadata = this.getExtensionMetadata(extensionId);
    if (metadata.category !== category) {
      throw new Error(`Extension '${extensionId}' is not ${CATEGORIES[category]?.article ?? `a ${category}`} provider`);
    }
    // Loading checks the category's methods.
    return await this.loadExtension(extensionId, options);
  }
  async getAnimeProvider(extensionId) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return this.getProvider('anime', extensionId, options);
  }
  async getMovieProvider(extensionId) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return this.getProvider('movies', extensionId, options);
  }
  /** The extractor manager shared by the providers this manager loads */
  getExtractorManager() {
    return this.extractorManager;
  }
  getProviderContext() {
    return this.providerContext;
  }
  /**
   * Search every provider of a category. A provider that fails to load or search gives an empty page
   * and its `error`, so one broken provider doesn't hide the others' results.
   */
  async searchAcrossProviders(category, query, page) {
    return Promise.all(this.getExtensionsByCategory(category).map(async ext => {
      try {
        const provider = await this.loadExtension(ext.id);
        const results = await provider.search(query, page);
        return {
          extensionId: ext.id,
          results
        };
      } catch (error) {
        return {
          extensionId: ext.id,
          results: {
            currentPage: page || 1,
            hasNextPage: false,
            results: []
          },
          error
        };
      }
    }));
  }
}
exports.ProviderManager = ProviderManager;
exports.default = ProviderManager;
//# sourceMappingURL=ProviderManager.js.map