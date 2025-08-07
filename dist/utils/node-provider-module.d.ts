import type { ProviderContext } from '../models/provider-context';
/**
 * Node.js-based provider module that replaces QuickJS implementation
 * This provides full Node.js runtime with native fetch support
 */
export declare class NodeProviderModule {
    private isNodeReady;
    private moduleId;
    private pendingRequests;
    private requestCounter;
    constructor(moduleId: string);
    /**
     * Initialize Node.js runtime and set up message handling
     */
    private initializeNode;
    /**
     * Handle messages from Node.js runtime
     */
    private handleNodeMessage;
    /**
     * Send a message to Node.js and wait for response
     */
    private sendToNode;
    /**
     * Wait for Node.js runtime to be ready
     */
    private waitForNodeReady;
    /**
     * Execute provider code and method in Node.js runtime
     */
    executeProvider(providerCode: string, methodName: string, args: any[]): Promise<any>;
    /**
     * Test Node.js connectivity
     */
    ping(): Promise<number>;
    /**
     * Check if Node.js runtime is ready
     */
    get ready(): boolean;
    /**
     * Get module ID
     */
    get id(): string;
}
/**
 * Load a provider from code using Node.js runtime
 */
export declare function loadProviderFromCodeNode(code: string, factoryName: string, context: ProviderContext): Promise<any>;
/**
 * Load a provider from URL using Node.js runtime
 */
export declare function loadProviderFromURLNode(url: string, factoryName: string, context: ProviderContext): Promise<any>;
//# sourceMappingURL=node-provider-module.d.ts.map