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
