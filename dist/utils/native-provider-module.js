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
            console.log('🔧 Loading native module with ID:', this.moduleId);
            const result = await (0, NativeConsumet_1.loadNativeModule)(this.moduleId, code, contextJson);
            console.log('🔧 Raw native module load result:', result);
            const moduleInfo = JSON.parse(result);
            console.log('🔧 Parsed module info:', moduleInfo);
            if (moduleInfo.success) {
                this.isLoaded = true;
                // Parse the exportKeys properly - it should be a JSON string
                let exportKeys = [];
                try {
                    if (typeof moduleInfo.exportKeys === 'string') {
                        // If it's a JSON string, parse it
                        if (moduleInfo.exportKeys.startsWith('[') && moduleInfo.exportKeys.endsWith(']')) {
                            exportKeys = JSON.parse(moduleInfo.exportKeys);
                        }
                        else {
                            // If it's a plain string, try to split it
                            exportKeys = moduleInfo.exportKeys
                                .split(',')
                                .map((key) => key.trim())
                                .filter((key) => key.length > 0);
                        }
                    }
                    else if (Array.isArray(moduleInfo.exportKeys)) {
                        exportKeys = moduleInfo.exportKeys;
                    }
                    else {
                        console.warn('🔧 Unexpected exportKeys format:', typeof moduleInfo.exportKeys, moduleInfo.exportKeys);
                        exportKeys = [];
                    }
                }
                catch (parseError) {
                    console.error('🔧 Failed to parse exportKeys:', parseError);
                    console.log('🔧 Raw exportKeys value:', moduleInfo.exportKeys);
                    exportKeys = [];
                }
                this.availableFunctions = exportKeys;
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
        console.log('🏭 Creating provider with factory:', factoryName);
        console.log('🏭 Available functions:', this.availableFunctions);
        if (!this.availableFunctions.includes(factoryName)) {
            throw new Error(`Function ${factoryName} not found in module. Available: ${this.availableFunctions.join(', ')}`);
        }
        try {
            // Execute the factory function with context
            const argsJson = JSON.stringify([context]);
            console.log('🏭 Executing factory function with args:', argsJson.substring(0, 200) + '...');
            const result = await (0, NativeConsumet_1.executeModuleFunction)(this.moduleId, factoryName, argsJson);
            console.log('🏭 Raw factory result:', result);
            let executionResult;
            let providerRef;
            try {
                executionResult = JSON.parse(result);
                console.log('🏭 Parsed factory result:', executionResult);
                // Check if it's a wrapped success result or direct provider reference
                if (executionResult.success !== undefined) {
                    // It's wrapped in { success: true, result: ... }
                    if (executionResult.success) {
                        providerRef = executionResult.result;
                    }
                    else {
                        throw new Error(executionResult.error || 'Factory function execution failed');
                    }
                }
                else if (executionResult._isProviderReference) {
                    // It's a direct provider reference object
                    providerRef = executionResult;
                }
                else {
                    // Unexpected format
                    throw new Error('Unexpected factory result format');
                }
            }
            catch (parseError) {
                console.error('🏭 Failed to parse factory result:', parseError);
                throw new Error('Failed to parse factory execution result');
            }
            // Verify this is a provider reference
            if (!providerRef._isProviderReference || !providerRef._providerId) {
                console.error('🏭 Invalid provider reference:', providerRef);
                throw new Error('Invalid provider reference received from QuickJS');
            }
            console.log('✅ Provider reference received:', {
                isReference: providerRef._isProviderReference,
                providerId: providerRef._providerId,
                availableMethods: providerRef._availableMethods,
                availableMethodsCount: providerRef._availableMethods?.length || 0,
                name: providerRef.name,
                baseUrl: providerRef.baseUrl,
            });
            // Create a proxy that routes method calls to the native provider instance
            const proxiedProvider = this.createProviderProxy(providerRef);
            console.log('🎯 Created proxied provider with ID:', providerRef._providerId);
            return proxiedProvider;
        }
        catch (error) {
            console.error(`❌ Failed to create provider with ${factoryName}:`, error);
            throw error;
        }
    }
    /**
     * Create a proxy that routes method calls to the native provider instance
     */
    createProviderProxy(providerRef) {
        // For provider references, we need to create a proxy that routes all method calls to QuickJS
        if (providerRef._isProviderReference) {
            const providerId = providerRef._providerId;
            const availableMethods = providerRef._availableMethods || [];
            console.log('🎯 Creating proxy for provider reference:', providerId);
            console.log('🎯 Available methods:', availableMethods);
            // Create a base object with the provider properties
            const baseProvider = {
                name: providerRef.name,
                baseUrl: providerRef.baseUrl,
                logo: providerRef.logo,
                classPath: providerRef.classPath,
                _providerId: providerId,
                _isProviderReference: true,
            };
            return new Proxy(baseProvider, {
                get: (target, prop) => {
                    // Return data properties directly using Object.getOwnPropertyDescriptor to avoid proxy recursion
                    const descriptor = Object.getOwnPropertyDescriptor(target, prop);
                    if (descriptor && typeof prop === 'string' && descriptor.value !== undefined) {
                        return descriptor.value;
                    }
                    // Handle special properties that shouldn't be proxied
                    if (typeof prop === 'string') {
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
                            return Reflect.get(target, prop, target);
                        }
                        // For provider methods, return a function that routes to QuickJS
                        if (availableMethods.includes(prop)) {
                            return (...args) => {
                                console.log(`🎯 Proxying method call: ${prop}`);
                                // Pass the provider ID as the first argument to identify the provider in QuickJS
                                return this.executeProviderMethod(prop, [{ _providerId: providerId }, ...args]);
                            };
                        }
                        // For unknown methods, still try to execute them (in case they exist but weren't detected)
                        return (...args) => {
                            console.log(`🎯 Attempting unknown method call: ${prop}`);
                            return this.executeProviderMethod(prop, [{ _providerId: providerId }, ...args]);
                        };
                    }
                    return Reflect.get(target, prop, target);
                },
            });
        }
        // Fallback to original proxy logic for non-reference objects
        return new Proxy(providerRef, {
            get: (target, prop) => {
                // For data properties that exist on target, return directly using Object.getOwnPropertyDescriptor
                // to avoid triggering the proxy recursively
                const descriptor = Object.getOwnPropertyDescriptor(target, prop);
                if (descriptor && typeof descriptor.value !== 'function') {
                    return descriptor.value;
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
                        // Use Reflect.get to avoid proxy recursion
                        return Reflect.get(target, prop, target);
                    }
                    // For provider methods that should be executed on the native side
                    return (...args) => {
                        return this.executeProviderMethod(prop, args);
                    };
                }
                // Use Reflect.get for other cases to avoid proxy recursion
                return Reflect.get(target, prop, target);
            },
        });
    }
    /**
     * Execute a provider method in the native module
     */
    async executeProviderMethod(methodName, args) {
        try {
            console.log(`🔍 Executing method ${methodName} with args:`, args);
            console.log(`🔍 Module loaded: ${this.isLoaded}, Available functions: ${this.availableFunctions.length}`);
            const argsJson = JSON.stringify(args);
            console.log(`🔍 Serialized args:`, argsJson.substring(0, 200) + '...');
            const result = await (0, NativeConsumet_1.executeModuleFunction)(this.moduleId, methodName, argsJson);
            console.log(`📋 Raw result from native execution:`, result);
            const executionResult = JSON.parse(result);
            console.log(`📋 Parsed execution result:`, executionResult);
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