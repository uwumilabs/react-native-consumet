<h1>TMDB</h1>
This is a custom provider that maps a movie provider to TMDB. Titles, images, seasons and episodes come from TMDB; episode servers and sources come from the movie provider.

`TMDB` takes your TMDB API key and a movie provider: a registry provider from `ProviderManager.getMovieProvider` (an `IMovieProvider`) or a `MovieParser` instance. Both are optional, but pass both:

- **API key:** get one at [themoviedb.org](https://www.themoviedb.org/settings/api). Without one (or with a blank one), TMDB uses a key shared by every app that passes none, which TMDB can rate-limit or revoke at any time, and logs a `console.warn` the first time.
- **Provider:** without one, TMDB uses the bundled `HiMovies` class, which isn't in the extension registry.

```ts
import { META, ProviderManager, ExtensionRegistry } from 'react-native-consumet';

const manager = new ProviderManager(ExtensionRegistry);
const TMDB_API_KEY = '<your TMDB API key>';
const tmdb = new META.TMDB(TMDB_API_KEY, await manager.getMovieProvider('netflixmirror'));
```

<h2>Methods</h2>

- [fetchTrending](#fetchtrending)
- [search](#search)
- [fetchMediaInfo](#fetchmediainfo)
- [fetchEpisodeServers](#fetchepisodeservers)
- [fetchEpisodeSources](#fetchepisodesources)
- [Errors](#errors)

`fetchMediaInfo` changed after 1.6.0: `id` is the TMDB id and the provider's id is in `providerId`. See [Migrating to the new TMDB info shape](../../migrations/tmdb-info.md).

### fetchTrending

<h4>Parameters</h4>

| Parameter             | Type     | Description                                                               |
| --------------------- | -------- | ------------------------------------------------------------------------- |
| type                  | `string` | type of trending option we want ('movie', 'tv series', 'people' or 'all') |
| timePeriod (optional) | `string` | the duration of trending we want ('day' or 'week'). **Default: 'day'**    |
| page (optional)       | `number` | page number to search for.                                                |

```ts
tmdb.fetchTrending('all', 'week').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of movies, TV shows and people. (_[`Promise<ISearch<IMovieResult | IAnimeResult | IPeopleResult>>`](../../../src/models/types.ts)_) `releaseDate` is the year from TMDB's date, or unset when TMDB has none. People have `name`, `rating`, `image` and `movies`, which is empty: TMDB no longer sends what trending people are known for.\
output:

```js
{
  currentPage: 1,
  hasNextPage: true,
  results: [
        {
          id: 848326,
          title: 'Rebel Moon - Part One: A Child of Fire',
          image: 'https://image.tmdb.org/t/p/original/ui4DrH1cKk2vkHshcUcGt2lKxCm.jpg',
          type: 'Movie',
          rating: 6.457,
          releaseDate: '2023'
        },
        {
          id: 572802,
          title: 'Aquaman and the Lost Kingdom',
          image: 'https://image.tmdb.org/t/p/original/8xV47NDrjdZDpkVcCFqkdHa3T0C.jpg',
          type: 'Movie',
          rating: 6.551,
          releaseDate: '2023'
        },
        {...}
        ...
  ]
}
```

### search

<h4>Parameters</h4>

| Parameter       | Type     | Description                                                            |
| --------------- | -------- | ---------------------------------------------------------------------- |
| query           | `string` | query to search for. (_In this case, We're searching for `the flash`_) |
| page (optional) | `number` | page number to search for.                                             |

```ts
tmdb.search('the flash').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of movies and TV shows. (_[`Promise<ISearch<IMovieResult | IAnimeResult>>`](../../../src/models/types.ts)_) The whole query is sent, URL-encoded, so it may contain `&`, `#` or spaces. `releaseDate` is the year from TMDB's date, or unset when TMDB has none.\
output:

```js
{
  currentPage: 1,
  results: [
    {
      "id": 60735,
      "title": "The Flash",
      "image": "https://image.tmdb.org/t/p/original/lJA2RCMfsWoskqlQhXPSLFQGXEJ.jpg",
      "type": "TV Series",
      "rating": 7.807,
      "releaseDate": "2014"
    },
    {
      "id": 298618,
      "title": "The Flash",
      "image": "https://image.tmdb.org/t/p/original/oduJooXJya3u6wuA6FgljAFCEQp.jpg",
      "type": "Movie",
      "rating": 0,
      "releaseDate": "2023"
    },
    {...}
    ...
  ]
}
```

### fetchMediaInfo

<h4>Parameters</h4>

| Parameter | Type     | Description                                                                       |
| --------- | -------- | --------------------------------------------------------------------------------- |
| id        | `string` | the TMDB id (_the `id` of a search or trending result_)                           |
| type      | `string` | `'movie'` or `'tv'` (_a result's `type`, `'Movie'` or `'TV Series'`, also works_) |

```ts
tmdb.fetchMediaInfo('60735', 'tv').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into a movie info object, including every season and episode. (_[`Promise<IMovieInfo>`](../../../src/models/types.ts)_)

- `id` is always the TMDB id you passed in.
- `providerId` is the title's media id on the movie provider. Pass it to `fetchEpisodeServers` / `fetchEpisodeSources`.
- Each episode has `number` (the TMDB episode number; `episode` is the same value and deprecated), and `uniqueId` `${tmdbId}-${type}-s${season}-e${episode}`, which doesn't depend on the provider. `id` and `url` are the provider's episode id and URL.
- When the provider has no matching title, or fails, the TMDB info and every season are still returned, but `providerId` and the episodes' `id` and `url` are unset: there's nothing to play on that provider. For movies, `episodeId` is unset too.
- Seasons are requested together. A season whose request fails keeps its place in `seasons`, with `failed: true` and no episodes, so stored season indexes still line up; fetching the info again may fill it. Only when every season fails does `fetchMediaInfo` throw.
- `duration` is the runtime in minutes, or unset when TMDB sends none. A movie has one season, whose image is the poster, with one episode, whose image is the backdrop.

output:

```js
{
  "id": "60735",
  "providerId": "...", // the title on the movie provider; unset when it has no match
  "title": "The Flash",
  "image": "https://image.tmdb.org/t/p/original/lJA2RCMfsWoskqlQhXPSLFQGXEJ.jpg",
  "cover": "https://image.tmdb.org/t/p/original/41yaWnIT8AjIHiULHtTbKNzZTjc.jpg",
  "type": "TV Series",
  "rating": 7.807,
  "releaseDate": "2014-10-07",
  "description": "After a particle accelerator causes a freak storm, CSI Investigator Barry Allen is struck by lightning and falls into a coma. ...",
  "genres": [
    "Drama",
    "Sci-Fi & Fantasy"
  ],
  "duration": 44,
  "totalEpisodes": 176,
  "totalSeasons": 9,
  "directors": [],
  "writers": [],
  "actors": [
    "Grant Gustin",
    "Candice Patton",
    ...
  ],
  "trailer": {
    "id": "Mx7xTF8fKz4",
    "site": "YouTube",
    "url": "https://www.youtube.com/watch?v=Mx7xTF8fKz4"
  },
  "mappings": {
    "imdb": "tt3107288",
    "tmdb": 60735
  },
  "similar": [
    {
      "id": 12971,
      "title": "Dragon Ball Z",
      "image": "https://image.tmdb.org/t/p/original/jB9l4mp0bzBgzE5y4tvBH6AMeMk.jpg",
      "type": "TV Series",
      "rating": 8.311,
      "releaseDate": "1989-04-26"
    },
    {...}
  ],
  "seasons": [
    {
      "season": 1,
      "image": {
        "mobile": "https://image.tmdb.org/t/p/w300/kHyXbcb2JGWIe1fyZa6PqBwlNJN.jpg",
        "hd": "https://image.tmdb.org/t/p/w780/kHyXbcb2JGWIe1fyZa6PqBwlNJN.jpg"
      },
      "isReleased": true,
      "episodes": [
        {
          "id": "...", // the provider's episode id; unset when the provider doesn't have it
          "uniqueId": "60735-tv-s1-e1",
          "title": "Pilot",
          "number": 1,
          "episode": 1,
          "season": 1,
          "releaseDate": "2014-10-07",
          "description": "Barry discovers his powers and puts them to the test, ...",
          "url": "...",
          "image": {
            "mobile": "https://image.tmdb.org/t/p/w300/piyGyhwbqqyIxcyuZXYmDUWSylb.jpg",
            "hd": "https://image.tmdb.org/t/p/w780/piyGyhwbqqyIxcyuZXYmDUWSylb.jpg"
          }
        },
        {...}
      ]
    },
    {...}
  ]
}
```

### fetchEpisodeServers

<h4>Parameters</h4>

| Parameter | Type     | Description                                                             |
| --------- | -------- | ----------------------------------------------------------------------- |
| episodeId | `string` | the provider's episode id (_an episode's `id` in the info's `seasons`_) |
| mediaId   | `string` | the provider's media id (_the info's `providerId`_)                     |

```ts
const info = await tmdb.fetchMediaInfo('60735', 'tv');
const episode = info.seasons?.[0]?.episodes?.[0];
if (info.providerId && episode?.id) {
  const servers = await tmdb.fetchEpisodeServers(episode.id, info.providerId);
  console.log(servers);
}
```

returns a promise which resolves into the provider's servers for the episode (_[`Promise<IEpisodeServer[]>`](../../../src/models/types.ts)_). TMDB passes the call, and any error, to its movie provider.

### fetchEpisodeSources

<h4>Parameters</h4>

| Parameter | Type     | Description                                                                                         |
| --------- | -------- | --------------------------------------------------------------------------------------------------- |
| episodeId | `string` | the provider's episode id (_an episode's `id` in the info's `seasons`, or `episodeId` for a movie_) |
| mediaId   | `string` | the provider's media id (_the info's `providerId`_)                                                 |
| ...args   | `any`    | passed to the provider's `fetchEpisodeSources`, e.g. a server name                                  |

```ts
const info = await tmdb.fetchMediaInfo('60735', 'tv');
const episode = info.seasons?.[0]?.episodes?.[0];
if (info.providerId && episode?.id) {
  const sources = await tmdb.fetchEpisodeSources(episode.id, info.providerId);
  console.log(sources);
}
```

returns a promise which resolves into the episode's sources from the movie provider. (_[`Promise<ISource>`](../../../src/models/types.ts)_)\
output:

```js
{
  "headers": {
    "Referer": "..."
  },
  "sources": [
    {
      "url": "https://.../1080/index.m3u8",
      "quality": "1080p",
      "isM3U8": true
    },
    {
      "url": "https://.../playlist.m3u8",
      "isM3U8": true,
      "quality": "auto"
    }
  ],
  "subtitles": [
    {
      "url": "https://.../english.vtt",
      "lang": "English"
    }
  ]
}
```

Make sure to check the `headers` property of the returned object. It contains the referer header, which is needed to bypass the 403 error and allow you to stream the video without any issues.

### Errors

When a TMDB request fails, `search`, `fetchTrending` and `fetchMediaInfo` throw a [`MetaError`](../../guides/meta.md#errors) with `source: 'tmdb'`, the HTTP `status` when there was one, and the original error as `cause`. A 429 or 5xx answer is retried once first. A failing movie provider doesn't make `fetchMediaInfo` throw, and neither does a failing season unless every season fails (see above). `fetchEpisodeServers` and `fetchEpisodeSources` pass the provider's errors through unchanged.

<p align="end">(<a href="../../guides/meta.md">back to meta providers list</a>)</p>
