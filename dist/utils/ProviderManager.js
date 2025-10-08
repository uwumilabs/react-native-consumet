"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderManager = void 0;
const create_provider_context_1 = __importDefault(require("./create-provider-context"));
const provider_maps_1 = require("./provider-maps");
class ProviderManager {
    constructor(registry, providerConfig = {}) {
        this.loadedExtensions = new Map();
        this.extensionManifest = new Map();
        this.providerContext = (0, create_provider_context_1.default)(providerConfig);
        this.loadRegistry(registry);
    }
    /**
     * Load and parse the extensionManifest
     */
    loadRegistry(registry) {
        try {
            registry.extensions.forEach((extension) => {
                // Convert old format to new format if needed
                const manifest = Object.assign(Object.assign({}, extension), { category: extension.category, factoryName: extension.factoryName });
                // Store with a normalized key to enable case-insensitive lookup by id
                if (typeof extension.id === 'string') {
                    this.extensionManifest.set(extension.id.toLowerCase(), manifest);
                }
                else {
                    this.extensionManifest.set(String(extension.id), manifest);
                }
            });
            //console.log(`📚 Loaded ${extensions.length} extensions from extensionManifest`);
        }
        catch (error) {
            console.error('❌ Failed to load extensionManifest:', error);
        }
    }
    /**
     * Get all available extensions
     */
    getAvailableExtensions() {
        return Array.from(this.extensionManifest.values());
    }
    /**
     * Get extensions by category
     */
    getExtensionsByCategory(category) {
        return this.getAvailableExtensions().filter((ext) => ext.category === category);
    }
    /**
     * Get extension metadata by ID/ name (case-insensitive) like 'zoro' or 'Zoro'
     */
    getExtensionMetadata(extensionId) {
        if (!extensionId)
            throw new Error('Extension id/name is required');
        // Try direct hit (as-is and lowercase id)
        const direct = this.extensionManifest.get(extensionId) || this.extensionManifest.get(extensionId.toLowerCase());
        if (direct)
            return direct;
        // Fallback: search by id or name, case-insensitive
        const needle = extensionId.toLowerCase();
        for (const [key, manifest] of this.extensionManifest.entries()) {
            if (key.toLowerCase() === needle)
                return manifest;
            if (manifest.id && String(manifest.id).toLowerCase() === needle)
                return manifest;
            if (manifest.name && String(manifest.name).toLowerCase() === needle)
                return manifest;
        }
        throw new Error(`Extension '${extensionId}' not found in extensionManifest`);
    }
    /**
     * Load an extension by ID from the extensionManifest
     */
    loadExtension(extensionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const metadata = this.getExtensionMetadata(extensionId);
            if (!metadata) {
                throw new Error(`Extension '${extensionId}' not found in extensionManifest`);
            }
            const cacheKey = (metadata.id || String(extensionId)).toLowerCase();
            // Check if already loaded
            if (this.loadedExtensions.has(cacheKey)) {
                //console.log(`📦 Extension '${extensionId}' already loaded`);
                return this.loadedExtensions.get(cacheKey);
            }
            try {
                //console.log(`📥 Loading extension '${extensionId}' from ${metadata.main}`);
                // Load the provider code
                //console.log(`🌐 Attempting to fetch from: ${metadata.main}`);
                // Add fetch options for better React Native compatibility
                const fetchOptions = {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/plain, application/javascript, */*',
                        'Content-Type': 'application/javascript',
                        'User-Agent': 'React-Native-Consumet/1.0.0',
                    },
                    timeout: 30000, // 30 second timeout
                };
                //console.log(`📡 Fetch options:`, fetchOptions);
                const response = yield fetch(metadata.main, fetchOptions);
                if (!response.ok) {
                    throw new Error(`Failed to fetch extension: ${response.status} ${response.statusText}`);
                }
                const providerCode = yield response.text();
                // Execute the provider code
                const factoryName = metadata.factoryName; // Use factory name directly
                if (!factoryName) {
                    throw new Error(`No factory function available for extension ${extensionId}`);
                }
                let providerInstance = yield this.executeProviderCode(providerCode, factoryName, metadata);
                // Attempt to attach the prototype from local provider classes so instanceof works in app code
                try {
                    // Prefer metadata.name (e.g., 'Zoro') to match local constructor map keys
                    const lookupKey = metadata.name || extensionId;
                    providerInstance = this.attachProviderPrototype(providerInstance, lookupKey, metadata.category);
                }
                catch (protoErr) {
                    // Non-fatal – if we can't attach prototype, just proceed with the plain instance
                    console.warn(`⚠️  Could not attach prototype for '${extensionId}':`, protoErr);
                }
                // Cache the loaded extension
                this.loadedExtensions.set(cacheKey, providerInstance);
                //console.log(`✅ Extension '${extensionId}' loaded successfully`);
                return providerInstance;
            }
            catch (error) {
                console.error(`❌ Failed to load extension '${extensionId}':`, error);
                console.error(`❌ Error details:`, {
                    message: error instanceof Error ? error.message : String(error),
                    name: error instanceof Error ? error.name : 'Unknown',
                    stack: error instanceof Error ? error.stack : undefined,
                    url: metadata.main,
                });
                throw error;
            }
        });
    }
    /**
     * Attach the correct prototype to the loaded provider instance so runtime instanceof checks pass
     * and developer tooling understands the shape better.
     */
    attachProviderPrototype(instance, providerKey, category) {
        // Use provided key directly; our maps are keyed by PascalCase names
        const key = providerKey;
        // Pick the correct constructor map by category
        const ctor = category === 'anime'
            ? provider_maps_1.animeProviders[key]
            : category === 'movies'
                ? provider_maps_1.movieProviders[key]
                : undefined;
        if (!ctor || typeof ctor !== 'function' || !ctor.prototype) {
            return instance; // Nothing to do
        }
        // If already an instance of desired ctor, skip
        if (instance instanceof ctor)
            return instance;
        // Attach the prototype so `instanceof` works at runtime
        Object.setPrototypeOf(instance, ctor.prototype);
        return instance;
    }
    /**
     * Execute provider code and create instance (extensionManifest-based)
     */
    executeProviderCode(code, factoryName, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const context = this.createExecutionContext();
            try {
                // Create and execute the provider code
                //console.log(`📝 About to execute provider code for factory: ${factoryName}`);
                // Add more robust error handling for React Native environment
                let executeFunction;
                try {
                    executeFunction = new Function('context', `
          const exports = context.exports;
          const require = context.require;
          const module = context.module;
          const console = context.console;
          const Promise = context.Promise;
          const Object = context.Object;
          const fetch = context.fetch;
          const __awaiter = context.__awaiter;
          
          try {
            ${code}
          } catch (execError) {
            console.error('Error during provider code execution:', execError);
            throw new Error('Provider code execution failed: ' + execError.message);
          }
          
          return { exports, ${factoryName}: typeof ${factoryName} !== 'undefined' ? ${factoryName} : exports.${factoryName} };
          `);
                }
                catch (syntaxError) {
                    console.error('Syntax error in provider code:', syntaxError);
                    throw new Error(`Failed to parse provider code: ${syntaxError.message}`);
                }
                const result = executeFunction(context);
                const factory = result[factoryName];
                if (!factory || typeof factory !== 'function') {
                    throw new Error(`Factory function '${factoryName}' not found in extension`);
                }
                const instance = factory(this.providerContext);
                let providerInstance = instance;
                // Validate the instance has required methods
                this.validateProviderInstance(instance, metadata.category);
                // Attempt to attach the prototype from local provider classes so instanceof works in app code
                try {
                    // Prefer metadata.name (e.g., 'Zoro') to match local constructor map keys
                    const lookupKey = metadata.name;
                    providerInstance = this.attachProviderPrototype(instance, lookupKey, metadata.category);
                }
                catch (protoErr) {
                    // Non-fatal – if we can't attach prototype, just proceed with the plain instance
                    console.warn(`⚠️  Could not attach prototype for '${metadata.name}':`, protoErr);
                }
                return providerInstance;
            }
            catch (error) {
                throw new Error(`Failed to execute provider code: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Create execution context for provider code
     */
    createExecutionContext() {
        const models = this.createModelsContext();
        const mocks = {
            'cheerio': { load: this.providerContext.load },
            'axios': this.providerContext.axios,
            '../../models': models,
            '../../models/index.js': models,
            '../../models/index': models,
            '../../utils/create-provider-context': {
                createProviderContext: () => this.providerContext,
            },
            '../../utils/create-provider-context.js': {
                createProviderContext: () => this.providerContext,
            },
            '../../utils': {
                createProviderContext: () => this.providerContext,
            },
            'URL': this.providerContext.PolyURL,
            'URLSearchParams': this.providerContext.PolyURLSearchParams,
            'NativeConsumet': this.providerContext.NativeConsumet,
        };
        // Create fetch function using axios
        const customFetch = (url_1, ...args_1) => __awaiter(this, [url_1, ...args_1], void 0, function* (url, options = {}) {
            try {
                const response = yield this.providerContext.axios({
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
                    text: () => __awaiter(this, void 0, void 0, function* () { return response.data; }),
                    json: () => __awaiter(this, void 0, void 0, function* () { return (typeof response.data === 'string' ? JSON.parse(response.data) : response.data); }),
                };
            }
            catch (error) {
                throw new Error(`fetch failed: ${error.message || error}`);
            }
        });
        return {
            exports: {},
            require: (module) => mocks[module] || {},
            module: { exports: {} },
            console,
            Promise,
            Object,
            fetch: customFetch,
            __awaiter: this.createAwaiterHelper(),
            URL: this.providerContext.PolyURL,
            URLSearchParams: this.providerContext.PolyURLSearchParams,
        };
    }
    /**
     * Create models context
     */
    createModelsContext() {
        return {
            AnimeParser: this.providerContext.AnimeParser,
            MovieParser: this.providerContext.MovieParser,
            MangaParser: this.providerContext.MangaParser,
            SubOrDub: { SUB: 'sub', DUB: 'dub', BOTH: 'both' },
            StreamingServers: {
                StreamSB: 'streamsb',
                StreamTape: 'streamtape',
                VidStreaming: 'vidstreaming',
                MegaCloud: 'megacloud',
            },
            MediaStatus: {
                COMPLETED: 'completed',
                ONGOING: 'ongoing',
                NOT_YET_AIRED: 'not_yet_aired',
                UNKNOWN: 'unknown',
            },
            TvType: {
                MOVIE: 'movie',
                TVSERIES: 'tvseries',
                ANIME: 'anime',
            },
            WatchListType: {
                WATCHING: 'watching',
                COMPLETED: 'completed',
                ONHOLD: 'onhold',
                DROPPED: 'dropped',
                PLAN_TO_WATCH: 'plan_to_watch',
                NONE: 'none',
            },
        };
    }
    /**
     * Create __awaiter helper for compatibility
     */
    createAwaiterHelper() {
        return (thisArg, _arguments, P, generator) => {
            function adopt(value) {
                return value instanceof P ? value : new P((resolve) => resolve(value));
            }
            return new (P || (P = Promise))((resolve, reject) => {
                function fulfilled(value) {
                    try {
                        step(generator.next(value));
                    }
                    catch (e) {
                        reject(e);
                    }
                }
                function rejected(value) {
                    try {
                        step(generator.throw(value));
                    }
                    catch (e) {
                        reject(e);
                    }
                }
                function step(result) {
                    result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
                }
                step((generator = generator.apply(thisArg, _arguments || [])).next());
            });
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
    getAnimeProvider(extensionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const metadata = this.getExtensionMetadata(extensionId);
            if (!metadata) {
                throw new Error(`Extension '${extensionId}' not found`);
            }
            if (metadata.category !== 'anime') {
                throw new Error(`Extension '${extensionId}' is not an anime provider`);
            }
            const instance = yield this.loadExtension(extensionId);
            return instance;
        });
    }
    /**
     * Get movie provider
     */
    getMovieProvider(extensionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const metadata = this.getExtensionMetadata(extensionId);
            if (!metadata) {
                throw new Error(`Extension '${extensionId}' not found`);
            }
            if (metadata.category !== 'movies') {
                throw new Error(`Extension '${extensionId}' is not a movie provider`);
            }
            const instance = yield this.loadExtension(extensionId);
            return instance;
        });
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
    searchAcrossProviders(category, query, page) {
        return __awaiter(this, void 0, void 0, function* () {
            const extensions = this.getExtensionsByCategory(category);
            const searchPromises = extensions.map((ext) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const provider = yield this.loadExtension(ext.id);
                    const results = (yield provider.search(query, page));
                    return { extensionId: ext.id, results };
                }
                catch (error) {
                    console.error(`Search failed for ${ext.id}:`, error);
                    return { extensionId: ext.id, results: { currentPage: page || 1, hasNextPage: false, results: [] } };
                }
            }));
            return Promise.all(searchPromises);
        });
    }
}
exports.ProviderManager = ProviderManager;
exports.default = ProviderManager;
//# sourceMappingURL=ProviderManager.js.map