# Migrating to the new TMDB info shape

These notes cover `META.TMDB#fetchMediaInfo(tmdbId, type)`. Search and trending results are unchanged.

## `id` is the TMDB id, and the provider id has its own field (breaking)

`fetchMediaInfo` used to replace `info.id` with the media id of the title on the movie provider (for
example HiMovies or NetflixMirror). Now `info.id` stays the TMDB id you passed in, and the provider's
id is in `info.providerId`.

| Field             | Before                                               | After                                                           |
| ----------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| `info.id`         | Provider media id; `undefined` or `''` with no match | TMDB id passed to `fetchMediaInfo` (e.g. `'84958'`), always set |
| `info.providerId` | Not set                                              | Provider media id, or `undefined` when the title wasn't matched |

The provider is now optional. When it has no matching title, `fetchMediaInfo` still returns the full
TMDB info and every season. In that case:

- `info.providerId` is `undefined`.
- Episodes have no `id` and no `url`, since there's nothing to play on this provider.
- For movies, `info.episodeId` is `undefined`.

A provider that throws, either during search or while fetching its info, is treated the same as no
match. Before this change, the error made `fetchMediaInfo` fail (1.6.0 threw a `TypeError` even when
there was simply no match).

These are unchanged:

- Episode `uniqueId` is built from the TMDB id: `` `${tmdbId}-${type}-s${season}-e${episode}` ``
  (`type` is `tv` or `movie`). It doesn't depend on the provider, so watch progress keyed by
  `uniqueId` doesn't need migrating.
- Episode `id`, when there is one, is the provider's episode id.
- `info.mappings.tmdb` is the TMDB id as a number.

### Matching changes

- A provider result's year may be one year off from TMDB's. When several results have equally
  close titles, the exact year wins, then a year one off, then a result with no year.
- Results that don't report a type, year or season count are kept. Only a known mismatch drops a
  result: the other type, a year more than one off, or a season count more than two off.
- When the matched provider returns no episodes, the seasons and `nextAiringEpisode` are still
  returned. Before, `seasons` was `[]`.

### What to change in an app

Wherever `info.id` was passed to the movie provider as the media id, pass `info.providerId` instead.
For example: `provider.fetchEpisodeServers(episodeId, mediaId)` and
`provider.fetchEpisodeSources(episodeId, mediaId, server)`.

In uwumi:

- `src/components/episode-list/EpisodeList.tsx`: change `episodeDataId={episodeData?.id}` (both
  places, and the `useCallback` dependency) to `episodeData?.providerId`. Change
  `mediaId={episodeData?.id ?? id}` to `mediaId={episodeData?.providerId ?? id}`.
- An episode without an `id` isn't available on the provider. `buildEpisodeRouteParams` already
  returns `null` for it.

## Episode, season and info types match the data

`fetchMediaInfo` now returns `Promise<IMovieInfo>` instead of `Promise<IMovieInfo | IAnimeInfo>`. The
movie types declare every field TMDB returns, so the result needs no cast.

| Field                        | Before                                                        | After                                               |
| ---------------------------- | ------------------------------------------------------------- | --------------------------------------------------- |
| Episode `number`             | Not set                                                       | TMDB episode number (`1` for a movie)               |
| Episode `episode`            | Episode number                                                | Unchanged, now declared and marked deprecated       |
| Episode `id` (type)          | `string`, though `undefined` for episodes not on the provider | `string \| undefined`                               |
| Season `episodes`            | `undefined` when TMDB lists no episodes for the season        | `[]`                                                |
| `trailer`                    | `{ id: undefined, url: '…?v=undefined' }` with no TMDB video  | `undefined`                                         |
| `IMovieInfo.duration` (type) | `string`                                                      | `string \| number` (TMDB gives minutes as a number) |
| `fetchMediaInfo` return type | `IMovieInfo \| IAnimeInfo`                                    | `IMovieInfo`                                        |

These fields were already returned and are now declared:

- `IMovieInfo`: `episodeId`, `similar`, `directors`, `writers`, `actors`, `characters`,
  `totalSeasons`, `nextAiringEpisode`, `mappings` (`{ imdb?: string; tmdb?: number }`).
- `IMovieSeason`: `isReleased`.
- `IMovieEpisode`: `episode`.

Images are unchanged. TMDB episodes and seasons keep `image: { mobile, hd }` (300 px and 780 px
wide), which `IMovieEpisode.image` (`string | { mobile?, hd? }`) and `IMovieSeason.image` already
allow. Provider and anime episodes use a URL string.

`IMovieEpisode.id` is optional for every movie episode, not just TMDB's. Code that passes an episode
`id` where a `string` is required needs a guard or a non-null assertion.

### What to change in an app

- Read `number` rather than `episode`. Code that already reads `number ?? episode` keeps working.
- Treat a missing episode `id` as "not available on this provider".

In uwumi:

- `src/hooks/queries/infoQueries.ts`: remove `as unknown as IMovieInfo` from both
  `META.TMDB(...).fetchMediaInfo(...)` calls.
- uwumi's other reads of an episode `id` already handle `undefined`: `buildEpisodeRouteParams`,
  `EpisodeActionsSheet` and the `EpisodeList` key extractor.

## Errors are `MetaError`

When a TMDB request fails, `search`, `fetchTrending` and `fetchMediaInfo` throw a `MetaError` (exported
from the package) instead of a plain `Error`. It has `source: 'tmdb'`, the HTTP `status` when there
was one, and the original error as `cause`. The message is unchanged, and `MetaError` extends `Error`,
so existing `catch` blocks keep working. Check `status === 429` to tell a rate limit from an outage.
Provider failures don't throw from `fetchMediaInfo` (see above).
