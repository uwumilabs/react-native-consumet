# React Native Consumet - Extension Integration Guide

A powerful React Native library for accessing anime, movie, and media content through a unified extension system.

## Table of Contents
- [Basic Usage](#basic-usage)
- [Why Use Extensions?](#why-use-extensions)
- [Core Components](#core-components)
- [Registry Versions and Compatibility](#registry-versions-and-compatibility)
- [Usage Examples](#usage-examples)
- [Custom HTTP Configuration](#custom-http-configuration)
- [React Integration](#react-integration)
- [API Reference](#api-reference)
- [Some Helpful imports](#some-helpful-imports)


## Basic Usage

```typescript
import { ProviderManager, extensionRegistry } from 'react-native-consumet';

// Initialize the provider manager
const providerManager = new ProviderManager(extensionRegistry);

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
const providerManager = new ProviderManager(extensionRegistry);

// Get available providers
const extensions = providerManager.getAvailableExtensions();

// Load specific provider types
const animeProvider = await providerManager.getAnimeProvider('zoro'); 
const movieProvider = await providerManager.getMovieProvider('himovies'); 

// You can also use loadExtension directly
const zoroProvider = await providerManager.loadExtension('zoro');
```

### ExtractorManager

Handles video source extraction from streaming sites.

```typescript
import { ExtractorManager, extensionRegistry } from 'react-native-consumet';

const extractorManager = new ExtractorManager(extensionRegistry);
const extractor = await extractorManager.loadExtractor('megacloud');
const sources = await extractor.extract(embedUrl, referer);
```

Providers loaded through a `ProviderManager` share one `ExtractorManager`, built from the same registry. When a provider calls `ctx.extractors.MegaPlay()`, the call runs the registry version of MegaPlay, hash-checked and fetched once, then cached. If the registry code can't be fetched or fails its hash, the bundled MegaPlay runs instead. An extractor that is in neither throws `Extractor '<name>' not found in the registry or the bundled extractors`.

To share an extractor cache between your own code and the providers, pass your manager in:

```typescript
const extractorManager = new ExtractorManager(extensionRegistry);
const providerManager = new ProviderManager(extensionRegistry, { extractorManager });
// providerManager.getExtractorManager() === extractorManager
```

`createProviderContext()` without an `extractorManager` keeps the bundled extractors, as before.

## Registry Versions and Compatibility

A registry says which format it uses, and each entry says which extension context its code needs:

```json
{
  "schemaVersion": 1,
  "extractors": [{ "name": "Kwik", "version": "1.2.2", "minContextVersion": 1, "main": "…", "sha256": "…" }],
  "extensions": [{ "id": "animepahe", "version": "1.2.4", "minContextVersion": 1, "factoryName": "createAnimePahe", "…": "…" }]
}
```

- **`schemaVersion`** is the format of the registry file. This library reads up to `REGISTRY_SCHEMA_VERSION` (1). A registry without one reads as 1, which covers every registry published before the field existed. A newer `schemaVersion` throws a `RegistryError` with code `UNSUPPORTED_SCHEMA`. The number only goes up when older libraries would misread the file (a field removed, renamed or changing meaning). Adding an optional field doesn't change it.
- **`minContextVersion`** is the lowest `CONTEXT_VERSION` the entry's code runs on. `CONTEXT_VERSION` is an integer the library exports (currently 1). It versions what the library gives extension code: the `ctx` helpers, the modules extension code can `require`, and its globals. An entry without `minContextVersion` needs 1. When a provider starts using something only a newer library provides, that library bumps `CONTEXT_VERSION` and the entry sets `minContextVersion` to the new value. Older apps then refuse the entry up front instead of failing mid-call with `undefined is not a function`.

### Validation

`new ProviderManager(registry)` and `new ExtractorManager(registry)` validate the registry, and so does `validateRegistry(registry)`. An invalid registry throws a `RegistryError` with code `INVALID_REGISTRY` and every problem listed in `issues`. Before this check, the managers logged the error and carried on with no entries. The check covers:

- **Required fields.** Extensions need `id`, `name`, `description`, `version`, `author.name`, `category`, `main`, `factoryName`, `baseUrl`, `logo`, `status`, `lastUpdated` and `extractors`. Extractors need `name`, `version` and `main`.
- **Types and formats.** `factoryName` and extractor `name` must be JavaScript identifiers, because they're interpolated into the code that runs the extension. `id` may only contain letters, digits, `-` and `_`. `version` must be semver (`1.2.3`). `sha256` must be 64 lowercase hex characters. `category` must be a `ProviderType`. Optional fields such as `aliases`, `languages` and the boolean flags must have the right type if present. Display fields such as `status` are only checked to be strings.
- **Unique keys.** Two extensions can't share an `id`, and two extractors can't share a `name` (case-insensitive).

Fields the schema doesn't know are ignored, so you can store extra data (such as a download time) next to `extensions` and `extractors`.

### Incompatible entries

An entry whose `minContextVersion` is higher than `CONTEXT_VERSION` stays in the manager, so `getAvailableExtensions()` and `getExtensionMetadata()` still return it and you can show it. Only its `id` (for extractors, its `name` and `aliases`) is validated, because it may use fields or values added after this library version. It never runs. `loadExtension`, `getAnimeProvider`, `getMovieProvider`, `loadExtractor`, `executeProviderCode` and `executeExtractorCode` (even with `skipIntegrity`) throw a `RegistryError` with code `INCOMPATIBLE_ENTRY` before any code is downloaded or run. When a provider calls `ctx.extractors.X()` and the registry's X is incompatible, the bundled X runs instead, the same fallback as for a failed hash.

```typescript
import { RegistryError, isCompatibleEntry, validateRegistry } from 'react-native-consumet';

// Check a downloaded registry before storing it, and keep the previous one if it's rejected.
// Store it whole: dropping `schemaVersion` would make a future format read as version 1.
try {
  validateRegistry(downloaded);
  saveRegistry(downloaded);
} catch (error) {
  if (error instanceof RegistryError && error.updateRequired) showUpdatePrompt();
  else reportBrokenRegistry(error);
}

// Mark entries this version of the app can't run
const runnable = providerManager.getAvailableExtensions().filter((entry) => isCompatibleEntry(entry));

// Cached code is refused the same way
try {
  await providerManager.executeProviderCode(cachedCode, metadata.factoryName, metadata);
} catch (error) {
  if (error instanceof RegistryError && error.code === 'INCOMPATIBLE_ENTRY') {
    showUpdatePrompt(`${metadata.name} needs a newer version of the app`);
  }
}
```

`RegistryError` has these fields:

| Field | Meaning |
|---|---|
| `code` | `INVALID_REGISTRY`, `UNSUPPORTED_SCHEMA` or `INCOMPATIBLE_ENTRY` |
| `updateRequired` | `true` for `UNSUPPORTED_SCHEMA` and `INCOMPATIBLE_ENTRY`: a newer app version accepts it |
| `issues` | Every problem found, e.g. `extensions[2] (anineko): factoryName must be a JavaScript identifier (got "create-anineko")` |
| `id` | The extension id or extractor name, for `INCOMPATIBLE_ENTRY` |
| `required` / `supported` | The `schemaVersion` or `minContextVersion` asked for, and what this library supports |

`assertCompatibleEntry(entry)` throws the same `INCOMPATIBLE_ENTRY` error, for apps that check entries themselves.


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

Yes — there are a few grammar and clarity improvements we can make so it reads more smoothly and professionally.

Here’s a corrected and slightly polished version of your text:

---

### Basic Extractor Usage

It is not compulsory to use `ExtractorManager` directly in all cases. The `fetchEpisodeSources` method (provided by `ProviderManager`) will handle source extraction for most providers implicitly. This is because `ProviderManager`'s context is designed to dynamically load extractors as needed.

However, `ExtractorManager` is useful for:
*   Providers that frequently change their source extraction code.
*   When you want to use custom extractor logic for complete control over the extraction process.
*   Directly accessing and testing specific extractors.

Server names map to extractors through the registry. `extractBaseExtractorName(serverName)` returns the longest registry extractor `name` or alias that the server name starts with, lowercased: `megacloud-hd-1` → `megacloud`, `upcloud` → `megacloud` (an alias), and a new extractor's `newhost-hd-1` → `newhost` as soon as its registry entry exists. Declare aliases in the extractor's registry entry:

```json
{ "name": "MegaCloud", "aliases": ["upcloud", "akcloud"], "version": "1.3.1", "main": "…", "sha256": "…" }
```

```typescript
import { ExtractorManager, extensionRegistry, PolyURL } from 'react-native-consumet';

const extractVideoSources = async (embedUrl: string, referer?: string) => {
  try {
    const extractorManager = new ExtractorManager(extensionRegistry);
    // Load a specific extractor by its ID.
   // This method handles dynamic loading from the registry and falls back to static extractors.
    const extractor = await extractorManager.loadExtractor('megacloud');
    
    // Assuming 'provider' and 'episodeId' are available from your context
    const servers = await provider.fetchEpisodeServers(episodeId); 
    
    // Example usage with a direct URL and referer
    const sources = await extractor.extract(
      new PolyURL(servers[0].url), // Use PolyURL for consistent URL handling
      referer
    ); 
    // 'referer' is available for only some extractors — check the TypeScript definition of `extract` for each extractor
    return sources;
  } catch (error) {
    console.error('Extraction failed:', error);
    return null;
  }
};
```

You can also use the cached extractor code to reduce the need to load it on every request:

```typescript
import { ExtractorManager, extensionRegistry, PolyURL, defaultExtractorContext } from 'react-native-consumet';

const extractVideoSourcesDynamic = async (codeString: string, metadata: any, embedUrl: string, referer?: string) => {
  try {
    const extractorManager = new ExtractorManager(extensionRegistry);
    // Execute arbitrary extractor code.
    const extractor = await extractorManager.executeExtractorCode(
      codeString,
      metadata
    );
    
    
    // Assuming 'provider' and 'episodeId' are available from your context
    const servers = await provider.fetchEpisodeServers(episodeId); 

    const sources = await extractor.extract(
      new PolyURL(servers[0].url), // Use PolyURL for consistent URL handling
      referer
    ); 
    // 'referer' is available for only some extractors — check the TypeScript definition of `extract` for each extractor
    return sources;
  } catch (error) {
    console.error('extraction failed:', error);
    return null;
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
  // Throws RegistryError if the registry is invalid or uses a newer schemaVersion
  constructor(registry: ExtensionRegistryData | typeof extensionRegistry, config?: ProviderContextConfig, integrityOptions?: IntegrityOptions)
  
  // Extension management
  getAvailableExtensions(): ExtensionManifest[]
  getExtensionsByCategory(category: ProviderType): ExtensionManifest[]
  getExtensionMetadata(extensionId: string): ExtensionManifest
  
  // Provider loading
  loadExtension<T extends AnimeProvider | MovieProvider>(
    extensionId: T
  ): Promise<
    T extends AnimeProvider
      ? InstanceType<(typeof animeProviders)[T]>
      : T extends MovieProvider
        ? InstanceType<(typeof movieProviders)[T]>
        : never
  >
  getAnimeProvider<T extends AnimeProvider>(extensionId: T, ...args: any[]): Promise<InstanceType<(typeof animeProviders)[T]>>
  getMovieProvider<T extends MovieProvider>(extensionId: T, ...args: any[]): Promise<InstanceType<(typeof movieProviders)[T]>>
  
  // Cross-provider operations
  searchAcrossProviders(
    category: ProviderType, 
    query: string, 
    page?: number
  ): Promise<Array<{ extensionId: string; results: ISearch<IAnimeResult | IMovieResult> }>>
  
  // Context and metadata
  getProviderContext(): ProviderContext
  getExtractorManager(): ExtractorManager // shared by every provider this manager loads
  
  // Provider code execution
  executeProviderCode<T extends AnimeProvider | MovieProvider>(
    code: string,
    factoryName: string,
    metadata: ExtensionManifest & { id: T }
  ): Promise<
    T extends AnimeProvider
      ? InstanceType<typeof animeProviders[T]>
      : T extends MovieProvider
        ? InstanceType<typeof movieProviders[T]>
        : never
  >
}
```

### ExtractorManager

```typescript
class ExtractorManager {
  // Throws RegistryError if the registry is invalid or uses a newer schemaVersion
  constructor(registry: ExtensionRegistryData | typeof extensionRegistry, extractorConfig?: ExtractorContextConfig, integrityOptions?: IntegrityOptions)
  
  // Extractor loading
  loadExtractor<T extends Extractor>(extractorId: T): Promise<(typeof defaultExtractors)[T]>
  
  // Extractor Metadata
  getExtractorMetadata(extractorId: StreamingServers): ExtractorInfo
  
  // Execute extractor code
  executeExtractorCode(code: string, metadata: ExtractorInfo): Promise<IVideoExtractor>  
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
  defaultExtractors,
  extensionRegistry,
  type AnimeProvider, 
  type animeProviders, 
  type MovieProvider, 
  type movieProviders
} from 'react-native-consumet';
```


## Additional Resources

- **Individual Provider Guides**: [`docs/guides/`](./guides/)
  - [Anime Providers](./guides/anime.md)
  - [Movie Providers](./guides/movies.md)
  - [Manga Providers](./guides/manga.md)
  - [Light Novel Providers](./guides/light-novels.md)
  - [Meta Providers](./guides/meta.md)