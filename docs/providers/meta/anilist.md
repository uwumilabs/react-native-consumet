<h1>Anilist</h1>
This is a custom provider that maps an anime provider to AniList. Titles, images and the episode list come from AniList and ani.zip; episode servers and sources come from the anime provider.

`Anilist` takes an anime provider as its first parameter **(optional)**: a registry provider from `ProviderManager.getAnimeProvider` (an `IAnimeProvider`) or an `AnimeParser` instance. The provider's episodes are matched to AniList. Without one, it uses the bundled `Zoro` class, which isn't in the extension registry, so pass one.

```ts
import { META, ProviderManager, ExtensionRegistry } from 'react-native-consumet';

const manager = new ProviderManager(ExtensionRegistry);
const anilist = new META.Anilist(await manager.getAnimeProvider('animepahe'));
```

<h2>Methods</h2>

- [search](#search)
- [fetchTrendingAnime](#fetchtrendinganime)
- [fetchPopularAnime](#fetchpopularanime)
- [fetchAnimeInfo](#fetchanimeinfo)
- [fetchEpisodesListById](#fetchepisodeslistbyid)
- [fetchAnimeGenres](#fetchanimegenres)
- [fetchAiringSchedule](#fetchairingschedule)
- [fetchEpisodeServers](#fetchepisodeservers)
- [fetchEpisodeSources](#fetchepisodesources)
- [Errors](#errors)

`fetchRecentEpisodes` is deprecated: it reads from Anify, which is offline, so it always fails.

### search

<h4>Parameters</h4>

| Parameter          | Type     | Description                                                                         |
| ------------------ | -------- | ----------------------------------------------------------------------------------- |
| query              | `string` | query to search for. (_In this case, We're searching for `Classroom of the elite`_) |
| page (optional)    | `number` | page number to search for.                                                          |
| perPage (optional) | `number` | number of results per page. **Default: 15**                                         |

```ts
anilist.search('Classroom of the elite').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of anime. (_[`Promise<ISearch<IAnimeResult[]>>`](../../../src/models/types.ts)_) The query is sent as a GraphQL variable, so it may contain quotes or backslashes. `cover` is the banner, or the cover image when the anime has no banner.\
output:

```js
{
  currentPage: 1,
  hasNextPage: false,
  results: [
    {
      id: '98659',
      title: {
         romaji: 'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e',
         english: 'Classroom of the Elite',
         native: 'ようこそ実力至上主義の教室へ',
         userPreferred: 'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e'
      },
      image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/b98659-sH5z5RfMuyMr.png',
      rating: 77,
      releaseDate: 2017
    },
    {
      id: '145545',
      title: {
         romaji: 'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e 2nd Season',
         english: 'Classroom of the Elite Season 2',
         native: 'ようこそ実力至上主義の教室へ 2nd Season',
         userPreferred: 'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e 2nd Season'
      },
      image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx145545-DGl3LVvFlnHi.png',
      rating: 79,
      releaseDate: 2022
    }
    {...}
    ...
  ]
}
```

### fetchTrendingAnime

<h4>Parameters</h4>

| Parameter          | Type     | Description                 |
| ------------------ | -------- | --------------------------- |
| page (optional)    | `number` | page number to search for.  |
| perPage (optional) | `number` | number of results per page. |

```ts
anilist.fetchTrendingAnime().then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of anime. (_[`Promise<ISearch<IAnimeResult[]>>`](../../../src/models/types.ts)_)\
output:

```js
{
  currentPage: 1,
  hasNextPage: true,
  results: [
    {
      id: '153288',
      malId: null,
      title: {
          romaji: 'Kaijuu 8-gou',
          english: 'Kaiju No.8',
          native: '怪獣８号',
          userPreferred: 'Kaijuu 8-gou'
      },
      image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx153288-INFE21hHhAUD.jpg',
      trailer: {
          id: '-MaTda-Ws3Y',
          site: 'youtube',
          thumbnail: 'https://i.ytimg.com/vi/-MaTda-Ws3Y/hqdefault.jpg'
      },
      cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx153288-INFE21hHhAUD.jpg',
      rating: null,
      releaseDate: null,
      totalEpisodes: 0,
      duration: null,
      type: null
    },
    {
      id: '130592',
      malId: 48413,
      title: {...},
      image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx130592-LAUlhx15mxQu.jpg',
      trailer: {...},
      cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/130592-WPfrW1SR4dnY.jpg',
      rating: 74,
      releaseDate: 2022,
      totalEpisodes: 12,
      duration: 24,
      score: 75,
      type: 'TV'
    },
  ]
}
```

### fetchPopularAnime

<h4>Parameters</h4>

| Parameter          | Type     | Description                 |
| ------------------ | -------- | --------------------------- |
| page (optional)    | `number` | page number to search for.  |
| perPage (optional) | `number` | number of results per page. |

```ts
anilist.fetchPopularAnime().then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of anime. (_[`Promise<ISearch<IAnimeResult[]>>`](../../../src/models/types.ts)_)\
output:

```js
{
  currentPage: 1,
  hasNextPage: true,
  results: [
    {
      id: '153288',
      malId: null,
      title: {
          romaji: 'Kaijuu 8-gou',
          english: 'Kaiju No.8',
          native: '怪獣８号',
          userPreferred: 'Kaijuu 8-gou'
      },
      image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx153288-INFE21hHhAUD.jpg',
      trailer: {
          id: '-MaTda-Ws3Y',
          site: 'youtube',
          thumbnail: 'https://i.ytimg.com/vi/-MaTda-Ws3Y/hqdefault.jpg'
      },
      cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx153288-INFE21hHhAUD.jpg',
      rating: null,
      releaseDate: null,
      totalEpisodes: 0,
      duration: null,
      type: null
    },
    {
      id: '130592',
      malId: 48413,
      title: {...},
      image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx130592-LAUlhx15mxQu.jpg',
      trailer: {...},
      cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/130592-WPfrW1SR4dnY.jpg',
      rating: 74,
      releaseDate: 2022,
      totalEpisodes: 12,
      duration: 24,
      score: 75,
      type: 'TV'
    },
  ]
}
```

### fetchAnimeInfo

<h4>Parameters</h4>

| Parameter              | Type      | Description                                                                                                                         |
| ---------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| id                     | `string`  | takes the AniList id as a parameter. (_the id can be found in the anime search results or anime info object_)                       |
| fetchFiller (optional) | `boolean` | if true, sets `isFiller` on the episodes. **Default: false**. The filler list it reads is currently offline (see [Errors](#errors)) |

```ts
anilist.fetchAnimeInfo('98659').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an anime info object (including the episodes). (_[`Promise<IAnimeInfo>`](../../../src/models/types.ts)_)\
The episodes come from the provider without the ani.zip merge, and each gets `uniqueId` `${anilistId}$ep=${number}`. Use [fetchEpisodesListById](#fetchepisodeslistbyid) for the merged list. Recommendations and relations share one shape (recommendations AniList hides are left out), and `title.userPreferred` is set.\
output:

```js
{
  id: '98659',
  title: {
    romaji: 'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e',
    english: 'Classroom of the Elite',
    native: 'ようこそ実力至上主義の教室へ',
    userPreferred: 'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e'
  },
  malId: 35507,
  trailer: {
    id: 'gMZDGyihTyc',
    site: 'youtube',
    thumbnail: 'https://i.ytimg.com/vi/gMZDGyihTyc/hqdefault.jpg'
  },
  image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/b98659-sH5z5RfMuyMr.png',
  cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/111321-nnetF1qONAcE.jpg',
  description: 'Koudo Ikusei Senior High School is a leading school with state-of-the-art facilities. The students there have the freedom to wear any hairstyle ...',
  status: 'Completed',
  releaseDate: 2017,
  nextAiringEpisode:{
    airingTime: 2312312123,
    timeUntilAiring: 12512355,
    episode: 5,
  }
  rating: 77,
  duration: 24,
  genres: [ 'Drama', 'Psychological' ],
  studios: [ 'Lerche' ],
  subOrDub: 'sub',
  recommendations: [
      {
        id: 101921,
        malId: 37999,
        title: {
          romaji: 'Kaguya-sama wa Kokurasetai: Tensaitachi no Renai Zunousen',
          english: 'Kaguya-sama: Love is War',
          native: '...',
          userPreferred: '...'
        },
        status: 'Completed',
        episodes: 12,
        chapters: null,
        image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101921-VvdGQy1ZySYf.jpg',
        cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101921-GgvvFhlNhzlF.jpg',
        color: '...',
        rating: 83,
        type: 'TV'
      },
      {...}
      ...
  ],
  episodes: [
    {
      id: '...', // the provider's episode id
      uniqueId: '98659$ep=1',
      number: 1,
      title: 'What is evil? Whatever springs from weakness.',
      image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/b98659-sH5z5RfMuyMr.png',
      url: '...'
    },
    {...}
    ...
  ]
}
```

### fetchEpisodesListById

<h4>Parameters</h4>

| Parameter              | Type      | Description                                                                                                                         |
| ---------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| id                     | `string`  | the AniList id.                                                                                                                     |
| fetchFiller (optional) | `boolean` | if true, sets `isFiller` on the episodes. **Default: false**. The filler list it reads is currently offline (see [Errors](#errors)) |

```ts
anilist.fetchEpisodesListById('162670').then((episodes) => {
  console.log(episodes);
});
```

returns a promise which resolves into the provider's episode list, merged with ani.zip metadata, without the anime info. (_[`Promise<IMetaAnimeEpisode[]>`](../../../src/models/types.ts)_)

- **`uniqueId`** is set on every episode, and is the key to store watch progress under:

  ```
  uniqueId = `${anilistId}$ep=${aniDbKey ?? number}`
  ```

  `aniDbKey` is the AniDB episode number of the ani.zip episode the provider's episode was matched to (matched by number first, then air date, then title). Specials never take part. Episodes ani.zip doesn't match, and every episode when ani.zip is unavailable or the provider doesn't use the ani.zip merge (the `aniZipEpisodes` capability), use the provider's `number`.

- **`number`** is always the provider's own episode number.
- **`tvdbNumber`** and **`absoluteNumber`** are the TVDB season-relative and absolute numbers, set only on episodes ani.zip matched.
- Titles, images and air dates come from the matched ani.zip episode when there is one.
- If AniList has the anime but the provider has no match, the promise resolves to `[]`.

The rule changed after 1.6.0; see [Migrating stored episode `uniqueId`s](../../migrations/uniqueid.md) for how to move stored progress.

output (Dr. Stone: New World Part 2, from a provider that numbers the cour 1–11):

```js
[
  {
    id: '...', // the provider's episode id
    uniqueId: '162670$ep=1',
    number: 1,
    tvdbNumber: 12,
    absoluteNumber: 48,
    title: 'The Kingdom of Science`s Counterattack',
    image: '...',
    releaseDate: '...',
  },
  {...}
  ...
]
```

### fetchAnimeGenres

<h4>Parameters</h4>

| Parameter          | Type       | Description                                          |
| ------------------ | ---------- | ---------------------------------------------------- |
| genres             | `string[]` | a list containing the genres of the animes to fetch. |
| page (optional)    | `number`   | page number to search for.                           |
| perPage (optional) | `number`   | number of results per page.                          |

```ts
anilist.fetchAnimeGenres(['Action', 'Adventure']).then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of anime. (_[`Promise<ISearch<IAnimeResult[]>>`](../../../src/models/types.ts)_)\
output:

```js
{
  currentPage: 1,
  hasNextPage: true,
  results: [
    {
      id: '1',
      malId: 1,
      title: {...},
      image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx1-CXtrrkMpJ8Zq.png',
      trailer: {...},
      description: 'Enter a world in the distant future, where Bounty Hunters roam the solar system. Spike and Jet, bounty hunting partners, set out on journeys in an ever struggling effort to win bounty rewards to survive.<br><br>\n' +
        'While traveling, they meet up with other very interesting people. Could Faye, the beautiful and ridiculously poor gambler, Edward, the computer genius, and Ein, the engineered dog be a good addition to the group?',
      cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1-T3PJUjFJyRwg.jpg',
      rating: 86,
      releaseDate: 1998,
      totalEpisodes: 26,
      duration: 24,
      type: 'TV'
    },
    {...}
  ]
}
```

### fetchAiringSchedule

<h4>Parameters</h4>

| Parameter              | Type               | Description                                                                                                                                                                                         |
| ---------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| page (optional)        | `number`           | page number. **Default: 1**                                                                                                                                                                         |
| perPage (optional)     | `number`           | number of results per page. **Default: 20**                                                                                                                                                         |
| weekStart (optional)   | `number \| string` | the first day of the schedule: a day number (`0` = Saturday, `1` = Sunday, `2` = Monday … `6` = Friday) or a day name (`'Monday'`). Its next occurrence is used, today included. **Default: today** |
| weekEnd (optional)     | `number \| string` | the last day of the schedule, included: the first such day on or after `weekStart`. **Default: the day before today**, so the default schedule is the seven days from today                         |
| notYetAired (optional) | `boolean`          | `true`: only episodes that haven't aired yet. `false`: only episodes that have already aired (AniList's filter). **Default: false**                                                                 |

The schedule runs in the device's local time, from the start of `weekStart` to the end of `weekEnd`. Numbers and names can be mixed; an unknown day throws before any request is made. For the episodes still to come this week, pass `notYetAired: true`:

```ts
anilist.fetchAiringSchedule(1, 20, undefined, undefined, true).then((data) => {
  console.log(data);
});

// Episodes airing from the coming Monday to the Sunday after it, aired or not yet
const [aired, upcoming] = await Promise.all([
  anilist.fetchAiringSchedule(1, 50, 'Monday', 'Sunday', false),
  anilist.fetchAiringSchedule(1, 50, 'Monday', 'Sunday', true),
]);
```

returns a promise which resolves into an array of anime. (_[`Promise<ISearch<IAnimeResult[]>>`](../../../src/models/types.ts)_)\
output:

```js

    {
      currentPage: 1,
      hasNextPage: true,
      results: [
        {
          id: '133844',
          malId: 48895,
          episode: 6,
          airingAt: 1660050000,
          title: {
            romaji: 'SHINE POST',
            english: 'SHINEPOST',
            native: 'シャインポスト',
            userPreferred: 'SHINE POST'
          },
          image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx133844-E32FjKZ0XxEs.jpg',
          description: 'The fourth season of <i>Overlord</i>.',
          cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/133844-uIaUmh5aJX3M.jpg',
          rating: 80,
          releaseDate: 2022,
          type: 'TV'
        },
        {
          id: '146210',
          malId: 51213,
          episode: 6,
          airingAt: 1660051800,
          title: {
            romaji: 'Jashin-chan Dropkick X',
            english: 'Dropkick on My Devil!!! X',
            native: '邪神ちゃんドロップキックX',
            userPreferred: 'Jashin-chan Dropkick X'
          },
          image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx146210-ZnIithxFLLHn.jpg',
          description: 'Meet Alto, a hapless student at Royal Ortigia Magic Academy whose academic performance leaves much to be desired. Rather than take a more sensible approach to salvaging his grades in time for graduation',
          cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx146210-ZnIithxFLLHn.jpg',
          rating: 69,
          releaseDate: 2022,
          type: 'TV'
        },
        {...},
        ...
      ]
    }

```

### fetchEpisodeServers

<h4>Parameters</h4>

| Parameter | Type     | Description                                                                                           |
| --------- | -------- | ----------------------------------------------------------------------------------------------------- |
| episodeId | `string` | the provider's episode id (_the `id` of an episode from `fetchEpisodesListById` or `fetchAnimeInfo`_) |

```ts
const episodes = await anilist.fetchEpisodesListById('98659');
const servers = await anilist.fetchEpisodeServers(episodes[0]!.id);
```

returns a promise which resolves into the provider's servers for the episode (_[`Promise<IEpisodeServer[]>`](../../../src/models/types.ts)_). Anilist passes the call to its anime provider.

### fetchEpisodeSources

<h4>Parameters</h4>

| Parameter | Type     | Description                                                                                           |
| --------- | -------- | ----------------------------------------------------------------------------------------------------- |
| episodeId | `string` | the provider's episode id (_the `id` of an episode from `fetchEpisodesListById` or `fetchAnimeInfo`_) |
| ...args   | `any`    | passed to the provider's `fetchEpisodeSources`, e.g. a server name or `SubOrDub`                      |

In this example, we're getting the sources for the first episode of classroom of the elite.

```ts
const episodes = await anilist.fetchEpisodesListById('98659');
const sources = await anilist.fetchEpisodeSources(episodes[0]!.id);
console.log(sources);
```

returns a promise which resolves into the episode's sources from the anime provider. (_[`Promise<ISource>`](../../../src/models/types.ts)_)\
output:

```js
{
  headers: {
    Referer: '...'
  },
  sources: [
    {
      url: 'https://.../master.m3u8',
      isM3U8: true,
      quality: 'auto'
    }
  ],
  subtitles: [...]
}
```

Make sure to check the `headers` property of the returned object. It contains the referer header, which is needed to bypass the 403 error and allow you to stream the video without any issues.

### Errors

Every method throws a [`MetaError`](../../guides/meta.md#errors) on failure:

- `source: 'anilist'` when the AniList request failed, with its HTTP `status`. A 429 or 5xx answer is retried once first. 404 and 429 keep readable messages (`Media not found…`, `You have been ratelimited by anilist…`).
- `source: 'provider'` when the anime provider failed, while finding the anime, listing episodes or fetching servers or sources. The provider's error is the `cause`.

ani.zip and filler lists are optional: when they fail or time out (5 s), the episodes are returned without them. The filler list `fetchFiller` reads (saikou-app's `mal-id-filler-list` on GitHub) is currently offline, so `isFiller` is never set.

<p align="end">(<a href="../../guides/meta.md">back to meta providers list</a>)</p>
