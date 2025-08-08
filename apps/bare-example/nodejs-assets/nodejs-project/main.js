const rn_bridge = require('rn-bridge');
const vm = require('vm');
const { Buffer } = require('buffer');


// Enhanced logging function
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Node.js] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Available modules that providers can use
const availableModules = {
  axios: require('axios'),
  cheerio: require('cheerio'),
  crypto: require('crypto'),
  url: require('url'),
  util: require('util'),
  fs: require('fs'),
  path: require('path'),
};

// Create a require function for the sandbox
function createSandboxRequire() {
  return function (moduleId) {
    if (availableModules[moduleId]) {
      return availableModules[moduleId];
    }
    // Allow core Node.js modules
    try {
      return require(moduleId);
    } catch (error) {
      throw new Error(`Module '${moduleId}' is not available in sandbox`);
    }
  };
}

// Create fetch implementation using axios
function createFetch() {
  const axios = require('axios');

  return async function fetch(url, options = {}) {
    try {
      const config = {
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        data: options.body,
        timeout: 30000,
        validateStatus: () => true, // Don't throw on HTTP error status
      };

      const response = await axios(config);

      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        headers: new Map(Object.entries(response.headers)),
        url: response.config.url,
        text: async () => response.data,
        json: async () => {
          if (typeof response.data === 'string') {
            return JSON.parse(response.data);
          }
          return response.data;
        },
      };
    } catch (error) {
      throw new Error(`Fetch failed: ${error.message}`);
    }
  };
}

// Execute provider code in a sandbox
async function executeProviderCode(providerCode, methodName, args) {
  try {
    log('Starting provider code execution:', { methodName, argsLength: args?.length });

    // Create sandbox context
    const sandbox = {
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Buffer,
      process: {
        env: process.env,
        version: process.version,
        versions: process.versions,
      },
      require: createSandboxRequire(),
      fetch: createFetch(),
      URL,
      URLSearchParams,
      module: { exports: {} },
      exports: {},
      __filename: 'provider.js',
      __dirname: '/',
    };

    log('Created sandbox context');

    // Create VM context
    const context = vm.createContext(sandbox);
    log('Created VM context');

    // Execute the provider code
    log('Executing provider code in VM...');
    vm.runInContext(providerCode, context);
    log('Provider code executed successfully');

    // Get the exported provider class
    const ProviderClass = sandbox.module.exports.default || sandbox.module.exports;
    log('Retrieved provider class:', { hasClass: !!ProviderClass, type: typeof ProviderClass });

    if (!ProviderClass || typeof ProviderClass !== 'function') {
      throw new Error('Provider must export a class as default export');
    }

    // Create provider instance
    log('Creating provider instance...');
    const provider = new ProviderClass();
    log('Provider instance created successfully');

    // Check if method exists
    if (!provider[methodName] || typeof provider[methodName] !== 'function') {
      log('Method not found on provider:', { methodName, availableMethods: Object.getOwnPropertyNames(provider) });
      throw new Error(`Method '${methodName}' not found on provider`);
    }

    log('Calling provider method:', { methodName, argsCount: args?.length });
    // Execute the method
    const result = await provider[methodName](...args);
    log('Provider method executed successfully:', { methodName, resultType: typeof result });
    return result;
  } catch (error) {
    log('Provider execution error:', { message: error.message, stack: error.stack });
    console.error('Provider execution error:', error);
    throw error;
  }
}

// New function to initialize provider from GitHub code
async function initializeProviderFromCode(providerCode, contextDataString) {
  try {
    log('Starting provider initialization from GitHub code...');

    // Parse context data
    const contextData = JSON.parse(contextDataString);
    log('Parsed context data:', { hasLoad: !!contextData.load, hasExtractors: !!contextData.extractors });

    // Create sandbox context with provider context
    const sandbox = {
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Buffer,
      process: {
        env: process.env,
        version: process.version,
        versions: process.versions,
      },
      require: createSandboxRequire(),
      fetch: createFetch(),
      URL,
      URLSearchParams,
      module: { exports: {} },
      exports: {},
      __filename: 'zoro.js',
      __dirname: '/',
      // Add provider context to sandbox
      createReactNativeProviderContext: () => contextData,
    };

    log('Created sandbox context for provider initialization');

    // Create VM context
    const context = vm.createContext(sandbox);
    log('Created VM context');

    // Execute the provider code (this will define createZoro function and exports)
    log('Executing provider code in VM...');
    vm.runInContext(providerCode, context);
    log('Provider code executed successfully');

    // Get the createZoro function from exports
    const createZoro = sandbox.module.exports.createZoro || sandbox.exports.createZoro;
    log('Retrieved createZoro function:', { hasCreateZoro: !!createZoro, type: typeof createZoro });

    if (!createZoro || typeof createZoro !== 'function') {
      throw new Error('Provider must export a createZoro function');
    }

    // Create provider instance using createZoro with context
    log('Creating provider instance with context...');
    const provider = createZoro(contextData);
    log('Provider instance created successfully');

    // Create a proxy object with the methods we can call from React Native
    const providerProxy = {
      search: async (query, page = 1) => {
        log('Executing search:', { query, page });
        const result = await provider.search(query, page);
        log('Search completed:', { resultCount: result?.results?.length || 0 });
        return result;
      },
      fetchAnimeInfo: async (id) => {
        log('Executing fetchAnimeInfo:', { id });
        const result = await provider.fetchAnimeInfo(id);
        log('fetchAnimeInfo completed:', { title: result?.title });
        return result;
      },
      fetchEpisodeSources: async (episodeId, server, subOrDub) => {
        log('Executing fetchEpisodeSources:', { episodeId, server, subOrDub });
        const result = await provider.fetchEpisodeSources(episodeId, server, subOrDub);
        log('fetchEpisodeSources completed:', { sourcesCount: result?.sources?.length || 0 });
        return result;
      }
    };

    log('Provider proxy created with methods:', Object.keys(providerProxy));
    return providerProxy;

  } catch (error) {
    log('Provider initialization error:', { message: error.message, stack: error.stack });
    console.error('Provider initialization error:', error);
    throw error;
  }
}

// Handle messages from React Native
rn_bridge.channel.on('message', async (msg) => {
  try {
    log('Received message from React Native:', msg);
    const { type, payload, id } = msg;

    switch (type) {
      case 'executeProvider':
        if (payload.code && payload.contextData) {
          // New provider initialization flow
          log('Initializing provider from GitHub code...');
          const result = await initializeProviderFromCode(payload.code, payload.contextData);
          log('Provider initialization completed:', result);

          rn_bridge.channel.send({
            type: 'providerReady',
            id,
            success: true,
            provider: result,
          });
        } else {
          // Original executeProvider flow
          log('Executing provider with payload:', payload);
          const { providerCode, methodName, args } = payload;
          const result = await executeProviderCode(providerCode, methodName, args);

          log('Provider execution completed successfully:', { methodName, result });
          rn_bridge.channel.send({
            type: 'executeProviderResult',
            id,
            success: true,
            result,
          });
        }
        break;

      case 'ping':
        log('Received ping, sending pong');
        rn_bridge.channel.send({
          type: 'pong',
          id,
          timestamp: Date.now(),
        });
        break;

      default:
        log('Unknown message type received:', type);
        rn_bridge.channel.send({
          type: 'error',
          id,
          success: false,
          error: `Unknown message type: ${type}`,
        });
        break;
    }
  } catch (error) {
    log('Node.js error occurred:', { error: error.message, stack: error.stack });
    console.error('Node.js error:', error);
    rn_bridge.channel.send({
      type: 'error',
      id: msg.id,
      success: false,
      error: error.message || 'Unknown error occurred',
    });
  }
});

// Inform React Native that Node.js is ready
log('Initializing Node.js runtime...');

rn_bridge.channel.send({
  type: 'ready',
  message: 'Node.js runtime initialized successfully',
});

log('Node.js runtime ready message sent to React Native');
console.log('Node.js runtime started successfully');

// Add error handler for the bridge
rn_bridge.channel.on('error', (error) => {
  log('Bridge error occurred:', error);
  console.error('Bridge error:', error);
});

// Add additional logging for bridge events
log('Setting up message listeners...');
log('Node.js runtime initialization complete');
log('Waiting for messages from React Native...');
