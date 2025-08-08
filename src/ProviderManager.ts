/* eslint-disable no-new-func */

import createProviderContext, { type ProviderContextConfig } from './utils/create-provider-context';
import type { ProviderContext } from './models/provider-context';
// Import actual models instead of mocking them
import {
  AnimeParser,
  MovieParser,
  type IAnimeInfo,
  type IAnimeResult,
  type IMovieResult,
  type ISearch,
  type ISource,
} from './models';

// Provider execution context for running zoro.js code
interface ExecutionContext {
  exports: any;
  require: (module: string) => any;
  module: { exports: any };
  console: Console;
  Promise: PromiseConstructor;
  Object: ObjectConstructor;
  fetch: (url: string, options?: any) => Promise<any>;
  __awaiter?: any;
}

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
export class ProviderManager {
  private zoroProviderCode: string | null = null;
  private zoroInstance: any = null;
  private providerContext: ProviderContext;
  private isInitialized = false;
  private customModels: Record<string, any> | null = null;

  constructor(config: ProviderContextConfig = {}) {
    // Create provider context using your utilities
    this.providerContext = createProviderContext(config);
    console.log('🚀 Personal Zoro Provider Manager initialized');
  }

  /**
   * Load zoro.js provider code from file or URL
   */
  async loadProviderCode(source: string): Promise<void> {
    try {
      console.log('📥 Loading zoro provider code from:', source);

      if (source.startsWith('http')) {
        // Load from URL (GitHub, etc.)
        const response = await fetch(source);
        this.zoroProviderCode = await response.text();
        console.log('✅ Provider code loaded from URL');
      } else {
        // Load from file system
        const fs = require('fs');
        this.zoroProviderCode = fs.readFileSync(source, 'utf-8');
        console.log('✅ Provider code loaded from file');
      }

      console.log('📦 Provider code size:', this.zoroProviderCode?.length || 0, 'characters');
    } catch (error) {
      console.error('❌ Failed to load provider code:', error);
      throw new Error(`Failed to load provider code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load provider code directly from a string
   */
  loadProviderCodeFromString(code: string): void {
    try {
      console.log('📥 Loading zoro provider code from string...');
      this.zoroProviderCode = code;
      console.log('✅ Provider code loaded from string');
      console.log('📦 Provider code size:', this.zoroProviderCode?.length || 0, 'characters');
    } catch (error) {
      console.error('❌ Failed to load provider code from string:', error);
      throw new Error(
        `Failed to load provider code from string: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Set custom models directly (avoids need to rewrite types/enums)
   * Use this to pass your actual models folder content
   */
  setCustomModels(customModels: Record<string, any>): void {
    console.log('🔧 Setting custom models...');
    this.customModels = customModels;
    console.log('✅ Custom models set:', Object.keys(customModels));
  }

  /**
   * Load models from your models folder automatically
   */
  async loadModelsFromPath(modelsPath: string = './models'): Promise<void> {
    try {
      console.log('📂 Loading models from:', modelsPath);
      const models = require(modelsPath);
      this.setCustomModels(models);
      console.log('✅ Models loaded successfully from path');
    } catch (error) {
      console.warn('⚠️ Could not load models from path, using fallback models');
      console.error('Models loading error:', error);
    }
  } /**
   * Create execution context with all necessary dependencies
   */
  private createExecutionContext(): ExecutionContext {
    const models = this.createModelsMock();

    const mocks: Record<string, any> = {
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
        console.error('Custom fetch error:', error);
        throw new Error(`fetch failed: ${error.message || error}`);
      }
    };

    return {
      exports: {},
      require: (module: string) => {
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
  private createModelsMock() {
    // Use custom models if set, otherwise try to import, fallback to defaults
    if (this.customModels) {
      console.log('📦 Using custom models provided');
      return this.customModels;
    }

    // Try to import models dynamically
    let models: any = {};
    try {
      models = require('./models');
      console.log('📦 Using imported models from ./models');
    } catch (error) {
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
  private createAwaiterHelper() {
    return (thisArg: any, _arguments: any, P: any, generator: any) => {
      function adopt(value: any) {
        return value instanceof P
          ? value
          : new P(function (resolve: any) {
              resolve(value);
            });
      }
      return new (P || (P = Promise))(function (resolve: any, reject: any) {
        function fulfilled(value: any) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value: any) {
          try {
            step(generator.throw(value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result: any) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
  }

  /**
   * Execute provider code and initialize zoro instance
   */
  async initializeProvider(): Promise<void> {
    if (!this.zoroProviderCode) {
      throw new Error('Provider code not loaded. Call loadProviderCode() first.');
    }

    try {
      console.log('🔄 Initializing zoro provider...');

      const context = this.createExecutionContext();

      // Create and execute the provider code
      const executeFunction = new Function(
        'context',
        `
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
        `
      );

      const result = executeFunction(context);

      // Create zoro instance
      if (result.createZoro && typeof result.createZoro === 'function') {
        this.zoroInstance = result.createZoro(this.providerContext);
        console.log('✅ Zoro provider initialized successfully');
      } else {
        throw new Error('createZoro function not found in provider code');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize provider:', error);
      throw new Error(`Provider initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ensure provider is initialized
   */
  private ensureInitialized(): void {
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
  async search(query: string, page: number = 1): Promise<ISearch<IAnimeResult | IMovieResult>> {
    this.ensureInitialized();
    try {
      console.log(`🔍 Searching for: "${query}" (page ${page})`);
      const result = await this.zoroInstance.search(query, page);
      console.log(`✅ Found ${result?.results?.length || 0} results`);
      return result;
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  /**
   * Get detailed anime information
   */
  async fetchAnimeInfo(id: string): Promise<IAnimeInfo> {
    this.ensureInitialized();
    try {
      console.log(`📺 Fetching anime info for: ${id}`);
      const result = await this.zoroInstance.fetchAnimeInfo(id);
      console.log(`✅ Got anime info: ${result?.title} (${result?.totalEpisodes} episodes)`);
      return result;
    } catch (error) {
      console.error('❌ Fetch anime info failed:', error);
      throw error;
    }
  }

  /**
   * Get episode streaming sources
   */
  async fetchEpisodeSources(
    episodeId: string,
    server: string = 'VidCloud',
    subOrDub: string = 'sub'
  ): Promise<ISource> {
    this.ensureInitialized();
    try {
      console.log(`🎬 Fetching episode sources: ${episodeId} (${server}, ${subOrDub})`);
      const result = await this.zoroInstance.fetchEpisodeSources(episodeId, server, subOrDub);
      console.log(`✅ Got ${result?.sources?.length || 0} sources`);
      return result;
    } catch (error) {
      console.error('❌ Fetch episode sources failed:', error);
      throw error;
    }
  }

  /**
   * Get provider context
   */
  getProviderContext(): ProviderContext {
    return this.providerContext;
  }

  /**
   * Check if provider is ready
   */
  isReady(): boolean {
    return this.isInitialized && !!this.zoroInstance;
  }
}

export default ProviderManager;
