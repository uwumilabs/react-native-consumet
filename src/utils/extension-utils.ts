import type { ProviderContext } from '../models/provider-context';
import { createProviderContext } from './create-provider-context';

/**
 * Provider module interface that extensions should export
 */
export interface ProviderModule {
  [key: string]: any;
  // Common patterns:
  // createProvider?: (context: ProviderContext) => any;
  // createAnimeProvider?: (context: ProviderContext) => any;
  // createMovieProvider?: (context: ProviderContext) => any;
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
}

/**
 * Simple extension cache
 */
const extensionCache = new Map<string, ProviderModule>();

/**
 * Safely evaluate provider code with proper error handling
 * Note: Uses Function constructor which is necessary for dynamic code loading
 * Consider the security implications in your environment
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
export function evaluateProviderCode(
  code: string,
  allowedGlobals: string[] = ['console', 'Promise', 'URL', 'fetch'],
  options: { sanitize?: boolean } = {}
): ProviderModule {
  const { sanitize = true } = options;

  try {
    // Basic security: Remove potentially dangerous functions (optional)
    const sanitizedCode = sanitize
      ? code
          .replace(/eval\s*\(/g, '// eval(')
          .replace(/Function\s*\(/g, '// Function(')
          .replace(/setTimeout\s*\(/g, '// setTimeout(')
          .replace(/setInterval\s*\(/g, '// setInterval(')
      : code;

    // Create a limited scope for execution
    const allowedScope = allowedGlobals.reduce((acc, globalVar) => {
      try {
        if (typeof globalThis !== 'undefined' && (globalThis as any)[globalVar]) {
          acc[globalVar] = (globalThis as any)[globalVar];
        }
      } catch {
        // Ignore errors accessing globals
      }
      return acc;
    }, {} as any);

    // Create the evaluation function
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const func = new Function(
      ...Object.keys(allowedScope),
      `
      const module = { exports: {} };
      const exports = module.exports;
      
      ${sanitizedCode}
      
      // Support both CommonJS and ES6 exports
      return typeof module.exports === 'object' && Object.keys(module.exports).length > 0 
        ? module.exports 
        : this;
      `
    );

    // Execute with limited scope
    const result = func.apply({}, Object.values(allowedScope));

    if (!result || typeof result !== 'object') {
      throw new Error('Provider code must export an object with provider factory functions');
    }

    return result;
  } catch (error) {
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
export async function loadProviderFromURL(url: string, config: ExtensionConfig = {}): Promise<ProviderModule> {
  const {
    fetch: customFetch = globalThis.fetch || require('node-fetch'),
    timeout = 10000,
    headers = {},
    cache = true,
    sanitize = true,
  } = config;

  // Check cache first
  if (cache && extensionCache.has(url)) {
    return extensionCache.get(url)!;
  }

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
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

    // Evaluate the code with sanitization option
    const module = evaluateProviderCode(code, ['console', 'Promise', 'URL', 'fetch'], { sanitize });

    // Cache the result
    if (cache) {
      extensionCache.set(url, module);
    }

    return module;
  } catch (error) {
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
export async function createProviderFromURL(
  url: string,
  factoryName: string,
  config: ExtensionConfig = {}
): Promise<any> {
  const { context = createProviderContext() } = config;

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
export async function loadMultipleProviders(
  providers: Array<{
    name: string;
    url: string;
    factory: string;
    context?: ProviderContext;
  }>,
  config: ExtensionConfig = {}
): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  // Load all providers in parallel
  const promises = providers.map(async (provider) => {
    const providerConfig = {
      ...config,
      context: provider.context || config.context || createProviderContext(),
    };

    const instance = await createProviderFromURL(provider.url, provider.factory, providerConfig);

    return { name: provider.name, instance };
  });

  const loadedProviders = await Promise.allSettled(promises);

  loadedProviders.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results[result.value.name] = result.value.instance;
    } else {
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
export function validateProviderModule(
  module: any,
  expectedFactories: string[] = []
): { isValid: boolean; errors: string[]; factories: string[] } {
  const errors: string[] = [];
  const factories: string[] = [];

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
export function clearExtensionCache(url?: string): void {
  if (url) {
    extensionCache.delete(url);
  } else {
    extensionCache.clear();
  }
}

/**
 * Get information about cached extensions
 *
 * @returns Array of cached extension URLs
 */
export function getCachedExtensions(): string[] {
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
export async function testProviderURL(
  url: string,
  config: ExtensionConfig = {}
): Promise<{
  isValid: boolean;
  errors: string[];
  factories: string[];
  loadTime: number;
}> {
  const startTime = Date.now();

  try {
    const module = await loadProviderFromURL(url, { ...config, cache: false });
    const validation = validateProviderModule(module);
    const loadTime = Date.now() - startTime;

    return {
      ...validation,
      loadTime,
    };
  } catch (error) {
    const loadTime = Date.now() - startTime;
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      factories: [],
      loadTime,
    };
  }
}
