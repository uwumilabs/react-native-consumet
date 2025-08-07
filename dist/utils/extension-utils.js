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
const node_provider_module_1 = require("./node-provider-module");
/**
 * Simple extension cache
 */
const extensionCache = new Map();
/**
 * Safely evaluate provider code with proper error handling
 * Note: Uses Function constructor which is necessary for dynamic code loading
 * Consider the security implications in your environment
 */
async function evaluateProviderCode(code, _allowedGlobals = ['console', 'Promise', 'URL', 'fetch'], options = {}) {
    const { context, useNodeJS = true } = options;
    try {
        console.log('Raw code preview:', code.substring(0, 500) + '...');
        // Use Node.js runtime only
        if (useNodeJS && context) {
            console.log('🚀 Using Node.js runtime for provider execution...');
            // Try to extract a factory function name from the code
            // Look for common patterns like "createProvider", "createAnimeProvider", etc.
            const factoryMatch = code.match(/(?:module\.exports\.)?(\w*create\w*Provider|\w*Provider|default)/g);
            const factoryName = factoryMatch ? factoryMatch[0].replace('module.exports.', '') : 'default';
            console.log(`📦 Detected factory function: ${factoryName}`);
            const provider = await (0, node_provider_module_1.loadProviderFromCodeNode)(code, factoryName, context);
            // Wrap in a module-like structure
            const nodeModuleWrapper = {};
            nodeModuleWrapper[factoryName] = () => provider;
            nodeModuleWrapper.default = () => provider;
            console.log('✅ Node.js runtime evaluation succeeded!');
            return nodeModuleWrapper;
        }
        // If Node.js is disabled or no context, throw error
        throw new Error('Node.js runtime is required for provider execution. Please ensure useNodeJS is true and context is provided.');
    }
    catch (error) {
        console.error('Node.js evaluation error:', error);
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
    const { cache = true, useNodeJS = true } = config;
    // Check cache first
    if (cache && extensionCache.has(url)) {
        return extensionCache.get(url);
    }
    // Use Node.js runtime only
    if (useNodeJS && config.context) {
        console.log('🚀 Using Node.js runtime for maximum compatibility and native fetch support...');
        const provider = await (0, node_provider_module_1.loadProviderFromURLNode)(url, 'createZoro', config.context);
        // Create a wrapper that looks like a traditional module
        const module = {
            createZoro: () => provider,
            createProvider: () => provider,
            default: provider,
        };
        // Cache the result
        if (cache) {
            extensionCache.set(url, module);
        }
        console.log('✅ Node.js runtime loading succeeded! Provider functions available.');
        return module;
    }
    // If Node.js is disabled or no context, throw error
    throw new Error('Node.js runtime is required for provider loading. Please ensure useNodeJS is true and context is provided.');
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