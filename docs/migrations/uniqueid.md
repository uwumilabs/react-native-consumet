# Migrating stored episode `uniqueId`s

`META.Anilist.fetchEpisodesListById` now builds each episode's `uniqueId` from AniDB numbering instead of TVDB numbering, and gives every episode one. Apps that store watch progress, history or downloads under `uniqueId` need to rename some stored keys once. This page gives the exact rule, worked examples, and a recipe for uwumi.

TMDB `uniqueId`s (`${tmdbId}-${type}-s${season}-e${episode}`) do not change. MAL episodes still have no `uniqueId`.

## The rule

```
uniqueId = `${anilistId}$ep=${aniDbKey ?? number}`
```

- `aniDbKey` is the numeric key of the ani.zip episode the provider episode was matched to. ani.zip keys episodes by AniDB episode: `"1"`, `"2"`… for regular episodes and `"S1"`, `"O1"`, `"C1"`… for specials and extras. Only numeric keys are ever used.
- `number` is the provider's own episode number. It is used when ani.zip has no match for the episode, when ani.zip is down, slow, returns 404 or lists no episodes, and for providers that don't use the ani.zip merge. If the provider gives no usable number, the 1-based position in the list is used.
- The rule is applied in one place, after merging, on every path.

| | 1.6.0 | Now |
|---|---|---|
| Episode matched to ani.zip | `${anilistId}$ep=${episodeNumber ?? episode}`: ani.zip's **TVDB** season-relative `episodeNumber`, or the raw ani.zip key when TVDB has none (so specials gave `$ep=S1`, `$ep=O3`…) | `${anilistId}$ep=${key}`: the **AniDB** episode (numeric ani.zip key) |
| Episode ani.zip didn't match, ani.zip unavailable, or a provider without the merge | no `uniqueId` | `${anilistId}$ep=${number}` |
| `fetchAnimeInfo` episodes | no `uniqueId` | `${anilistId}$ep=${number}` |
| `number` | overwritten with TVDB `episodeNumber` when matched | always the provider's number |
| TVDB numbering | in `number` | in `tvdbNumber` (season-relative) and `absoluteNumber`, only on matched episodes |

Builds from `main` after 1.6.0 already gave unmatched episodes `${anilistId}$ep=${number}`; that part is unchanged.

### How an episode is matched

1. **By number.** Provider episode `N` takes ani.zip key `N`. If the provider lists the same number twice, the copy whose release date is closest to the air date takes it.
2. **By air date**, for episodes still unmatched (for example a provider that numbers a second cour 12–22): an unused ani.zip episode that aired within a day of the provider's release date. Episodes sharing an air day are all kept, and are paired in number order.
3. **By title**, for what is left.

There is no "same position in the list" fallback any more, and specials never take part. In 1.6.0 matching went by date first, then number, then title, then position.

## Examples

### 162670: Dr. Stone: New World Part 2

ani.zip has AniDB keys `1`–`11`. TVDB lists them as season 3, episodes 12–22 (absolute 48–58). A provider that numbers the cour 1–11:

| Provider `number` | Title | TVDB `episodeNumber` | `absoluteNumber` | Old `uniqueId` (1.6.0) | New `uniqueId` |
|---|---|---|---|---|---|
| 1 | The Kingdom of Science\`s Counterattack | 12 | 48 | `162670$ep=12` | `162670$ep=1` |
| 2 | The Medusa\`s True Face | 13 | 49 | `162670$ep=13` | `162670$ep=2` |
| 3 | Deal Game, Test of Wit | 14 | 50 | `162670$ep=14` | `162670$ep=3` |
| 4 | Battle in Three Dimensions | 15 | 51 | `162670$ep=15` | `162670$ep=4` |
| 5 | Total War | 16 | 52 | `162670$ep=16` | `162670$ep=5` |
| 6 | Joker | 17 | 53 | `162670$ep=17` | `162670$ep=6` |
| 7 | Flicker of Doom | 18 | 54 | `162670$ep=18` | `162670$ep=7` |
| 8 | Last Man Standing | 19 | 55 | `162670$ep=19` | `162670$ep=8` |
| 9 | First Dream | 20 | 56 | `162670$ep=20` | `162670$ep=9` |
| 10 | "Treasure Island" | 21 | 57 | `162670$ep=21` | `162670$ep=10` |
| 11 | Beyond the New World | 22 | 58 | `162670$ep=22` | `162670$ep=11` |

In 1.6.0 these episodes also came back with `number` 12–22. Now `number` is 1–11, and `tvdbNumber` is 12–22. A provider that numbers the cour 12–22 and dates its episodes gets the same `uniqueId`s, matched by air date, and keeps `number` 12–22.

### 21355: Re:Zero

ani.zip has numeric keys `1`–`25`, whose TVDB numbers are also 1–25, followed by 39 specials (`S1`–`S26`, `O1`–`O13`) with no TVDB number.

- Regular episodes keep their keys: `21355$ep=1` … `21355$ep=25`, before and after.
- 1.6.0 could hand a special's key and title to a regular episode. A 26th provider entry was paired with `S1` ("Pre Air Special") by the position fallback, giving `21355$ep=S1`. A provider whose release dates are re-upload times could pair an episode with a Director's Cut special by date: an upload on 2020-01-01 gave `21355$ep=O1`. Now those episodes get `21355$ep=${number}` (for example `21355$ep=26`) and keep their own title. No `uniqueId` has a non-numeric episode part any more.

### Airing shows

When ani.zip doesn't have a show yet (216895 answered 404 on 2026-10-15) or lists no episodes (198727), every episode gets `${anilistId}$ep=${number}`. When ani.zip catches up, number matching assigns the same keys, so progress stored in the meantime keeps working.

## Which stored keys change

1. **Seasons whose TVDB numbering doesn't restart** (continuing seasons, split cours, like 162670): `${id}$ep=${tvdbEpisodeNumber}` becomes `${id}$ep=${aniDbKey}`. This is the mapping that ani.zip gives: the entry with key `K` and `episodeNumber` `T` maps `$ep=T` to `$ep=K`. This is the main case to migrate.
2. **Special keys** (`$ep=S1`, `$ep=O3`…): these were attached to regular episodes by mistake. The data doesn't say which episode they were on, so they can't be mapped reliably. Drop them, or leave them orphaned.
3. **Episodes the old date-first matching paired with the wrong ani.zip entry**, for example provider uploads of a whole season on one day. The stored key belongs to the episode whose title was shown, not necessarily the video that was played. After applying case 1 the progress lands on that titled episode.

Keys where ani.zip's `episodeNumber` equals its key, which covers most single-season shows such as Re:Zero 1–25, do not change.

## Migrating uwumi

uwumi keeps `uniqueId` in three persisted stores:

- `watchProgress` (`useWatchProgressStore`): `progresses[uniqueId]`.
- `continueWatching` (`useContinueWatchingStore`): `entries[].uniqueId`, `entries[].watchParams.uniqueId`, and the old `number` in `entries[].watchParams.episodeNumber`.
- `downloads` (`useDownloadStore`): the record key (`uniqueId` when one was set) and `uniqueId`.

### Recommended: migrate each show when its episode list loads

This uses the new `tvdbNumber` field, so it needs no extra requests.

1. **Once, on the first launch with the new library**, before any progress is written, save the anime progress keys that exist (those matching `/^\d+\$ep=/`) into a persisted set, `legacyKeys`. Only keys in this set are migrated. A key written later by the new library (say `x$ep=13`, meaning AniDB 13) must never be read as an old TVDB 13.
2. **When `fetchEpisodesListById(anilistId)` resolves** and `legacyKeys` holds keys for that show, build every rename first and then apply them all in one update. A show can have both `13 → 1` and `25 → 13`, and renaming in place one at a time would chain them.
3. Apply the renames to all three stores. If the new key already has progress, keep the entry that is completed or further along. In `continueWatching`, also set `watchParams.episodeNumber` to the episode's new `number`.
4. Remove the show's keys from `legacyKeys`, including keys like `S1` or `O3` that can't be mapped. Do this only if at least one episode came back with `tvdbNumber`. If ani.zip failed on this load, there is nothing to map yet, so try again on the next load.

```ts
import type { IMetaAnimeEpisode } from 'react-native-consumet';

const migrateShow = (anilistId: string, episodes: IMetaAnimeEpisode[], legacyKeys: Set<string>) => {
  const prefix = `${anilistId}$ep=`;
  const legacy = [...legacyKeys].filter((key) => key.startsWith(prefix));
  if (legacy.length === 0 || !episodes.some((e) => e.tvdbNumber !== undefined)) return null;

  const renames = new Map<string, string>(); // old key -> new key, built from one snapshot
  for (const e of episodes) {
    if (e.tvdbNumber === undefined) continue;
    const oldKey = `${prefix}${e.tvdbNumber}`;
    if (oldKey !== e.uniqueId && legacyKeys.has(oldKey)) renames.set(oldKey, e.uniqueId);
  }
  return { renames, done: legacy }; // apply renames to the stores, then delete `done` from legacyKeys
};
```

When applying the renames to `progresses`, build the new object from the old one in a single pass. Read every old key from the snapshot, never from the object you are writing.

### Alternative: migrate everything up front

Bump the `version` of the persisted `watchProgress` store and do the work in an async `migrate`. For each AniList id among the stored keys, fetch `https://api.ani.zip/mappings?anilist_id=<id>`. For every numeric key `K` with an `episodeNumber` `T`, rename `${id}$ep=${T}` to `${id}$ep=${K}`, from a snapshot as above. This needs the network during migration. If a request fails, leave that show's keys alone and retry on the next launch.

## Other changes apps may notice

- `number` is always the provider's number. For continuing seasons it no longer jumps to the TVDB number (162670 shows 1–11, not 12–22). Filler flags are looked up by this number.
- Every episode has a `uniqueId`, including unmatched ones, ones from a provider without the merge (such as registry-only providers that don't declare `aniZipEpisodes`), and all episodes when ani.zip is unavailable. In 1.6.0 these had none, and uwumi couldn't open them (`buildEpisodeRouteParams` returns `null` without one).
- ani.zip titles, images and air dates now only come from the matched AniDB episode, so specials' titles no longer appear on regular episodes.
- If a provider lists the same number twice, both copies get the same `uniqueId`. Only the copy released closest to the air date gets the ani.zip metadata.
- A `uniqueId` set by the provider itself is replaced, so every provider follows the same rule.
- When the provider finds no match, `fetchEpisodesListById` returns `[]` instead of throwing a `TypeError`.
- `fetchEpisodesListById` is typed `Promise<IMetaAnimeEpisode[]>`, where `uniqueId` is a required `string` and `tvdbNumber` and `absoluteNumber` are optional.
