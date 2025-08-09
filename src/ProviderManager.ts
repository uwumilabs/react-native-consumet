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
  MediaFormat,
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
      registry.extensions.forEach((extension: any) => {
        // Convert old format to new format if needed
        const manifest: ExtensionManifest = {
          ...extension,
          category: extension.category as any, // Cast to avoid type error
          factories: extension.factories || (extension.factoryName ? [extension.factoryName] : []),
        };
        this.extensionManifest.set(extension.id, manifest);
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
  // async loadProviderCode(
  //   source: string,
  //   factoryName: string,
  //   extensionId: string = `custom-${factoryName}-${Date.now()}`
  // ): Promise<AnimeProviderInstance | MovieProviderInstance> {
  //   try {
  //     console.log(`📥 Loading provider code from: ${source}`);

  //     let providerCode: string;

  //     if (source.startsWith('http')) {
  //       // Load from URL
  //       const response = await fetch(source);
  //       if (!response.ok) {
  //         throw new Error(`Failed to fetch from URL: ${response.status} ${response.statusText}`);
  //       }
  //       providerCode = await response.text();
  //       console.log('✅ Provider code loaded from URL');
  //     } else {
  //       // Load from file system
  //       const fs = require('fs');
  //       providerCode = fs.readFileSync(source, 'utf-8');
  //       console.log('✅ Provider code loaded from file');
  //     }

  //     // This code path is only reached for URL-based loading
  //     const providerInstance = await this.executeProviderCodeDirect(providerCode, factoryName);

  //     // Cache the loaded extension
  //     this.loadedExtensions.set(extensionId, providerInstance);

  //     console.log(`✅ Provider '${factoryName}' loaded successfully`);
  //     console.log(`📦 Provider code size: ${providerCode.length} characters`);
  //     // @ts-ignore
  //     return providerInstance;
  //   } catch (error) {
  //     console.error(`❌ Failed to load provider code from ${source}:`, error);
  //     throw error;
  //   }
  // }

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
      const factoryName = metadata.factories[0]; // Use first factory
      if (!factoryName) {
        throw new Error(`No factory functions available for extension ${extensionId}`);
      }
      const providerInstance = await this.executeProviderCode(providerCode, factoryName, metadata);

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
      console.log(`📝 About to execute provider code for factory: ${factoryName} (direct)`);

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
          const __awaiter = context.__awaiter;
          
          try {
            ${code}
          } catch (execError) {
            console.error('Error during provider code execution:', execError);
            throw new Error('Provider code execution failed: ' + execError.message);
          }
          
          return { exports, ${factoryName}: typeof ${factoryName} !== 'undefined' ? ${factoryName} : exports.${factoryName} };
          `
        );
      } catch (syntaxError: any) {
        console.error('Syntax error in provider code:', syntaxError);
        throw new Error(`Failed to parse provider code: ${syntaxError.message}`);
      }

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
      console.log(`📝 About to execute provider code for factory: ${factoryName}`);

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
          const __awaiter = context.__awaiter;
          
          try {
            ${code}
          } catch (execError) {
            console.error('Error during provider code execution:', execError);
            throw new Error('Provider code execution failed: ' + execError.message);
          }
          
          return { exports, ${factoryName}: typeof ${factoryName} !== 'undefined' ? ${factoryName} : exports.${factoryName} };
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

    // Check if we're in React Native environment
    if (this.isReactNativeEnvironment()) {
      return await this.loadExtensionReactNative(extensionId);
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
  // async loadProviderCodeFromString(
  //   code: string,
  //   factoryName: string,
  //   extensionId: string = `string-${factoryName}-${Date.now()}`
  // ): Promise<AnimeProviderInstance | MovieProviderInstance> {
  //   try {
  //     console.log(`📥 Loading provider code from string: ${factoryName}`);
  //     console.log(`📦 Provider code size: ${code.length} characters`);

  //     // Execute the provider code
  //     const providerInstance = await this.executeProviderCodeDirect(code, factoryName);

  //     // Cache the loaded extension
  //     this.loadedExtensions.set(extensionId, providerInstance);

  //     console.log(`✅ Provider '${factoryName}' loaded successfully from string`);
  //     // @ts-ignore
  //     return providerInstance;
  //   } catch (error) {
  //     console.error(`❌ Failed to load provider code from string:`, error);
  //     throw error;
  //   }
  // }

  /**
   * Detect if we're running in React Native environment
   */
  private isReactNativeEnvironment(): boolean {
    // Check for React Native specific globals
    return typeof global !== 'undefined' && (global as any).__fbBatchedBridge !== undefined;
  }

  /**
   * Load extension in React Native environment using pre-compiled providers
   */
  private async loadExtensionReactNative(extensionId: string): Promise<AnimeProviderInstance> {
    const metadata = this.getExtensionMetadata(extensionId);
    if (!metadata) {
      throw new Error(`Extension '${extensionId}' not found in registry`);
    }

    // Check if already loaded
    if (this.loadedExtensions.has(extensionId)) {
      console.log(`📦 Extension '${extensionId}' already loaded`);
      return this.loadedExtensions.get(extensionId) as AnimeProviderInstance;
    }

    try {
      console.log(`📥 Loading extension '${extensionId}' for React Native...`);

      // For React Native, we'll use a different approach
      // Instead of dynamic code execution, we'll use pre-compiled factories
      const providerInstance = await this.createReactNativeProvider(extensionId, metadata);

      // Cache the loaded extension
      this.loadedExtensions.set(extensionId, providerInstance);

      console.log(`✅ Extension '${extensionId}' loaded successfully in React Native`);
      return providerInstance as AnimeProviderInstance;
    } catch (error) {
      console.error(`❌ Failed to load extension '${extensionId}' in React Native:`, error);
      throw error;
    }
  }

  /**
   * Create provider instance for React Native environment
   */
  private async createReactNativeProvider(
    extensionId: string,
    _metadata: ExtensionManifest
  ): Promise<AnimeProviderInstance> {
    // For now, we'll create a basic provider that shows the limitation
    // In a real implementation, you would have pre-compiled providers
    switch (extensionId) {
      case 'zoro-anime':
        return this.createZoroReactNativeProvider();
      default:
        throw new Error(
          `Provider '${extensionId}' is not yet supported in React Native environment. Dynamic code execution is limited in React Native.`
        );
    }
  }

  /**
   * Create a React Native compatible Zoro provider
   */
  private createZoroReactNativeProvider(): AnimeProviderInstance {
    // This is a simplified version that demonstrates the concept
    // In production, you'd want to import actual pre-compiled provider classes
    return {
      name: 'Zoro (React Native)',
      baseUrl: 'https://hianime.to',
      logo: 'https://is3-ssl.mzstatic.com/image/thumb/Purple112/v4/7e/91/00/7e9100ee-2b62-0942-4cdc-e9b93252ce1c/source/512x512bb.jpg',
      classPath: 'ANIME.Zoro',
      
      search: async (query: string, page = 1): Promise<ISearch<IAnimeResult>> => {
        // Basic implementation - in production you'd implement the full logic
        console.log(`🔍 Searching for "${query}" on page ${page} using React Native compatible provider`);
        return {
          currentPage: page,
          hasNextPage: false,
          totalPages: 1,
          results: [
            {
              id: 'demo-anime-1',
              title: `Demo result for "${query}"`,
              url: 'https://hianime.to/demo',
              image: 'https://via.placeholder.com/300x400',
              type: MediaFormat.TV,
              sub: 12,
              dub: 12,
              episodes: 12,
            } as IAnimeResult,
          ],
        };
      },

      fetchAnimeInfo: async (animeId: string) => {
        console.log(`📺 Fetching anime info for ${animeId} using React Native compatible provider`);
        return {
          id: animeId,
          title: 'Demo Anime',
          url: `https://hianime.to/${animeId}`,
          image: 'https://via.placeholder.com/300x400',
          description: 'This is a demo anime result from React Native compatible provider.',
          type: 'TV',
          status: 'Completed',
          totalEpisodes: 12,
          episodes: [],
        } as any;
      },

      fetchEpisodeSources: async (episodeId: string) => {
        console.log(`🎬 Fetching episode sources for ${episodeId} using React Native compatible provider`);
        return {
          sources: [
            {
              url: 'https://demo-video-url.mp4',
              isM3U8: false,
              quality: '1080p',
            },
          ],
          headers: {},
        } as any;
      },

      fetchEpisodeServers: async (episodeId: string) => {
        console.log(`🖥️ Fetching episode servers for ${episodeId} using React Native compatible provider`);
        return [
          {
            name: 'Demo Server',
            url: 'https://demo-server.com',
          },
        ] as any;
      },
    };
  }
}

export default ProviderManager;
