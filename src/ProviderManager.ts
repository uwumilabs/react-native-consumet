/* eslint-disable no-new-func */

import createProviderContext, { type ProviderContextConfig } from './utils/create-provider-context';
import type { ProviderContext } from './models/provider-context';
import {
  type IAnimeInfo,
  type IAnimeResult,
  type IMovieResult,
  type IMovieInfo,
  type ISearch,
  type ISource,
  type IEpisodeServer,
  TvType,
} from './models';

// Import the registry
import registry from './registry.json';
import type { ExtensionManifest, ProviderType } from './models/extension-manifest';

/**
 * Base provider interface with required methods for extensions
 */
interface BaseProviderInstance {
  name: string;
  baseUrl: string;
  logo: string;
  classPath: string;
  search(query: string, page?: number): Promise<ISearch<any>>;
  fetchEpisodeSources(episodeId: string, ...args: any[]): Promise<ISource>;
  fetchEpisodeServers(episodeId: string, ...args: any[]): Promise<IEpisodeServer[]>;
  fetchSpotlight?(...args: any[]): Promise<ISearch<any>>;
}

/**
 * Anime provider interface
 */
interface AnimeProviderInstance extends BaseProviderInstance {
  search(query: string, page?: number): Promise<ISearch<IAnimeResult>>;
  fetchAnimeInfo(animeId: string, ...args: any[]): Promise<IAnimeInfo>;
  fetchSpotlight?(...args: any[]): Promise<ISearch<IAnimeResult>>;
}

/**
 * Movie provider interface
 */
interface MovieProviderInstance extends BaseProviderInstance {
  search(query: string, page?: number): Promise<ISearch<IMovieResult>>;
  fetchMediaInfo(mediaId: string): Promise<IMovieInfo>;
  fetchSpotlight?(...args: any[]): Promise<ISearch<IMovieResult>>;
  supportedTypes: Set<TvType>;
}

export class ProviderManager {
  private providerContext: ProviderContext;
  private loadedExtensions = new Map<string, any>();
  private extensionManifest = new Map<string, ExtensionManifest>();

  constructor(config: ProviderContextConfig = {}) {
    this.providerContext = createProviderContext(config);
    this.loadRegistry();
    console.log('🚀 Registry-based Provider Manager initialized');
  }

  /**
   * Load and parse the registry
   */
  private loadRegistry(): void {
    try {
      registry.extensions.forEach((extension) => {
        this.extensionManifest.set(extension.id, extension as ExtensionManifest);
      });
      console.log(`📚 Loaded ${registry.extensions.length} extensions from registry`);
    } catch (error) {
      console.error('❌ Failed to load registry:', error);
    }
  }

  /**
   * Get all available extensions
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
   * Get extension metadata by ID
   */
  getExtensionMetadata(extensionId: string): ExtensionManifest | null {
    return this.extensionManifest.get(extensionId) || null;
  }

  /**
   * Load provider code from file path or URL (for testing purposes)
   *
   * @param source - File path (e.g., './dist/providers/anime/zoro.js') or URL
   * @param factoryName - Factory function name (e.g., 'createZoro', 'createHiMovies')
   * @param extensionId - Optional custom extension ID for caching
   */
  async loadProviderCode(
    source: string,
    factoryName: string,
    extensionId: string = `custom-${factoryName}-${Date.now()}`
  ): Promise<AnimeProviderInstance | MovieProviderInstance> {
    try {
      console.log(`📥 Loading provider code from: ${source}`);

      let providerCode: string;

      if (source.startsWith('http')) {
        // Load from URL
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to fetch from URL: ${response.status} ${response.statusText}`);
        }
        providerCode = await response.text();
        console.log('✅ Provider code loaded from URL');
      } else {
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
    } catch (error) {
      console.error(`❌ Failed to load provider code from ${source}:`, error);
      throw error;
    }
  }

  /**
   * Load an extension by ID from the registry
   */
  async loadExtension(extensionId: string): Promise<BaseProviderInstance> {
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
    } catch (error) {
      console.error(`❌ Failed to load extension '${extensionId}':`, error);
      throw error;
    }
  }

  /**
   * Execute provider code directly with minimal metadata (for testing)
   */
  private async executeProviderCodeDirect(code: string, factoryName: string): Promise<BaseProviderInstance> {
    const context = this.createExecutionContext();

    try {
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
        
        ${code}
        
        return { exports, ${factoryName}: typeof ${factoryName} !== 'undefined' ? ${factoryName} : exports.${factoryName} };
        `
      );

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
    } catch (error) {
      throw new Error(`Failed to execute provider code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute provider code and create instance (registry-based)
   */
  private async executeProviderCode(
    code: string,
    factoryName: string,
    metadata: ExtensionManifest
  ): Promise<BaseProviderInstance> {
    const context = this.createExecutionContext();

    try {
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
        
        ${code}
        
        return { exports, ${factoryName}: typeof ${factoryName} !== 'undefined' ? ${factoryName} : exports.${factoryName} };
        `
      );

      const result = executeFunction(context);
      const factory = result[factoryName];

      if (!factory || typeof factory !== 'function') {
        throw new Error(`Factory function '${factoryName}' not found in extension`);
      }

      const instance = factory(this.providerContext);

      // Validate the instance has required methods
      this.validateProviderInstance(instance, metadata.category);

      return instance;
    } catch (error) {
      throw new Error(`Failed to execute provider code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create execution context for provider code
   */
  private createExecutionContext() {
    const models = this.createModelsContext();

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
      '../../utils': {
        createProviderContext: () => this.providerContext,
      },
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
      require: (module: string) => mocks[module] || {},
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
  private createModelsContext() {
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
  private createAwaiterHelper() {
    return (thisArg: any, _arguments: any, P: any, generator: any) => {
      function adopt(value: any) {
        return value instanceof P ? value : new P((resolve: any) => resolve(value));
      }
      return new (P || (P = Promise))((resolve: any, reject: any) => {
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
   * Get a type-safe anime provider
   */
  async getAnimeProvider(extensionId: string): Promise<AnimeProviderInstance> {
    const metadata = this.getExtensionMetadata(extensionId);
    if (!metadata) {
      throw new Error(`Extension '${extensionId}' not found`);
    }

    if (metadata.category !== 'anime') {
      throw new Error(`Extension '${extensionId}' is not an anime provider`);
    }

    const instance = await this.loadExtension(extensionId);
    return instance as AnimeProviderInstance;
  }

  /**
   * Get a type-safe movie provider
   */
  async getMovieProvider(extensionId: string): Promise<MovieProviderInstance> {
    const metadata = this.getExtensionMetadata(extensionId);
    if (!metadata) {
      throw new Error(`Extension '${extensionId}' not found`);
    }

    if (metadata.category !== 'movies') {
      throw new Error(`Extension '${extensionId}' is not a movie provider`);
    }

    const instance = await this.loadExtension(extensionId);
    return instance as MovieProviderInstance;
  }

  /**
   * Get any provider (use with caution - prefer typed methods)
   */
  async getProvider(extensionId: string): Promise<BaseProviderInstance> {
    return await this.loadExtension(extensionId);
  }

  /**
   * Get the provider context
   */
  getProviderContext(): ProviderContext {
    return this.providerContext;
  }

  /**
   * Get registry metadata
   */
  getRegistryMetadata() {
    return registry.metadata;
  }

  /**
   * Search across all loaded providers of a specific category
   */
  async searchAcrossProviders(
    category: ProviderType,
    query: string,
    page?: number
  ): Promise<Array<{ extensionId: string; results: ISearch<any> }>> {
    const extensions = this.getExtensionsByCategory(category);
    const searchPromises = extensions.map(async (ext) => {
      try {
        const provider = await this.loadExtension(ext.id);
        const results = await provider.search(query, page);
        return { extensionId: ext.id, results };
      } catch (error) {
        console.error(`Search failed for ${ext.id}:`, error);
        return { extensionId: ext.id, results: { currentPage: page || 1, hasNextPage: false, results: [] } };
      }
    });

    return Promise.all(searchPromises);
  }

  /**
   * Load provider code from string (for testing purposes)
   */
  async loadProviderCodeFromString(
    code: string,
    factoryName: string,
    extensionId: string = `string-${factoryName}-${Date.now()}`
  ): Promise<AnimeProviderInstance | MovieProviderInstance> {
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
    } catch (error) {
      console.error(`❌ Failed to load provider code from string:`, error);
      throw error;
    }
  }

  /**
   * Convenience method to load Zoro provider (for testing)
   */
  async loadZoro(source?: string): Promise<AnimeProviderInstance> {
    const defaultSource = './dist/providers/anime/zoro.js';
    return this.loadProviderCode(source || defaultSource, 'createZoro', 'zoro-test') as Promise<AnimeProviderInstance>;
  }

  /**
   * Convenience method to load HiMovies provider (for testing)
   */
  async loadHiMovies(source?: string): Promise<MovieProviderInstance> {
    const defaultSource = './dist/providers/movies/himovies.js';
    return this.loadProviderCode(
      source || defaultSource,
      'createHiMovies',
      'himovies-test'
    ) as Promise<MovieProviderInstance>;
  }

  /**
   * Auto-detect and load any provider from file (for testing)
   */
  async loadAnyProvider(source: string, extensionId?: string): Promise<BaseProviderInstance> {
    try {
      console.log(`🔍 Auto-detecting provider from: ${source}`);

      let providerCode: string;
      if (source.startsWith('http')) {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to fetch from URL: ${response.status} ${response.statusText}`);
        }
        providerCode = await response.text();
      } else {
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
    } catch (error) {
      console.error(`❌ Failed to auto-load provider from ${source}:`, error);
      throw error;
    }
  }
}

export default ProviderManager;
