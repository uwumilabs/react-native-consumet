"use strict";
/* eslint-disable no-new-func */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderManager = void 0;
const create_provider_context_1 = __importDefault(require("./utils/create-provider-context"));
// Import the registry
const registry_json_1 = __importDefault(require("./registry.json"));
class ProviderManager {
    constructor(config = {}) {
        this.loadedExtensions = new Map();
        this.extensionManifest = new Map();
        this.providerContext = (0, create_provider_context_1.default)(config);
        this.loadRegistry();
        console.log('🚀 Registry-based Provider Manager initialized');
    }
    /**
     * Load and parse the registry
     */
    loadRegistry() {
        try {
            registry_json_1.default.extensions.forEach((extension) => {
                this.extensionManifest.set(extension.id, extension);
            });
            console.log(`📚 Loaded ${registry_json_1.default.extensions.length} extensions from registry`);
        }
        catch (error) {
            console.error('❌ Failed to load registry:', error);
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
     * Get extension metadata by ID
     */
    getExtensionMetadata(extensionId) {
        return this.extensionManifest.get(extensionId) || null;
    }
    /**
     * Load provider code from file path or URL (for testing purposes)
     *
     * @param source - File path (e.g., './dist/providers/anime/zoro.js') or URL
     * @param factoryName - Factory function name (e.g., 'createZoro', 'createHiMovies')
     * @param extensionId - Optional custom extension ID for caching
     */
    async loadProviderCode(source, factoryName, extensionId = `custom-${factoryName}-${Date.now()}`) {
        try {
            console.log(`📥 Loading provider code from: ${source}`);
            let providerCode;
            if (source.startsWith('http')) {
                // Load from URL
                const response = await fetch(source);
                if (!response.ok) {
                    throw new Error(`Failed to fetch from URL: ${response.status} ${response.statusText}`);
                }
                providerCode = await response.text();
                console.log('✅ Provider code loaded from URL');
            }
            else {
                // Load from file system
                const fs = require('fs');
                providerCode = fs.readFileSync(source, 'utf-8');
                console.log('✅ Provider code loaded from file');
            }
            // Execute the provider code
            const providerInstance = await this.executeProviderCodeDirect(providerCode, factoryName);
            // Cache the loaded extension
            this.loadedExtensions.set(extensionId, providerInstance);
            console.log(`✅ Provider '${factoryName}' loaded successfully`);
            console.log(`📦 Provider code size: ${providerCode.length} characters`);
            // @ts-ignore
            return providerInstance;
        }
        catch (error) {
            console.error(`❌ Failed to load provider code from ${source}:`, error);
            throw error;
        }
    }
    /**
     * Load an extension by ID from the registry
     */
    async loadExtension(extensionId) {
        const metadata = this.getExtensionMetadata(extensionId);
        if (!metadata) {
            throw new Error(`Extension '${extensionId}' not found in registry`);
        }
        // Check if already loaded
        if (this.loadedExtensions.has(extensionId)) {
            console.log(`📦 Extension '${extensionId}' already loaded`);
            return this.loadedExtensions.get(extensionId);
        }
        try {
            console.log(`📥 Loading extension '${extensionId}' from ${metadata.main}`);
            // Load the provider code
            const response = await fetch(metadata.main);
            if (!response.ok) {
                throw new Error(`Failed to fetch extension: ${response.status} ${response.statusText}`);
            }
            const providerCode = await response.text();
            // Execute the provider code
            const providerInstance = await this.executeProviderCode(providerCode, metadata.factoryName, metadata);
            // Cache the loaded extension
            this.loadedExtensions.set(extensionId, providerInstance);
            console.log(`✅ Extension '${extensionId}' loaded successfully`);
            return providerInstance;
        }
        catch (error) {
            console.error(`❌ Failed to load extension '${extensionId}':`, error);
            throw error;
        }
    }
    /**
     * Execute provider code directly with minimal metadata (for testing)
     */
    async executeProviderCodeDirect(code, factoryName) {
        const context = this.createExecutionContext();
        try {
            // Create and execute the provider code
            const executeFunction = new Function('context', `
        const exports = context.exports;
        const require = context.require;
        const module = context.module;
        const console = context.console;
        const Promise = context.Promise;
        const Object = context.Object;
        const fetch = context.fetch;
        const __awaiter = context.__awaiter;
        
        ${code}
        
        return { exports, ${factoryName}: typeof ${factoryName} !== 'undefined' ? ${factoryName} : exports.${factoryName} };
        `);
            const result = executeFunction(context);
            const factory = result[factoryName];
            if (!factory || typeof factory !== 'function') {
                throw new Error(`Factory function '${factoryName}' not found in provider code`);
            }
            const instance = factory(this.providerContext);
            // Basic validation for required methods
            const requiredMethods = ['search', 'fetchEpisodeSources', 'fetchEpisodeServers'];
            for (const method of requiredMethods) {
                if (typeof instance[method] !== 'function') {
                    console.warn(`⚠️ Provider missing method: ${method}`);
                }
            }
            return instance;
        }
        catch (error) {
            throw new Error(`Failed to execute provider code: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Execute provider code and create instance (registry-based)
     */
    async executeProviderCode(code, factoryName, metadata) {
        const context = this.createExecutionContext();
        try {
            // Create and execute the provider code
            const executeFunction = new Function('context', `
        const exports = context.exports;
        const require = context.require;
        const module = context.module;
        const console = context.console;
        const Promise = context.Promise;
        const Object = context.Object;
        const fetch = context.fetch;
        const __awaiter = context.__awaiter;
        
        ${code}
        
        return { exports, ${factoryName}: typeof ${factoryName} !== 'undefined' ? ${factoryName} : exports.${factoryName} };
        `);
            const result = executeFunction(context);
            const factory = result[factoryName];
            if (!factory || typeof factory !== 'function') {
                throw new Error(`Factory function '${factoryName}' not found in extension`);
            }
            const instance = factory(this.providerContext);
            // Validate the instance has required methods
            this.validateProviderInstance(instance, metadata.category);
            return instance;
        }
        catch (error) {
            throw new Error(`Failed to execute provider code: ${error instanceof Error ? error.message : String(error)}`);
        }
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
        };
        // Create fetch function using axios
        const customFetch = async (url, options = {}) => {
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
            }
            catch (error) {
                throw new Error(`fetch failed: ${error.message || error}`);
            }
        };
        return {
            exports: {},
            require: (module) => mocks[module] || {},
            module: { exports: {} },
            console,
            Promise,
            Object,
            fetch: customFetch,
            __awaiter: this.createAwaiterHelper(),
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
            SubOrSub: { SUB: 'sub', DUB: 'dub', BOTH: 'both' },
            StreamingServers: {
                VidCloud: 'vidcloud',
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
     * Get a type-safe anime provider
     */
    async getAnimeProvider(extensionId) {
        const metadata = this.getExtensionMetadata(extensionId);
        if (!metadata) {
            throw new Error(`Extension '${extensionId}' not found`);
        }
        if (metadata.category !== 'anime') {
            throw new Error(`Extension '${extensionId}' is not an anime provider`);
        }
        const instance = await this.loadExtension(extensionId);
        return instance;
    }
    /**
     * Get a type-safe movie provider
     */
    async getMovieProvider(extensionId) {
        const metadata = this.getExtensionMetadata(extensionId);
        if (!metadata) {
            throw new Error(`Extension '${extensionId}' not found`);
        }
        if (metadata.category !== 'movies') {
            throw new Error(`Extension '${extensionId}' is not a movie provider`);
        }
        const instance = await this.loadExtension(extensionId);
        return instance;
    }
    /**
     * Get any provider (use with caution - prefer typed methods)
     */
    async getProvider(extensionId) {
        return await this.loadExtension(extensionId);
    }
    /**
     * Get the provider context
     */
    getProviderContext() {
        return this.providerContext;
    }
    /**
     * Get registry metadata
     */
    getRegistryMetadata() {
        return registry_json_1.default.metadata;
    }
    /**
     * Search across all loaded providers of a specific category
     */
    async searchAcrossProviders(category, query, page) {
        const extensions = this.getExtensionsByCategory(category);
        const searchPromises = extensions.map(async (ext) => {
            try {
                const provider = await this.loadExtension(ext.id);
                const results = await provider.search(query, page);
                return { extensionId: ext.id, results };
            }
            catch (error) {
                console.error(`Search failed for ${ext.id}:`, error);
                return { extensionId: ext.id, results: { currentPage: page || 1, hasNextPage: false, results: [] } };
            }
        });
        return Promise.all(searchPromises);
    }
    /**
     * Load provider code from string (for testing purposes)
     */
    async loadProviderCodeFromString(code, factoryName, extensionId = `string-${factoryName}-${Date.now()}`) {
        try {
            console.log(`📥 Loading provider code from string: ${factoryName}`);
            console.log(`📦 Provider code size: ${code.length} characters`);
            // Execute the provider code
            const providerInstance = await this.executeProviderCodeDirect(code, factoryName);
            // Cache the loaded extension
            this.loadedExtensions.set(extensionId, providerInstance);
            console.log(`✅ Provider '${factoryName}' loaded successfully from string`);
            // @ts-ignore
            return providerInstance;
        }
        catch (error) {
            console.error(`❌ Failed to load provider code from string:`, error);
            throw error;
        }
    }
    /**
     * Convenience method to load Zoro provider (for testing)
     */
    async loadZoro(source) {
        const defaultSource = './dist/providers/anime/zoro.js';
        return this.loadProviderCode(source || defaultSource, 'createZoro', 'zoro-test');
    }
    /**
     * Convenience method to load HiMovies provider (for testing)
     */
    async loadHiMovies(source) {
        const defaultSource = './dist/providers/movies/himovies.js';
        return this.loadProviderCode(source || defaultSource, 'createHiMovies', 'himovies-test');
    }
    /**
     * Auto-detect and load any provider from file (for testing)
     */
    async loadAnyProvider(source, extensionId) {
        try {
            console.log(`🔍 Auto-detecting provider from: ${source}`);
            let providerCode;
            if (source.startsWith('http')) {
                const response = await fetch(source);
                if (!response.ok) {
                    throw new Error(`Failed to fetch from URL: ${response.status} ${response.statusText}`);
                }
                providerCode = await response.text();
            }
            else {
                const fs = require('fs');
                providerCode = fs.readFileSync(source, 'utf-8');
            }
            // Try to detect factory function name
            const factoryMatches = providerCode.match(/(?:function\s+|const\s+|export\s+(?:function\s+)?)(create\w+)/g);
            if (!factoryMatches || factoryMatches.length === 0) {
                throw new Error('No factory function found (looking for createXxx pattern)');
            }
            const factoryName = factoryMatches[0].replace(/(?:function\s+|const\s+|export\s+(?:function\s+)?)/, '');
            console.log(`🎯 Detected factory function: ${factoryName}`);
            return this.loadProviderCode(source, factoryName, extensionId);
        }
        catch (error) {
            console.error(`❌ Failed to auto-load provider from ${source}:`, error);
            throw error;
        }
    }
}
exports.ProviderManager = ProviderManager;
exports.default = ProviderManager;
//# sourceMappingURL=ProviderManager.js.map