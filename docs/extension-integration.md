# React Native Consumet - Extension Integration Guide

A powerful React Native library for accessing anime, movie, and media content through a unified extension system.

## Table of Contents
- [Basic Usage](#basic-usage)
- [Why Use Extensions?](#why-use-extensions)
- [Core Components](#core-components)
- [Usage Examples](#usage-examples)
- [Custom HTTP Configuration](#custom-http-configuration)
- [Extractor Usage Example](#extractor-usage-example)
- [React Integration](#react-integration)
- [API Reference](#api-reference)
- [Some Helpful imports](#some-helpful-imports)


## Basic Usage

```typescript
import { ProviderManager } from 'react-native-consumet';

// Initialize the provider manager
const providerManager = new ProviderManager();

// Load an anime provider
const provider = await providerManager.getAnimeProvider('zoro');

// Search for content
const results = await provider.search('Attack on Titan');
console.log(results);
```

## Why Use Extensions?

React Native Consumet uses an extension-based architecture instead of static provider imports. Here's why:

### Extensions Architecture

```typescript
// Load providers dynamically
const provider = await providerManager.getAnimeProvider('zoro');
```

**Benefits:**
- **Dynamic Loading** - Only load what you need
- **Unified API** - Consistent interface across all providers
- **Cross-Provider Search** - Search multiple sources simultaneously
- **Auto-Updates** - Providers update without app updates

###  Direct Import 

```typescript
import { ANIME } from 'react-native-consumet';
const zoro = new ANIME.Zoro();
```

**Limitations:**
- All providers loaded at startup
- Inconsistent APIs between providers
- Manual provider management required

> [!NOTE]
> For usage, see the [individual provider guides](./guides/) in the docs folder.

## Core Components

### ProviderManager

The main class for managing and accessing providers.

```typescript
const providerManager = new ProviderManager();

// Get available providers
const extensions = providerManager.getAvailableExtensions();

// Load specific provider types
const animeProvider = await providerManager.getAnimeProvider('zoro') as Zoro; // Type assertion for better type safety
const movieProvider = await providerManager.getMovieProvider('himovies') as HiMovies; // Type assertion for better type safety
```

### ExtractorManager

Handles video source extraction from streaming sites.

```typescript
import { ExtractorManager } from 'react-native-consumet';

const extractorManager = new ExtractorManager();
const extractor = await extractorManager.loadExtractor('megacloud');
const sources = await extractor.extract(embedUrl, referer);
```


## Usage Examples

### Basic Provider Usage

```typescript
import { ProviderManager } from 'react-native-consumet';

const manager = new ProviderManager();

// Search for anime
const searchAnime = async (query: string) => {
  const provider = await manager.getAnimeProvider('zoro');
  const results = await provider.search(query);
  return results;
};

// Get detailed information
const getAnimeInfo = async (animeId: string) => {
  const provider = await manager.getAnimeProvider('zoro');
  const info = await provider.fetchAnimeInfo(animeId);
  return info;
};

// Get streaming sources
const getEpisodeSources = async (episodeId: string) => {
  const provider = await manager.getAnimeProvider('zoro');
  const sources = await provider.fetchEpisodeSources(episodeId);
  return sources;
};
```

### Cross-Provider Search

Search across multiple providers simultaneously:

```typescript
const searchAllProviders = async (query: string) => {
  const results = await manager.searchAcrossProviders('anime', query);
  
  // Results grouped by provider
  results.forEach(({ extensionId, results }) => {
    console.log(`${extensionId}: ${results.results.length} results`);
  });
  
  return results;
};
```

### Movie Provider Example

```typescript
// Search for movies
const searchMovies = async (query: string) => {
  const provider = await manager.getMovieProvider('himovies');
  const results = await provider.search(query);
  return results;
};

// Get movie details
const getMovieInfo = async (movieId: string) => {
  const provider = await manager.getMovieProvider('himovies');
  const info = await provider.fetchMovieInfo(movieId);
  return info;
};
```

### Error Handling

```typescript
const safeSearch = async (query: string) => {
  try {
    const provider = await manager.getAnimeProvider('zoro');
    return await provider.search(query);
  } catch (error) {
    console.error('Search failed:', error.message);
    return { results: [] };
  }
};
```

## Custom HTTP Configuration

```typescript
import axios from 'axios';

const customAxios = axios.create({
  timeout: 30000,
  headers: { 'User-Agent': 'MyApp/1.0.0' },
  // Add proxy if needed
  proxy: { host: 'proxy.example.com', port: 8080 }
});

// ProviderManager takes ProviderContextConfig as an constructor argument
const manager = new ProviderManager({
  axios: customAxios,
});

// Extractormanager takes ExtractorContextConfig as an constructor argument
const extractorManager = new ExtractorManager({
  axios: customAxios,
});
```
[for more details go through `extension-utils` to see which default axios properties are passed](../src/utils/extension-utils.ts)\
[`ProviderContextConfig`](../src/utils/create-provider-context.ts)\
[`ExtractorContextConfig`](../src/utils/create-extractor-context.ts)


## Extractor Usage Example

```typescript
const extractVideoSources = async (embedUrl: string, referer: string) => {
  try {
    const extractorManager = new ExtractorManager();
    const extractor = await extractorManager.loadExtractor('megacloud');
    
    const sources = await extractor.extract(new URL(embedUrl), referer);
    return sources;
  } catch (error) {
    console.error('Extraction failed:', error);
    return null;
  }
};
```

```typescript
const extractVideoSources = async (embedUrl: string, referer: string) => {
  try {
    // This way u can use the cached extractor code reducing the need to load on every request
    const metadata=extractorManager.getExtractorMetadata('megacloud');
    const megacloudExtractor = await extractorManager.executeExtractorCode(`${testCode.testCodeString}`,metadata!)
    const links = await megacloudExtractor.extract(new PolyURL(sources.headers?.Referer!),"https://himovies.sx");
    console.log('📹 Extracted video links:', links);
  } catch (error) {
    console.error('Extraction failed:', error);
    return null;
  }
};
```

## React Integration

### Custom Hook for Anime Provider

```typescript
import { useState, useEffect, useCallback } from 'react';
import { ProviderManager } from 'react-native-consumet';

export const useAnimeProvider = () => {
  const [manager] = useState(() => new ProviderManager());
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    const loadProviders = () => {
      const extensions = manager.getAvailableExtensions();
      const animeProviders = extensions.filter(ext => ext.category === 'anime');
      setProviders(animeProviders);
    };
    loadProviders();
  }, [manager]);

  const searchAnime = useCallback(async (query: string, providerId = 'zoro') => {
    setLoading(true);
    try {
      const provider = await manager.getAnimeProvider(providerId);
      return await provider.search(query);
    } catch (error) {
      console.error('Search failed:', error);
      return { results: [] };
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const getAnimeInfo = useCallback(async (animeId: string, providerId = 'zoro') => {
    setLoading(true);
    try {
      const provider = await manager.getAnimeProvider(providerId);
      return await provider.fetchAnimeInfo(animeId);
    } catch (error) {
      console.error('Failed to fetch anime info:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const searchAcrossProviders = useCallback(async (query: string) => {
    setLoading(true);
    try {
      return await manager.searchAcrossProviders('anime', query);
    } catch (error) {
      console.error('Cross-provider search failed:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [manager]);

  return { 
    searchAnime, 
    getAnimeInfo,
    searchAcrossProviders,
    loading, 
    providers,
    manager 
  };
};
```

### Anime Search Component

```tsx
import React, { useState } from 'react';
import { useAnimeProvider } from './hooks/useAnimeProvider';

const AnimeSearch: React.FC = () => {
  const { searchAnime, searchAcrossProviders, loading, providers } = useAnimeProvider();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('zoro');
  const [searchMode, setSearchMode] = useState<'single' | 'all'>('single');

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    if (searchMode === 'single') {
      const searchResults = await searchAnime(query, selectedProvider);
      setResults([{ extensionId: selectedProvider, results: searchResults }]);
    } else {
      const searchResults = await searchAcrossProviders(query);
      setResults(searchResults);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Anime Search</Text>

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search anime..."
      />

      <View style={styles.providers}>
        {mockProviders.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.provider, p.id === selectedProvider && styles.activeProvider]}
            onPress={() => setSelectedProvider(p.id)}
          >
            <Text style={styles.providerText}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button title="Search" onPress={handleSearch} />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text>{item.description}</Text>
              {item.releaseDate && <Text>Released: {item.releaseDate}</Text>}
            </View>
          </View>
        )}
      />
    </View>
  );
};

export default AnimeSearch;
```

### Anime Details Component

```tsx
import React, { useState, useEffect } from 'react';
import { useAnimeProvider } from './hooks/useAnimeProvider';

interface AnimeDetailsProps {
  animeId: string;
  providerId: string;
}

const AnimeDetails: React.FC<AnimeDetailsProps> = ({ animeId, providerId }) => {
  const { getAnimeInfo, loading } = useAnimeProvider();
  const [animeInfo, setAnimeInfo] = useState(null);

  useEffect(() => {
    const loadAnimeInfo = async () => {
      const info = await getAnimeInfo(animeId, providerId);
      setAnimeInfo(info);
    };
    
    if (animeId && providerId) {
      loadAnimeInfo();
    }
  }, [animeId, providerId, getAnimeInfo]);

  if (loading) return <div>Loading anime details...</div>;
  if (!animeInfo) return <div>Anime not found</div>;

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Image source={{ uri: animeInfo.image }} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.title}>{animeInfo.title}</Text>
          <Text style={styles.description}>{animeInfo.description}</Text>

          <View style={styles.meta}>
            <Text>Status: {animeInfo.status}</Text>
            <Text>Release Date: {animeInfo.releaseDate}</Text>
            <Text>Episodes: {animeInfo.totalEpisodes}</Text>
          </View>

          <View style={styles.genres}>
            {animeInfo.genres.map((genre) => (
              <Text key={genre} style={styles.genreTag}>
                {genre}
              </Text>
            ))}
          </View>
        </View>
      </View>

      {/* Episodes List */}
      <View style={styles.episodesSection}>
        <Text style={styles.episodesTitle}>Episodes</Text>
        <FlatList
          data={animeInfo.episodes}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => (
            <View style={styles.episodeCard}>
              <Text style={styles.episodeNumber}>Episode {item.number}</Text>
              <Text style={styles.episodeTitle}>{item.title}</Text>
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
};

export default AnimeDetails;
```

### Multi-Provider Hook

```typescript
import { useState, useCallback } from 'react';
import { ProviderManager } from 'react-native-consumet';

export const useMultiProvider = () => {
  const [manager] = useState(() => new ProviderManager());
  const [loading, setLoading] = useState(false);

  const searchContent = useCallback(async (
    query: string, 
    category: 'anime' | 'movies' | 'manga' | 'light-novels'
  ) => {
    setLoading(true);
    try {
      return await manager.searchAcrossProviders(category, query);
    } catch (error) {
      console.error('Multi-provider search failed:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const getProvidersByCategory = useCallback((category: string) => {
    return manager.getExtensionsByCategory(category as any);
  }, [manager]);

  return {
    searchContent,
    getProvidersByCategory,
    loading,
    manager
  };
};
```

## API Reference

### ProviderManager

```typescript
class ProviderManager {
  constructor(config?: ProviderManagerConfig)
  
  // Extension management
  getAvailableExtensions(): ExtensionManifest[]
  getExtensionsByCategory(category: ProviderType): ExtensionManifest[]
  getExtensionMetadata(extensionId: string): ExtensionManifest
  
  // Provider loading
  getAnimeProvider(extensionId: string): Promise<AnimeProviderInstance>
  getMovieProvider(extensionId: string): Promise<MovieProviderInstance>
  getMangaProvider(extensionId: string): Promise<MangaProviderInstance>
  getLightNovelProvider(extensionId: string): Promise<LightNovelProviderInstance>
  
  // Generic provider access
  getProvider(extensionId: string): Promise<BaseProviderInstance>
  
  // Cross-provider operations
  searchAcrossProviders(
    category: ProviderType, 
    query: string, 
    page?: number
  ): Promise<CrossProviderSearchResult[]>
  
  // Context and metadata
  getProviderContext(): ProviderContext
  getRegistryMetadata(): RegistryMetadata
  
  // Provider code execution
  executeProviderCode(
    code: string, 
    factoryName: string, 
    metadata: ExtensionManifest
  ): Promise<AnimeParser | MovieParser | MangaParser | LightNovelParser>
}
```

### ExtractorManager

```typescript
class ExtractorManager {
  constructor(context?: ExtractorContext)
  
  // Extractor loading
  loadExtractor(extractorId: string): Promise<VideoExtractor>
  
  // Extractor Metadata
  getExtractorMetadata(extractorId: string): Promise<ExtractorMetadata>
  
  // Execute extractor code
  executeExtractorCode(
    code: string, 
    metadata: ExtractorMetadata
  ): Promise<VideoExtractor>  
  
}
```

### Provider Context Functions

```typescript
// Create provider execution context
createProviderContext(config?: ProviderContextConfig): ProviderContext

// Create extractor execution context  
createExtractorContext(config?: ExtractorContextConfig): ExtractorContext
```

## Some Helpful imports

```typescript
import {
  createProviderContext,
  ProviderManager,
  ExtractorManager,
  createExtractorContext,
  PolyURL, // Polyfill for URL handling
  PolyURLSearchParams, // Polyfill for URLSearchParams
  defaultAxios, // default axios instance
  extractorContext,
  defaultStaticExtractors,
   } from 'react-native-consumet';
---


## Additional Resources

- **Individual Provider Guides**: [`docs/guides/`](./guides/)
  - [Anime Providers](./guides/anime.md)
  - [Movie Providers](./guides/movies.md)
  - [Manga Providers](./guides/manga.md)
  - [Light Novel Providers](./guides/light-novels.md)
  - [Meta Providers](./guides/meta.md)