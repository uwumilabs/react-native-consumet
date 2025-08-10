/* eslint-disable no-new-func */
import extensionRegistry from '../extension-registry.json';

// Import static extractors as fallbacks
import {
  AsianLoad,
  Filemoon,
  GogoCDN,
  Kwik,
  MixDrop,
  Mp4Player,
  Mp4Upload,
  RapidCloud,
  MegaCloud,
  StreamHub,
  StreamLare,
  StreamSB,
  StreamTape,
  StreamWish,
  VidCloud,
  VidMoly,
  VizCloud,
  VidHide,
  Voe,
  MegaUp,
} from '../extractors';
import type { ExtractorContext } from '../models';
import type { ExtractorInfo } from '../models/extension-manifest';
import { createExtractorContext, type ExtractorContextConfig } from './create-extractor-context';
import { defaultStaticExtractors } from './extension-utils';

export class ExtractorManager {
  private loadedExtractors = new Map<string, any>();
  private extractorRegistry = new Map<string, ExtractorInfo>();
  private staticExtractors!: Record<string, any>;
  private extractorContext: ExtractorContext;

  constructor(config: ExtractorContextConfig = {}) {
    this.extractorContext = createExtractorContext(config);
    this.initializeStaticExtractors();
    this.loadExtractorsFromRegistry();
    console.log('🔧 Dynamic Extractor Manager initialized');
  }

  /**
   * Initialize static extractors as fallbacks
   */
  private initializeStaticExtractors(): void {
    this.staticExtractors = defaultStaticExtractors;
  }

  /**
   * Load extractors from the unified extension registry
   */
  private loadExtractorsFromRegistry(): void {
    try {
      // Extract extractors from all extensions in the registry
      extensionRegistry.extensions.forEach((extension: any) => {
        if (extension.extractors) {
          extension.extractors.forEach((extractor: any) => {
            const manifest: ExtractorInfo = {
              name: extractor.name,
              version: extractor.version,
              main: extractor.main,
            };
            this.extractorRegistry.set(extractor.name.toLowerCase(), manifest);
          });
        }
      });

      const totalExtractors = this.extractorRegistry.size;
      console.log(`🔧 Loaded ${totalExtractors} dynamic extractors from extension registry`);
    } catch (error) {
      console.error('❌ Failed to load extractors from extension registry:', error);
    }
  }

  /**
   * Get extractor metadata by ID
   */
  getExtractorMetadata(extractorId: string): ExtractorInfo | null {
    return this.extractorRegistry.get(extractorId.toLowerCase()) || null;
  }

  /**
   * Load an extractor by ID from the registry
   */
  async loadExtractor(extractorId: string): Promise<any> {
    const metadata = this.getExtractorMetadata(extractorId);
    if (!metadata) {
      // Fallback to static extractor if available
      const staticExtractor = this.staticExtractors[extractorId.toLowerCase()];
      if (staticExtractor) {
        console.log(`🔧 Using static fallback for extractor '${extractorId}'`);
        return staticExtractor;
      }
      throw new Error(`Extractor '${extractorId}' not found in registry or static extractors`);
    }

    // Check if already loaded
    if (this.loadedExtractors.has(extractorId)) {
      console.log(`🔧 Extractor '${extractorId}' already loaded`);
      return this.loadedExtractors.get(extractorId);
    }

    try {
      // Handle static extractors (legacy)
      if (metadata.main.startsWith('static://')) {
        const staticId = metadata.main.replace('static://', '');
        const staticExtractor = this.staticExtractors[staticId.toLowerCase()];
        if (staticExtractor) {
          this.loadedExtractors.set(extractorId, staticExtractor);
          console.log(`🔧 Static extractor '${extractorId}' loaded`);
          return staticExtractor;
        }
        throw new Error(`Static extractor '${staticId}' not found`);
      }

      console.log(`🔧 Loading dynamic extractor '${extractorId}' from ${metadata.main}`);

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

      console.log(`✅ Dynamic extractor '${extractorId}' loaded successfully (encryption: ${metadata.version})`);
      return extractorInstance;
    } catch (error) {
      console.error(`❌ Failed to load extractor '${extractorId}':`, error);

      // Fallback to static extractor if available
      const staticExtractor = this.staticExtractors[extractorId.toLowerCase()];
      if (staticExtractor) {
        console.log(`🔧 Falling back to static extractor for '${extractorId}'`);
        this.loadedExtractors.set(extractorId, staticExtractor);
        return staticExtractor;
      }

      throw error;
    }
  }

  /**
   * Execute extractor code and create instance
   */
  private async executeExtractorCode(code: string, metadata: ExtractorInfo): Promise<any> {
    const context = this.createExecutionContext(metadata);

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
      return factory();
    } catch (error) {
      console.error(`❌ Failed to execute extractor code for '${metadata.name}':`, error);
      throw error;
    }
  }

  /**
   * Create execution context for extractor code
   */
  private createExecutionContext(_metadata: ExtractorInfo) {
    const extractorContext = this.extractorContext;

    return {
      exports: {},
      module: { exports: {} },
      require: (name: string) => {
        // Provide required modules for extractors
        switch (name) {
          case 'axios':
            return extractorContext.axios;
          case 'cheerio':
            return { load: extractorContext.load };
          case 'sharedUtils':
            return extractorContext.sharedUtils;
          default:
            throw new Error(`Module '${name}' not available in extractor context`);
        }
      },
      Promise,
      Object,
      fetch: extractorContext.axios.get,
      __awaiter: (thisArg: any, _arguments: any, P: any, generator: any) => {
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
            result.done
              ? resolve(result.value)
              : new P((innerResolve: any) => innerResolve(result.value)).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      },
      // Provide extractor context for context-aware extractors
      axios: extractorContext.axios,
      load: extractorContext.load,
      sharedUtils: extractorContext.sharedUtils,
    };
  }
}

export default ExtractorManager;
