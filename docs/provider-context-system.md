# Provider Context System

## Core Concepts

### 1. Provider Context (`ProviderContext`)

The main context interface that gets injected into every provider factory function.

```typescript
interface ProviderContext {
  axios: AxiosInstance;           // HTTP client for requests
  load: (html: string) => CheerioAPI;  // Cheerio for HTML parsing
  USER_AGENT: string;             // User agent for requests
  AnimeParser: typeof AnimeParser; // anime parser class
  MovieParser: typeof MovieParser; // movie parser class
  extractors: ExtractorRegistry;   // Video extractors (StreamSB, MegaCloud, etc.)
  logger?: Logger;                // Optional logging
}
```

### 2. Extractor Context (`ExtractorContext`)

A lighter context specifically for video extractors.

```typescript
interface ExtractorContext {
  axios: AxiosStatic;             // HTTP client
  load: (html: string) => CheerioAPI;  // HTML parser
  USER_AGENT?: string;            // User agent
  logger?: Logger;                // Optional logging
}
```

### 3. Context Factory (`createProviderContext`)

Utility function that creates fully configured contexts with sensible defaults.

## Usage Examples

### Basic Usage - Zero Configuration

```typescript
import { createZoro, createProviderContext } from 'react-native-consumet';

// Create context with all defaults (axios, cheerio, extractors pre-configured)
const context = createProviderContext();

// Create provider instance
const zoro = createZoro(context);

// Use it immediately
const results = await zoro.search('Naruto');
console.log(results.results); // Array of anime results
```

### Search Example

```typescript
const searchAnime = async () => {
  // Auto-configured context
  const context = createProviderContext();
  const provider = createZoro(context);
  
  // Search for anime
  const searchResults = await provider.search('Attack on Titan', 1);
  
  searchResults.results.forEach(anime => {
    console.log(`Title: ${anime.title}`);
    console.log(`ID: ${anime.id}`);
    console.log(`URL: ${anime.url}`);
    console.log(`Type: ${anime.type}`);
  });
};
```

### Get Anime Info Example

```typescript
const getAnimeInfo = async () => {
  const context = createProviderContext();
  const provider = createZoro(context);
  
  // Get detailed anime information
  const animeInfo = await provider.fetchAnimeInfo('attack-on-titan-112');
  
  console.log(`Title: ${animeInfo.title}`);
  console.log(`Description: ${animeInfo.description}`);
  console.log(`Status: ${animeInfo.status}`);
  console.log(`Episodes: ${animeInfo.totalEpisodes}`);
  
  // List all episodes
  animeInfo.episodes?.forEach(episode => {
    console.log(`Episode ${episode.number}: ${episode.title}`);
  });
};
```

### Get Episode Sources Example

```typescript
import { StreamingServers, SubOrSub } from 'react-native-consumet';

const getEpisodeSources = async () => {
  const context = createProviderContext();
  const provider = createZoro(context);
  
  // Get video sources for an episode
  const sources = await provider.fetchEpisodeSources(
    'attack-on-titan-112$episode$1234$sub',
    StreamingServers.VidCloud,
    SubOrSub.SUB
  );
  
  console.log(`Quality: ${sources.quality}`);
  sources.sources?.forEach(source => {
    console.log(`URL: ${source.url}`);
    console.log(`Quality: ${source.quality}`);
    console.log(`Type: ${source.isM3U8 ? 'HLS' : 'MP4'}`);
  });
};
```

## Customization Examples

### Custom Axios Configuration

```typescript
import axios from 'axios';

const customAxios = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'MyCustomBot/1.0',
    'Accept': 'application/json',
  },
});

const context = createProviderContext({
  axios: customAxios
});

const provider = createZoro(context);
```

### React Native Optimized

```typescript
import { createReactNativeProviderContext } from 'react-native-consumet';

// Optimized for mobile networks (longer timeouts, mobile user agents)
const context = createReactNativeProviderContext();
const provider = createZoro(context);
```

### Custom User Agent

```typescript
const context = createProviderContext({
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
});

const provider = createZoro(context);
```

### Custom Extractors

```typescript
class MyCustomExtractor {
  extract(url: URL): Promise<ISource> {
    // Custom extraction logic
    return Promise.resolve({ sources: [], quality: 'auto' });
  }
}

const context = createProviderContext({
  extractors: {
    MyCustomExtractor: MyCustomExtractor,
    // Still includes default extractors (StreamSB, MegaCloud, StreamTape)
  }
});
```

## Extension Loading Example

### Load Provider from GitHub

```typescript
import { loadProviderFromURL, createProviderContext } from 'react-native-consumet';

const loadProviderFromGitHub = async () => {
  // Download provider code from GitHub
  const module = await loadProviderFromURL(
    'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/dist/providers/anime/zoro.js'
  );
  
  // Create context with all dependencies
  const context = createProviderContext();
  
  // Create provider instance with injected dependencies
  const provider = module.createZoro(context);
  
  // Use immediately
  const results = await provider.search('One Piece');
  return results;
};
```

### Load Provider from URL

```typescript
import { createProviderFromURL } from 'react-native-consumet';

const loadProviderFromURL = async (providerUrl: string) => {
  try {
    // One-step provider creation with automatic context injection
    const provider = await createProviderFromURL(providerUrl, 'createProvider');
    
    return provider;
  } catch (error) {
    console.error('Failed to load provider:', error);
    throw error;
  }
};

// Usage
const provider = await loadProviderFromURL('https://my-server.com/custom-provider.js');
const anime = await provider.search('Dragon Ball');
```

## Advanced Examples

### Multiple Providers

```typescript
const useMultipleProviders = async () => {
  const context = createProviderContext();
  
  // Load multiple providers
  const zoro = createZoro(context);
  const gogoanime = createGogoanime(context); // If available
  
  // Search across multiple sources
  const [zoroResults, gogoResults] = await Promise.all([
    zoro.search('Demon Slayer'),
    gogoanime.search('Demon Slayer')
  ]);
  
  // Combine results
  const allResults = [
    ...zoroResults.results.map(r => ({ ...r, source: 'Zoro' })),
    ...gogoResults.results.map(r => ({ ...r, source: 'Gogoanime' }))
  ];
  
  return allResults;
};
```

### Provider with Custom Logger

```typescript
const customLogger = {
  log: (...args: any[]) => {
    // Send logs to analytics service
    analytics.track('provider_log', { message: args.join(' ') });
    console.log('[PROVIDER]', ...args);
  },
  error: (...args: any[]) => {
    // Send errors to error tracking service
    errorTracker.captureException(new Error(args.join(' ')));
    console.error('[PROVIDER ERROR]', ...args);
  }
};

const context = createProviderContext({
  logger: customLogger
});

const provider = createZoro(context);
```

### Proxy Support Example

```typescript
const proxyAxios = axios.create({
  proxy: {
    host: 'proxy.example.com',
    port: 8080,
    auth: {
      username: 'user',
      password: 'pass'
    }
  }
});

const context = createProviderContext({
  axios: proxyAxios
});

const provider = createZoro(context);
```

## Error Handling

```typescript
const safeProviderUsage = async () => {
  try {
    const context = createProviderContext();
    const provider = createZoro(context);
    
    const results = await provider.search('Anime Name');
    
    if (!results.results || results.results.length === 0) {
      console.log('No results found');
      return [];
    }
    
    return results.results;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
    } else if (error.response?.status === 404) {
      console.error('Anime not found');
    } else {
      console.error('Provider error:', error.message);
    }
    
    return [];
  }
};
```

## Benefits

### For Developers
- 🎯 **Zero Configuration** - Works out of the box
- 🔧 **Flexible** - Customize anything you need
- 📱 **Mobile Optimized** - React Native ready configurations
- 🚀 **Extension Ready** - Load providers from anywhere

### For Extension Creators
- 💉 **Dependency Injection** - No hardcoded dependencies
- 📦 **Lightweight** - Only bundle what you use
- 🔄 **Hot Updates** - Update providers without app releases
- 🌐 **Universal** - Works in any JavaScript environment

### For App Users
- ⚡ **Fast** - Optimized HTTP configurations
- 🛡️ **Reliable** - Robust error handling and timeouts
- 🔍 **Comprehensive** - Access to all video extractors
- 📺 **Quality** - Best available video sources

## Migration from Class-based Providers

### Before (Class-based)
```typescript
import { Zoro } from 'react-native-consumet';

const zoro = new Zoro();
const results = await zoro.search('Anime');
```

### After (Context-based)
```typescript
import { createZoro, createProviderContext } from 'react-native-consumet';

const context = createProviderContext();
const zoro = createZoro(context);
const results = await zoro.search('Anime');
```

### Backward Compatibility
```typescript
// Still works! Uses context factory internally
import { Zoro } from 'react-native-consumet';

const zoro = new Zoro();
const results = await zoro.search('Anime');
```

This context system provides the foundation for a truly extensible anime/manga scraping platform where providers can be loaded dynamically from any source while maintaining full dependency injection and configuration flexibility.
