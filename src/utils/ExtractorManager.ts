import type { ExtractorContext, IVideoExtractor, ExtractorContextConfig } from '../models';
import { StreamingServers } from '../models';
import type { ExtractorInfo } from '../models/extension-manifest';
import createExtractorContext from './create-extractor-context';
import { defaultExtractors } from './extension-utils';
import extensionRegistry from '../extension-registry.json';

export class ExtractorManager {
  private loadedExtractors = new Map<string, any>();
  private extractorRegistry = new Map<string, ExtractorInfo>();
  private staticExtractors!: Record<string, any>;
  private extractorContext: ExtractorContext;

  // Map of server name aliases to their actual extractor names
  private extractorAliases: Map<string, string> = new Map([
    ['upcloud', 'megacloud'],
    ['akcloud', 'megacloud'],
  ]);

  constructor(registry: typeof extensionRegistry, extractorConfig: ExtractorContextConfig = {}) {
    this.extractorContext = createExtractorContext(extractorConfig);
    this.initializeStaticExtractors();
    this.loadRegistry(registry);
    //console.log('🔧 Dynamic Extractor Manager initialized');
  }

  /**
   * Initialize static extractors as fallbacks
   */
  private initializeStaticExtractors(): void {
    this.staticExtractors = defaultExtractors;
  }

  /**
   * Load extractors from the unified extension registry
   */
  private loadRegistry(registry: typeof extensionRegistry): void {
    try {
      // Extract extractors from all extensions in the registry
      registry.extensions.forEach((extension: any) => {
        if (extension.extractors) {
          registry.extractors.forEach((extractor: any) => {
            const manifest: ExtractorInfo = {
              name: extractor.name,
              version: extractor.version,
              main: extractor.main,
            };
            this.extractorRegistry.set(extractor.name.toLowerCase(), manifest);
          });
        }
      });

      // const totalExtractors = this.extractorRegistry.size;
      //console.log(`🔧 Loaded ${totalExtractors} dynamic extractors from extension registry`);
    } catch (error) {
      console.error('❌ Failed to load extractors from extension registry:', error);
    }
  }

  /**
   * @param extractorId server name or extractor ID (case-insensitive) like 'megacloud' or 'MegaCloud'
   * @returns ExtractorInfo or undefined if not found
   * - Also handles server names with suffixes like 'megacloud-hd-1', 'kwik-pahe', etc.
   * - Resolves aliases like 'upcloud' -> 'megacloud', 'akcloud' -> 'megacloud'
   */
  getExtractorMetadata(extractorId: string): ExtractorInfo | undefined {
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
   * Extract the base extractor name from server names with suffixes and resolve aliases
   * Examples:
   * - 'megacloud-hd-1' -> 'megacloud'
   * - 'kwik-pahe' -> 'kwik'
   * - 'upcloud' -> 'megacloud' (alias resolved)
   * - 'akcloud' -> 'megacloud' (alias resolved)
   * - 'MegaCloud' -> 'megacloud'
   */
  public extractBaseExtractorName(serverName: string): string | null {
    const lowerName = serverName.toLowerCase();

    // Get all extractor values from StreamingServers enum
    const knownExtractors = Object.values(StreamingServers as Record<string, string>);

    // Check aliases first
    for (const [alias] of this.extractorAliases) {
      if (lowerName.startsWith(alias)) {
        // Return the resolved alias target
        return this.extractorAliases.get(alias)!;
      }
    }

    // Check if the server name starts with any known extractor
    for (const extractor of knownExtractors) {
      if (lowerName.startsWith(extractor.toLowerCase())) {
        return extractor.toLowerCase();
      }
    }

    // If no match found, try splitting by hyphen and taking first part
    const firstPart = lowerName.split('-')[0];

    // Check if first part is an alias
    if (firstPart && this.extractorAliases.has(firstPart)) {
      return this.extractorAliases.get(firstPart)!;
    }

    // Check if first part is a known extractor
    if (firstPart && knownExtractors.some((e) => e.toLowerCase() === firstPart)) {
      return firstPart;
    }

    return null;
  }

  /**
   * Load an extractor by ID from the registry
   * Handles server names with suffixes like 'megacloud-hd-1', 'kwik-pahe', etc.
   * Also resolves aliases like 'upcloud' -> 'megacloud', 'akcloud' -> 'megacloud'
   */
  async loadExtractor(extractorId: StreamingServers): Promise<IVideoExtractor> {
    const metadata = this.getExtractorMetadata(extractorId as StreamingServers);
    if (!metadata) {
      // Try to extract base name and look for static extractor
      const baseName = this.extractBaseExtractorName(extractorId) || extractorId;
      const resolvedName = this.extractorAliases.get(baseName.toLowerCase()) || baseName;
      const staticExtractor = this.staticExtractors[resolvedName.toLowerCase()];
      if (staticExtractor) {
        //console.log(`🔧 Using static fallback for extractor '${extractorId}' (resolved: '${resolvedName}')`);
        return staticExtractor;
      }
      throw new Error(`Extractor '${extractorId}' not found in registry or static extractors`);
    }

    // Check if already loaded
    if (this.loadedExtractors.has(extractorId)) {
      //console.log(`🔧 Extractor '${extractorId}' already loaded`);
      return this.loadedExtractors.get(extractorId);
    }

    try {
      // Handle static extractors (legacy)
      if (metadata.main.startsWith('static://')) {
        const staticId = metadata.main.replace('static://', '');
        const staticExtractor = this.staticExtractors[staticId.toLowerCase()];
        if (staticExtractor) {
          this.loadedExtractors.set(extractorId, staticExtractor);
          //console.log(`🔧 Static extractor '${extractorId}' loaded`);
          return staticExtractor;
        }
        throw new Error(`Static extractor '${staticId}' not found`);
      }

      //console.log(`🔧 Loading dynamic extractor '${extractorId}' from ${metadata.main}`);

      // Load the extractor code dynamically
      const fetchOptions = {
        method: 'GET',
        headers: {
          'Accept': 'text/plain, application/javascript, */*',
          'Content-Type': 'application/javascript',
          'User-Agent': 'React-Native-Consumet/1.0.0',
        },
        timeout: 30000,
      };

      const response = await fetch(metadata.main, fetchOptions);
      if (!response.ok) {
        throw new Error(`Failed to fetch extractor: ${response.status} ${response.statusText}`);
      }
      const extractorCode = await response.text();

      // Execute the extractor code
      const extractorInstance = await this.executeExtractorCode(extractorCode, metadata);

      // Cache the loaded extractor
      this.loadedExtractors.set(extractorId, extractorInstance);

      //console.log(`✅ Dynamic extractor '${extractorId}' loaded successfully (encryption: ${metadata.version})`);
      return extractorInstance;
    } catch (error) {
      console.error(`❌ Failed to load extractor '${extractorId}':`, error);

      // Fallback to static extractor if available
      const staticExtractor = this.staticExtractors[extractorId.toLowerCase()];
      if (staticExtractor) {
        //console.log(`🔧 Falling back to static extractor for '${extractorId}'`);
        this.loadedExtractors.set(extractorId, staticExtractor);
        return staticExtractor;
      }

      throw error;
    }
  }

  /**
   * Execute extractor code and create instance
   */
  public async executeExtractorCode(code: string, metadata: ExtractorInfo): Promise<IVideoExtractor> {
    const context = this.createExecutionContext();

    try {
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
          const URL = context.URL;
          const URLSearchParams = context.URLSearchParams;
          const __awaiter = context.__awaiter;
          const axios = context.axios;
          const load = context.load;
          const sharedUtils = context.sharedUtils;
          
          try {
            ${code}
          } catch (execError) {
            console.error('Error during extractor code execution:', execError);
            throw new Error('Extractor code execution failed: ' + execError.message);
          }
          
          return { exports, ${metadata.name}: typeof ${metadata.name} !== 'undefined' ? ${metadata.name} : exports.${metadata.name} };
          `
        );
      } catch (syntaxError: any) {
        console.error('Syntax error in extractor code:', syntaxError);
        throw new Error(`Failed to parse extractor code: ${syntaxError.message}`);
      }

      const result = executeFunction(context);
      const factory = result[metadata.name || `create${metadata.name}`];

      if (!factory) {
        throw new Error(`Factory function '${metadata.name || `create${metadata.name}`}' not found in extractor code`);
      }
      return factory(this.extractorContext);
    } catch (error) {
      console.error(`❌ Failed to execute extractor code for '${metadata.name}':`, error);
      throw error;
    }
  }

  /**
   * Create models context
   */
  private createModelsContext() {
    return {
      SubOrSub: { SUB: 'sub', DUB: 'dub', BOTH: 'both' },
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
   * Create execution context for extractor code
   */
  private createExecutionContext() {
    const extractorContext = this.extractorContext;
    const models = this.createModelsContext();
    const mocks: Record<string, any> = {
      'cheerio': { load: this.extractorContext.load },
      'axios': this.extractorContext.axios,
      '../../models': models,
      '../../models/index.js': models,
      '../../models/index': models,
      '../../utils/create-extractor-context': {
        createExtractorContext: () => this.extractorContext,
      },
      '../../utils/create-extractor-context.js': {
        createExtractorContext: () => this.extractorContext,
      },
      '../../utils': {
        createExtractorContext: () => this.extractorContext,
      },
    };
    return {
      exports: {},
      module: { exports: {} },
      require: (module: string) => mocks[module] || {},
      Promise,
      Object,
      fetch: async (url: string, options: any = {}) => {
        try {
          const response = await this.extractorContext.axios({
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
      },
      __awaiter: (thisArg: any, _arguments: any, P: any, generator: any) => {
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
      },
      // Provide extractor context for context-aware extractors
      axios: extractorContext.axios,
      load: extractorContext.load,
      console,
      URL: extractorContext.PolyURL,
      URLSearchParams: extractorContext.PolyURLSearchParams,
    };
  }
}

export default ExtractorManager;
