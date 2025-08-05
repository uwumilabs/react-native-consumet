import type { ProviderContext } from '../models/provider-context';
/**
 * Native JavaScript module wrapper that executes provider functions in Android WebView
 * This provides perfect CommonJS compatibility while maintaining clean TypeScript interface
 */
export declare class NativeProviderModule {
    private moduleId;
    private isLoaded;
    private availableFunctions;
    constructor(moduleId: string);
    /**
     * Load the JavaScript module code into the native executor
     */
    load(code: string, context: ProviderContext): Promise<void>;
    /**
     * Create a provider instance using the native module
     */
    createProvider(factoryName: string, context: ProviderContext): Promise<any>;
    /**
     * Create a proxy that routes method calls to the native provider instance
     */
    private createProviderProxy;
    /**
     * Execute a provider method in the native module
     */
    private executeProviderMethod;
    /**
     * Unload the native module
     */
    unload(): Promise<void>;
    /**
     * Check if module is loaded
     */
    get loaded(): boolean;
    /**
     * Get available functions
     */
    get functions(): string[];
}
/**
 * Load a provider from URL using native JavaScript execution
 */
export declare function loadProviderFromURLNative(url: string, factoryName: string, context: ProviderContext): Promise<any>;
/**
 * Create a React Native provider context optimized for native execution
 */
export declare function createReactNativeProviderContextForNative(): ProviderContext;
//# sourceMappingURL=native-provider-module.d.ts.map