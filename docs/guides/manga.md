<h1 align="center">react-native-consumet</h1>

<h2>MANGA</h2>

By using `MANGA` category you can interact with the manga providers. And have access to the manga providers methods. Which allows you to search for manga, get the manga information, get the manga chapters with images to read.

The bundled extension registry has no manga providers yet, so use the bundled classes below. A registry that lists manga providers loads them with `manager.getProvider('manga', id)` (see [Extension Integration](../extension-integration.md#providermanager)).

```ts
import { MANGA } from 'react-native-consumet';

// Any class from the list below
const mangadex = new MANGA.MangaDex();
```

## Common Methods

`languages` - string, the language of the current provider, return language code, example: `languages: 'en'`

`isNSFW` - bool, `true` if the provider provides NSFW content.

`isWorking` - bool, `false` when the provider is marked as down. Most providers leave it `true`.

`name` - string, the name of the current provider, example: `name: 'MangaDex'`

`baseUrl` - string, url to the base URL of the current provider

`logo` - string, url to the logo image of the current provider

`classPath` - string, the provider's place in the library, example: `classPath: 'MANGA.MangaDex'`

`languages`, `baseUrl`, `logo` and `classPath` are protected; read them through `provider.toString`.

## Manga Providers List

This list is in alphabetical order.

- [AsuraScans](../providers/manga/asurascans.md) (`MANGA.AsuraScans`)
- [BRMangas](../providers/manga/brmangas.md) (`MANGA.BRMangas`)
- ComicK (`MANGA.ComicK`)
- FlameScans (`MANGA.FlameScans`)
- [MangaDex](../providers/manga/mangadex.md) (`MANGA.MangaDex`)
- [MangaHere](../providers/manga/mangahere.md) (`MANGA.MangaHere`)
- [MangaHost](../providers/manga/mangahost.md) (`MANGA.MangaHost`)
- [MangaKakalot](../providers/manga/mangakakalot.md) (`MANGA.MangaKakalot`)
- [Mangapark](../providers/manga/mangapark.md) (`MANGA.Mangapark`)
- [MangaPill](../providers/manga/mangapill.md) (`MANGA.MangaPill`)
- [MangaReader](../providers/manga/mangareader.md) (`MANGA.MangaReader`)
- [Mangasee123](../providers/manga/mangasee123.md) (`MANGA.Mangasee123`)
- [ReadManga](../providers/manga/readmanga.md) (`MANGA.ReadManga`)
- [VyvyManga](../providers/manga/vyvymanga.md) (`MANGA.VyvyManga`)

<p align="end">(<a href="../README.md">back to table of contents</a>)</p>
