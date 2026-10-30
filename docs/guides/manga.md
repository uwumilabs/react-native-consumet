<h1 align="center">react-native-consumet</h1>

<h2>MANGA</h2>

By using `MANGA` category you can interact with the manga providers. And have access to the manga providers methods. Which allows you to search for manga, get the manga information, get the manga chapters with images to read.

The bundled extension registry has no manga providers yet, so use the bundled classes below. A registry that lists manga providers loads them with `manager.getProvider('manga', id)` (see [Extension Integration](../extension-integration.md#providermanager)).

```ts
import axios from 'axios';
import { MANGA, createProviderContext } from 'react-native-consumet';

// Any class from the list below
const mangadex = new MANGA.MangaDex();

// Or with a provider context, to send its requests through your own axios (timeout, headers, interceptors)
const appAxios = axios.create({ timeout: 30000, headers: { 'User-Agent': 'MyApp/1.0' } });
const mangapill = new MANGA.MangaPill(createProviderContext({ axios: appAxios }));
```

Manga classes take an optional provider context, `new MANGA.MangaDex(ctx?)`, and make every request through `ctx.axios`. Without one they use `createProviderContext()`, whose axios has the library's 15 s timeout and browser headers.

## Common Methods

`languages` - string, the language of the current provider, return language code, example: `languages: 'en'`

`isNSFW` - bool, `true` if the provider provides NSFW content.

`isWorking` - bool, `false` when the provider is marked as down. Most providers leave it `true`.

`name` - string, the name of the current provider, example: `name: 'MangaDex'`

`baseUrl` - string, url to the base URL of the current provider

`logo` - string, url to the logo image of the current provider

`classPath` - string, the provider's place in the library, example: `classPath: 'MANGA.MangaDex'`

`languages`, `baseUrl`, `logo` and `classPath` are protected; read them through `provider.toString`.

## What every manga provider returns

Sites lay out their data differently; every provider maps it onto the same shape, so apps can
switch providers without special cases. Fields a site doesn't have are left out, never filled
with placeholders.

- **`search(query, page?)`** returns `{ currentPage, hasNextPage, results }`. Each result has an
  `id` (pass it to `fetchMangaInfo`) and a string `title`. Optional fields: `altTitles` (strings),
  absolute `image` and `url`, `headerForImage` when the image host needs headers, a plain-text
  `description`, `status` (a `MediaStatus`) and `releaseDate`.
- **`fetchMangaInfo(id)`** returns the same fields, plus `genres`, `authors` and `artists` as
  string arrays, and `chapters` **in reading order: first chapter first**.
- **Chapters:** each has an `id` (pass it to `fetchChapterPages`) and a string `title` (`Chapter
  12` when the site gives no name). They also have `chapterNumber` and `volumeNumber` wherever the
  site gives them (`10.5` is fine), `releaseDate` (ISO 8601 when it parses), and `scanlator`,
  `language` and absolute `url` when the site lists them.
- **`fetchChapterPages(chapterId)`** returns the pages in order, with `page` counting from 1 and
  an absolute `img`. When the image host refuses hotlinks, every page carries the same
  `headerForImage` (for example `{ Referer }`); send it with the image request.

`parseChapterNumber`, `parseVolumeNumber` and `sortChaptersForReading` (exported from the
package) turn a site's labels into these fields. Provider tests check the shape with
`test/unit/helpers/manga-contract.ts`.

## Manga Providers List

This list is in alphabetical order.

- [AsuraScans](../providers/manga/asurascans.md) (`MANGA.AsuraScans`)
- [FlameScans](../providers/manga/flamescans.md) (`MANGA.FlameScans`), now Flame Comics at flamecomics.xyz
- [MangaDex](../providers/manga/mangadex.md) (`MANGA.MangaDex`)
- [MangaHere](../providers/manga/mangahere.md) (`MANGA.MangaHere`)
- [MangaKakalot](../providers/manga/mangakakalot.md) (`MANGA.MangaKakalot`)
- [MangaPill](../providers/manga/mangapill.md) (`MANGA.MangaPill`)

ComicK, MangaPark, MangaReader, MangaHost, BRMangas, Mangasee123, VyvyManga and ReadManga were removed because their sites are gone.

<p align="end">(<a href="../README.md">back to table of contents</a>)</p>
