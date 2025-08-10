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
exports.ExtractorManager = void 0;
/* eslint-disable no-new-func */
const create_provider_context_1 = __importDefault(require("./create-provider-context"));
const extension_registry_json_1 = __importDefault(require("../extension-registry.json"));
// Import static extractors as fallbacks
const extractors_1 = require("../extractors");
const megacloud_getsrcs_1 = require("../extractors/megacloud/megacloud.getsrcs");
const utils_1 = require("./utils");
class ExtractorManager {
    constructor(config = {}) {
        this.loadedExtractors = new Map();
        this.extractorRegistry = new Map();
        this.providerContext = (0, create_provider_context_1.default)(config);
        this.initializeStaticExtractors();
        this.loadExtractorsFromRegistry();
        console.log('🔧 Dynamic Extractor Manager initialized');
    }
    /**
     * Initialize static extractors as fallbacks
     */
    initializeStaticExtractors() {
        this.staticExtractors = {
            asianload: extractors_1.AsianLoad,
            filemoon: extractors_1.Filemoon,
            gogocdn: extractors_1.GogoCDN,
            kwik: extractors_1.Kwik,
            mixdrop: extractors_1.MixDrop,
            mp4player: extractors_1.Mp4Player,
            mp4upload: extractors_1.Mp4Upload,
            rapidcloud: extractors_1.RapidCloud,
            megacloud: (ctx) => (0, extractors_1.MegaCloud)(ctx || this.createExtractorContext()),
            streamhub: extractors_1.StreamHub,
            streamlare: extractors_1.StreamLare,
            streamsb: extractors_1.StreamSB,
            streamtape: extractors_1.StreamTape,
            streamwish: extractors_1.StreamWish,
            vidcloud: (ctx) => (0, extractors_1.VidCloud)(ctx || this.createExtractorContext()),
            vidmoly: extractors_1.VidMoly,
            vizcloud: extractors_1.VizCloud,
            vidhide: extractors_1.VidHide,
            voe: extractors_1.Voe,
            megaup: extractors_1.MegaUp,
        };
    }
    /**
     * Create extractor context for context-aware extractors
     */
    createExtractorContext() {
        return {
            axios: this.providerContext.axios,
            load: this.providerContext.load,
            USER_AGENT: this.providerContext.USER_AGENT || utils_1.USER_AGENT,
            logger: this.providerContext.logger,
            sharedUtils: {
                getSources: megacloud_getsrcs_1.getSources,
            },
        };
    }
    /**
     * Load extractors from the unified extension registry
     */
    loadExtractorsFromRegistry() {
        try {
            // Extract extractors from all extensions in the registry
            extension_registry_json_1.default.extensions.forEach((extension) => {
                if (extension.extractors) {
                    extension.extractors.forEach((extractor) => {
                        const manifest = {
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
        }
        catch (error) {
            console.error('❌ Failed to load extractors from extension registry:', error);
        }
    }
    /**
     * Get extractor metadata by ID
     */
    getExtractorMetadata(extractorId) {
        return this.extractorRegistry.get(extractorId.toLowerCase()) || null;
    }
    /**
     * Load an extractor by ID from the registry
     */
    loadExtractor(extractorId) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const response = yield fetch(metadata.main, fetchOptions);
                if (!response.ok) {
                    throw new Error(`Failed to fetch extractor: ${response.status} ${response.statusText}`);
                }
                const extractorCode = yield response.text();
                // Execute the extractor code
                const extractorInstance = yield this.executeExtractorCode(extractorCode, metadata);
                // Cache the loaded extractor
                this.loadedExtractors.set(extractorId, extractorInstance);
                console.log(`✅ Dynamic extractor '${extractorId}' loaded successfully (encryption: ${metadata.version})`);
                return extractorInstance;
            }
            catch (error) {
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
        });
    }
    /**
     * Execute extractor code and create instance
     */
    executeExtractorCode(code, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const context = this.createExecutionContext(metadata);
            try {
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
          const axios = context.axios;
          const load = context.load;
          
          try {
            ${code}
          } catch (execError) {
            console.error('Error during extractor code execution:', execError);
            throw new Error('Extractor code execution failed: ' + execError.message);
          }
          
          return { exports, ${metadata.name}: typeof ${metadata.name} !== 'undefined' ? ${metadata.name} : exports.${metadata.name} };
          `);
                }
                catch (syntaxError) {
                    console.error('Syntax error in extractor code:', syntaxError);
                    throw new Error(`Failed to parse extractor code: ${syntaxError.message}`);
                }
                const result = executeFunction(context);
                const factory = result[metadata.name || `create${metadata.name}`];
                if (!factory) {
                    throw new Error(`Factory function '${metadata.name || `create${metadata.name}`}' not found in extractor code`);
                }
                return factory();
            }
            catch (error) {
                console.error(`❌ Failed to execute extractor code for '${metadata.name}':`, error);
                throw error;
            }
        });
    }
    /**
     * Create execution context for extractor code
     */
    createExecutionContext(_metadata) {
        const extractorContext = this.createExtractorContext();
        return {
            exports: {},
            module: { exports: {} },
            require: (name) => {
                // Provide required modules for extractors
                switch (name) {
                    case 'axios':
                        return extractorContext.axios;
                    case 'cheerio':
                        return { load: extractorContext.load };
                    default:
                        throw new Error(`Module '${name}' not available in extractor context`);
                }
            },
            console: extractorContext.logger,
            Promise,
            Object,
            fetch: this.providerContext.axios.get,
            __awaiter: (thisArg, _arguments, P, generator) => {
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
                        result.done
                            ? resolve(result.value)
                            : new P((innerResolve) => innerResolve(result.value)).then(fulfilled, rejected);
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
exports.ExtractorManager = ExtractorManager;
exports.default = ExtractorManager;
//# sourceMappingURL=ExtractorManager.js.map