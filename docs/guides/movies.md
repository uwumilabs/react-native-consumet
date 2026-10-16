<h1 align="center">react-native-consumet</h1>

<h2>MOVIES</h2>

Movie providers let you search for movies and shows, get the movie/tv series information, and get the movie/tv series episodes with streaming links. Load them from the extension registry (recommended, see [Extension Integration](../extension-integration.md)), or construct a bundled class from the `MOVIES` namespace.

```ts
import { MOVIES, ProviderManager, ExtensionRegistry } from 'react-native-consumet';

// From the registry, by registry id
const manager = new ProviderManager(ExtensionRegistry);
const netflixMirror = await manager.getMovieProvider('netflixmirror');

// Or a bundled class from the list below
const multimovies = new MOVIES.MultiMovies();
```

## Common Methods

`languages` - string, the language of the current provider, return language code, example: `languages: 'en'`

`isNSFW` - bool, `true` if the provider provides NSFW content.

`isWorking` - bool, `false` when the provider is marked as down. Most providers leave it `true`; the registry `status` is a better signal.

`name` - string, the name of the current provider, example: `name: 'NetflixMirror'`

`baseUrl` - string, url to the base URL of the current provider

`logo` - string, url to the logo image of the current provider

`classPath` - string, the provider's place in the library, example: `classPath: 'MOVIES.NetflixMirror'`

`supportedTypes` - object, A `Set` of supported types by the provider, to check if a type is supported use `supportedTypes.has(<the type to be checked>)`.

On bundled classes, `languages`, `baseUrl`, `logo` and `classPath` may be protected; read them through `provider.toString`.

## Movies Providers List

| Provider      | Bundled class          | Registry id (status)       | Docs                                                  |
| ------------- | ---------------------- | -------------------------- | ----------------------------------------------------- |
| NetflixMirror | `MOVIES.NetflixMirror` | `netflixmirror` (beta)     | [NetflixMirror](../providers/movies/netflixmirror.md) |
| PrimeMirror   | `MOVIES.PrimeMirror`   | `primemirror` (beta)       | same API as NetflixMirror                             |
| DisneyMirror  | `MOVIES.DisneyMirror`  | `disneymirror` (beta)      | same API as NetflixMirror                             |
| VegaMovies    | `MOVIES.VegaMovies`    | `vegamovies` (alpha)       |                                                       |
| MultiMovies   | `MOVIES.MultiMovies`   | `multimovies` (deprecated) | [MultiMovies](../providers/movies/multimovies.md)     |
| YFlix         | `MOVIES.YFlix`         | `yflix` (deprecated)       |                                                       |
| HiMovies      | `MOVIES.HiMovies`      | not in the registry        | [HiMovies](../providers/movies/himovies.md)           |
| MultiStream   | `MOVIES.MultiStream`   | not in the registry        |                                                       |

VegaMovies and the three mirrors return playable files from `fetchEpisodeSources` (`isSourceDirect` in the registry): pass the server name to `fetchEpisodeSources` instead of handing server URLs to an extractor.

[DramaCool](../providers/movies/dramacool.md) is not exported in this version (`MOVIES.DramaCool` is undefined); its page is kept for reference.

<p align="end">(<a href="../README.md">back to table of contents</a>)</p>
