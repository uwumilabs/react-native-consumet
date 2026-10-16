# React Native Consumet - Extension Integration Guide

A powerful React Native library for accessing anime, movie, and media content through a unified extension system.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Why Use Extensions?](#why-use-extensions)
- [Core Components](#core-components)
- [Registry Versions and Compatibility](#registry-versions-and-compatibility)
- [Downloaded Registries and Signatures](#downloaded-registries-and-signatures)
- [Usage Examples](#usage-examples)
- [Custom HTTP Configuration](#custom-http-configuration)
- [React Integration](#react-integration)
- [API Reference](#api-reference)
- [Some Helpful imports](#some-helpful-imports)

## Basic Usage

```typescript
import { ProviderManager, ExtensionRegistry } from 'react-native-consumet';

// Initialize the provider manager with a registry: the bundled one, or one your app downloaded
const providerManager = new ProviderManager(ExtensionRegistry);

// Load an anime provider by its registry id
const provider = await providerManager.getAnimeProvider('animepahe');

// Search for content
const results = await provider.search('Attack on Titan');
console.log(results);
```

`ProviderManager` requires a registry. Calling it without one, or with something that isn't a registry, throws a `RegistryError` (see [Validation](#validation)).

## Why Use Extensions?

React Native Consumet uses an extension-based architecture instead of static provider imports. Here's why:

### Extensions Architecture

```typescript
// Load providers dynamically by registry id
const provider = await providerManager.getAnimeProvider('animepahe');
```

**Benefits:**

- **Dynamic Loading** - Only load what you need
- **Unified API** - Consistent interface across all providers
- **Cross-Provider Search** - Search multiple sources simultaneously
- **Updates without app releases** - When your app downloads the registry, new provider versions arrive without an app update (see the [Security Model](./security.md) for what that trusts)

### Direct Import

```typescript
import { ANIME } from 'react-native-consumet';
const animepahe = new ANIME.AnimePahe(); // or new ANIME.AnimePahe(ctx?, customBaseURL?)
```

**Limitations:**

- Runs the code shipped with the installed library version, so fixes need a library update
- Inconsistent APIs between providers
- Manual provider management required

> [!NOTE]
> For usage, see the [individual provider guides](./guides/) in the docs folder.

## Core Components

### ProviderManager

The main class for managing and accessing providers.

```typescript
const providerManager = new ProviderManager(ExtensionRegistry);

// Get available providers
const extensions = providerManager.getAvailableExtensions();

// Load specific provider types
const animeProvider = await providerManager.getAnimeProvider('animepahe');
const movieProvider = await providerManager.getMovieProvider('netflixmirror');

// You can also use loadExtension directly
const anikoto = await providerManager.loadExtension('anikoto');

// Or getProvider, for any category: the result is typed by the category
const anineko = await providerManager.getProvider('anime', 'anineko');

// Override the registry's baseUrl, e.g. when a site moves before the registry is updated
const mirror = await providerManager.getAnimeProvider('animepahe', { baseUrl: 'https://animepahe.example' });
```

Ids are the registry `id`s (case-insensitive; the provider `name` also works). `AnimeProviderId` and `MovieProviderId` autocomplete the ids in the bundled registry and accept any other string, so providers added to a downloaded registry later still type-check. Loaded providers are typed as `IAnimeProvider` / `IMovieProvider`.

`getProvider(category, id)` loads a provider of any category, including manga and light novels, and refuses an entry of another category before downloading it. The bundled registry only lists anime and movie providers; manga and light-novel entries in a downloaded registry load the same way. Loading checks that the provider has the methods its category needs, listed in `REQUIRED_PROVIDER_METHODS`, and throws with every missing method:

| Category       | Required methods                                                         |
| -------------- | ------------------------------------------------------------------------ |
| `anime`        | `search`, `fetchAnimeInfo`, `fetchEpisodeSources`, `fetchEpisodeServers` |
| `movies`       | `search`, `fetchMediaInfo`, `fetchEpisodeSources`, `fetchEpisodeServers` |
| `manga`        | `search`, `fetchMangaInfo`, `fetchChapterPages`                          |
| `light-novels` | `search`, `fetchLightNovelInfo`, `fetchChapterContent`                   |
| `meta`         | `search`, `fetchEpisodeSources`, `fetchEpisodeServers`                   |

Each provider is loaded once per id, `sha256` and `baseUrl`. Concurrent calls share one download, a failed load is retried on the next call, and an entry with a new `sha256` is loaded again. `invalidate(id)` forgets a loaded provider and its compiled code, so the next call downloads and runs it again. A manager compiles each provider's code once per id and `sha256`, so keep one `ProviderManager` per registry (for example at module scope) instead of creating one per call.

### ExtractorManager

Handles video source extraction from streaming sites.

```typescript
import { ExtractorManager, ExtensionRegistry, PolyURL } from 'react-native-consumet';

const extractorManager = new ExtractorManager(ExtensionRegistry);
const extractor = await extractorManager.loadExtractor('megacloud');
const sources = await extractor.extract(new PolyURL(embedUrl), referer);
```

`loadExtractor` takes an extractor or server name and always returns an extractor instance: the registry version, or, when the registry has none or its copy can't be used, the bundled one built with the manager's context. The server names of one extractor share one load (`megacloud-hd-1`, `MegaCloud` and `upcloud` all load MegaCloud once), and `invalidate(name)` forgets it.

Providers loaded through a `ProviderManager` share one `ExtractorManager`, built from the same registry. When a provider calls `ctx.extractors.MegaPlay()`, the call runs the registry version of MegaPlay, hash-checked and fetched once, then cached. If the registry code can't be fetched or fails its hash, the bundled MegaPlay runs instead. An extractor that is in neither throws `Extractor '<name>' not found in the registry or the bundled extractors`.

To share an extractor cache between your own code and the providers, pass your manager in:

```typescript
const extractorManager = new ExtractorManager(ExtensionRegistry);
const providerManager = new ProviderManager(ExtensionRegistry, { extractorManager });
// providerManager.getExtractorManager() === extractorManager
```

`createProviderContext()` without an `extractorManager` keeps the bundled extractors, as before.

## Registry Versions and Compatibility

A registry says which format it uses, and each entry says which extension context its code needs:

```json
{
  "schemaVersion": 1,
  "extractors": [{ "name": "Kwik", "version": "1.2.2", "minContextVersion": 1, "main": "…", "sha256": "…" }],
  "extensions": [
    { "id": "animepahe", "version": "1.2.4", "minContextVersion": 1, "factoryName": "createAnimePahe", "…": "…" }
  ]
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

| Field                    | Meaning                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `code`                   | `INVALID_REGISTRY`, `UNSUPPORTED_SCHEMA` or `INCOMPATIBLE_ENTRY`                                                        |
| `updateRequired`         | `true` for `UNSUPPORTED_SCHEMA` and `INCOMPATIBLE_ENTRY`: a newer app version accepts it                                |
| `issues`                 | Every problem found, e.g. `extensions[2] (anineko): factoryName must be a JavaScript identifier (got "create-anineko")` |
| `id`                     | The extension id or extractor name, for `INCOMPATIBLE_ENTRY`                                                            |
| `required` / `supported` | The `schemaVersion` or `minContextVersion` asked for, and what this library supports                                    |

`assertCompatibleEntry(entry)` throws the same `INCOMPATIBLE_ENTRY` error, for apps that check entries themselves.

## Downloaded Registries and Signatures

The bundled `ExtensionRegistry` ships inside the app and needs no signature. A registry the app downloads carries the code URLs and the hashes that check that code, so it is only as trustworthy as where it came from. CI signs the registry on `main` with ed25519 and publishes the signature next to it, at the registry URL plus `.sig`. Check it with `parseSignedRegistry` before using a downloaded registry:

```typescript
import {
  ExtensionRegistry,
  ProviderManager,
  RegistryError,
  RegistrySignatureError,
  parseSignedRegistry,
  type ExtensionRegistryData,
} from 'react-native-consumet';

const REGISTRY_URL =
  'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/refs/heads/main/src/extension-registry.json';

const download = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
};

// The verified registry, or undefined to keep the one the app already has
const downloadRegistry = async (): Promise<ExtensionRegistryData | undefined> => {
  try {
    // Verify the exact bytes that were signed: pass the text as downloaded, never re-serialized JSON
    const [text, signature] = await Promise.all([download(REGISTRY_URL), download(`${REGISTRY_URL}.sig`)]);
    // Checks the signature before parsing, then runs validateRegistry
    return parseSignedRegistry(text, signature);
  } catch (error) {
    if (error instanceof RegistrySignatureError) console.warn(`Registry not verified: ${error.code}`);
    else if (error instanceof RegistryError && error.updateRequired)
      console.warn('Update the app to use this registry');
    else console.warn('Could not download the registry', error);
    return undefined;
  }
};

const manager = new ProviderManager((await downloadRegistry()) ?? ExtensionRegistry);
```

`parseSignedRegistry` fails closed: it returns a registry only when a signature line verifies under a trusted key. It throws a `RegistrySignatureError` with one of these codes before it parses anything, and a `RegistryError` when the signed registry is invalid:

| `code`                | Meaning                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `NO_SIGNING_KEYS`     | This library version bundles no public key, so no downloaded registry verifies                             |
| `INVALID_SIGNING_KEY` | A trusted key isn't a 64-character hex ed25519 public key                                                  |
| `MALFORMED_SIGNATURE` | The signature file isn't 1 to 4 lines of 128-character hex signatures                                      |
| `SIGNATURE_MISMATCH`  | No signature verifies: the registry changed after it was signed, or a key this app doesn't trust signed it |

- **No key is bundled yet.** The trusted keys are `REGISTRY_SIGNING_KEYS` (from `src/registry-signing-keys.ts`), and the list is empty until a maintainer generates the first key and a release bundles it. Until then every downloaded registry fails with `NO_SIGNING_KEYS`, so keep using the bundled `ExtensionRegistry`.
- **Right after a registry change**, the signature is stale until CI re-signs it, so verification fails with `SIGNATURE_MISMATCH`. Keep the previous registry and try again later.
- **Self-hosted registries:** pass your own keys with `parseSignedRegistry(text, signature, { publicKeys: [...REGISTRY_SIGNING_KEYS, yourKey] })`. `verifyRegistrySignature(text, signature, publicKeys?)` checks a signature without parsing, and returns the key that verified it.

The signature doesn't stop an older registry being served with its older signature. See the [Security Model](./security.md#6-signed-registry-downloads) for what signing covers.

## Usage Examples

### Basic Provider Usage

```typescript
import { ProviderManager, ExtensionRegistry } from 'react-native-consumet';

const manager = new ProviderManager(ExtensionRegistry);

// Search for anime
const searchAnime = async (query: string) => {
  const provider = await manager.getAnimeProvider('animepahe');
  const results = await provider.search(query);
  return results;
};

// Get detailed information
const getAnimeInfo = async (animeId: string) => {
  const provider = await manager.getAnimeProvider('animepahe');
  const info = await provider.fetchAnimeInfo(animeId);
  return info;
};

// Get streaming sources
const getEpisodeSources = async (episodeId: string) => {
  const provider = await manager.getAnimeProvider('animepahe');
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

`searchAcrossProviders` loads every registry entry of the category. A provider that fails to load or to search contributes an empty result instead of rejecting the whole call.

### Basic Extractor Usage

It is not compulsory to use `ExtractorManager` directly in all cases. The `fetchEpisodeSources` method of a provider loaded by `ProviderManager` handles source extraction for most providers itself, because the provider context loads extractors as needed.

However, `ExtractorManager` is useful for:

- Providers that frequently change their source extraction code.
- When you want to use custom extractor logic for complete control over the extraction process.
- Directly accessing and testing specific extractors.

Server names map to extractors through the registry. `extractBaseExtractorName(serverName)` returns the longest registry extractor `name` or alias that the server name starts with, lowercased: `megacloud-hd-1` → `megacloud`, `upcloud` → `megacloud` (an alias), and a new extractor's `newhost-hd-1` → `newhost` as soon as its registry entry exists. Declare aliases in the extractor's registry entry:

```json
{ "name": "MegaCloud", "aliases": ["upcloud", "akcloud"], "version": "1.3.1", "main": "…", "sha256": "…" }
```

Apps hand a server's URL to an extractor only when the provider's registry entry has `haveMultiServers` set and `isSourceDirect` unset. Otherwise, call the provider's `fetchEpisodeSources` with the server name.

```typescript
import { ExtractorManager, ExtensionRegistry, PolyURL, type IAnimeProvider } from 'react-native-consumet';

const extractorManager = new ExtractorManager(ExtensionRegistry);

const extractVideoSources = async (provider: IAnimeProvider, episodeId: string, referer?: string) => {
  try {
    const servers = await provider.fetchEpisodeServers(episodeId);
    const server = servers.find((s) => extractorManager.extractBaseExtractorName(s.name) === 'megacloud');
    if (!server) return null;

    // Loads the registry version of the extractor (hash-checked, then cached),
    // falling back to the bundled one if the registry copy can't be used
    const extractor = await extractorManager.loadExtractor('megacloud');

    // Extractors take a PolyURL. Some also take a referer: check each extractor's `extract` signature
    return await extractor.extract(new PolyURL(server.url), referer);
  } catch (error) {
    console.error('Extraction failed:', error);
    return null;
  }
};
```

Apps that cache extractor code can run it without downloading it again. The code is checked against the entry's `sha256` before it runs:

```typescript
import { ExtractorManager, ExtensionRegistry, PolyURL, type ExtractorInfo } from 'react-native-consumet';

const extractorManager = new ExtractorManager(ExtensionRegistry);

// `cachedCode` is the file at `entry.main`, stored by your app
const runCachedExtractor = async (cachedCode: string, entry: ExtractorInfo, embedUrl: string, referer?: string) => {
  try {
    const extractor = await extractorManager.executeExtractorCode(cachedCode, entry);
    return await extractor.extract(new PolyURL(embedUrl), referer);
  } catch (error) {
    // IntegrityError: the cached code doesn't match `entry.sha256`; download it again
    console.error('extraction failed:', error);
    return null;
  }
};
```

## Custom HTTP Configuration

```typescript
import axios from 'axios';
import { ProviderManager, ExtractorManager, ExtensionRegistry } from 'react-native-consumet';

const customAxios = axios.create({
  timeout: 30000,
  headers: { 'User-Agent': 'MyApp/1.0.0' },
});

// The second argument is a ProviderContextConfig. The manager's own ExtractorManager uses the
// same axios, load and userAgent.
const manager = new ProviderManager(ExtensionRegistry, {
  axios: customAxios,
});

// The second argument is an ExtractorContextConfig
const extractorManager = new ExtractorManager(ExtensionRegistry, {
  axios: customAxios,
});
```

[for more details go through `extension-utils` to see which default axios properties are passed](../src/utils/extension-utils.ts)\
[`ProviderContextConfig`](../src/models/provider-context.ts)\
[`ExtractorContextConfig`](../src/models/extractor-context.ts)

## React Integration

### Custom Hook for Anime Provider

```typescript
// hooks/useAnimeProvider.ts
import { useCallback, useMemo, useState } from 'react';
import {
  ProviderManager,
  ExtensionRegistry,
  type AnimeProviderId,
  type IAnimeInfo,
  type IAnimeResult,
  type ISearch,
} from 'react-native-consumet';

// One manager for the app: it caches the providers it loads
const manager = new ProviderManager(ExtensionRegistry);

export const useAnimeProvider = () => {
  const [loading, setLoading] = useState(false);
  const providers = useMemo(() => manager.getExtensionsByCategory('anime'), []);

  const searchAnime = useCallback(
    async (query: string, providerId: AnimeProviderId = 'animepahe'): Promise<ISearch<IAnimeResult>> => {
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
    },
    []
  );

  const getAnimeInfo = useCallback(
    async (animeId: string, providerId: AnimeProviderId = 'animepahe'): Promise<IAnimeInfo | null> => {
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
    },
    []
  );

  const searchAcrossProviders = useCallback(async (query: string) => {
    setLoading(true);
    try {
      return await manager.searchAcrossProviders('anime', query);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    searchAnime,
    getAnimeInfo,
    searchAcrossProviders,
    loading,
    providers,
    manager,
  };
};
```

### Anime Search Component

```tsx
import React, { useState } from 'react';
import { Button, FlatList, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { IAnimeResult, IMovieResult } from 'react-native-consumet';
import { useAnimeProvider } from './hooks/useAnimeProvider';

// searchAcrossProviders types its results for both anime and movie providers
type Result = IAnimeResult | IMovieResult;
type Row = Result & { extensionId: string };

const titleOf = (item: Result) =>
  typeof item.title === 'string' ? item.title : (item.title.english ?? item.title.romaji ?? '');

const AnimeSearch: React.FC = () => {
  const { searchAnime, searchAcrossProviders, loading, providers } = useAnimeProvider();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Row[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('animepahe');
  const [searchMode, setSearchMode] = useState<'single' | 'all'>('single');

  const handleSearch = async () => {
    if (!query.trim()) return;

    if (searchMode === 'single') {
      const search = await searchAnime(query, selectedProvider);
      setResults(search.results.map((r) => ({ ...r, extensionId: selectedProvider })));
    } else {
      const perProvider = await searchAcrossProviders(query);
      setResults(
        perProvider.flatMap(({ extensionId, results: search }) => search.results.map((r) => ({ ...r, extensionId })))
      );
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Anime Search</Text>

      <TextInput value={query} onChangeText={setQuery} placeholder="Search anime..." />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {providers.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={{ padding: 8, opacity: searchMode === 'single' && p.id === selectedProvider ? 1 : 0.5 }}
            onPress={() => {
              setSearchMode('single');
              setSelectedProvider(p.id);
            }}>
            <Text>{p.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={{ padding: 8, opacity: searchMode === 'all' ? 1 : 0.5 }}
          onPress={() => setSearchMode('all')}>
          <Text>All providers</Text>
        </TouchableOpacity>
      </View>

      <Button title={loading ? 'Searching…' : 'Search'} onPress={handleSearch} disabled={loading} />

      <FlatList
        data={results}
        keyExtractor={(item) => `${item.extensionId}:${item.id}`}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 8 }}>
            {item.image ? <Image source={{ uri: item.image }} style={{ width: 60, height: 90 }} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold' }}>{titleOf(item)}</Text>
              <Text>{item.extensionId}</Text>
              {item.releaseDate ? <Text>Released: {item.releaseDate}</Text> : null}
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
import React, { useEffect, useState } from 'react';
import { FlatList, Image, Text, View } from 'react-native';
import type { IAnimeInfo } from 'react-native-consumet';
import { useAnimeProvider } from './hooks/useAnimeProvider';

interface AnimeDetailsProps {
  animeId: string;
  providerId: string;
}

const AnimeDetails: React.FC<AnimeDetailsProps> = ({ animeId, providerId }) => {
  const { getAnimeInfo, loading } = useAnimeProvider();
  const [animeInfo, setAnimeInfo] = useState<IAnimeInfo | null>(null);

  useEffect(() => {
    if (animeId && providerId) {
      getAnimeInfo(animeId, providerId).then(setAnimeInfo);
    }
  }, [animeId, providerId, getAnimeInfo]);

  if (loading) return <Text>Loading anime details...</Text>;
  if (!animeInfo) return <Text>Anime not found</Text>;

  const title =
    typeof animeInfo.title === 'string' ? animeInfo.title : (animeInfo.title.english ?? animeInfo.title.romaji);

  // The episode list is the scrolling element; the details sit in its header
  return (
    <FlatList
      data={animeInfo.episodes ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={{ padding: 16 }}>
          {animeInfo.image ? <Image source={{ uri: animeInfo.image }} style={{ width: 120, height: 180 }} /> : null}
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{title}</Text>
          <Text>{animeInfo.description}</Text>
          <Text>Status: {animeInfo.status}</Text>
          <Text>Release Date: {animeInfo.releaseDate}</Text>
          <Text>Episodes: {animeInfo.totalEpisodes}</Text>
          <Text>Genres: {animeInfo.genres?.join(', ')}</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Episodes</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ fontWeight: 'bold' }}>Episode {item.number}</Text>
          {item.title ? <Text>{item.title}</Text> : null}
        </View>
      )}
    />
  );
};

export default AnimeDetails;
```

### Multi-Provider Hook

```typescript
import { useState, useCallback } from 'react';
import { ProviderManager, ExtensionRegistry, type ProviderType } from 'react-native-consumet';

const manager = new ProviderManager(ExtensionRegistry);

export const useMultiProvider = () => {
  const [loading, setLoading] = useState(false);

  const searchContent = useCallback(async (query: string, category: ProviderType) => {
    setLoading(true);
    try {
      return await manager.searchAcrossProviders(category, query);
    } catch (error) {
      console.error('Multi-provider search failed:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getProvidersByCategory = useCallback((category: ProviderType) => {
    return manager.getExtensionsByCategory(category);
  }, []);

  return {
    searchContent,
    getProvidersByCategory,
    loading,
    manager,
  };
};
```

## API Reference

### ProviderManager

```typescript
class ProviderManager {
  // Throws RegistryError if the registry is invalid or uses a newer schemaVersion
  constructor(
    registry: ExtensionRegistryData | typeof ExtensionRegistry,
    config?: ProviderContextConfig,
    integrityOptions?: IntegrityOptions
  );

  // Extension management
  getAvailableExtensions(): ExtensionManifest[];
  getExtensionsByCategory(category: ProviderType): ExtensionManifest[];
  getExtensionMetadata(extensionId: string): ExtensionManifest; // throws if the id isn't in the registry

  // Provider loading. options.baseUrl overrides the registry entry's baseUrl.
  loadExtension<T extends string>(extensionId: T, options?: ProviderLoadOptions): Promise<ProviderInstanceOf<T>>;
  getProvider<C extends ProviderType>(
    category: C,
    extensionId: string,
    options?: ProviderLoadOptions
  ): Promise<ProviderOfCategory<C>>; // throws if the entry is of another category
  getAnimeProvider(extensionId: AnimeProviderId, options?: ProviderLoadOptions): Promise<IAnimeProvider>;
  getMovieProvider(extensionId: MovieProviderId, options?: ProviderLoadOptions): Promise<IMovieProvider>;

  // Forget a loaded provider and its compiled code; the next load fetches and runs it again
  invalidate(extensionId: string): void;

  // Cross-provider operations
  searchAcrossProviders(
    category: ProviderType,
    query: string,
    page?: number
  ): Promise<Array<{ extensionId: string; results: ISearch<IAnimeResult | IMovieResult> }>>;

  // Context and metadata
  getProviderContext(): ProviderContext;
  getExtractorManager(): ExtractorManager; // shared by every provider this manager loads

  // Run provider code your app already has. Throws IntegrityError unless the code matches
  // metadata.sha256 (options.skipIntegrity opts out), and RegistryError for incompatible entries.
  // Verified code is compiled once per id and sha256; each call returns a new instance.
  executeProviderCode<T extends string>(
    code: string,
    factoryName: string,
    metadata: ExtensionManifest & { id: T },
    options?: ExecuteCodeOptions & ProviderLoadOptions
  ): Promise<ProviderInstanceOf<T>>;
}
```

### ExtractorManager

```typescript
class ExtractorManager {
  // Throws RegistryError if the registry is invalid or uses a newer schemaVersion
  constructor(
    registry: ExtensionRegistryData | typeof ExtensionRegistry,
    extractorConfig?: ExtractorContextConfig,
    integrityOptions?: IntegrityOptions
  );

  // Extractor loading, by extractor name or server name ('megacloud', 'megacloud-hd-1', 'upcloud').
  // Always an instance: the registry version, or the bundled one built with this manager's context.
  loadExtractor(extractorId: string): Promise<IVideoExtractor>;

  // Forget a loaded extractor and its compiled code (takes the same names as loadExtractor)
  invalidate(extractorId: string): void;

  // Extractor metadata, resolving aliases and server-name suffixes; undefined if not in the registry
  getExtractorMetadata(extractorId: string): ExtractorInfo | undefined;
  extractBaseExtractorName(serverName: string): string | null;

  // Run extractor code your app already has (same checks as executeProviderCode)
  executeExtractorCode(code: string, metadata: ExtractorInfo, options?: ExecuteCodeOptions): Promise<IVideoExtractor>;
}
```

`IntegrityOptions` is `{ allowUnhashed?: boolean }` and `ExecuteCodeOptions` is `{ skipIntegrity?: boolean }`; see the [Security Model](./security.md) before using either.

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
  ExtensionRegistry, // the registry bundled with the library
  PolyURL, // WHATWG URL Standard implementation; throws a TypeError on invalid input
  PolyURLSearchParams, // WHATWG URLSearchParams
  defaultAxios, // default axios instance
  defaultExtractorContext,
  defaultExtractors,
  RegistryError, // invalid or incompatible registry / entry
  IntegrityError, // code that doesn't match its registry hash
  parseSignedRegistry, // verify, parse and validate a downloaded registry
  RegistrySignatureError, // a downloaded registry whose signature doesn't verify
  REQUIRED_PROVIDER_METHODS, // the methods each category's providers must have
  MetaError, // failures from META.Anilist, META.TMDB and META.Myanimelist
  type AnimeProviderId, // registry ids of anime providers
  type MovieProviderId, // registry ids of movie providers
  type IAnimeProvider, // what getAnimeProvider resolves
  type IMovieProvider, // what getMovieProvider resolves
  type ExtensionManifest, // a registry entry
  type ExtensionRegistryData, // a registry
} from 'react-native-consumet';
```

Extension authors: the helpers `ctx` gives provider code, including the native module, are described in [Adding a New Provider](./guides/adding-new-provider.md#using-providercontext).

## Additional Resources

- **Individual Provider Guides**: [`docs/guides/`](./guides/)
  - [Anime Providers](./guides/anime.md)
  - [Movie Providers](./guides/movies.md)
  - [Manga Providers](./guides/manga.md)
  - [Light Novel Providers](./guides/light-novels.md)
  - [Meta Providers](./guides/meta.md)
- **[Upgrading](./migrations/README.md)**: breaking and behaviour changes since 1.6.0
