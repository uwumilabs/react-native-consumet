# React Native Consumet - React### Why Use Extensions Architecture?

- **🔄 Dynamic Loading**: Load providers on-demand
- **🛠️ Unified API**: Consistent interface across all provider types
- **🔍 Cross-Provider Search**: Search across multiple providers simultaneously
- **🔧 Centralized Management**: Single interface for all provider operationsntegration Guide

This guide explains how to integrate and use the React Native Consumet library in your React applications. The library provides a powerful extension system for accessing anime, movie, and other media content providers.

> **⚠️ IMPORTANT: Extensions Architecture Required**
>
> React Native Consumet is built around an **extensions-based architecture**. This documentation assumes you're using the extension system with `ProviderManager`. If you're looking to use individual providers directly without the extension system, please refer to the appropriate provider guides in the [`docs/guides`](./guides/) directory:
>
> - **Anime Providers**: See [`docs/guides/anime.md`](./guides/anime.md)
> - **Movie Providers**: See [`docs/guides/movies.md`](./guides/movies.md)
> - **Manga Providers**: See [`docs/guides/manga.md`](./guides/manga.md)
> - **Light Novel Providers**: See [`docs/guides/light-novels.md`](./guides/light-novels.md)
> - **Meta Providers**: See [`docs/guides/meta.md`](./guides/meta.md)
>
> The extension architecture provides better performance, type safety, and unified provider management compared to using individual providers directly.

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Getting Started](#getting-started)
4. [ProviderManager](#providermanager)
5. [Provider Context](#provider-context)
6. [React Integration Examples](#react-integration-examples)
7. [Advanced Usage](#advanced-usage)
8. [Best Practices](#best-practices)

## Overview

React Native Consumet uses an **extension-based architecture** where media providers are loaded dynamically through a unified system. This approach offers several advantages over using individual providers directly:

### Why Use Extensions Architecture?

- **🔄 Dynamic Loading**: Load providers on-demand
- **🛠️ Unified API**: Consistent interface across all provider types
- **🔍 Cross-Provider Search**: Search across multiple providers simultaneously
- **🔧 Centralized Management**: Single interface for all provider operations

The library provides several key utilities:

- **ProviderManager**: Main interface for loading and managing providers
- **createProviderContext**: Context creation for providers

## Core Components

### 1. ProviderManager (`src/utils/ProviderManager.ts`)

The main class for managing provider extensions and executing provider code.

**Key Features:**

- Load providers from registry or URLs
- Type-safe provider interfaces
- Built-in caching and validation
- Cross-provider search capabilities

### 2. createProviderContext (`src/utils/create-provider-context.ts`)

Factory function for creating provider execution contexts with all necessary dependencies.

**Key Features:**

- HTTP client configuration
- HTML parsing setup
- Video extractor registry
- Custom configuration support

## Getting Started

### Installation

```bash
npm install react-native-consumet
# or
yarn add react-native-consumet
```

### Basic Setup

```typescript
import { ProviderManager } from 'react-native-consumet';

// Initialize the provider manager
const providerManager = new ProviderManager();
```

## Why Choose Extensions Over Individual Providers?

If you're considering whether to use the extensions architecture or individual providers, here's why the extension system is recommended:

### Extensions Architecture (Recommended) ✅

```typescript
// ✅ Recommended: Using ProviderManager with extensions
import { ProviderManager } from 'react-native-consumet';

const manager = new ProviderManager();
const provider = await manager.getAnimeProvider('zoro');
const results = await provider.search('Attack on Titan');
```

**Benefits:**

- **Lazy Loading**: Providers are loaded only when needed
- **Unified API**: Consistent methods across all provider types
- **Cross-Provider Search**: Search multiple providers simultaneously
- **Future-Proof**: Easy to add new providers without code changes

### Individual Providers (Legacy) ❌

```typescript
// ❌ Legacy approach: Direct provider imports
import { ANIME } from 'react-native-consumet';

const zoro = new ANIME.Zoro();
const results = await zoro.search('Attack on Titan');
```

**Limitations:**

- **Static Loading**: All providers loaded even if unused
- **Fragmented API**: Different interfaces for different providers
- **Manual Management**: You handle all provider lifecycle
- **No Cross-Provider Features**: Can't search multiple providers easily

> **📖 For Individual Provider Usage**: If you must use individual providers, refer to the specific guides in [`docs/guides/`](./guides/) for detailed examples and best practices for each provider type.

## ProviderManager

### Basic Usage

```typescript
import { ProviderManager } from 'react-native-consumet';

const providerManager = new ProviderManager({
  // Optional configuration
  userAgent: 'MyApp/1.0.0',
  timeout: 30000,
});

// Get available extensions
const extensions = providerManager.getAvailableExtensions();
console.log('Available providers:', extensions.map(ext => ext.name));

// Load and use an anime provider
const loadAnimeProvider = async () => {
  try {
    const provider = await providerManager.getAnimeProvider('zoro');
    
    // Search for anime
    const searchResults = await provider.search('Attack on Titan');
    console.log('Search results:', searchResults);
    
    // Get anime details
    if (searchResults.results.length > 0) {
      const animeInfo = await provider.fetchAnimeInfo(searchResults.results[0].id);
      console.log('Anime info:', animeInfo);
    }
  } catch (error) {
    console.error('Failed to load provider:', error);
  }
};
```

### Provider Types

```typescript
// Type-safe provider access
const animeProvider = await providerManager.getAnimeProvider('zoro');
const movieProvider = await providerManager.getMovieProvider('himovies');

// Generic provider access (less type-safe)
const genericProvider = await providerManager.getProvider('zoro');
```

### Cross-Provider Search

```typescript
const searchAllProviders = async (query: string) => {
  const results = await providerManager.searchAcrossProviders('anime', query);
  
  results.forEach(({ extensionId, results }) => {
    console.log(`Results from ${extensionId}:`, results.results.length);
  });
};
```

## Provider Context

### Basic Context Creation

```typescript
import {createProviderContext} from 'react-native-consumet';

// Create default context
const context = createProviderContext();

// Create custom context
const customContext = createProviderContext({
  userAgent: 'MyApp/1.0.0',
  timeout: 30000,
  logger: {
    log: (msg) => console.log('[PROVIDER]', msg),
    error: (msg) => console.error('[PROVIDER ERROR]', msg)
  }
});
```

### Custom HTTP Configuration

```typescript
import axios from 'axios';

const customAxios = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'MyCustomApp/1.0.0'
  },
  proxy: {
    host: 'proxy.example.com',
    port: 8080
  }
});

const context = createProviderContext({
  axios: customAxios
});
```

## React Integration Examples

### React Hook for Provider Management

```typescript
import { useState, useEffect, useCallback } from 'react';
import { ProviderManager } from 'react-native-consumet';

export const useProviderManager = () => {
  const [manager] = useState(() => new ProviderManager());
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const extensions = manager.getAvailableExtensions();
        setProviders(extensions);
      } catch (error) {
        console.error('Failed to load providers:', error);
      }
    };

    loadProviders();
  }, [manager]);

  const searchContent = useCallback(async (query: string, category: 'anime' | 'movies') => {
    setLoading(true);
    try {
      const results = await manager.searchAcrossProviders(category, query);
      return results;
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [manager]);

  return {
    manager,
    providers,
    searchContent,
    loading
  };
};
```

### React Component Example

```tsx
import React, { useState } from 'react';
import { useProviderManager } from './hooks/useProviderManager';

const AnimeSearch: React.FC = () => {
  const { searchContent, providers, loading } = useProviderManager();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    const searchResults = await searchContent(query, 'anime');
    setResults(searchResults);
  };

  return (
    <div>
      <h2>Anime Search</h2>
      
      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for anime..."
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div>
        <h3>Available Providers: {providers.length}</h3>
        {providers.map(provider => (
          <span key={provider.id} style={{ margin: '0 5px', padding: '2px 8px', background: '#eee' }}>
            {provider.name}
          </span>
        ))}
      </div>

      <div>
        <h3>Results</h3>
        {results.map(({ extensionId, results: providerResults }) => (
          <div key={extensionId}>
            <h4>{extensionId} ({providerResults.results.length} results)</h4>
            {providerResults.results.slice(0, 5).map(result => (
              <div key={result.id} style={{ margin: '10px 0', padding: '10px', border: '1px solid #ccc' }}>
                <img src={result.image} alt={result.title} style={{ width: '50px', height: '70px' }} />
                <h5>{result.title}</h5>
                <p>{result.description}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnimeSearch;
```

### Provider Details Component

```tsx
import React, { useState, useEffect } from 'react';
import { ProviderManager } from 'react-native-consumet';

interface ProviderDetailsProps {
  providerId: string;
  mediaId: string;
}

const ProviderDetails: React.FC<ProviderDetailsProps> = ({ providerId, mediaId }) => {
  const [provider, setProvider] = useState(null);
  const [mediaInfo, setMediaInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProviderAndMedia = async () => {
      try {
        const manager = new ProviderManager();
        const loadedProvider = await manager.getAnimeProvider(providerId);
        setProvider(loadedProvider);

        const info = await loadedProvider.fetchAnimeInfo(mediaId);
        setMediaInfo(info);
      } catch (error) {
        console.error('Failed to load provider or media:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProviderAndMedia();
  }, [providerId, mediaId]);

  if (loading) return <div>Loading...</div>;
  if (!mediaInfo) return <div>Media not found</div>;

  return (
    <div>
      <h2>{mediaInfo.title}</h2>
      <img src={mediaInfo.image} alt={mediaInfo.title} />
      <p>{mediaInfo.description}</p>
      
      <h3>Episodes ({mediaInfo.episodes?.length || 0})</h3>
      {mediaInfo.episodes?.map(episode => (
        <div key={episode.id}>
          <h4>Episode {episode.number}: {episode.title}</h4>
        </div>
      ))}
    </div>
  );
};
```

## Advanced Usage

### Custom Provider Context

```typescript
import createProviderContext from 'react-native-consumet/utils/create-provider-context';

// Create context with custom extractors
const context = createProviderContext({
  extractors: {
    MyCustomExtractor: CustomExtractorClass,
    // Override default extractors
    MegaCloud: MyMegaCloudExtractor
  },
  logger: {
    log: (msg) => analytics.track('provider_log', { message: msg }),
    error: (msg) => errorReporting.captureException(new Error(msg))
  }
});
```

### Caching and Performance

```typescript
class CachedProviderManager {
  private cache = new Map();
  private manager = new ProviderManager();

  async getProvider(id: string) {
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }

    const provider = await this.manager.getProvider(id);
    this.cache.set(id, provider);
    return provider;
  }

  // Cache search results
  async search(providerId: string, query: string) {
    const cacheKey = `${providerId}:${query}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const provider = await this.getProvider(providerId);
    const results = await provider.search(query);
    
    // Cache for 5 minutes
    this.cache.set(cacheKey, results);
    setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
    
    return results;
  }
}
```

### Error Handling

```typescript
const robustProviderManager = {
  async searchWithFallback(query: string) {
    const providers = ['zoro', 'gogoanime', 'animepahe'];
    
    for (const providerId of providers) {
      try {
        const manager = new ProviderManager();
        const provider = await manager.getAnimeProvider(providerId);
        const results = await provider.search(query);
        
        if (results.results.length > 0) {
          return { provider: providerId, results };
        }
      } catch (error) {
        console.warn(`Provider ${providerId} failed:`, error);
        continue;
      }
    }
    
    throw new Error('All providers failed');
  }
};
```

## Best Practices

### 1. Architecture Choice

**✅ Always prefer Extensions Architecture:**

- Use `ProviderManager` for all new projects
- Provides unified API across all provider types
- Enables advanced features like cross-provider search

**📖 When to use Individual Providers:**

- Legacy projects that can't be migrated immediately
- Very specific use cases requiring direct provider access
- Educational purposes or debugging specific providers

**🔄 If using individual providers, consider migrating:**

```typescript
// Instead of this (individual provider):
import { ANIME } from 'react-native-consumet';
const zoro = new ANIME.Zoro();

// Use this (extensions architecture):
import { ProviderManager } from 'react-native-consumet';
const manager = new ProviderManager();
const zoro = await manager.getAnimeProvider('zoro');
```

For individual provider usage, consult the specific guides:

- [`docs/guides/anime.md`](./guides/anime.md) - Anime provider examples
- [`docs/guides/movies.md`](./guides/movies.md) - Movie provider examples  
- [`docs/guides/manga.md`](./guides/manga.md) - Manga provider examples
- [`docs/guides/light-novels.md`](./guides/light-novels.md) - Light novel provider examples
- [`docs/guides/meta.md`](./guides/meta.md) - Meta provider examples

### 2. Provider Management

- Initialize ProviderManager once and reuse it
- Use appropriate provider methods for your use case
- Handle network failures gracefully

### 3. React Integration

- Use React hooks for provider state management
- Implement loading states for better UX
- Consider using React Query or SWR for advanced caching

## API Reference

### ProviderManager Methods

```typescript
class ProviderManager {
  // Get extensions
  getAvailableExtensions(): ExtensionManifest[]
  getExtensionsByCategory(category: ProviderType): ExtensionManifest[]
  getExtensionMetadata(extensionId: string): ExtensionManifest | null
  
  // Load providers
  getAnimeProvider(extensionId: string): Promise<AnimeProviderInstance>
  getMovieProvider(extensionId: string): Promise<MovieProviderInstance>
  getProvider(extensionId: string): Promise<BaseProviderInstance>
  
  // Search
  searchAcrossProviders(category: ProviderType, query: string, page?: number): Promise<SearchResult[]>
  
  // Context
  getProviderContext(): ProviderContext
  getRegistryMetadata(): RegistryMetadata
}
```

This documentation provides a comprehensive guide for integrating React Native Consumet into React applications, covering everything from basic setup to advanced usage patterns.
