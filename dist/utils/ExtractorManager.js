"use strict";

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ExtractorManager = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
const models_1 = require("../models");
const create_extractor_context_1 = __importDefault(require("./create-extractor-context"));
const extension_utils_1 = require("./extension-utils");
const extension_integrity_1 = require("./extension-integrity");
const fetch_with_timeout_1 = require("./fetch-with-timeout");
const extension_modules_1 = require("./extension-modules");
const registry_schema_1 = require("./registry-schema");
/** Build an extractor from a bundled or registry export: classes with `new`, factories by calling them. */
function instantiate(extractor, ctx) {
  if (typeof extractor !== 'function') return extractor;
  const isClass = extractor.prototype instanceof models_1.VideoExtractor || /^class\b/.test(Function.prototype.toString.call(extractor));
  return isClass ? new extractor(ctx) : extractor(ctx);
}
class ExtractorManager {
  // Loads by `${extractor name}|${sha256}` (`|static` for bundled-only extractors), see loadExtractor
  loadedExtractors = new Map();
  // Compiled registry code by lowercased extractor name
  compiledExtractors = new Map();
  extractorRegistry = new Map();
  staticExtractors;
  extractorContext;
  integrityOptions;
  // Server name alias -> extractor name, from registry `aliases`. The defaults cover registries
  // published before entries carried aliases.
  extractorAliases = new Map([['upcloud', 'megacloud'], ['akcloud', 'megacloud']]);
  /**
   * @throws RegistryError if the registry is invalid or uses a newer schema than this library reads
   */
  constructor(registry) {
    let extractorConfig = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let integrityOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const {
      extractors
    } = (0, registry_schema_1.validateRegistry)(registry);
    this.extractorContext = (0, create_extractor_context_1.default)(extractorConfig);
    this.integrityOptions = integrityOptions;
    this.initializeStaticExtractors();
    this.loadRegistry(extractors);
    //console.log('🔧 Dynamic Extractor Manager initialized');
  }
  /**
   * Initialize static extractors as fallbacks
   */
  initializeStaticExtractors() {
    this.staticExtractors = {
      ...extension_utils_1.defaultExtractors
    };
    for (const [key, value] of Object.entries(extension_utils_1.defaultExtractors)) {
      this.staticExtractors[key.toLowerCase()] = value;
    }
  }
  /**
   * Index the validated registry extractors (and their aliases) by lowercased name
   */
  loadRegistry(extractors) {
    // Keep the whole entry: dropping `sha256` here used to disable integrity checks for extractors.
    for (const extractor of extractors) {
      const name = extractor.name.toLowerCase();
      this.extractorRegistry.set(name, {
        ...extractor
      });
      for (const alias of extractor.aliases ?? []) {
        this.extractorAliases.set(alias.toLowerCase(), name);
      }
    }
  }
  /**
   * @param extractorId server name or extractor ID (case-insensitive) like 'megacloud' or 'MegaCloud'
   * @returns ExtractorInfo or undefined if not found
   * - Also handles server names with suffixes like 'megacloud-hd-1', 'kwik-pahe', etc.
   * - Resolves aliases like 'upcloud' -> 'megacloud', 'akcloud' -> 'megacloud'
   */
  getExtractorMetadata(extractorId) {
    const lowerExtractorId = extractorId.toLowerCase();
    // Check if this is an alias and resolve it
    const resolvedId = this.extractorAliases.get(lowerExtractorId) || lowerExtractorId;
    // First try exact match with resolved ID
    const exactMatch = this.extractorRegistry.get(resolvedId);
    if (exactMatch) {
      return exactMatch;
    }
    // If no exact match, try to extract base name from patterns like:
    // - 'megacloud-hd-1' -> 'megacloud'
    // - 'kwik-pahe' -> 'kwik'
    // - 'streamsb-backup' -> 'streamsb'
    const baseExtractorName = this.extractBaseExtractorName(extractorId);
    if (baseExtractorName) {
      // Check if base name is an alias
      const resolvedBaseName = this.extractorAliases.get(baseExtractorName) || baseExtractorName;
      const baseMatch = this.extractorRegistry.get(resolvedBaseName);
      if (baseMatch) {
        return baseMatch;
      }
    }
    return undefined;
  }
  /**
   * Resolve a server name to its extractor name: the longest registry extractor name or alias
   * the server name starts with (bundled extractor names are a fallback), lowercased.
   * Examples:
   * - 'megacloud-hd-1' -> 'megacloud'
   * - 'kwik-pahe' -> 'kwik'
   * - 'upcloud' -> 'megacloud' (alias)
   * - 'newhost-hd-1' -> 'newhost' (any extractor present in the registry)
   */
  extractBaseExtractorName(serverName) {
    const lowerName = serverName.toLowerCase();
    // Ordered so that on equal length a registry name beats an alias, and an alias beats a bundled name.
    const candidates = [...Array.from(this.extractorRegistry.keys(), name => [name, name]), ...Array.from(this.extractorAliases.entries()), ...Object.values(models_1.StreamingServers).map(v => [v.toLowerCase(), v.toLowerCase()])];
    let best;
    for (const candidate of candidates) {
      if (lowerName.startsWith(candidate[0]) && (!best || candidate[0].length > best[0].length)) {
        best = candidate;
      }
    }
    return best ? best[1] : null;
  }
  /**
   * Load an extractor by server name or extractor ID from the registry, or the bundled version
   * when the registry has none or its code can't be used. Always an instance built with this
   * manager's extractor context.
   * Handles server names with suffixes like 'megacloud-hd-1', 'kwik-pahe', etc.
   * Also resolves aliases like 'upcloud' -> 'megacloud', 'akcloud' -> 'megacloud'
   */
  async loadExtractor(extractorId) {
    const metadata = this.getExtractorMetadata(extractorId);
    if (!metadata) {
      // Not in the registry: use the bundled extractor, if there is one
      const name = (this.extractBaseExtractorName(extractorId) ?? extractorId).toLowerCase();
      if (!this.staticExtractors[name]) {
        throw new Error(`Extractor '${extractorId}' not found in registry or static extractors`);
      }
      return (0, extension_modules_1.memoiseLoad)(this.loadedExtractors, `${name}|static`, async () => this.createStaticExtractor(name));
    }
    // Refuse a registry version that needs a newer extension context before downloading it.
    // Providers still fall back to the bundled extractor (see createProviderContext).
    (0, registry_schema_1.assertCompatibleEntry)(metadata);
    // Keyed on the extractor name, so every server name it serves ('megacloud-hd-1', 'MegaCloud',
    // 'upcloud') shares one load, and on its hash, so a new version is loaded again.
    const key = `${metadata.name.toLowerCase()}|${metadata.sha256 ?? ''}`;
    return (0, extension_modules_1.memoiseLoad)(this.loadedExtractors, key, () => this.fetchExtractor(metadata));
  }
  /**
   * Forget a loaded extractor and its compiled code, so the next load fetches and runs it again.
   * Takes the same names as loadExtractor ('megacloud-hd-1', 'MegaCloud', 'upcloud').
   */
  invalidate(extractorId) {
    const name = (this.getExtractorMetadata(extractorId)?.name ?? this.extractBaseExtractorName(extractorId) ?? extractorId).toLowerCase();
    (0, extension_modules_1.deleteEntriesOf)(this.loadedExtractors, name);
    this.compiledExtractors.delete(name);
  }
  /** The bundled version of an extractor, built with this manager's context */
  createStaticExtractor(name) {
    return instantiate(this.staticExtractors[name.toLowerCase()], this.extractorContext);
  }
  /**
   * Fetch and run the registry version of an extractor, falling back to the bundled version
   */
  async fetchExtractor(metadata) {
    try {
      // Handle static extractors (legacy)
      if (metadata.main.startsWith('static://')) {
        const staticId = metadata.main.replace('static://', '');
        if (this.staticExtractors[staticId.toLowerCase()]) return this.createStaticExtractor(staticId);
        throw new Error(`Static extractor '${staticId}' not found`);
      }
      //console.log(`🔧 Loading dynamic extractor '${metadata.name}' from ${metadata.main}`);
      const response = await (0, fetch_with_timeout_1.fetchTextWithTimeout)(metadata.main, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain, application/javascript, */*',
          'User-Agent': 'React-Native-Consumet/1.0.0'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch extractor: ${response.status} ${response.statusText}`);
      }
      // Verifies the code against the registry hash and the extractor name before running it
      return await this.executeExtractorCode(response.text, metadata);
    } catch (error) {
      console.error(`❌ Failed to load extractor '${metadata.name}':`, error);
      // Fallback to the bundled version of the extractor, if there is one
      if (this.staticExtractors[metadata.name.toLowerCase()]) return this.createStaticExtractor(metadata.name);
      throw error;
    }
  }
  /**
   * Execute extractor code and create instance.
   * The code must match `metadata.sha256` unless `options.skipIntegrity` is set. Verified code is
   * compiled once per extractor name and sha256; each call returns a new instance.
   *
   * @throws RegistryError before running anything if the entry needs a newer extension context
   * @throws IntegrityError before running anything if the hash or extractor name is invalid
   */
  async executeExtractorCode(code, metadata) {
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    (0, registry_schema_1.assertCompatibleEntry)(metadata);
    // The name is interpolated into the generated code.
    (0, extension_integrity_1.assertValidIdentifier)(metadata?.name, 'extractor name', String(metadata?.name));
    // The same code verified against the same hash before runs from its compiled copy.
    const key = metadata.name.toLowerCase();
    const sha256 = metadata.sha256 ?? '';
    const compiled = this.compiledExtractors.get(key);
    let factory = compiled?.sha256 === sha256 && compiled.code === code ? compiled.factory : undefined;
    if (!factory && !options.skipIntegrity) {
      (0, extension_integrity_1.verifyExtensionCode)(code, metadata, this.integrityOptions);
    }
    try {
      if (!factory) {
        const context = this.createExecutionContext(metadata.name);
        factory = (0, extension_modules_1.evaluateExtensionCode)(code, metadata.name, context, 'extractor');
        if (!factory) {
          throw new Error(`Factory function '${metadata.name}' not found in extractor code`);
        }
        // Unverified code is never reused: the next call checks its hash again.
        if (!options.skipIntegrity) this.compiledExtractors.set(key, {
          sha256,
          code,
          factory
        });
      }
      return instantiate(factory, this.extractorContext);
    } catch (error) {
      console.error(`❌ Failed to execute extractor code for '${metadata.name}':`, error);
      throw error;
    }
  }
  /**
   * Create execution context for extractor code
   */
  createExecutionContext(extractorName) {
    const extractorContext = this.extractorContext;
    // The only modules extractor code can require; anything else throws (EXT-5).
    const modules = {
      'cheerio': {
        load: extractorContext.load
      },
      'axios': extractorContext.axios,
      'crypto-js': crypto_js_1.default,
      [extension_modules_1.MODELS_MODULE]: {
        VideoExtractor: models_1.VideoExtractor,
        ...extension_modules_1.extensionEnums
      },
      [extension_modules_1.UTILS_MODULE]: {
        createExtractorContext: () => extractorContext
      }
    };
    return {
      exports: {},
      module: {
        exports: {}
      },
      require: (0, extension_modules_1.createExtensionRequire)(extractorName, modules),
      Promise,
      Object,
      fetch: (0, fetch_with_timeout_1.createExtensionFetch)(extractorContext.axios),
      axios: extractorContext.axios,
      load: extractorContext.load,
      CryptoJS: crypto_js_1.default,
      console,
      URL: extractorContext.PolyURL,
      URLSearchParams: extractorContext.PolyURLSearchParams
    };
  }
}
exports.ExtractorManager = ExtractorManager;
exports.default = ExtractorManager;
//# sourceMappingURL=ExtractorManager.js.map