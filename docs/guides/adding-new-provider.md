# Adding a New Provider to react-native-consumet

This guide outlines the process of adding a new content provider (e.g., for anime, movies, manga, or light novels) to the `react-native-consumet` library.

Providers ship through the extension registry: you write a factory, add a registry entry, and commit. The build, the published file, its URL and its hash are generated, and apps load the provider without a library release.

## Table of Contents

- [Understanding Providers and Extractors](#understanding-providers-and-extractors)
- [Step 1: Choose the Right Category](#step-1-choose-the-right-category)
- [Step 2: Create the Provider File](#step-2-create-the-provider-file)
- [Step 3: Implement the Provider Logic](#step-3-implement-the-provider-logic)
  - [Core Methods to Implement](#core-methods-to-implement)
  - [Using `ProviderContext`](#using-providercontext)
  - [Integrating Extractors](#integrating-extractors)
  - [Declaring Capabilities](#declaring-capabilities)
  - [Native Module](#native-module)
- [Step 4: Add to `extension-registry.json`](#step-4-add-to-extension-registryjson)
  - [Compatibility: `minContextVersion` and `schemaVersion`](#compatibility-mincontextversion-and-schemaversion)
  - [What CI checks](#what-ci-checks)
  - [Removing old published versions](#removing-old-published-versions)
- [Optional: Bundle a Provider Class](#optional-bundle-a-provider-class)
- [Step 5: Write Tests](#step-5-write-tests)
- [Step 6: Update Documentation](#step-6-update-documentation)
- [Step 7: Build and Verify](#step-7-build-and-verify)
- [Submitting Your Contribution](#submitting-your-contribution)

---

## Understanding Providers and Extractors

Before you start, it's crucial to understand the distinction between **Providers** and **Extractors** in this project:

- **Providers (`src/providers`)**: These are responsible for fetching metadata and high-level media information from external APIs or websites. They handle:
  - Searching for content (e.g., anime by title).
  - Fetching detailed information about a specific media item (e.g., episode list for an anime).
  - Fetching episode servers (links to where the actual video content is hosted).
  - They act as the "brains" for a specific media type.

- **Extractors (`src/extractors`)**: These are responsible for the low-level task of scraping and extracting actual video sources (and subtitles) from specific hosting websites (e.g., MegaCloud, VidHide). They deal with:
  - Making web requests to video hosting sites.
  - Parsing HTML (using `cheerio`).
  - Handling any encryption/decryption required by the hosting site (using `crypto-js`).
  - They are the "hands" that interact directly with the content sources.

**Key Relationship**: Providers often delegate the task of obtaining direct media links to extractors. If a provider uses a common video hosting site, you'll likely use an existing extractor. If it uses a unique or custom hosting solution, you might need to create a new extractor first.

## Step 1: Choose the Right Category

Providers are categorized by media type. Determine if your new provider is for:

- Anime (`src/providers/anime`)
- Movies (`src/providers/movies`)
- Manga (`src/providers/manga`)
- Light Novels (`src/providers/light-novels`)
- Meta (for metadata services like Anilist, TMDB) (`src/providers/meta`)

Every category can ship through the registry. Apps load a provider with `ProviderManager.getProvider(category, id)` (`getAnimeProvider` and `getMovieProvider` are shortcuts for anime and movies), which checks that it has the methods its category requires; see [Core Methods to Implement](#core-methods-to-implement). The examples in this guide are an anime provider. The meta providers the library ships (`META.Anilist`, `META.TMDB`) are bundled classes that wrap another provider, so changing them needs a library release.

## Step 2: Create the Provider File

Create a folder for your provider in the category directory and a factory file in it named `create-<id>.ts`, e.g. `src/providers/anime/myanimewebsite/create-myanimewebsite.ts`. The build bundles exactly this file (see [Step 4](#step-4-add-to-extension-registryjson)).

The factory receives a `ProviderContext` and the base URL from the registry entry, and returns a plain object with the provider's fields and methods:

```typescript
// src/providers/anime/myanimewebsite/create-myanimewebsite.ts
import {
  type IAnimeInfo,
  type IAnimeResult,
  type IEpisodeServer,
  type ISearch,
  type ISource,
  type ProviderCapabilities,
  type ProviderConfig,
  type ProviderContext,
} from '../../../models';

export function createMyAnimeWebsite(ctx: ProviderContext, customBaseURL?: string) {
  const { axios, load, PolyURL, extractors, createCustomBaseUrl } = ctx;

  // The registry entry's `baseUrl` arrives as customBaseURL, so a domain move is a registry-only change
  const baseUrl = createCustomBaseUrl('https://www.myanimewebsite.com', customBaseURL);

  const config: ProviderConfig = {
    name: 'MyAnimeWebsite',
    languages: 'en',
    classPath: 'ANIME.MyAnimeWebsite',
    baseUrl,
    logo: `${baseUrl}/favicon.ico`,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: false,
  };

  const search = async (query: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const { data } = await axios.get(`${baseUrl}/search?q=${encodeURIComponent(query)}&page=${page}`);
    const $ = load(data);

    const results: IAnimeResult[] = [];
    $('div.anime-item').each((_, el) => {
      const href = $(el).find('a').attr('href') ?? '';
      results.push({
        id: href.split('/').pop() ?? '',
        title: $(el).find('h3').text().trim(),
        image: $(el).find('img').attr('src'),
      });
    });

    return { currentPage: page, hasNextPage: false, results };
  };

  const fetchAnimeInfo = async (id: string): Promise<IAnimeInfo> => {
    const { data } = await axios.get(`${baseUrl}/anime/${id}`);
    const $ = load(data);
    return {
      id,
      title: $('h1').text().trim(),
      episodes: $('ul.episodes li a')
        .map((i, el) => ({ id: $(el).attr('data-id') ?? '', number: i + 1 }))
        .get(),
    };
  };

  const fetchEpisodeServers = async (episodeId: string): Promise<IEpisodeServer[]> => {
    const { data } = await axios.get(`${baseUrl}/ajax/servers/${episodeId}`);
    const $ = load(data);
    return $('.server')
      .map((_, el) => ({ name: $(el).text().trim().toLowerCase(), url: $(el).attr('data-link') ?? '' }))
      .get();
  };

  const fetchEpisodeSources = async (episodeId: string, server: string = 'megacloud'): Promise<ISource> => {
    const servers = await fetchEpisodeServers(episodeId);
    const picked = servers.find((s) => s.name.startsWith(server)) ?? servers[0];
    if (!picked) throw new Error(`No servers found for episode ${episodeId}`);

    // Runs the registry version of MegaCloud when the app's registry has one, else the bundled one.
    // The base resolves a relative link; PolyURL throws a TypeError on one it can't parse.
    return await extractors.MegaCloud(ctx).extract(new PolyURL(picked.url, baseUrl), `${baseUrl}/`);
  };

  return {
    ...config,
    capabilities: { aniZipEpisodes: true } as ProviderCapabilities,
    search,
    fetchAnimeInfo,
    fetchEpisodeServers,
    fetchEpisodeSources,
  };
}

export type MyAnimeWebsiteProviderInstance = ReturnType<typeof createMyAnimeWebsite>;
```

Export the factory by name (`export function createMyAnimeWebsite`); the registry's `factoryName` must match it. Provider and extractor modules use named exports only.

## Step 3: Implement the Provider Logic

### Core Methods to Implement

`ProviderManager` checks that the methods of the entry's `category` exist before it hands a loaded provider to an app, and rejects it with every missing method in the error. They are exported as `REQUIRED_PROVIDER_METHODS`:

| Category       | Required methods                                                         |
| -------------- | ------------------------------------------------------------------------ |
| `anime`        | `search`, `fetchAnimeInfo`, `fetchEpisodeSources`, `fetchEpisodeServers` |
| `movies`       | `search`, `fetchMediaInfo`, `fetchEpisodeSources`, `fetchEpisodeServers` |
| `manga`        | `search`, `fetchMangaInfo`, `fetchChapterPages`                          |
| `light-novels` | `search`, `fetchLightNovelInfo`, `fetchChapterContent`                   |
| `meta`         | `search`, `fetchEpisodeSources`, `fetchEpisodeServers`                   |

No base class is needed: return a plain object, as in the example. For anime and movie providers:

- `search(query: string, ...args: any[]): Promise<ISearch<T>>`: Searches for content based on a query.
- `fetchAnimeInfo(animeId: string, ...args: any[]): Promise<IAnimeInfo>` (anime) or `fetchMediaInfo(mediaId: string, ...args: any[]): Promise<IMovieInfo>` (movies): Fetches detailed information about a media item, including its episodes.
- `fetchEpisodeServers(episodeId: string, ...args: any[]): Promise<IEpisodeServer[]>`: Fetches available servers for an episode.
- `fetchEpisodeSources(episodeId: string, ...args: any[]): Promise<ISource>`: Fetches video sources for a specific episode. This is where you'll typically interact with extractors.

Movie providers also set `supportedTypes` (a `Set` of `TvType` values). Give movie results `type`, `releaseDate` and, for TV shows, `seasons`, so `META.TMDB` can match them.

### Using `ProviderContext`

The `ProviderContext` (`ctx`) object provides essential utilities. Prefer it over imports: the bundle can only `require` a few modules (see [Step 4](#step-4-add-to-extension-registryjson)).

- `axios`: The app's Axios instance for making HTTP requests (15 s timeout by default).
- `load`: A Cheerio `load` function for parsing HTML.
- `CryptoJS`, `USER_AGENT`: crypto-js and the default User-Agent string.
- `PolyURL`, `PolyURLSearchParams`: implementations of the WHATWG URL Standard. Use them instead of the global `URL`, which is incomplete in React Native. As the standard requires, `new PolyURL(input)` throws a `TypeError` for invalid input or an invalid base, so pass a base for scraped links that may be relative (`new PolyURL(href, baseUrl)`), or catch the error. `pathname` keeps its percent-encoding, and query strings encode a space as `+`.
- `createCustomBaseUrl(defaultUrl, customUrl?)`: Picks the registry's base URL when one is passed.
- `extractors`: The extractors, e.g. `extractors.MegaCloud(ctx)` (see below).
- `enums`: The library's enums: `StreamingServers`, `MediaFormat`, `MediaStatus`, `SubOrDub`, `WatchListType`, `TvType`, `Genres`, `Topics`.
- `AnimeParser`, `MovieParser`, `MangaParser`: The base classes.
- `NativeConsumet`: The native module (WebView requests, DDoS-Guard cookies, script deobfuscation); see [Native Module](#native-module).

The full type is `ProviderContext` in [`src/models/provider-context.ts`](../../src/models/provider-context.ts).

Extension code also runs with a few globals:

- `fetch(url, { method, headers, body })`: sent through the app's axios. Like the platform `fetch`, it resolves for every HTTP status (`ok` is `false` for 4xx and 5xx) and rejects only when no response arrives. `text()` always returns the body as a string, also for JSON responses, and `json()` parses it.
- `exports`, `module`, `require` (only the modules listed in [Step 4](#step-4-add-to-extension-registryjson)) and `console`.

The loader looks for your factory as `exports[factoryName]`, then `module.exports[factoryName]`, then a top-level `function factoryName`, then the default export (`exports.default`, then `module.exports.default`). Code outside the factory runs once per manager and code hash; the factory runs once per load.

### Integrating Extractors

Call extractors through `ctx.extractors`, passing the context to function extractors: `extractors.MegaCloud(ctx).extract(new PolyURL(embedUrl), referer)`, as in the example above. When the provider is loaded by a `ProviderManager` whose registry lists the extractor, this runs the registry version, hash-checked and cached, and falls back to the bundled one if the registry copy can't be used. The `ExtractorRegistry` type in [`src/models/provider-context.ts`](../../src/models/provider-context.ts) lists each extractor's `extract` signature; older ones are classes that take the context too (`new extractors.MixDrop(ctx)`).

Always pass your factory's `ctx` to the extractors you call. A bundled extractor then makes its requests through the app's axios, proxy and user agent; without a context it falls back to the library's default context and ignores the app's settings.

List the extractors your provider uses in the entry's `extractors` field. Server names resolve to extractors by the longest registry `name` or alias they start with (`megacloud-hd-1` → MegaCloud), so name your servers after their extractor.

A new extractor is a registry entry too. Write `src/extractors/<name>.ts` exporting a function named exactly like the entry's `name` (`export function NewHost(ctx: ExtractorContext): IVideoExtractor`), and add an entry to the registry's `extractors` array with `name`, `version`, `minContextVersion`, `distFile` (`dist/bundles/extractors/<name>.js`) and optional `aliases`. To call it as `ctx.extractors.NewHost` with types, also add it to `defaultExtractors` in [`src/utils/extension-utils.ts`](../../src/utils/extension-utils.ts) and to `ExtractorRegistry`.

### Declaring Capabilities

Meta providers decide how to treat your provider from what it declares, not from its class, so a provider shipped only through the registry gets the same treatment as a built-in one. Return a `capabilities` object from your factory, as in the example above:

```typescript
return {
  ...config,
  capabilities: { aniZipEpisodes: true } as ProviderCapabilities,
  search,
  fetchAnimeInfo,
  // ...
};
```

| Capability       | Meaning                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aniZipEpisodes` | `META.Anilist` merges your episode list with ani.zip titles, images and episode keys. Set it when your episode `number`s follow the anime's own numbering. |
| `subDub`         | `'combined'`: one entry whose episode ids end in `$both`, and the caller picks `$sub` or `$dub`. `'separate'`: sub and dub are separate entries.           |

With `aniZipEpisodes`, `META.Anilist` keys your episodes by AniDB number (`uniqueId`), matching them to ani.zip by `number` first; see [Migrating stored episode `uniqueId`s](../migrations/uniqueid.md). Without it, your episodes are keyed by their own `number`.

If your provider has a class wrapper, copy the field across: `this.capabilities = this.instance.capabilities;`.

### Native Module

`ctx.NativeConsumet` gives extension code the library's native module: `makeGetRequestWithWebView` and `makePostRequestWithWebView` (load a page in a hidden WebView, with its cookies), `getDdosGuardCookiesWithWebView` and `bypassDdosGuard`, a plain `makePostRequest`, and `deobfuscateScript` (runs the Synchrony deobfuscator). What each method resolves, the `code` of each rejection, and how WebView requests treat sub-resources, HTTP errors and cookies are documented in [`src/NativeConsumet.ts`](../../src/NativeConsumet.ts). Android and iOS follow that contract. In short:

- Rejections are Errors with a `code`: `WEBVIEW_ERROR` (the page failed to load), `TIMEOUT` (it didn't finish within 30 s), `COOKIE_ERROR`, `ERROR`, `HTTP_ERROR`, and `NetworkError` / `ParseError` / `EvaluationError` from `deobfuscateScript`.
- In WebView requests only the main document decides the outcome. Failed images, scripts and iframes are ignored, and HTTP error statuses (403, 503…) resolve with the page.
- `deobfuscateScript` downloads Synchrony (about 400 KB) on its first call, checks it against a pinned SHA-256, and keeps it in memory and in the app's cache directory, so later calls and launches work offline. A download that doesn't match the pin rejects with `NetworkError`.

Two platform differences remain:

- **Android WebView POSTs** can't carry custom headers. `makePostRequestWithWebView` sends only `User-Agent` and `Cookie` there, and the body as `application/x-www-form-urlencoded`.
- **iOS WebView cookies** live in an in-memory store shared by this module's WebViews only. They carry over between calls but are separate from the app's own WebViews and are cleared when the app restarts. Android uses the app-wide `CookieManager`.

Registry code also runs in apps built with older native code (1.6.0 and earlier), which behaved differently. Code that must work there should:

- keep a null check on `deobfuscateScript`'s result (older iOS resolved `null` on failure);
- accept `{ cookie }` as well as a string from `getDdosGuardCookiesWithWebView` (older Android resolved an object);
- check `status === 'success'` on WebView request results (older Android resolved timeouts with `status: 'timeout'` and no `html` or `response`).

```typescript
// src/providers/anime/myanimewebsite/load-protected-page.ts
import type { ProviderContext } from '../../../models';

export async function loadProtectedPage(ctx: ProviderContext, url: string, packedScript: string) {
  const { NativeConsumet } = ctx;

  // Current builds resolve the Cookie header string; older Android builds resolved { cookie }
  const raw: unknown = await NativeConsumet.getDdosGuardCookiesWithWebView(url);
  const cookie = typeof raw === 'string' ? raw : ((raw as { cookie?: string } | null)?.cookie ?? '');

  const page = await NativeConsumet.makeGetRequestWithWebView(url, { Cookie: cookie });
  if (page.status !== 'success') throw new Error(`WebView request for ${url} failed: ${page.status}`);

  const script = await NativeConsumet.deobfuscateScript(packedScript);
  if (!script) throw new Error('Could not deobfuscate the player script');

  return { html: page.html, script };
}
```

## Step 4: Add to `extension-registry.json`

Once your provider is implemented, you need to register it in `src/extension-registry.json`. This file acts as a manifest for all available extensions.

Add a new entry to the `extensions` array:

```jsonc
{
  "id": "myanimewebsite",
  "name": "MyAnimeWebsite",
  "description": "A new provider for anime content from MyAnimeWebsite.com",
  "version": "1.0.0",
  "minContextVersion": 1, // Lowest CONTEXT_VERSION the code runs on (see below)
  "author": {
    "name": "Your Name",
    "url": "https://github.com/your-github",
  },
  "category": "anime", // or movies
  "distFile": "dist/bundles/providers/anime/myanimewebsite/create-myanimewebsite.js", // Bundle to publish
  "factoryName": "createMyAnimeWebsite", // The name of the function you export
  "baseUrl": "https://www.myanimewebsite.com", // Passed to the factory as customBaseURL
  "logo": "https://www.myanimewebsite.com/favicon.ico", // Link to provider's logo/favicon
  "languages": ["en"],
  "nsfw": false,
  "status": "beta", // or stable, alpha, deprecated
  "lastUpdated": "YYYY-MM-DDTHH:MM:SSZ", // Current UTC timestamp
  "extractors": ["MegaCloud"], // List of extractors your provider uses
  "subbed": true, // For anime providers
  "dubbed": true, // For anime providers
  "isSourceEmbed": true, // true if the provider uses embed links that require extractors
  "isSourceDirect": false, // true if fetchEpisodeSources returns playable files itself (server names are not extractors)
  "haveMultiServers": true, // true if fetchEpisodeServers lists several servers the user can pick from
}
```

The comments are for this guide only; the registry is plain JSON.

Apps hand a server's URL to a registry extractor only when `haveMultiServers` is true and `isSourceDirect` is not. Otherwise they call the provider's `fetchEpisodeSources` with the server name. A provider whose servers are mirrors of direct files (e.g. VegaMovies: "CF Storage", "Pixeldrain") sets both `isSourceDirect` and `haveMultiServers`.

Don't write `main` or `sha256` yourself; leave them out of a new entry. Committing does the rest: when a commit stages changes under `src/` or `scripts/`, the pre-commit hook rebuilds `dist/` from the staged files, runs `prepare-registry`, and stages `dist/`, the newly published file under `registry/` and the updated registry entry. If you commit with `--no-verify`, or want to try it before committing, run the same steps yourself and commit what they change:

```bash
yarn build && node scripts/prepare-registry.js
```

`prepare-registry` exits with an error, and writes nothing, if an entry's `distFile` is missing or isn't a `.js` file under `dist/`, if `main` is set to a URL it didn't write (anything other than this repo's `registry/<kind>/<id>/<version>.js` URL for the same entry), or if the resulting registry fails the library's own schema check (`validateRegistry`, e.g. a `factoryName` that isn't a JavaScript identifier).

`yarn build` bundles every registry entry into one file. The `distFile` path names the bundle, and its source is the matching file under `src/`: `dist/bundles/providers/anime/myanimewebsite/create-myanimewebsite.js` is built from `src/providers/anime/myanimewebsite/create-myanimewebsite.ts`. Relative imports, such as a helper or another extractor, are inlined into the bundle. The runtime supplies only these modules:

| Import                                               | What extension code gets                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| `axios`, `cheerio`, `crypto-js`                      | The context's axios instance, `{ load }`, and CryptoJS                   |
| anything under `src/models`                          | The base parsers and the library's enums                                 |
| `src/utils` (index) and the `create-*-context` files | `createProviderContext` / `createExtractorContext` returning the context |

Requiring anything else throws when the extension loads. Prefer what `ctx` gives your factory over imports.

`prepare-registry` then copies the bundle to an immutable path, `registry/extensions/<id>/<version>.js`, and sets `main` to that file's URL and `sha256` to its hash. Commit the new file under `registry/` with the registry change. Apps refuse to run code whose hash doesn't match, and refuse entries without a `sha256`.

**Every change needs a new `version`.** A published version is never overwritten: if the build output changed while `version` stays the same, the script exits with an error asking you to bump it, and the pre-commit hook stops the commit. Bump `version` in the entry, stage it, and commit again. Run `yarn registry:check` to verify the registry without writing anything, and add `--base origin/main` to also run the version checks CI runs.

**After the change merges,** a maintainer approves the "Sign registry" run, which signs the new registry for apps that download it. Until then `yarn registry:check` notes the signature as stale (or missing while no signing key exists); that is expected and doesn't fail the check. See [Registry signing](../../CONTRIBUTING.md#registry-signing-maintainers).

### Compatibility: `minContextVersion` and `schemaVersion`

`CONTEXT_VERSION` (exported by the library, currently 1) versions what the library gives extension code: the `ctx` helpers, the modules it can `require`, and its globals. Each entry's `minContextVersion` is the lowest `CONTEXT_VERSION` its code runs on.

- Set `"minContextVersion": 1` for code that only uses what this guide describes.
- If your provider needs a context helper that older libraries lack (a new `ctx` field, module or native method), the library change that adds it bumps `CONTEXT_VERSION` in [`src/utils/registry-schema.ts`](../../src/utils/registry-schema.ts), and your entry sets `minContextVersion` to the new value. Apps on older libraries then still list the entry, but refuse to load it with a `RegistryError` (`INCOMPATIBLE_ENTRY`, `updateRequired: true`) instead of failing mid-call with `undefined is not a function`. Extractor entries work the same way.

The registry's top-level `schemaVersion` (`REGISTRY_SCHEMA_VERSION`, currently 1) is the format of the file itself. Adding a provider or an optional field never changes it; it goes up only when a field is removed, renamed or changes meaning, which older libraries would misread. See [Registry Versions and Compatibility](../extension-integration.md#registry-versions-and-compatibility).

### What CI checks

The `registry` job in CI rebuilds `dist/` from a clean checkout with `yarn build:clean`, then fails if:

- the committed `dist/` differs from the rebuild (a hand-edited or stale `dist/`)
- an entry's `sha256` differs from its rebuilt bundle, or the bundle changed under a version that's already published
- compared with the commit the change is based on, an entry's `sha256` changed without a higher `version`, a `version` went backwards, or a file already published under `registry/` changed
- a URL in the current registry, or in a supported release's registry, points at a published file that no longer exists (see below)

The build is deterministic, so a `dist/` committed through the pre-commit hook matches the rebuild.

### Removing old published versions

Deleting a published file breaks every app whose registry still points at it: installing that extension then gets a 404. Apps that already downloaded the file keep working. So a version may be deleted only when **all** of these hold:

1. It isn't the current version of its entry in `src/extension-registry.json`.
2. It isn't the newest version before the current one, which is kept so a bad release can be rolled back by changing one line.
3. No supported release's bundled registry references it.

**Supported releases** are every stable `vX.Y.Z` tag in the two most recent minor lines. For example, if the latest release is `v1.7.2`, all `v1.7.*` and `v1.6.*` tags are supported. The rule reads each one's registry with `git show <tag>:src/extension-registry.json`. Releases up to `v1.6.0` predate published files (their URLs point into `dist/`), so they don't protect anything.

Don't delete files by hand. `yarn registry:prune` lists what the rule allows deleting, and `yarn registry:prune --delete` removes it. Both need release tags locally (`git fetch --tags`). CI fails if any URL in the current registry or in a supported release's registry points at a file that no longer exists.

## Optional: Bundle a Provider Class

A registry provider needs no class and no library release. Add a class only if the provider should also ship inside the library, as `ANIME.MyAnimeWebsite`:

1. Write `src/providers/anime/myanimewebsite/myanimewebsite.ts`: a class extending `AnimeParser` (or `MovieParser`) that takes `(ctx?, customBaseURL?)`, the factory's order, and keeps the older `(customBaseURL?)` form as an overload. `providerArgs(ctxOrBaseURL, customBaseURL)` from `src/providers/provider-args.ts` reads both forms and supplies `createProviderContext()` when there's no context. Build the instance with `createMyAnimeWebsite(ctx, baseURL)` and copy the fields and methods across, including `capabilities`. `src/providers/anime/anineko/anineko.ts` is a short example.
2. Export the class and the factory by name, and add them to the `ANIME` (or `MOVIES`) object in `src/providers/anime/index.ts`.
3. Add a lazy getter for the class to `animeProviders` (or `movieProviders`) in [`src/utils/provider-maps.ts`](../../src/utils/provider-maps.ts), keyed by the registry entry's `name`. `ProviderManager` then gives loaded instances that class's prototype, so `instanceof MyAnimeWebsite` holds. Without it they get the `AnimeParser` / `MovieParser` prototype. The getters `require` the module and read the class by name, to avoid import cycles; copy an existing one.
4. Add the registry id to `KnownAnimeProviderId` (or `KnownMovieProviderId`) in the same file, so it autocompletes in `getAnimeProvider`. Other ids type-check anyway.

## Step 5: Write Tests

Tests live in `test/`. `yarn test` runs the offline unit tests under `test/unit/`, which use recorded responses and mocks and must not touch the network. `yarn test:live` also runs the suites in the category folders (`test/anime/`, `test/movies/`…), which call the real sites.

An offline test builds the factory with a context whose `axios` returns a recorded page:

```typescript
// test/unit/myanimewebsite.test.ts
import { createProviderContext } from '../../src/utils/create-provider-context';
import { createMyAnimeWebsite } from '../../src/providers/anime/myanimewebsite/create-myanimewebsite';

const searchPage = `<div class="anime-item"><a href="/anime/one-piece"><h3>One Piece</h3><img src="/op.jpg"></a></div>`;

describe('MyAnimeWebsite', () => {
  it('parses search results', async () => {
    const get = jest.fn().mockResolvedValue({ data: searchPage });
    const provider = createMyAnimeWebsite(createProviderContext({ axios: { get } as any }));

    const results = await provider.search('one piece');

    expect(get).toHaveBeenCalledWith('https://www.myanimewebsite.com/search?q=one%20piece&page=1');
    expect(results.results).toEqual([{ id: 'one-piece', title: 'One Piece', image: '/op.jpg' }]);
  });
});
```

A live test runs the same factory against the site. It can't load the provider through `ProviderManager` yet: the registry's `main` URL only exists once the change is merged.

```typescript
// test/anime/myanimewebsite.test.ts
import { createProviderContext } from '../../src/utils/create-provider-context';
import { createMyAnimeWebsite } from '../../src/providers/anime/myanimewebsite/create-myanimewebsite';

jest.setTimeout(120000);

const provider = createMyAnimeWebsite(createProviderContext());

test('searches, fetches info and fetches sources', async () => {
  const search = await provider.search('One Piece');
  const first = search.results[0];
  expect(first).toBeDefined();

  const info = await provider.fetchAnimeInfo(first!.id);
  const episode = info.episodes?.[0];
  expect(episode).toBeDefined();

  const sources = await provider.fetchEpisodeSources(episode!.id);
  expect(sources.sources.length).toBeGreaterThan(0);
});
```

Run your tests using `yarn test` and `yarn test:live`.

## Step 6: Update Documentation

Create a new markdown file for your provider in `docs/providers/<category>/` (e.g., `docs/providers/anime/myanimewebsite.md`). Document its capabilities, supported methods, and any specific usage notes.

Also, update the relevant `docs/guides/<category>.md` file to include your new provider in the list of available providers.

## Step 7: Build and Verify

Before submitting, ensure your changes build correctly and pass the checks CI runs. `yarn lint` reports problems without changing files; `yarn lint:fix` fixes what it can.

```bash
yarn build
yarn lint
yarn typecheck
yarn test
yarn registry:check --base origin/main
```

Then test the provider in the example app (`apps/`), on a device or emulator. Its **Registry** tab loads anime and movie providers, and its **Load from** toggle picks where the code comes from:

1. **Local dist**, before the version is published. After `yarn build`, run `node scripts/prepare-registry.js` (so the entry's `sha256` matches the new bundle) and `yarn example gen:local-dist` (which rewrites the app's map of bundles), then start the app with `yarn example android` or `yarn example ios`. The app still checks the code against the entry's `sha256`: a stale map shows an integrity mismatch.
2. **Registry**, once the version is on `main`. This is the path real apps take: it fetches the entry's `main` URL and verifies the hash. Before the merge it reports a 404.

See [`apps/README.md`](../../apps/README.md) for what each error means.

## Submitting Your Contribution

Once you're confident in your changes, create a pull request to the `react-native-consumet` repository. Ensure your commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.
