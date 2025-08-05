"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateProviderCode = evaluateProviderCode;
exports.loadProviderFromURL = loadProviderFromURL;
exports.createProviderFromURL = createProviderFromURL;
exports.loadMultipleProviders = loadMultipleProviders;
exports.validateProviderModule = validateProviderModule;
exports.clearExtensionCache = clearExtensionCache;
exports.getCachedExtensions = getCachedExtensions;
exports.testProviderURL = testProviderURL;
const create_provider_context_1 = require("./create-provider-context");
const models_1 = require("../models");
const NativeConsumet_1 = require("../NativeConsumet");
const native_provider_module_1 = require("./native-provider-module");
/**
 * Simple extension cache
 */
const extensionCache = new Map();
/**
 * Create a require function that maps module paths to context objects
 * This approach is much cleaner than hardcoding all the types and values inline
 */
function createRequireFunction(context) {
    return (modulePath) => {
        // Map common require paths to context objects
        const moduleMap = {
            'axios': context.axios,
            'cheerio': { load: context.load },
            '../../models': {
                AnimeParser: context.AnimeParser,
                MovieParser: context.MovieParser,
                SubOrSub: models_1.SubOrSub,
                StreamingServers: models_1.StreamingServers,
                MediaStatus: models_1.MediaStatus,
                WatchListType: models_1.WatchListType,
            },
            '../../extractors': context.extractors,
            '../../utils': context.extractors, // Some modules might import utils as extractors
            '../../utils/create-provider-context': {
                createProviderContext: () => context,
            },
            // Direct extractor imports
            '../../extractors/asianload': context.extractors.AsianLoad,
            '../../extractors/filemoon': context.extractors.Filemoon,
            '../../extractors/gogocdn': context.extractors.GogoCDN,
            '../../extractors/kwik': context.extractors.Kwik,
            '../../extractors/mixdrop': context.extractors.MixDrop,
            '../../extractors/mp4player': context.extractors.Mp4Player,
            '../../extractors/mp4upload': context.extractors.Mp4Upload,
            '../../extractors/rapidcloud': context.extractors.RapidCloud,
            '../../extractors/megacloud': context.extractors.MegaCloud,
            '../../extractors/streamhub': context.extractors.StreamHub,
            '../../extractors/streamlare': context.extractors.StreamLare,
            '../../extractors/streamsb': context.extractors.StreamSB,
            '../../extractors/streamtape': context.extractors.StreamTape,
            '../../extractors/streamwish': context.extractors.StreamWish,
            '../../extractors/vidcloud': context.extractors.VidCloud,
            '../../extractors/vidmoly': context.extractors.VidMoly,
            '../../extractors/vizcloud': context.extractors.VizCloud,
            '../../extractors/vidhide': context.extractors.VidHide,
            '../../extractors/voe': context.extractors.Voe,
            '../../extractors/megaup': context.extractors.MegaUp,
        };
        const result = moduleMap[modulePath];
        if (result) {
            return result;
        }
        // Handle dynamic paths or unknown modules gracefully
        console.warn(`Unknown require: ${modulePath}`);
        return {};
    };
}
/**
 * Safely evaluate provider code with proper error handling
 * Note: Uses Function constructor which is necessary for dynamic code loading
 * Consider the security implications in your environment
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
async function evaluateProviderCode(code, allowedGlobals = ['console', 'Promise', 'URL', 'fetch'], options = {}) {
    const { sanitize = false, context, useNative = true } = options; // Default to using native evaluation when available
    try {
        console.log('Raw code preview:', code.substring(0, 500) + '...');
        // Try native Android JavaScript evaluation first (much more reliable)
        if (useNative && typeof NativeConsumet_1.evaluateJavaScript === 'function' && context) {
            try {
                console.log('Using native Android JavaScript evaluation...');
                const contextJson = JSON.stringify({
                    // Minimal context info for native side
                    userAgent: context.USER_AGENT,
                    hasExtractors: !!context.extractors,
                });
                const nativeResult = await (0, NativeConsumet_1.evaluateJavaScript)(code, contextJson);
                console.log('Native evaluation succeeded!', nativeResult);
                const parsed = JSON.parse(nativeResult);
                if (parsed.success && parsed.exportKeys && parsed.exportKeys.length > 0) {
                    // Native evaluation confirmed the code is valid and has exports
                    // Now re-evaluate in our JS context to get the actual functions
                    console.log('Native validation passed, re-evaluating in JS context for function access...');
                    // Fall through to manual evaluation below, but we know it should work
                }
                else {
                    throw new Error(parsed.error || 'Native evaluation found no exports');
                }
            }
            catch (nativeError) {
                console.warn('Native evaluation failed, falling back to manual eval:', nativeError);
                // Fall through to manual evaluation
            }
        }
        // Create a proper CommonJS environment that matches Node.js behavior
        const moduleEnv = {
            module: { exports: {} },
            exports: {},
            require: context ? createRequireFunction(context) : () => ({}),
            console,
            Object,
            Promise,
            URL,
            fetch: globalThis.fetch,
            globalThis,
            global: globalThis,
            // Add common Node.js globals that might be expected
            Buffer: globalThis.Buffer || undefined,
            process: globalThis.process || { env: {} },
            __dirname: '/',
            __filename: '/zoro.js',
        };
        // Link exports properly (this is critical!)
        moduleEnv.exports = moduleEnv.module.exports;
        // For React Native/trusted sources, use direct eval with proper CommonJS wrapper
        // This mimics exactly what Node.js does when it loads a module
        try {
            // Pre-process the code to handle Object.defineProperty patterns
            let processedCode = code;
            // Handle Object.defineProperty(exports, "__esModule", { value: true }); pattern
            processedCode = processedCode.replace(/Object\.defineProperty\(exports,\s*['"]\s*__esModule\s*['"],\s*\{\s*value:\s*true\s*\}\s*\);?/g, 'exports.__esModule = true;');
            // Handle other Object.defineProperty patterns for exports
            processedCode = processedCode.replace(/Object\.defineProperty\(exports,\s*['"]([^'"]+)['"],\s*\{[^}]*\}\s*\);?/g, '// Object.defineProperty handled');
            const wrappedCode = `
        (function(exports, require, module, __filename, __dirname, console, Object, Promise, URL, fetch, globalThis, global, Buffer, process) {
          ${processedCode}
          return module.exports;
        })
      `;
            console.log('Using direct eval approach (Node.js-like) with preprocessed code...');
            // This is exactly how Node.js evaluates modules internally
            // eslint-disable-next-line no-eval
            const moduleFunction = eval(wrappedCode);
            const result = moduleFunction(moduleEnv.exports, // exports
            moduleEnv.require, // require
            moduleEnv.module, // module
            moduleEnv.__filename, // __filename
            moduleEnv.__dirname, // __dirname
            moduleEnv.console, // console
            moduleEnv.Object, // Object
            moduleEnv.Promise, // Promise
            moduleEnv.URL, // URL
            moduleEnv.fetch, // fetch
            moduleEnv.globalThis, // globalThis
            moduleEnv.global, // global
            moduleEnv.Buffer, // Buffer
            moduleEnv.process // process
            );
            console.log('Direct eval succeeded! Result keys:', Object.keys(result || {}));
            console.log('Result type:', typeof result);
            console.log('Has createZoro:', typeof result?.createZoro);
            if (!result || typeof result !== 'object') {
                throw new Error('Provider code must export an object with provider factory functions');
            }
            return result;
        }
        catch (evalError) {
            console.error('Direct eval failed:', evalError);
            throw evalError; // Don't fall back, we want to see the real error
        }
    }
    catch (error) {
        console.error('Full evaluation error:', error);
        throw new Error(`Failed to evaluate provider code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Load a provider extension from a URL
 *
 * @param url - URL to fetch the provider code from
 * @param config - Configuration options
 * @returns Promise resolving to the provider module
 *
 * @example
 * ```typescript
 * // Load from GitHub
 * const module = await loadProviderFromURL(
 *   'https://raw.githubusercontent.com/user/repo/main/providers/custom-anime.js'
 * );
 *
 * const provider = module.createCustomAnime(context);
 * const results = await provider.search('Naruto');
 * ```
 */
async function loadProviderFromURL(url, config = {}) {
    const { fetch: customFetch = globalThis.fetch, timeout = 10000, headers = {}, cache = true, sanitize = true, useNative = true, } = config;
    // Check if fetch is available
    if (!customFetch) {
        throw new Error('Fetch function not available. Please provide a custom fetch function in the config.');
    }
    // Check cache first
    if (cache && extensionCache.has(url)) {
        return extensionCache.get(url);
    }
    // Try native loading first if requested and available
    if (useNative && typeof NativeConsumet_1.loadNativeModule === 'function' && config.context) {
        try {
            console.log('🚀 Using native Android module loading for maximum CommonJS compatibility...');
            const provider = await (0, native_provider_module_1.loadProviderFromURLNative)(url, 'createZoro', config.context);
            // Create a wrapper that looks like a traditional module
            const module = {
                createZoro: () => provider,
                // Add other potential factory functions
                default: provider,
            };
            // Cache the result
            if (cache) {
                extensionCache.set(url, module);
            }
            console.log('✅ Native module loading succeeded!');
            return module;
        }
        catch (nativeError) {
            console.warn('⚠️ Native loading failed, falling back to JavaScript evaluation:', nativeError);
            // Fall through to traditional loading
        }
    }
    try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Extension loading timeout after ${timeout}ms`)), timeout);
        });
        // Fetch the provider code
        const fetchPromise = customFetch(url).then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch extension: ${response.status} ${response.statusText}`);
            }
            return response.text();
        });
        const code = await Promise.race([fetchPromise, timeoutPromise]);
        // Evaluate the code with sanitization option and context
        const module = evaluateProviderCode(code, ['console', 'Promise', 'URL', 'fetch'], {
            sanitize,
            context: config.context || (0, create_provider_context_1.createProviderContext)(),
        });
        // Cache the result
        if (cache) {
            extensionCache.set(url, module);
        }
        return module;
    }
    catch (error) {
        throw new Error(`Failed to load provider from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Create a provider instance from a URL with automatic context injection
 *
 * @param url - URL to fetch the provider from
 * @param factoryName - Name of the factory function to call (e.g., 'createZoro')
 * @param config - Configuration options
 * @returns Promise resolving to the configured provider instance
 *
 * @example
 * ```typescript
 * // Automatically inject context and create provider
 * const zoro = await createProviderFromURL(
 *   'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/dist/providers/anime/zoro.js',
 *   'createZoro'
 * );
 *
 * const results = await zoro.search('One Piece');
 * ```
 */
async function createProviderFromURL(url, factoryName, config = {}) {
    const { context = (0, create_provider_context_1.createProviderContext)() } = config;
    const module = await loadProviderFromURL(url, config);
    if (!module[factoryName] || typeof module[factoryName] !== 'function') {
        throw new Error(`Provider module does not export a function named '${factoryName}'`);
    }
    return module[factoryName](context);
}
/**
 * Load multiple providers from different URLs
 *
 * @param providers - Array of provider configurations
 * @param config - Global configuration options
 * @returns Promise resolving to an object with all loaded providers
 *
 * @example
 * ```typescript
 * const providers = await loadMultipleProviders([
 *   { name: 'zoro', url: 'https://example.com/zoro.js', factory: 'createZoro' },
 *   { name: 'gogoanime', url: 'https://example.com/gogo.js', factory: 'createGogoanime' }
 * ]);
 *
 * const zoroResults = await providers.zoro.search('Naruto');
 * const gogoResults = await providers.gogoanime.search('Naruto');
 * ```
 */
async function loadMultipleProviders(providers, config = {}) {
    const results = {};
    // Load all providers in parallel
    const promises = providers.map(async (provider) => {
        const providerConfig = {
            ...config,
            context: provider.context || config.context || (0, create_provider_context_1.createProviderContext)(),
        };
        const instance = await createProviderFromURL(provider.url, provider.factory, providerConfig);
        return { name: provider.name, instance };
    });
    const loadedProviders = await Promise.allSettled(promises);
    loadedProviders.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            results[result.value.name] = result.value.instance;
        }
        else {
            const providerName = providers[index]?.name || 'unknown';
            console.error(`Failed to load provider '${providerName}':`, result.reason);
        }
    });
    return results;
}
/**
 * Validate that a provider module has the expected structure
 *
 * @param module - The provider module to validate
 * @param expectedFactories - Array of expected factory function names
 * @returns Validation result with details
 *
 * @example
 * ```typescript
 * const validation = validateProviderModule(module, ['createZoro']);
 * if (!validation.isValid) {
 *   console.error('Invalid provider:', validation.errors);
 * }
 * ```
 */
function validateProviderModule(module, expectedFactories = []) {
    const errors = [];
    const factories = [];
    if (!module || typeof module !== 'object') {
        errors.push('Provider module must be an object');
        return { isValid: false, errors, factories };
    }
    // Find all factory functions
    Object.keys(module).forEach((key) => {
        if (typeof module[key] === 'function') {
            factories.push(key);
        }
    });
    // Check for expected factories
    expectedFactories.forEach((factoryName) => {
        if (!module[factoryName] || typeof module[factoryName] !== 'function') {
            errors.push(`Missing required factory function: ${factoryName}`);
        }
    });
    // Check if at least one factory exists
    if (factories.length === 0) {
        errors.push('Provider module must export at least one factory function');
    }
    return {
        isValid: errors.length === 0,
        errors,
        factories,
    };
}
/**
 * Clear the extension cache
 *
 * @param url - Specific URL to clear, or undefined to clear all
 *
 * @example
 * ```typescript
 * // Clear specific extension
 * clearExtensionCache('https://example.com/provider.js');
 *
 * // Clear all cached extensions
 * clearExtensionCache();
 * ```
 */
function clearExtensionCache(url) {
    if (url) {
        extensionCache.delete(url);
    }
    else {
        extensionCache.clear();
    }
}
/**
 * Get information about cached extensions
 *
 * @returns Array of cached extension URLs
 */
function getCachedExtensions() {
    return Array.from(extensionCache.keys());
}
/**
 * Test if a provider URL is accessible and valid
 *
 * @param url - URL to test
 * @param config - Configuration options
 * @returns Promise resolving to test result
 *
 * @example
 * ```typescript
 * const test = await testProviderURL('https://example.com/provider.js');
 * if (test.isValid) {
 *   console.log('Provider is valid with factories:', test.factories);
 * } else {
 *   console.error('Provider test failed:', test.errors);
 * }
 * ```
 */
async function testProviderURL(url, config = {}) {
    const startTime = Date.now();
    try {
        const module = await loadProviderFromURL(url, { ...config, cache: false });
        const validation = validateProviderModule(module);
        const loadTime = Date.now() - startTime;
        return {
            ...validation,
            loadTime,
        };
    }
    catch (error) {
        const loadTime = Date.now() - startTime;
        return {
            isValid: false,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            factories: [],
            loadTime,
        };
    }
}
//# sourceMappingURL=extension-utils.js.map