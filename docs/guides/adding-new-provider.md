# Adding a New Provider to react-native-consumet

This guide outlines the process of adding a new content provider (e.g., for anime, movies, manga, or light novels) to the `react-native-consumet` library.

## Table of Contents
- [Understanding Providers and Extractors](#understanding-providers-and-extractors)
- [Step 1: Choose the Right Category](#step-1-choose-the-right-category)
- [Step 2: Create the Provider File](#step-2-create-the-provider-file)
- [Step 3: Implement the Provider Logic](#step-3-implement-the-provider-logic)
  - [Core Methods to Implement](#core-methods-to-implement)
  - [Using `ProviderContext`](#using-providercontext)
  - [Integrating Extractors](#integrating-extractors)
- [Step 4: Add to `extension-registry.json`](#step-4-add-to-extension-registryjson)
- [Step 5: Write Tests](#step-5-write-tests)
- [Step 6: Update Documentation](#step-6-update-documentation)
- [Step 7: Build and Verify](#step-7-build-and-verify)
- [Submitting Your Contribution](#submitting-your-contribution)

---

## Understanding Providers and Extractors

Before you start, it's crucial to understand the distinction between **Providers** and **Extractors** in this project:

*   **Providers (`src/providers`)**: These are responsible for fetching metadata and high-level media information from external APIs or websites. They handle:
    *   Searching for content (e.g., anime by title).
    *   Fetching detailed information about a specific media item (e.g., episode list for an anime).
    *   Fetching episode servers (links to where the actual video content is hosted).
    *   They act as the "brains" for a specific media type.

*   **Extractors (`src/extractors`)**: These are responsible for the low-level task of scraping and extracting actual video sources (and subtitles) from specific hosting websites (e.g., MegaCloud, StreamSB). They deal with:
    *   Making web requests to video hosting sites.
    *   Parsing HTML (using `cheerio`).
    *   Handling any encryption/decryption required by the hosting site (using `crypto-js`).
    *   They are the "hands" that interact directly with the content sources.

**Key Relationship**: Providers often delegate the task of obtaining direct media links to extractors. If a provider uses a common video hosting site, you'll likely use an existing extractor. If it uses a unique or custom hosting solution, you might need to create a new extractor first.

## Step 1: Choose the Right Category

Providers are categorized by media type. Determine if your new provider is for:
*   Anime (`src/providers/anime`)
*   Movies (`src/providers/movies`)
*   Manga (`src/providers/manga`)
*   Light Novels (`src/providers/light-novels`)
*   Meta (for metadata services like Anilist, TMDB) (`src/providers/meta`)

## Step 2: Create the Provider File

Navigate to the appropriate category directory (e.g., `src/providers/anime/`) and create a new TypeScript file for your provider (e.g., `myanimewebsite.ts`).

Inside this file, you'll typically export a function that creates your provider instance. This function will receive a `ProviderContext` object.

```typescript
// src/providers/anime/myanimewebsite.ts
import { ProviderContext, AnimeParser, type ISearch, type IAnimeInfo, type ISource, type IEpisodeServer } from '../../models';

export function createMyAnimeWebsite(ctx: ProviderContext) {
  const { axios, load, URL, URLSearchParams, extractors, enums } = ctx;
  const { StreamingServers } = enums; // Access enums like StreamingServers

  // Define your base URL
  const baseUrl = 'https://www.myanimewebsite.com';

  // Implement your provider logic here
  class MyAnimeWebsite extends AnimeParser {
    readonly name = 'MyAnimeWebsite';
    protected baseUrl = baseUrl;

    // Implement core methods (search, fetchAnimeInfo, fetchEpisodeSources, fetchEpisodeServers)
    // ...
  }

  return new MyAnimeWebsite();
}
```

## Step 3: Implement the Provider Logic

Your provider class should extend the appropriate base parser (`AnimeParser`, `MovieParser`, `MangaParser`, `LightNovelParser`) and implement its abstract methods.

### Core Methods to Implement

*   `search(query: string, ...args: any[]): Promise<ISearch<T>>`: Searches for content based on a query.
*   `fetchMediaInfo(mediaId: string, ...args: any[]): Promise<TInfo>`: Fetches detailed information about a media item.
*   `fetchEpisodeSources(episodeId: string, ...args: any[]): Promise<ISource>`: Fetches video sources for a specific episode. This is where you'll typically interact with extractors.
*   `fetchEpisodeServers(episodeId: string, ...args: any[]): Promise<IEpisodeServer[]>`: Fetches available servers for an episode.

### Using `ProviderContext`

The `ProviderContext` (`ctx`) object provides essential utilities:
*   `axios`: An Axios instance for making HTTP requests.
*   `load`: A Cheerio `load` function for parsing HTML.
*   `URL`, `URLSearchParams`: Polyfills for URL manipulation.
*   `extractors`: An object containing dynamically loadable extractors (e.g., `extractors.MegaCloud`).
*   `enums`: Access to shared enums like `StreamingServers`, `MediaStatus`, `SubOrDub`.

**Example using `axios` and `load`:**

```typescript
// Inside your provider class
async search(query: string): Promise<ISearch<IAnimeResult>> {
  const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
  const { data } = await ctx.axios.get(searchUrl);
  const $ = ctx.load(data);

  const results: IAnimeResult[] = [];
  $('div.anime-item').each((i, el) => {
    results.push({
      id: $(el).find('a').attr('href')?.split('/').pop() || '',
      title: $(el).find('h3').text().trim(),
      image: $(el).find('img').attr('src'),
      // ... other fields
    });
  });

  return { results, currentPage: 1, hasNextPage: false };
}
```

### Integrating Extractors

When implementing `fetchEpisodeSources`, you'll use extractors provided by the `ProviderContext`.

```typescript
// Inside your provider class's fetchEpisodeSources method
async fetchEpisodeSources(episodeId: string, server: StreamingServers): Promise<ISource> {
  // First, get the embed URL for the chosen server
  const embedUrl = await this.getEmbedUrlForServer(episodeId, server); // Your custom method

  if (!embedUrl) {
    throw new Error(`No embed URL found for server: ${server}`);
  }

  let sources: ISource;
  switch (server) {
    case StreamingServers.MegaCloud:
      // Use the MegaCloud extractor from the context
      const megacloudExtractor = ctx.extractors.MegaCloud;
      sources = await megacloudExtractor(ctx).extract(new ctx.URL(embedUrl), this.baseUrl);
      break;
    case StreamingServers.StreamSB:
      // Use the StreamSB extractor
      const streamsbExtractor = ctx.extractors.StreamSB;
      sources = await streamsbExtractor(ctx).extract(new ctx.URL(embedUrl));
      break;
    // Add cases for other extractors your provider uses
    default:
      throw new Error(`Unsupported server: ${server}`);
  }

  return sources;
}
```

## Step 4: Add to `extension-registry.json`

Once your provider is implemented, you need to register it in `src/extension-registry.json`. This file acts as a manifest for all available extensions.

Add a new entry to the `extensions` array:

```json
{
  "id": "myanimewebsite",
  "name": "MyAnimeWebsite",
  "description": "A new provider for anime content from MyAnimeWebsite.com",
  "version": "1.0.0",
  "author": {
    "name": "Your Name",
    "url": "https://github.com/your-github"
  },
  "category": "anime", // or movies, manga, light-novels, meta
  "main": "https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/dist/providers/anime/myanimewebsite.js", // Path to your compiled JS file
  "factoryName": "createMyAnimeWebsite", // The name of the function you export
  "baseUrl": "https://www.myanimewebsite.com",
  "logo": "https://www.myanimewebsite.com/favicon.ico", // Link to provider's logo/favicon
  "languages": ["en"],
  "nsfw": false,
  "status": "beta", // or stable, deprecated
  "lastUpdated": "YYYY-MM-DDTHH:MM:SSZ", // Current UTC timestamp
  "extractors": ["MegaCloud", "StreamSB"], // List of extractors your provider uses
  "subbed": true, // For anime providers
  "dubbed": true, // For anime providers
  "isSourceEmbed": true // true if the provider uses embed links that require extractors
}
```
**Important**: The `main` field should point to the *compiled JavaScript file* in the `dist` directory, hosted on GitHub (e.g., `raw.githubusercontent.com`). You'll need to push your changes and then update this URL.

## Step 5: Write Tests

Create a new test file in the `test` directory corresponding to your provider's category (e.g., `test/anime/myanimewebsite.test.ts`).

Use `jest` to write unit and integration tests for your provider's `search`, `fetchMediaInfo`, `fetchEpisodeSources`, and `fetchEpisodeServers` methods.

```typescript
// test/anime/myanimewebsite.test.ts
import { ProviderManager } from '../../src/utils/ProviderManager';
import { AnimeParser } from '../../src/models';

describe('MyAnimeWebsite Provider', () => {
  let provider: AnimeParser;

  beforeAll(async () => {
    const manager = new ProviderManager();
    provider = await manager.getAnimeProvider('myanimewebsite'); // Use your provider's ID
  });

  test('should search for anime', async () => {
    const results = await provider.search('Attack on Titan');
    expect(results.results).toBeInstanceOf(Array);
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results[0]).toHaveProperty('id');
    expect(results.results[0]).toHaveProperty('title');
  });

  test('should fetch anime info', async () => {
    const searchResults = await provider.search('Jujutsu Kaisen');
    const animeId = searchResults.results[0]?.id;
    expect(animeId).toBeDefined();

    const info = await provider.fetchAnimeInfo(animeId!);
    expect(info).toHaveProperty('title');
    expect(info).toHaveProperty('episodes');
    expect(info.episodes?.length).toBeGreaterThan(0);
  });

  test('should fetch episode sources', async () => {
    const searchResults = await provider.search('One Piece');
    const animeId = searchResults.results[0]?.id;
    expect(animeId).toBeDefined();

    const info = await provider.fetchAnimeInfo(animeId!);
    const episodeId = info.episodes?.[0]?.id;
    expect(episodeId).toBeDefined();

    const sources = await provider.fetchEpisodeSources(episodeId!);
    expect(sources).toHaveProperty('sources');
    expect(sources.sources.length).toBeGreaterThan(0);
    expect(sources.sources[0]).toHaveProperty('url');
  });

  // Add more tests for edge cases, error handling, etc.
});
```

Run your tests using `yarn test`.

## Step 6: Update Documentation

Create a new markdown file for your provider in `docs/providers/<category>/` (e.g., `docs/providers/anime/myanimewebsite.md`). Document its capabilities, supported methods, and any specific usage notes.

Also, update the relevant `docs/guides/<category>.md` file to include your new provider in the list of available providers.

## Step 7: Build and Verify

Before submitting, ensure your changes build correctly and pass linting checks.

```bash
yarn build
yarn lint
```

Test your provider in the example applications (`apps/bare-example` or `apps/expo-example`) to ensure it works as expected in a real React Native environment.

## Submitting Your Contribution

Once you're confident in your changes, create a pull request to the `react-native-consumet` repository. Ensure your commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.
