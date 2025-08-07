import type { ProviderContext } from '../models/provider-context';

let nodejs: any = null;
let initializationError: Error | null = null;

// Add React Native environment check
function isReactNativeEnvironment(): boolean {
  try {
    // Check if we're in a React Native environment
    return (
      (typeof global !== 'undefined' && (global as any).HermesInternal !== undefined) ||
      (typeof (global as any).navigator !== 'undefined' && (global as any).navigator.product === 'ReactNative')
    );
  } catch {
    return false;
  }
}

try {
  console.log('🔧 Environment check:', {
    isReactNative: isReactNativeEnvironment(),
    platform: typeof (global as any).navigator !== 'undefined' ? (global as any).navigator.product : 'unknown',
    hasGlobal: typeof global !== 'undefined',
    hasHermes: typeof global !== 'undefined' && (global as any).HermesInternal !== undefined,
  });

  if (!isReactNativeEnvironment()) {
    console.warn('⚠️ Warning: Not running in React Native environment. nodejs-mobile-react-native may not work.');
  }

  console.log('🔧 Attempting to load nodejs-mobile-react-native...');
  nodejs = require('nodejs-mobile-react-native');
  console.log('✅ nodejs-mobile-react-native loaded successfully');
  console.log('📦 Available methods:', Object.getOwnPropertyNames(nodejs));
} catch (error) {
  console.error('❌ Failed to load nodejs-mobile-react-native:', error);
  initializationError = error instanceof Error ? error : new Error('Unknown error loading nodejs-mobile-react-native');
}

/**
 * Check if Node.js mobile is properly initialized
 */
function checkNodeJSAvailability(): void {
  if (initializationError) {
    throw new Error(`nodejs-mobile-react-native failed to initialize: ${initializationError.message}`);
  }

  if (!nodejs) {
    throw new Error(
      'nodejs-mobile-react-native is not available. Please ensure:\n' +
        '1. The package is properly installed\n' +
        '2. React Native is properly linked\n' +
        '3. Platform-specific setup is complete'
    );
  }

  // Check if required methods exist
  if (typeof nodejs.start !== 'function') {
    throw new Error('nodejs-mobile-react-native.start is not available. The module may not be properly linked.');
  }

  if (!nodejs.channel) {
    throw new Error('nodejs-mobile-react-native.channel is not available. The module may not be properly linked.');
  }
}

/**
 * Node.js-based provider module that replaces QuickJS implementation
 * This provides full Node.js runtime with native fetch support
 */
export class NodeProviderModule {
  private isNodeReady: boolean = false;
  private moduleId: string;
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout?: NodeJS.Timeout }> = new Map();
  private requestCounter: number = 0;

  constructor(moduleId: string) {
    this.moduleId = moduleId;
    this.initializeNode();
  }

  /**
   * Initialize Node.js runtime and set up message handling
   */
  private initializeNode(): void {
    console.log('🚀 Starting Node.js runtime initialization...');

    if (this.isNodeReady) {
      console.log('✅ Node.js runtime already initialized');
      return;
    }

    // Check if nodejs-mobile-react-native is available
    try {
      checkNodeJSAvailability();
    } catch (error) {
      console.error('❌ Node.js availability check failed:', error);
      throw error;
    }

    console.log('📦 nodejs-mobile-react-native is available, starting runtime...');

    try {
      // Start Node.js runtime with our main script
      console.log('🔧 Calling nodejs.start("main.js")...');
      nodejs.start('main.js'); // Use 'test.js' as the test point for Node.js runtime
      console.log('✅ nodejs.start() completed successfully');

      // Listen for messages from Node.js
      console.log('🔧 Setting up message listener...');
      nodejs.channel.addListener('message', (msg: any) => {
        this.handleNodeMessage(msg);
      });
      console.log('✅ Message listener set up successfully');

      console.log('🚀 Node.js runtime initialization started successfully');
    } catch (error) {
      console.error('❌ Failed to start Node.js runtime:', error);
      throw new Error(
        `Failed to initialize Node.js runtime: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle messages from Node.js runtime
   */
  private handleNodeMessage(msg: any): void {
    try {
      console.log('📨 Received message from Node.js:', msg);

      if (msg.type === 'ready') {
        this.isNodeReady = true;
        console.log('✅ Node.js runtime is ready');
        return;
      }

      if (msg.id && this.pendingRequests.has(msg.id)) {
        const request = this.pendingRequests.get(msg.id)!;

        // Clear timeout if exists
        if (request.timeout) {
          clearTimeout(request.timeout);
        }

        this.pendingRequests.delete(msg.id);

        if (msg.success) {
          request.resolve(msg.result);
        } else {
          request.reject(new Error(msg.error || 'Unknown error from Node.js'));
        }
      }
    } catch (error) {
      console.error('❌ Error handling Node.js message:', error);
    }
  }

  /**
   * Send a message to Node.js and wait for response
   */
  private async sendToNode(type: string, payload: any, timeoutMs: number = 30000): Promise<any> {
    console.log(`📤 Preparing to send message to Node.js: ${type}`);

    try {
      checkNodeJSAvailability();
    } catch (error) {
      console.error('❌ Node.js not available for message sending:', error);
      throw error;
    }

    if (!this.isNodeReady) {
      console.log('⏳ Node.js not ready, waiting...');
      // Wait for Node.js to be ready
      await this.waitForNodeReady();
    }

    return new Promise((resolve, reject) => {
      const id = `req_${++this.requestCounter}_${Date.now()}`;

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Node.js request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // Store request
      this.pendingRequests.set(id, { resolve, reject, timeout });

      // Send message
      const message = { type, payload, id };
      console.log('📤 Sending to Node.js:', message);

      try {
        nodejs.channel.send(message);
        console.log('✅ Message sent successfully');
      } catch (error) {
        console.error('❌ Failed to send message to Node.js:', error);
        this.pendingRequests.delete(id);
        clearTimeout(timeout);
        reject(
          new Error(`Failed to send message to Node.js: ${error instanceof Error ? error.message : 'Unknown error'}`)
        );
      }
    });
  }

  /**
   * Wait for Node.js runtime to be ready
   */
  private async waitForNodeReady(timeoutMs: number = 10000): Promise<void> {
    if (this.isNodeReady) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Node.js runtime startup timeout'));
      }, timeoutMs);

      const checkReady = () => {
        if (this.isNodeReady) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  }

  /**
   * Execute provider code and method in Node.js runtime
   */
  async executeProvider(providerCode: string, methodName: string, args: any[]): Promise<any> {
    try {
      console.log(`🔧 Executing provider method: ${methodName}`);
      console.log(`🔧 Provider code length: ${providerCode.length} characters`);
      console.log(`🔧 Method args:`, args);

      const result = await this.sendToNode('executeProvider', {
        providerCode,
        methodName,
        args,
      });

      console.log(`✅ Provider method ${methodName} executed successfully:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Failed to execute provider method ${methodName}:`, error);
      throw error;
    }
  }

  /**
   * Test Node.js connectivity
   */
  async ping(): Promise<number> {
    try {
      const startTime = Date.now();
      await this.sendToNode('ping', {});
      const endTime = Date.now();
      return endTime - startTime;
    } catch (error) {
      console.error('❌ Node.js ping failed:', error);
      throw error;
    }
  }

  /**
   * Check if Node.js runtime is ready
   */
  get ready(): boolean {
    return this.isNodeReady;
  }

  /**
   * Get module ID
   */
  get id(): string {
    return this.moduleId;
  }
}

/**
 * Load a provider from code using Node.js runtime
 */
export async function loadProviderFromCodeNode(
  code: string,
  factoryName: string,
  context: ProviderContext
): Promise<any> {
  // Create Node.js module instance
  const moduleId = `node_provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const nodeModule = new NodeProviderModule(moduleId);

  // Wait for Node.js to be ready
  console.log('⏳ Waiting for Node.js runtime to be ready...');
  if (!nodeModule.ready) {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Node.js runtime startup timeout'));
      }, 10000);

      const checkReady = () => {
        if (nodeModule.ready) {
          clearTimeout(timeout);
          resolve(undefined);
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  }

  console.log('✅ Node.js runtime is ready, testing connectivity...');

  // Test connectivity
  try {
    const pingTime = await nodeModule.ping();
    console.log(`🏓 Node.js ping successful: ${pingTime}ms`);
  } catch (error) {
    console.error('❌ Node.js ping failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Node.js runtime not responding: ${errorMessage}`);
  }

  // Execute the factory function to create provider instance
  console.log(`🏭 Creating provider instance using factory: ${factoryName}`);

  try {
    // First, we need to execute the code to get the factory function
    // Then execute the factory with context to create the provider instance
    const providerInstance = await nodeModule.executeProvider(code, factoryName, [context]);

    console.log('🎯 Provider instance created:', {
      name: providerInstance?.name,
      baseUrl: providerInstance?.baseUrl,
      hasProperties: Object.keys(providerInstance || {}).length,
    });

    // Create a proxy that routes method calls to Node.js
    const proxiedProvider = createNodeProviderProxy(nodeModule, code, providerInstance);

    // Attach cleanup method
    proxiedProvider._cleanup = () => {
      // Node.js runtime persists, no cleanup needed for now
      console.log('🧹 Provider cleanup completed');
    };
    proxiedProvider._moduleId = moduleId;
    proxiedProvider._nodeModule = nodeModule;

    return proxiedProvider;
  } catch (error) {
    console.error(`❌ Failed to create provider instance:`, error);
    throw error;
  }
}

/**
 * Create a proxy that routes method calls to Node.js runtime
 */
function createNodeProviderProxy(nodeModule: NodeProviderModule, code: string, baseProvider: any): any {
  return new Proxy(baseProvider || {}, {
    get: (target, prop) => {
      // Return data properties directly
      if (typeof prop === 'string' && target[prop] !== undefined && typeof target[prop] !== 'function') {
        return target[prop];
      }

      // Handle special properties that shouldn't be proxied
      if (typeof prop === 'string') {
        if (
          prop === 'then' ||
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
          typeof prop === 'symbol'
        ) {
          return Reflect.get(target, prop, target);
        }

        // For provider methods, return a function that routes to Node.js
        return async (...args: any[]) => {
          console.log(`🎯 Proxying method call to Node.js: ${prop}`);
          return await nodeModule.executeProvider(code, prop, args);
        };
      }

      return Reflect.get(target, prop, target);
    },
  });
}

/**
 * Load a provider from URL using Node.js runtime
 */
export async function loadProviderFromURLNode(
  url: string,
  factoryName: string,
  context: ProviderContext
): Promise<any> {
  // Fetch the code
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch provider: ${response.status} ${response.statusText}`);
  }

  const code = await response.text();

  // Use the code-based loader
  return await loadProviderFromCodeNode(code, factoryName, context);
}
