<h1 align="center">react-native-consumet</h1>

<h2>META</h2>

Meta providers combine a metadata service (AniList, TMDB, MyAnimeList) with an anime or movie provider: titles, images and episode lists come from the service, and episode servers and sources from the provider you pass in.

Pass a provider explicitly. A meta provider built without one falls back to a bundled class that isn't in the extension registry (Zoro for `Anilist` and `Myanimelist`, HiMovies for `TMDB`).

```ts
import { META, ProviderManager, ExtensionRegistry } from 'react-native-consumet';

const manager = new ProviderManager(ExtensionRegistry);

// AniList metadata with episodes from a registry anime provider
const anilist = new META.Anilist(await manager.getAnimeProvider('animepahe'));

// TMDB metadata with episodes from a registry movie provider, using your own TMDB API key
const TMDB_API_KEY = '<your TMDB API key>';
const tmdb = new META.TMDB(TMDB_API_KEY, await manager.getMovieProvider('netflixmirror'));
```

Get a TMDB API key at [themoviedb.org](https://www.themoviedb.org/settings/api) and pass it as the first argument. Without one (or with a blank one), `META.TMDB` uses a key shared by every app that passes none, which TMDB can rate-limit or revoke at any time, and logs a `console.warn` once. `MOVIES.MultiStream`, which also calls TMDB, takes the key as its third argument: `new MOVIES.MultiStream(ctx?, customBaseURL?, apiKey?)`, for example `new MOVIES.MultiStream(undefined, undefined, TMDB_API_KEY)`. The older `new MOVIES.MultiStream(customBaseURL?)` still works, with the shared key.

`META.Myanimelist` is deprecated: use `META.Anilist`, which has the same anime, gives the MAL id as `malId`, and keys episodes with stable `uniqueId`s. Myanimelist episodes have no `uniqueId`, and the class will be removed in a future major release.

## Errors

Meta providers throw `MetaError` (exported from the package) instead of plain errors. `META.TMDB` is the exception for `fetchEpisodeServers` and `fetchEpisodeSources`, which pass the movie provider's errors through unchanged.

| Field    | Meaning                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `source` | Where it failed: `'anilist'`, `'mal'`, `'tmdb'`, `'anizip'`, `'filler'` or `'provider'` (the anime or movie provider you passed in) |
| `status` | The HTTP status, when there was one                                                                                                 |
| `cause`  | The original error                                                                                                                  |

AniList, TMDB and MAL requests time out after 15 s, and a 429 or 5xx answer is retried once before the error is thrown. `MetaError` extends `Error` and keeps the message, so existing `catch` blocks keep working. Check `status === 429` to tell a rate limit from an outage.

```ts
import { MetaError } from 'react-native-consumet';

try {
  await anilist.fetchAnimeInfo('21');
} catch (error) {
  if (error instanceof MetaError && error.status === 429) {
    // AniList rate limit: try again later
  }
}
```

## Common Methods

`isNSFW` - bool, `true` if the provider provides NSFW content.

`isWorking` - bool, `false` when the provider is marked as down.

`name` - string, the name of the current provider, example: `name: 'Anilist'`

`baseUrl`, `logo`, `classPath` - protected; read them through `provider.toString`.

## Meta Providers List

This list is in alphabetical order.

- [Anilist](../providers/meta/anilist.md) (`META.Anilist`)
- Myanimelist (`META.Myanimelist`), deprecated in favour of `META.Anilist`
- [TMDB](../providers/meta/tmdb.md) (`META.TMDB`)

See also [Migrating stored episode `uniqueId`s](../migrations/uniqueid.md) and [Migrating to the new TMDB info shape](../migrations/tmdb-info.md).

<p align="end">(<a href="../README.md">back to table of contents</a>)</p>
