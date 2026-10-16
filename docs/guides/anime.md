<h1 align="center">react-native-consumet</h1>

<h2>ANIME</h2>

Anime providers let you search for anime, get the anime information, and get the anime episodes with streaming links. Load them from the extension registry (recommended, see [Extension Integration](../extension-integration.md)), or construct a bundled class from the `ANIME` namespace.

```ts
import { ANIME, ProviderManager, ExtensionRegistry } from 'react-native-consumet';

// From the registry, by registry id
const manager = new ProviderManager(ExtensionRegistry);
const animepahe = await manager.getAnimeProvider('animepahe');

// Or a bundled class from the list below. Without a context it uses createProviderContext()
const animekai = new ANIME.AnimeKai();

// With a context, its requests and extractors use that context's axios, proxy and user agent
const anikoto = new ANIME.AniKoto(manager.getProviderContext());
```

Bundled classes take an optional provider context and base URL, `new ANIME.AnimeKai(ctx?, customBaseURL?)`, in the order of the factories they wrap. The older `new ANIME.AnimeKai(customBaseURL?)` still works.

## Common Methods

`languages` - string, the language of the current provider, return language code, example: `languages: 'en'`

`isNSFW` - bool, `true` if the provider provides NSFW content.

`isWorking` - bool, `false` when the provider is marked as down. Most providers leave it `true`; the registry `status` is a better signal.

`isDubAvailableSeparately` - bool, `true` if dubbed episodes are listed separately from the subbed ones.

`name` - string, the name of the current provider, example: `name: 'AnimePahe'`

`baseUrl` - string, url to the base URL of the current provider

`logo` - string, url to the logo image of the current provider

`classPath` - string, the provider's place in the library, example: `classPath: 'ANIME.AnimePahe'`

`capabilities` - object (optional), what `META.Anilist` and `META.Myanimelist` may assume about the provider's episodes (`aniZipEpisodes`, `subDub`)

On bundled classes, `languages`, `baseUrl`, `logo` and `classPath` are protected; read them through `provider.toString`.

## Anime Providers List

| Provider  | Bundled class     | Registry id (status)    | Docs                                         |
| --------- | ----------------- | ----------------------- | -------------------------------------------- |
| AniKoto   | `ANIME.AniKoto`   | `anikoto` (stable)      |                                              |
| AniNeko   | `ANIME.AniNeko`   | `anineko` (stable)      |                                              |
| AnimePahe | `ANIME.AnimePahe` | `animepahe` (stable)    | [AnimePahe](../providers/anime/animepahe.md) |
| AnimeKai  | `ANIME.AnimeKai`  | `animekai` (deprecated) | [AnimeKai](../providers/anime/animekai.md)   |
| Zoro      | `ANIME.Zoro`      | not in the registry     | [Zoro](../providers/anime/zoro.md)           |
| ReAnime   | `ANIME.ReAnime`   | not in the registry     |                                              |

AnimeUnity is not working and not exported ([page kept for reference](../providers/anime/animeunity.md)). Anify, AnimeDrive, Marin, KickAssAnime and AnimeSuge were removed: their sites or APIs are gone.

<p align="end">(<a href="../README.md">back to table of contents</a>)</p>
