# Extension Development Guide


## Core Utility Functions

### 1. `evaluateProviderCode(code, allowedGlobals?)`
Safely evaluates JavaScript code for dynamic provider loading with basic security features.

```typescript
import { evaluateProviderCode } from 'react-native-consumet';

const providerCode = `
  export const createMyProvider = (context) => {
    return {
      search: async (query) => {
        const response = await context.axios.get(\`/search?q=\${query}\`);
        return response.data;
      }
    };
  };
`;

const module = evaluateProviderCode(providerCode);
const provider = module.createMyProvider(context);
```

### 2. `loadProviderFromURL(url, config?)`
Loads a provider from any URL with caching and timeout support.

```typescript
import { loadProviderFromURL } from 'react-native-consumet';

const module = await loadProviderFromURL(
  'https://raw.githubusercontent.com/user/repo/main/providers/anime-provider.js',
  {
    timeout: 15000,
    cache: true
  }
);
```

### 3. `createProviderFromURL(url, factoryName, config?)`
One-step provider creation with automatic context injection.

```typescript
import { createProviderFromURL } from 'react-native-consumet';

// Automatically creates context and instantiates provider
const zoro = await createProviderFromURL(
  'https://example.com/zoro-provider.js',
  'createZoro'
);

const results = await zoro.search('Naruto');
```

### 4. `loadMultipleProviders(providers, config?)`
Load multiple providers in parallel from different sources.

```typescript
import { loadMultipleProviders } from 'react-native-consumet';

const providers = await loadMultipleProviders([
  { name: 'zoro', url: 'https://example.com/zoro.js', factory: 'createZoro' },
  { name: 'gogo', url: 'https://example.com/gogo.js', factory: 'createGogo' },
  { name: 'anilist', url: 'https://example.com/anilist.js', factory: 'createAnilist' }
]);

// Use any provider
const results = await providers.zoro.search('Attack on Titan');
const info = await providers.anilist.fetchAnimeInfo('123');
```

### 5. `validateProviderModule(module, expectedFactories?)`
Validate provider modules before using them.

```typescript
import { validateProviderModule } from 'react-native-consumet';

const validation = validateProviderModule(module, ['createZoro', 'createGogo']);

if (!validation.isValid) {
  console.error('Provider validation failed:', validation.errors);
} else {
  console.log('Available factories:', validation.factories);
}
```

### 6. `testProviderURL(url, config?)`
Test if a provider URL is accessible and contains valid code.

```typescript
import { testProviderURL } from 'react-native-consumet';

const test = await testProviderURL('https://example.com/provider.js');

console.log(`Provider is ${test.isValid ? 'valid' : 'invalid'}`);
console.log(`Load time: ${test.loadTime}ms`);
console.log(`Available factories: ${test.factories.join(', ')}`);

if (!test.isValid) {
  console.error('Errors:', test.errors);
}
```

### 7. Cache Management
```typescript
import { 
  clearExtensionCache, 
  getCachedExtensions 
} from 'react-native-consumet';

// Clear specific extension
clearExtensionCache('https://example.com/provider.js');

// Clear all cached extensions
clearExtensionCache();

// See what's cached
const cachedUrls = getCachedExtensions();
console.log('Cached extensions:', cachedUrls);
```

## Real-World Examples

### Building a Provider Registry

```typescript
import { 
  loadMultipleProviders, 
  testProviderURL, 
  createProviderContext 
} from 'react-native-consumet';

class ProviderRegistry {
  private providers = new Map();
  private context = createProviderContext();

  async registerProvider(name: string, url: string, factoryName: string) {
    try {
      // Test the provider first
      const test = await testProviderURL(url);
      if (!test.isValid) {
        throw new Error(`Invalid provider: ${test.errors.join(', ')}`);
      }

      // Load and register
      const provider = await createProviderFromURL(url, factoryName, {
        context: this.context
      });

      this.providers.set(name, provider);
      console.log(`Registered provider '${name}' with factories: ${test.factories.join(', ')}`);
    } catch (error) {
      console.error(`Failed to register provider '${name}':`, error);
    }
  }

  async search(query: string) {
    const results = [];
    
    for (const [name, provider] of this.providers) {
      try {
        const result = await provider.search(query);
        results.push({ source: name, ...result });
      } catch (error) {
        console.warn(`Search failed for ${name}:`, error);
      }
    }

    return results;
  }

  getProvider(name: string) {
    return this.providers.get(name);
  }
}

// Usage
const registry = new ProviderRegistry();

await registry.registerProvider('zoro', 'https://example.com/zoro.js', 'createZoro');
await registry.registerProvider('gogo', 'https://example.com/gogo.js', 'createGogo');

const results = await registry.search('One Piece');
```

### React Native App with Dynamic Providers

```typescript
import React, { useState, useEffect } from 'react';
import { 
  createProviderFromURL, 
  createReactNativeProviderContext,
  testProviderURL 
} from 'react-native-consumet';

const AnimeApp = () => {
  const [providers, setProviders] = useState(new Map());
  const [loading, setLoading] = useState(false);

  const addProvider = async (name: string, url: string, factoryName: string) => {
    setLoading(true);
    try {
      // Test provider first
      const test = await testProviderURL(url);
      if (!test.isValid) {
        alert(`Invalid provider: ${test.errors.join(', ')}`);
        return;
      }

      // Load with React Native optimized context
      const provider = await createProviderFromURL(url, factoryName, {
        context: createReactNativeProviderContext()
      });

      setProviders(prev => new Map(prev).set(name, provider));
      alert(`Successfully added ${name} provider`);
    } catch (error) {
      alert(`Failed to add provider: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const searchAnime = async (query: string) => {
    const results = [];
    
    for (const [name, provider] of providers) {
      try {
        const result = await provider.search(query);
        results.push({ source: name, data: result });
      } catch (error) {
        console.warn(`Search failed for ${name}:`, error);
      }
    }

    return results;
  };

  return (
    // Your React Native UI here
    <div>
      <button onClick={() => addProvider('zoro', 'https://example.com/zoro.js', 'createZoro')}>
        Add Zoro Provider
      </button>
      {/* Rest of your UI */}
    </div>
  );
};
```

### Web Extension with Hot Reloading

```typescript
import { 
  loadProviderFromURL, 
  clearExtensionCache,
  createProviderContext 
} from 'react-native-consumet';

class ExtensionManager {
  private providers = new Map();
  private watchList = new Set();

  async loadProvider(name: string, url: string, factoryName: string, hotReload = false) {
    try {
      // Clear cache for hot reload
      if (hotReload) {
        clearExtensionCache(url);
      }

      const module = await loadProviderFromURL(url, { cache: !hotReload });
      const provider = module[factoryName](createProviderContext());

      this.providers.set(name, provider);
      
      if (hotReload) {
        console.log(`Hot reloaded provider: ${name}`);
      }

      return provider;
    } catch (error) {
      console.error(`Failed to load ${name}:`, error);
      throw error;
    }
  }

  startWatching(name: string, url: string, factoryName: string, interval = 30000) {
    this.watchList.add({ name, url, factoryName });
    
    const checkForUpdates = async () => {
      try {
        await this.loadProvider(name, url, factoryName, true);
      } catch (error) {
        console.error(`Hot reload failed for ${name}:`, error);
      }
    };

    setInterval(checkForUpdates, interval);
  }
}
```

## Benefits for Extension Developers

### 🚀 **Zero Configuration**
```typescript
// Just works out of the box
const provider = await createProviderFromURL(url, 'createProvider');
```

### 🔧 **Flexible Configuration**
```typescript
// Custom axios, timeouts, caching
const provider = await createProviderFromURL(url, 'createProvider', {
  context: createProviderContext({ 
    axios: customAxios,
    timeout: 30000 
  }),
  timeout: 15000,
  cache: false
});
```

### 📱 **React Native Ready**
```typescript
// Mobile-optimized configurations
const context = createReactNativeProviderContext();
```

### 🛡️ **Built-in Validation**
```typescript
// Automatic provider validation
const test = await testProviderURL(url);
if (test.isValid) { /* safe to use */ }
```

### ⚡ **Performance Optimized**
- Automatic caching
- Parallel loading
- Timeout handling
- Error recovery

### 🔄 **Hot Reloading Support**
```typescript
// Clear cache for immediate updates
clearExtensionCache(url);
const updatedProvider = await loadProviderFromURL(url);
```