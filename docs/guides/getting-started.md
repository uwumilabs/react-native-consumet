<h1 align="center">react-native-consumet</h1>

## Getting Started

Hello! Thank you for checking out react-native-consumet!

This document aims to be a gentle introduction to the library and its usage in React Native applications.

Let's start!

### Installation

Install with npm:

```sh
npm install react-native-consumet react-native-get-random-values
```

Install with yarn:

```sh
yarn add react-native-consumet react-native-get-random-values
```

`react-native-get-random-values` is a peer dependency. It ships native code, and autolinking only links packages your app depends on directly, so install it in your app and rebuild the native app (`cd ios && pod install` for bare iOS projects). The library imports it itself; you don't. See the [README](../../README.md#installation) for the supported versions.

### Two Ways to Use the Library

React Native Consumet offers two approaches:

1. **🚀 Extension System (Recommended)** - Load providers from the extension registry with `ProviderManager`
2. **📦 Individual Providers** - Use the provider classes bundled with the library (legacy approach)

---

## Method 1: Extension System (Recommended)

`ProviderManager` loads providers listed in a registry. The library bundles one, exported as `ExtensionRegistry`; apps can also download a newer one. Provider code is downloaded on first use and checked against the registry's SHA-256 hash before it runs.

### Basic Usage with Extensions

```ts
import { ProviderManager, ExtensionRegistry } from 'react-native-consumet';

const main = async () => {
  // The manager needs a registry: the bundled one, or one your app downloaded
  const manager = new ProviderManager(ExtensionRegistry);

  // Load an anime provider by its registry id
  const animeProvider = await manager.getAnimeProvider('animepahe');

  // Search for anime
  const results = await animeProvider.search('Attack on Titan');
  console.log(results);

  // Get detailed anime information
  const first = results.results[0];
  if (first) {
    const animeInfo = await animeProvider.fetchAnimeInfo(first.id);
    console.log(animeInfo);

    // Get episode sources
    const episode = animeInfo.episodes?.[0];
    if (episode) {
      const episodeSources = await animeProvider.fetchEpisodeSources(episode.id);
      console.log(episodeSources);
    }
  }
};

main();
```

### React Native Component Example

```tsx
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { ProviderManager, ExtensionRegistry, type IAnimeResult } from 'react-native-consumet';

// One manager for the app: it caches the providers it loads
const manager = new ProviderManager(ExtensionRegistry);

const titleOf = (item: IAnimeResult) =>
  typeof item.title === 'string' ? item.title : (item.title.english ?? item.title.romaji ?? '');

const AnimeSearchScreen = () => {
  const [searchResults, setSearchResults] = useState<IAnimeResult[]>([]);
  const [loading, setLoading] = useState(false);

  const searchAnime = async (query: string) => {
    setLoading(true);
    try {
      const provider = await manager.getAnimeProvider('animepahe');
      const results = await provider.search(query);
      setSearchResults(results.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Anime Search</Text>
      <TouchableOpacity
        onPress={() => searchAnime('One Piece')}
        disabled={loading}
        style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <Text style={{ color: 'white', textAlign: 'center' }}>{loading ? 'Searching…' : 'Search "One Piece"'}</Text>
      </TouchableOpacity>

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{titleOf(item)}</Text>
            <Text style={{ color: '#666', marginTop: 4 }}>{item.releaseDate}</Text>
          </View>
        )}
      />
    </View>
  );
};

export default AnimeSearchScreen;
```

### Cross-Provider Search

```ts
import { ProviderManager, ExtensionRegistry } from 'react-native-consumet';

const searchAcrossProviders = async () => {
  const manager = new ProviderManager(ExtensionRegistry);

  // Search across all anime providers in the registry
  const results = await manager.searchAcrossProviders('anime', 'Naruto');

  results.forEach(({ extensionId, results: providerResults }) => {
    console.log(`Results from ${extensionId}:`, providerResults.results.length);
  });
};
```

_see also [Extension Integration documentation](../extension-integration.md) for more advanced usage._

---

## Method 2: Individual Providers

The library also bundles provider classes you can construct directly. They run the code shipped with your installed library version, so they only change when you update the library.

### Anime Example

```ts
import { ANIME } from 'react-native-consumet';

const main = async () => {
  // Create a new instance of the AnimePahe provider
  const animepahe = new ANIME.AnimePahe();

  // Search for anime
  const results = await animepahe.search('Attack on Titan');
  console.log(results);

  // Get the first anime info
  const firstAnime = results.results[0];
  if (!firstAnime) return;
  const animeInfo = await animepahe.fetchAnimeInfo(firstAnime.id);
  console.log(animeInfo);

  // Get episode sources
  const episode = animeInfo.episodes?.[0];
  if (episode) {
    const episodeSources = await animepahe.fetchEpisodeSources(episode.id);
    console.log(episodeSources);
  }
};

main();
```

### Movies Example

```ts
import { MOVIES } from 'react-native-consumet';

const main = async () => {
  // Create a new instance of the NetflixMirror provider
  const netflixMirror = new MOVIES.NetflixMirror();

  // Search for movies
  const results = await netflixMirror.search('Avengers');
  console.log(results);

  // Get movie info
  const firstMovie = results.results[0];
  if (!firstMovie) return;
  const movieInfo = await netflixMirror.fetchMediaInfo(firstMovie.id);
  console.log(movieInfo);
};

main();
```

_see provider-specific documentation: [Anime](./anime.md) | [Movies](./movies.md) | [Manga](./manga.md) | [Light Novels](./light-novels.md) | [Meta](./meta.md)_

---

## Available Providers

The bundled registry lists these providers (registry id, then status). `manager.getAvailableExtensions()` returns the entries of the registry you pass in.

### 🎬 Anime Providers

- **AnimePahe** (`animepahe`, stable)
- **AniKoto** (`anikoto`, stable)
- **AniNeko** (`anineko`, stable)
- **AnimeKai** (`animekai`, deprecated)

### 🎥 Movie Providers

- **NetflixMirror**, **PrimeMirror**, **DisneyMirror** (`netflixmirror`, `primemirror`, `disneymirror`, beta)
- **VegaMovies** (`vegamovies`, alpha)
- **MultiMovies**, **YFlix** (`multimovies`, `yflix`, deprecated)

### 📚 Manga and 📖 Light Novel Providers

The bundled registry has no manga or light novel providers yet: use the bundled classes, such as `MANGA.MangaDex` and `LIGHT_NOVELS.ReadLightNovels`. A registry that lists them loads them with `manager.getProvider('manga', id)` or `manager.getProvider('light-novels', id)`. See the [Manga](./manga.md) and [Light Novels](./light-novels.md) guides.

### 🔍 Meta Providers

`META.Anilist`, `META.TMDB` and `META.Myanimelist` add metadata (AniList, TMDB, MyAnimeList) on top of an anime or movie provider. See the [Meta](./meta.md) guide.

For per-provider pages, see the [providers documentation](../providers/).

## React Native Specific Considerations

### Network Configuration

Some providers may require specific network configurations. Make sure your app has proper internet permissions:

**Android (android/app/src/main/AndroidManifest.xml):**

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

**iOS (ios/YourApp/Info.plist):**

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

### Error Handling

Loading a provider can fail before any site is contacted. The library throws typed errors you can check:

```ts
import { ProviderManager, ExtensionRegistry, RegistryError, IntegrityError } from 'react-native-consumet';

const fetchAnimeWithErrorHandling = async () => {
  try {
    const manager = new ProviderManager(ExtensionRegistry);
    const provider = await manager.getAnimeProvider('animepahe');
    return await provider.search('One Piece');
  } catch (error) {
    if (error instanceof RegistryError && error.updateRequired) {
      // The registry or provider needs a newer version of the app
      console.error('Update the app to use this provider');
    } else if (error instanceof RegistryError) {
      // The registry is malformed: error.issues lists every problem
      console.error('Invalid registry:', error.issues);
    } else if (error instanceof IntegrityError) {
      // The downloaded code didn't match its registry hash, so it wasn't run
      console.error('Provider code failed its integrity check');
    } else {
      // Network or site errors from the provider itself
      console.error('Provider error:', error);
    }
    return null;
  }
};
```

Meta providers (`META.Anilist`, `META.TMDB`, `META.Myanimelist`) throw `MetaError`, which carries the failing `source` and the HTTP `status`. See the [Meta](./meta.md) guide.

## Next Steps

Now that you have a basic understanding, explore these advanced topics:

- **[Extension Integration](../extension-integration.md)** - Deep dive into the extension system
- **[Provider-Specific Guides](./anime.md)** - Anime, [Movies](./movies.md), [Manga](./manga.md), [Light Novels](./light-novels.md) and [Meta](./meta.md)
- **[Upgrading](../migrations/README.md)** - Breaking and behaviour changes since 1.6.0
- **[Contributing](./contributing.md)** - Help improve the library

## Need Help?

If you encounter any issues or have questions:

1. Check the [documentation](../README.md)
2. Look at the [provider-specific guides](./anime.md)
3. Open an [issue](https://github.com/uwumilabs/react-native-consumet/issues) on GitHub

---

[← Back to documentation index](../README.md)
