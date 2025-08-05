"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeProviderModule = void 0;
exports.loadProviderFromURLNative = loadProviderFromURLNative;
exports.createReactNativeProviderContextForNative = createReactNativeProviderContextForNative;
const NativeConsumet_1 = require("../NativeConsumet");
/**
 * Native JavaScript module wrapper that executes provider functions in Android WebView
 * This provides perfect CommonJS compatibility while maintaining clean TypeScript interface
 */
class NativeProviderModule {
    constructor(moduleId) {
        this.isLoaded = false;
        this.availableFunctions = [];
        this.moduleId = moduleId;
    }
    /**
     * Load the JavaScript module code into the native executor
     */
    async load(code, context) {
        try {
            const contextJson = JSON.stringify({
                userAgent: context.USER_AGENT,
                hasExtractors: !!context.extractors,
            });
            const result = await (0, NativeConsumet_1.loadNativeModule)(this.moduleId, code, contextJson);
            const moduleInfo = JSON.parse(result);
            if (moduleInfo.success) {
                this.isLoaded = true;
                this.availableFunctions = moduleInfo.exportKeys || [];
                console.log(`✅ Native module ${this.moduleId} loaded successfully with functions:`, this.availableFunctions);
            }
            else {
                throw new Error(moduleInfo.error || 'Unknown module loading error');
            }
        }
        catch (error) {
            console.error(`❌ Failed to load native module ${this.moduleId}:`, error);
            throw error;
        }
    }
    /**
     * Create a provider instance using the native module
     */
    async createProvider(factoryName, context) {
        if (!this.isLoaded) {
            throw new Error(`Module ${this.moduleId} is not loaded`);
        }
        if (!this.availableFunctions.includes(factoryName)) {
            throw new Error(`Function ${factoryName} not found in module. Available: ${this.availableFunctions.join(', ')}`);
        }
        try {
            // Execute the factory function with context
            const argsJson = JSON.stringify([context]);
            const result = await (0, NativeConsumet_1.executeModuleFunction)(this.moduleId, factoryName, argsJson);
            const executionResult = JSON.parse(result);
            if (executionResult.success) {
                // The result is the provider instance created by the factory
                const providerInstance = executionResult.result;
                console.log('✅ Provider instance created successfully:', {
                    hasSearch: typeof providerInstance?.search,
                    type: typeof providerInstance,
                    keys: Object.keys(providerInstance || {}),
                    allPropertyNames: Object.getOwnPropertyNames(providerInstance || {}),
                    methods: Object.getOwnPropertyNames(providerInstance || {}).filter((key) => typeof providerInstance[key] === 'function'),
                });
                // Create a proxy that routes method calls to the native provider instance
                return this.createProviderProxy(providerInstance);
            }
            else {
                throw new Error(executionResult.error || 'Factory function execution failed');
            }
        }
        catch (error) {
            console.error(`❌ Failed to create provider with ${factoryName}:`, error);
            throw error;
        }
    }
    /**
     * Create a proxy that routes method calls to the native provider instance
     */
    createProviderProxy(providerData) {
        return new Proxy(providerData, {
            get: (target, prop) => {
                // For data properties that exist on target, return directly
                if (typeof target[prop] !== 'undefined' && typeof target[prop] !== 'function') {
                    return target[prop];
                }
                // Handle special properties and methods that shouldn't be proxied
                if (typeof prop === 'string') {
                    // Don't proxy Promise methods, Symbol properties, or internal/common JavaScript methods
                    if (prop === 'then' ||
                        prop === 'catch' ||
                        prop === 'finally' ||
                        prop.startsWith('_') ||
                        prop === 'constructor' ||
                        prop === 'valueOf' ||
                        prop === 'toString' ||
                        prop === 'toJSON' ||
                        prop === 'hasOwnProperty' ||
                        prop === 'isPrototypeOf' ||
                        prop === 'propertyIsEnumerable' ||
                        prop === 'toLocaleString' ||
                        typeof prop === 'symbol') {
                        return target[prop];
                    }
                    // For provider methods that should be executed on the native side
                    return (...args) => {
                        return this.executeProviderMethod(prop, args);
                    };
                }
                return target[prop];
            },
        });
    }
    /**
     * Execute a provider method in the native module
     */
    async executeProviderMethod(methodName, args) {
        try {
            console.log(`🔍 Executing method ${methodName} with args:`, args);
            const argsJson = JSON.stringify(args);
            const result = await (0, NativeConsumet_1.executeModuleFunction)(this.moduleId, methodName, argsJson);
            console.log(`📋 Raw result from native execution:`, result);
            const executionResult = JSON.parse(result);
            if (executionResult.success) {
                console.log(`✅ Method ${methodName} executed successfully:`, executionResult.result);
                return executionResult.result;
            }
            else {
                console.error(`❌ Method ${methodName} failed with error:`, executionResult.error);
                throw new Error(executionResult.error || 'Method execution failed');
            }
        }
        catch (error) {
            console.error(`❌ Failed to execute ${methodName}:`, error);
            throw error;
        }
    }
    /**
     * Unload the native module
     */
    async unload() {
        if (this.isLoaded) {
            await (0, NativeConsumet_1.unloadNativeModule)(this.moduleId);
            this.isLoaded = false;
            this.availableFunctions = [];
        }
    }
    /**
     * Check if module is loaded
     */
    get loaded() {
        return this.isLoaded;
    }
    /**
     * Get available functions
     */
    get functions() {
        return [...this.availableFunctions];
    }
}
exports.NativeProviderModule = NativeProviderModule;
/**
 * Load a provider from URL using native JavaScript execution
 */
async function loadProviderFromURLNative(url, factoryName, context) {
    // Fetch the code
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch provider: ${response.status} ${response.statusText}`);
    }
    const code = await response.text();
    // Create native module instance
    const moduleId = `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const nativeModule = new NativeProviderModule(moduleId);
    // Load the code
    await nativeModule.load(code, context);
    // Create provider instance
    const provider = await nativeModule.createProvider(factoryName, context);
    // Attach cleanup method
    provider._cleanup = () => nativeModule.unload();
    provider._moduleId = moduleId;
    provider._nativeModule = nativeModule;
    return provider;
}
/**
 * Create a React Native provider context optimized for native execution
 */
function createReactNativeProviderContextForNative() {
    // Import the main context creator
    const { createReactNativeProviderContext } = require('./create-provider-context');
    return createReactNativeProviderContext();
}
//# sourceMappingURL=native-provider-module.js.map