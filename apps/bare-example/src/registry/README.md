# ProviderManager Examples

This directory contains examples demonstrating how to use the `ProviderManager` class with both registry-based and local provider loading approaches.

## Overview

The `ProviderManager` is a unified system for loading and managing media provider extensions in React Native Consumet. It supports two main loading strategies:

1. **Registry-based loading** - Load providers from remote GitHub URLs
2. **Local file loading** - Load providers from local file paths

## Examples

### 🌐 GitHub Registry Example (`Ext-github.tsx`)

**Uses:** `ProviderManager.loadExtension(extensionId)`

This example demonstrates loading providers from the official GitHub registry:

```typescript
const manager = new ProviderManager();

// Get available extensions from registry
const extensions = manager.getAvailableExtensions();

// Load extension by ID
const provider = await manager.loadExtension('zoro-anime');

// Use the provider
const results = await provider.search('Naruto');
```

**Features:**
- ✅ Automatically loads from `registry.json`
- ✅ Supports multiple extensions with switching
- ✅ Remote updates and version control
- ✅ Metadata and settings from registry
- ✅ Type-safe provider interfaces

**Registry Structure:**
```json
{
  "extensions": [
    {
      "id": "zoro-anime",
      "name": "Zoro Anime Provider",
      "main": "https://raw.githubusercontent.com/uwumilabs/react-native-consumet/native-executor/dist/providers/anime/zoro.js",
      "factories": ["createZoro"],
      "category": "anime"
    }
  ]
}
```

### 📂 Local Files Example (`Ext-local.tsx`)

**Uses:** `ProviderManager.loadProviderCode(source, factoryName, extensionId)`

This example demonstrates loading providers from local file paths:

```typescript
const manager = new ProviderManager();

// Load from local file path
const provider = await manager.loadProviderCode(
  '../../../lib/commonjs/providers/anime/zoro.js',
  'createZoro',
  'zoro-local'
);

// Use the provider
const results = await provider.search('Naruto');
```

**Features:**
- ✅ Load from local file system
- ✅ No network required
- ✅ Faster loading for development
- ✅ Support for custom providers
- ✅ Auto-detection of factory functions

**Additional Methods:**
```typescript
// Auto-detect factory function
const provider = await manager.loadAnyProvider('./path/to/provider.js');

// Load from string content
const provider = await manager.loadProviderCodeFromString(
  codeString, 
  'createZoro'
);

// Convenience methods
const zoroProvider = await manager.loadZoro('./custom/zoro.js');
const movieProvider = await manager.loadHiMovies('./custom/himovies.js');
```

## Running the Examples

### Demo App (`index.tsx`)

The main demo app provides a tabbed interface to switch between both examples:

```typescript
import ProviderManagerDemo from './src/registry';

// In your app
<ProviderManagerDemo />
```

### Individual Examples

Import and use individual examples:

```typescript
// GitHub Registry Example
import ExtGithub from './src/registry/Ext-github';
<ExtGithub />

// Local Files Example
import ExtLocal from './src/registry/Ext-local';
<ExtLocal />
```

## Provider Manager Configuration

### Basic Setup

```typescript
import { ProviderManager } from 'react-native-consumet';

// Create with default configuration
const manager = new ProviderManager();

// Create with custom configuration
const manager = new ProviderManager({
  axios: customAxiosInstance,
  extractors: customExtractors,
  // ... other config options
});
```

### Registry Methods

```typescript
// Get all extensions
const extensions = manager.getAvailableExtensions();

// Get extensions by category
const animeExtensions = manager.getExtensionsByCategory('anime');
const movieExtensions = manager.getExtensionsByCategory('movies');

// Get extension metadata
const metadata = manager.getExtensionMetadata('zoro-anime');

// Get type-safe providers
const animeProvider = await manager.getAnimeProvider('zoro-anime');
const movieProvider = await manager.getMovieProvider('himovies-movies');
```

### Local Loading Methods

```typescript
// Load from file path
const provider = await manager.loadProviderCode(
  './path/to/provider.js',
  'createProviderName',
  'custom-id'
);

// Load from URL
const provider = await manager.loadProviderCode(
  'https://example.com/provider.js',
  'createProviderName',
  'remote-id'
);

// Auto-detect factory function
const provider = await manager.loadAnyProvider('./path/to/provider.js');
```

## Error Handling

Both examples include comprehensive error handling:

```typescript
try {
  const provider = await manager.loadExtension('zoro-anime');
  const results = await provider.search('query');
  // Handle results
} catch (error) {
  console.error('Failed to load provider:', error);
  Alert.alert('Error', error.message);
}
```

## Provider Interface

All loaded providers implement the base provider interface:

```typescript
interface BaseProviderInstance {
  name: string;
  baseUrl: string;
  search(query: string, page?: number): Promise<ISearch<any>>;
  fetchEpisodeSources(episodeId: string): Promise<ISource>;
  fetchEpisodeServers(episodeId: string): Promise<IEpisodeServer[]>;
}

// Category-specific interfaces
interface AnimeProviderInstance extends BaseProviderInstance {
  fetchAnimeInfo(animeId: string): Promise<IAnimeInfo>;
}

interface MovieProviderInstance extends BaseProviderInstance {
  fetchMediaInfo(mediaId: string): Promise<IMovieInfo>;
}
```

## Development Notes

### File Structure
```
src/registry/
├── index.tsx              # Main demo with tabs
├── Ext-github.tsx         # Registry example
├── Ext-local.tsx          # Local files example
└── README.md              # This file
```

### Dependencies
- React Native Consumet library
- ProviderManager class
- Local provider files in `lib/commonjs/providers/`

### Registry Configuration
The registry is loaded from `src/registry.json` and contains metadata for all available extensions including GitHub URLs, factory functions, and categories.

## Troubleshooting

### Common Issues

1. **Provider not found**: Check extension ID in registry
2. **Factory function not found**: Verify factory name in provider file
3. **Network errors**: Check GitHub URL accessibility
4. **Local file errors**: Verify file path and permissions

### Debug Information

Both examples include debug sections showing:
- Provider Manager initialization status
- Selected provider information
- Available methods on provider instance
- Loading state and error details

## Next Steps

- Extend examples with more provider categories
- Add provider caching and performance optimization
- Implement provider settings and configuration
- Add offline support for registry-based providers
