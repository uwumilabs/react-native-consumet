"use strict";
/* eslint-disable no-new-func */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderManager = void 0;
const create_provider_context_1 = __importDefault(require("./utils/create-provider-context"));
/**
 * Personal Provider Manager for Zoro
 *
 * Features:
 * - Loads and executes zoro.js provider code
 * - Provides direct access to all original zoro methods
 * - Includes standardized API for compatibility
 * - Uses your project's context utilities
 * - Supports both React Native and Node.js environments
 */
class ProviderManager {
    constructor(config = {}) {
        this.zoroProviderCode = null;
        this.zoroInstance = null;
        this.isInitialized = false;
        this.customModels = null;
        // Create provider context using your utilities
        this.providerContext = (0, create_provider_context_1.default)(config);
        console.log('🚀 Personal Zoro Provider Manager initialized');
    }
    /**
     * Load zoro.js provider code from file or URL
     */
    async loadProviderCode(source) {
        try {
            console.log('📥 Loading zoro provider code from:', source);
            if (source.startsWith('http')) {
                // Load from URL (GitHub, etc.)
                const response = await fetch(source);
                this.zoroProviderCode = await response.text();
                console.log('✅ Provider code loaded from URL');
            }
            else {
                // Load from file system
                const fs = require('fs');
                this.zoroProviderCode = fs.readFileSync(source, 'utf-8');
                console.log('✅ Provider code loaded from file');
            }
            console.log('📦 Provider code size:', this.zoroProviderCode?.length || 0, 'characters');
        }
        catch (error) {
            console.error('❌ Failed to load provider code:', error);
            throw new Error(`Failed to load provider code: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Load provider code directly from a string
     */
    loadProviderCodeFromString(code) {
        try {
            console.log('📥 Loading zoro provider code from string...');
            this.zoroProviderCode = code;
            console.log('✅ Provider code loaded from string');
            console.log('📦 Provider code size:', this.zoroProviderCode?.length || 0, 'characters');
        }
        catch (error) {
            console.error('❌ Failed to load provider code from string:', error);
            throw new Error(`Failed to load provider code from string: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Set custom models directly (avoids need to rewrite types/enums)
     * Use this to pass your actual models folder content
     */
    setCustomModels(customModels) {
        console.log('🔧 Setting custom models...');
        this.customModels = customModels;
        console.log('✅ Custom models set:', Object.keys(customModels));
    }
    /**
     * Load models from your models folder automatically
     */
    async loadModelsFromPath(modelsPath = './models') {
        try {
            console.log('📂 Loading models from:', modelsPath);
            const models = require(modelsPath);
            this.setCustomModels(models);
            console.log('✅ Models loaded successfully from path');
        }
        catch (error) {
            console.warn('⚠️ Could not load models from path, using fallback models');
            console.error('Models loading error:', error);
        }
    } /**
     * Create execution context with all necessary dependencies
     */
    createExecutionContext() {
        const models = this.createModelsMock();
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
        };
        // Create a proper fetch function using axios
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
                console.error('Custom fetch error:', error);
                throw new Error(`fetch failed: ${error.message || error}`);
            }
        };
        return {
            exports: {},
            require: (module) => {
                return mocks[module] || {};
            },
            module: { exports: {} },
            console,
            Promise,
            Object,
            fetch: customFetch,
            __awaiter: this.createAwaiterHelper(),
        };
    }
    /**
     * Create models mock for zoro.js - now using actual imported models
     */
    createModelsMock() {
        // Use custom models if set, otherwise try to import, fallback to defaults
        if (this.customModels) {
            console.log('📦 Using custom models provided');
            return this.customModels;
        }
        // Try to import models dynamically
        let models = {};
        try {
            models = require('./models');
            console.log('📦 Using imported models from ./models');
        }
        catch (error) {
            console.warn('⚠️ Could not import models, using provider context models');
        }
        return {
            // Use actual model classes from your project
            AnimeParser: models.AnimeParser || this.providerContext.AnimeParser,
            MovieParser: models.MovieParser || this.providerContext.MovieParser,
            // Import actual enums/constants if they exist
            SubOrSub: models.SubOrSub || { SUB: 'sub', DUB: 'dub', BOTH: 'both' },
            StreamingServers: models.StreamingServers || {
                VidCloud: 'vidcloud',
                StreamSB: 'streamsb',
                StreamTape: 'streamtape',
                VidStreaming: 'vidstreaming',
            },
            MediaStatus: models.MediaStatus || {
                COMPLETED: 'completed',
                ONGOING: 'ongoing',
                NOT_YET_AIRED: 'not_yet_aired',
                UNKNOWN: 'unknown',
            },
            WatchListType: models.WatchListType || {
                WATCHING: 'watching',
                COMPLETED: 'completed',
                ONHOLD: 'onhold',
                DROPPED: 'dropped',
                PLAN_TO_WATCH: 'plan_to_watch',
                NONE: 'none',
            },
            // Include any other models that might be needed
            ...models, // Spread all models for completeness
        };
    }
    /**
     * Create __awaiter helper for older compiled code
     */
    createAwaiterHelper() {
        return (thisArg, _arguments, P, generator) => {
            function adopt(value) {
                return value instanceof P
                    ? value
                    : new P(function (resolve) {
                        resolve(value);
                    });
            }
            return new (P || (P = Promise))(function (resolve, reject) {
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
     * Execute provider code and initialize zoro instance
     */
    async initializeProvider() {
        if (!this.zoroProviderCode) {
            throw new Error('Provider code not loaded. Call loadProviderCode() first.');
        }
        try {
            console.log('🔄 Initializing zoro provider...');
            const context = this.createExecutionContext();
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
        
        ${this.zoroProviderCode}
        
        return { exports, createZoro: typeof createZoro !== 'undefined' ? createZoro : exports.createZoro };
        `);
            const result = executeFunction(context);
            // Create zoro instance
            if (result.createZoro && typeof result.createZoro === 'function') {
                this.zoroInstance = result.createZoro(this.providerContext);
                console.log('✅ Zoro provider initialized successfully');
            }
            else {
                throw new Error('createZoro function not found in provider code');
            }
            this.isInitialized = true;
        }
        catch (error) {
            console.error('❌ Failed to initialize provider:', error);
            throw new Error(`Provider initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Ensure provider is initialized
     */
    ensureInitialized() {
        if (!this.isInitialized || !this.zoroInstance) {
            throw new Error('Provider not initialized. Call initializeProvider() first.');
        }
    }
    // ==========================================
    // ORIGINAL ZORO METHODS - DIRECT ACCESS
    // ==========================================
    /**
     * Search for anime using zoro's search method
     */
    async search(query, page = 1) {
        this.ensureInitialized();
        try {
            console.log(`🔍 Searching for: "${query}" (page ${page})`);
            const result = await this.zoroInstance.search(query, page);
            console.log(`✅ Found ${result?.results?.length || 0} results`);
            return result;
        }
        catch (error) {
            console.error('❌ Search failed:', error);
            throw error;
        }
    }
    /**
     * Get detailed anime information
     */
    async fetchAnimeInfo(id) {
        this.ensureInitialized();
        try {
            console.log(`📺 Fetching anime info for: ${id}`);
            const result = await this.zoroInstance.fetchAnimeInfo(id);
            console.log(`✅ Got anime info: ${result?.title} (${result?.totalEpisodes} episodes)`);
            return result;
        }
        catch (error) {
            console.error('❌ Fetch anime info failed:', error);
            throw error;
        }
    }
    /**
     * Get episode streaming sources
     */
    async fetchEpisodeSources(episodeId, server = 'VidCloud', subOrDub = 'sub') {
        this.ensureInitialized();
        try {
            console.log(`🎬 Fetching episode sources: ${episodeId} (${server}, ${subOrDub})`);
            const result = await this.zoroInstance.fetchEpisodeSources(episodeId, server, subOrDub);
            console.log(`✅ Got ${result?.sources?.length || 0} sources`);
            return result;
        }
        catch (error) {
            console.error('❌ Fetch episode sources failed:', error);
            throw error;
        }
    }
    /**
     * Get provider context
     */
    getProviderContext() {
        return this.providerContext;
    }
    /**
     * Check if provider is ready
     */
    isReady() {
        return this.isInitialized && !!this.zoroInstance;
    }
}
exports.ProviderManager = ProviderManager;
exports.default = ProviderManager;
//# sourceMappingURL=ProviderManager.js.map