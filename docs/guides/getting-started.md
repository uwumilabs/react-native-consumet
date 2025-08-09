<h1 align="center">react-native-consumet</h1>

## Getting Started

Hello! Thank you for checking out react-native-consumet!

This document aims to be a gentle introduction to the library and its usage in React Native applications.

Let's start!

### Installation

Install with npm:

```sh
npm install react-native-consumet
```

Install with yarn:

```sh
yarn add react-native-consumet
```

### Two Ways to Use the Library

React Native Consumet offers two approaches:

1. **🚀 Extension System (Recommended)** - Dynamic provider loading with unified API
2. **📦 Individual Providers** - Direct provider imports (legacy approach)

---

## Method 1: Extension System (Recommended)

The extension system provides better performance, unified API, and cross-provider search capabilities.

### Basic Usage with Extensions

```ts
import { ProviderManager } from 'react-native-consumet';

const main = async () => {
  // Create a new instance of the ProviderManager
  const manager = new ProviderManager();
  
  // Get an anime provider
  const animeProvider = await manager.getAnimeProvider('zoro');
  
  // Search for anime
  const results = await animeProvider.search('Attack on Titan');
  console.log(results);
  
  // Get detailed anime information
  if (results.results.length > 0) {
    const animeInfo = await animeProvider.fetchAnimeInfo(results.results[0].id);
    console.log(animeInfo);
    
    // Get episode sources
    if (animeInfo.episodes && animeInfo.episodes.length > 0) {
      const episodeSources = await animeProvider.fetchEpisodeSources(animeInfo.episodes[0].id);
      console.log(episodeSources);
    }
  }
};

main();
```

### React Native Component Example

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { ProviderManager } from 'react-native-consumet';

const AnimeSearchScreen = () => {
  const [manager] = useState(() => new ProviderManager());
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchAnime = async (query: string) => {
    setLoading(true);
    try {
      const provider = await manager.getAnimeProvider('zoro');
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
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Anime Search
      </Text>
      <TouchableOpacity 
        onPress={() => searchAnime('One Piece')}
        style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 8, marginBottom: 16 }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Search "One Piece"
        </Text>
      </TouchableOpacity>
      
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.title}</Text>
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
import { ProviderManager } from 'react-native-consumet';

const searchAcrossProviders = async () => {
  const manager = new ProviderManager();
  
  // Search across all available anime providers
  const results = await manager.searchAcrossProviders('anime', 'Naruto');
  
  results.forEach(({ extensionId, results: providerResults }) => {
    console.log(`Results from ${extensionId}:`, providerResults.results.length);
  });
};
```

_see also [Extension Integration documentation](../extension-integration.md) for more advanced usage._

---

## Method 2: Individual Providers

If you prefer to use individual providers directly:

### Anime Example

```ts
import { ANIME } from 'react-native-consumet';

const main = async () => {
  // Create a new instance of the Zoro provider
  const zoro = new ANIME.Zoro();
  
  // Search for anime
  const results = await zoro.search('Attack on Titan');
  console.log(results);
  
  // Get the first anime info
  const firstAnime = results.results[0];
  const animeInfo = await zoro.fetchAnimeInfo(firstAnime.id);
  console.log(animeInfo);
  
  // Get episode sources
  if (animeInfo.episodes && animeInfo.episodes.length > 0) {
    const episodeSources = await zoro.fetchEpisodeSources(animeInfo.episodes[0].id);
    console.log(episodeSources);
    
    // Get available streaming servers
    const streamingServers = await zoro.fetchEpisodeServers(animeInfo.episodes[0].id);
    console.log(streamingServers);
  }
};

main();
```

### Movies Example

```ts
import { MOVIES } from 'react-native-consumet';

const main = async () => {
  // Create a new instance of the FlixHQ provider
  const flixhq = new MOVIES.FlixHQ();
  
  // Search for movies
  const results = await flixhq.search('Avengers');
  console.log(results);
  
  // Get movie info
  const firstMovie = results.results[0];
  const movieInfo = await flixhq.fetchMediaInfo(firstMovie.id);
  console.log(movieInfo);
};

main();
```

_see provider-specific documentation: [Anime](./anime.md) | [Movies](./movies.md) | [Manga](./manga.md) | [Light Novels](./light-novels.md)_

---

## Available Providers

React Native Consumet supports various providers across different categories:

### 🎬 Anime Providers

- **Zoro** - High-quality anime streaming
- **Gogoanime** - Popular anime provider
- **AnimePahe** - Compressed anime episodes

### 🎥 Movie Providers

- **FlixHQ** - Movies and TV shows
- **HiMovies** - HD movies and series

### 📚 Manga Providers

- **MangaDex** - Comprehensive manga library
- **MangaHere** - Popular manga reader

### 📖 Light Novel Providers

- **ReadLightNovels** - Extensive light novel collection

For a complete list of available providers, check the [providers documentation](../providers/).

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

Always implement proper error handling for network requests:

```ts
const fetchAnimeWithErrorHandling = async () => {
  try {
    const manager = new ProviderManager();
    const provider = await manager.getAnimeProvider('zoro');
    const results = await provider.search('One Piece');
    return results;
  } catch (error) {
    if (error.message.includes('network')) {
      console.error('Network error - check internet connection');
    } else if (error.message.includes('provider')) {
      console.error('Provider error - try a different provider');
    } else {
      console.error('Unknown error:', error);
    }
    return null;
  }
};
```

## Next Steps

Now that you have a basic understanding, explore these advanced topics:

- **[Extension Integration](../extension-integration.md)** - Deep dive into the extension system
- **[Provider-Specific Guides](../guides/)** - Detailed guides for each provider type
- **[Contributing](./contributing.md)** - Help improve the library

## Need Help?

If you encounter any issues or have questions:

1. Check the [documentation](../README.md)
2. Look at the [provider-specific guides](../guides/)
3. Open an [issue](https://github.com/uwumilabs/react-native-consumet/issues) on GitHub

---

[← Back to documentation index](../README.md)
