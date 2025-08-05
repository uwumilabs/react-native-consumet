import type { ProviderContext } from '../models/provider-context';
/**
 * Provider module interface that extensions should export
 */
export interface ProviderModule {
    [key: string]: any;
}
/**
 * Configuration for loading extensions
 */
export interface ExtensionConfig {
    /**
     * Custom context to inject into the provider
     */
    context?: ProviderContext;
    /**
     * Custom fetch function (useful for React Native or different environments)
     */
    fetch?: (url: string) => Promise<{
        ok: boolean;
        status: number;
        statusText: string;
        text(): Promise<string>;
    }>;
    /**
     * Timeout for fetching extensions (default: 10000ms)
     */
    timeout?: number;
    /**
     * Custom headers for fetching extensions
     */
    headers?: Record<string, string>;
    /**
     * Whether to cache loaded extensions (default: true)
     */
    cache?: boolean;
    /**
     * Whether to sanitize dangerous functions like eval (default: true)
     * Set to false for trusted sources that might need eval for legitimate purposes
     */
    sanitize?: boolean;
    /**
     * Whether to use native Android JavaScript execution (default: true)
     * This provides much better CommonJS compatibility but only works on Android
     */
    useNative?: boolean;
}
/**
 * Safely evaluate provider code with proper error handling
 * Note: Uses Function constructor which is necessary for dynamic code loading
 * Consider the security implications in your environment
 */
export declare function evaluateProviderCode(code: string, allowedGlobals?: string[], options?: {
    sanitize?: boolean;
    context?: ProviderContext;
    useNative?: boolean;
}): Promise<ProviderModule>;
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
export declare function loadProviderFromURL(url: string, config?: ExtensionConfig): Promise<ProviderModule>;
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
export declare function createProviderFromURL(url: string, factoryName: string, config?: ExtensionConfig): Promise<any>;
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
export declare function loadMultipleProviders(providers: Array<{
    name: string;
    url: string;
    factory: string;
    context?: ProviderContext;
}>, config?: ExtensionConfig): Promise<Record<string, any>>;
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
export declare function validateProviderModule(module: any, expectedFactories?: string[]): {
    isValid: boolean;
    errors: string[];
    factories: string[];
};
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
export declare function clearExtensionCache(url?: string): void;
/**
 * Get information about cached extensions
 *
 * @returns Array of cached extension URLs
 */
export declare function getCachedExtensions(): string[];
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
export declare function testProviderURL(url: string, config?: ExtensionConfig): Promise<{
    isValid: boolean;
    errors: string[];
    factories: string[];
    loadTime: number;
}>;
//# sourceMappingURL=extension-utils.d.ts.map