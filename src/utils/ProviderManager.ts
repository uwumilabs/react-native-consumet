/* eslint-disable no-new-func */

import createProviderContext from './create-provider-context';
import type { ProviderContext } from '../models/provider-context';
import { type IAnimeResult, type IMovieResult, type ISearch, type ProviderContextConfig } from '../models';
import extensionRegistry from '../extension-registry.json';
import type { ExtensionManifest, ProviderType } from '../models/extension-manifest';
import type { AnimeProvider, animeProviders, MovieProvider, movieProviders } from './provider-maps';

export class ProviderManager {
  private providerContext: ProviderContext;
  private loadedExtensions = new Map<string, any>();
  private extensionManifest = new Map<string, ExtensionManifest>();

  constructor(registry: typeof extensionRegistry, providerConfig: ProviderContextConfig = {}) {
    this.providerContext = createProviderContext(providerConfig);
    this.loadRegistry(registry);
  }

  /**
   * Load and parse the extensionManifest
   */
  private loadRegistry(registry: typeof extensionRegistry): void {
    try {
      registry.extensions.forEach((extension: any) => {
        // Convert old format to new format if needed
        const manifest: ExtensionManifest = {
          ...extension,
          category: extension.category as any, // Cast to avoid type error
          factoryName: extension.factoryName,
        };
        this.extensionManifest.set(extension.id, manifest);
      });
      //console.log(`📚 Loaded ${extensions.length} extensions from extensionManifest`);
    } catch (error) {
      console.error('❌ Failed to load extensionManifest:', error);
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
  getExtensionMetadata(extensionId: string): ExtensionManifest {
    return this.extensionManifest.get(extensionId)!;
  }

  /**
   * Load an extension by ID from the extensionManifest
   */
  async loadExtension<T extends AnimeProvider | MovieProvider>(
    extensionId: T
  ): Promise<
    T extends AnimeProvider
      ? InstanceType<(typeof animeProviders)[T]>
      : T extends MovieProvider
        ? InstanceType<(typeof movieProviders)[T]>
        : never
  > {
    const metadata = this.getExtensionMetadata(extensionId);
    if (!metadata) {
      throw new Error(`Extension '${extensionId}' not found in extensionManifest`);
    }

    // Check if already loaded
    if (this.loadedExtensions.has(extensionId)) {
      //console.log(`📦 Extension '${extensionId}' already loaded`);
      return this.loadedExtensions.get(extensionId);
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

      const response = await fetch(metadata.main, fetchOptions);
      if (!response.ok) {
        throw new Error(`Failed to fetch extension: ${response.status} ${response.statusText}`);
      }
      const providerCode = await response.text();

      // Execute the provider code
      const factoryName = metadata.factoryName; // Use factory name directly
      if (!factoryName) {
        throw new Error(`No factory function available for extension ${extensionId}`);
      }
      const providerInstance = await this.executeProviderCode(
        providerCode,
        factoryName,
        metadata as ExtensionManifest & { id: T }
      );

      // Cache the loaded extension
      this.loadedExtensions.set(extensionId, providerInstance);

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
   * Execute provider code and create instance (extensionManifest-based)
   */
  public async executeProviderCode<T extends AnimeProvider | MovieProvider>(
    code: string,
    factoryName: string,
    metadata: ExtensionManifest & { id: T }
  ): Promise<
    T extends AnimeProvider
      ? InstanceType<(typeof animeProviders)[T]>
      : T extends MovieProvider
        ? InstanceType<(typeof movieProviders)[T]>
        : never
  > {
    const context = this.createExecutionContext();

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
      require: (module: string) => mocks[module] || {},
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
  private createModelsContext() {
    return {
      AnimeParser: this.providerContext.AnimeParser,
      MovieParser: this.providerContext.MovieParser,
      MangaParser: this.providerContext.MangaParser,
      SubOrDub: { SUB: 'sub', DUB: 'dub', BOTH: 'both' },
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
   * Get anime provider
   */
  async getAnimeProvider<T extends AnimeProvider>(extensionId: T): Promise<InstanceType<(typeof animeProviders)[T]>> {
    const metadata = this.getExtensionMetadata(extensionId as string);
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
   * Get movie provider
   */
  async getMovieProvider<T extends MovieProvider>(extensionId: T): Promise<InstanceType<(typeof movieProviders)[T]>> {
    const metadata = this.getExtensionMetadata(extensionId as string);
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
        const provider = await this.loadExtension(ext.id as AnimeProvider | MovieProvider);
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
