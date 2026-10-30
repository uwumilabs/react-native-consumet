<h1> FlameScans (Flame Comics) </h1>

```ts
const flameScans = new MANGA.FlameScans();
```

The constructor takes an optional provider context, `new MANGA.FlameScans(ctx?)`, whose axios makes every request (default: `createProviderContext()`). See the [manga guide](../../guides/manga.md).

The Flame Scans group rebranded as **Flame Comics** and moved from `flamescans.org` to [flamecomics.xyz](https://flamecomics.xyz) (`flamecomics.com` redirects there). The class keeps its name, `MANGA.FlameScans`; its `name` is now `FlameComics` and its `baseUrl` `https://flamecomics.xyz`. Ids changed with the site: series ids are the site's series numbers (`'12'`) and chapter ids are `<seriesId>/<chapter token>` (`'12/0e7e73bf743525dd'`), so ids saved from the old site no longer work.

The site is a Next.js app. The provider reads the JSON behind its pages (`/_next/data/<buildId>/…`), looks the build id up on the home page once, and looks it up again when a new deploy replaces it. Covers and pages come from `cdn.flamecomics.xyz`, which serves them without a `Referer`, so results have no `headerForImage`.

<h2>Methods</h2>

- [search](#search)
- [fetchMangaInfo](#fetchmangainfo)
- [fetchChapterPages](#fetchchapterpages)

### search

> Note: This method is a subclass of the [`BaseParser`](../../../src/models/base-parser.ts) class, meaning it is available across most categories.

<h4>Parameters</h4>

| Parameter       | Type     | Description                                                                  |
| --------------- | -------- | ---------------------------------------------------------------------------- |
| query           | `string` | query to search for. (_In this case, we're searching for `returners magic`_) |
| page (optional) | `number` | page number (default: 1). Every match is on page 1.                          |

The site has no search endpoint: its browse page lists every series, and `search` returns the ones whose title contains every word of the query, ignoring case and punctuation (`returners magic` finds "A Returner's Magic Should Be Special"). The site's web novels are left out. The description is the short blurb the browse page shows.

```ts
flameScans.search('returners magic').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of manga. (_[`Promise<ISearch<IMangaResult[]>>`](../../../src/models/types.ts)_)\
output:

```js
{
  currentPage: 1,
  hasNextPage: false,
  results: [
    {
      id: '12',
      title: "A Returner's Magic Should Be Special",
      url: 'https://flamecomics.xyz/series/12',
      image: 'https://cdn.flamecomics.xyz/uploads/images/series/12/thumbnail.png?1744373084',
      description: `"Now that I'm back, I won't allow my loved ones to die again!" The Shadow Labyrinth - the deadliest catastrophe humanity has ever known. Desir Arman, one of the six remaining survivors of mankind, is inside the…`,
      status: 'Cancelled',
      releaseDate: 2018
    }
  ]
}
```

The site's statuses map to `MediaStatus`: Ongoing → `ONGOING`, Completed → `COMPLETED`, Hiatus → `HIATUS`, Dropped and Cancelled → `CANCELLED`, Coming Soon → `NOT_YET_AIRED`.

### fetchMangaInfo

<h4>Parameters</h4>

| Parameter | Type     | Description                                           |
| --------- | -------- | ----------------------------------------------------- |
| mangaId   | `string` | manga id (_can be found in the manga search results_) |

```ts
flameScans.fetchMangaInfo('12').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an manga info object (including the chapters). (_[`Promise<IMangaInfo>`](../../../src/models/types.ts)_)\
output:

```js
{
  id: '12',
  title: "A Returner's Magic Should Be Special",
  url: 'https://flamecomics.xyz/series/12',
  image: 'https://cdn.flamecomics.xyz/uploads/images/series/12/thumbnail.png?1744373084',
  description: `"Now that I'm back, I won't allow my loved ones to die again!" The Shadow Labyrinth - the deadliest catastrophe humanity has ever known. ...`,
  status: 'Cancelled',
  releaseDate: 2018,
  altTitles: [
    'Gwihwanjaui Mabeob-eun Teugbyeolhaeya Habnida',
    'Kikan-sha no mahou wa tokubetsudesu',
    'La magia de un retornado debe ser especial',
    '귀환자의 마법은 특별해야 합니다',
    '帰還者の魔法は特別です'
  ],
  genres: [ 'Action', 'Adventure', 'Fantasy', 'Magic' ],
  authors: [ 'Yu So Nan' ],
  artists: [ 'Uk Jag Ga' ],
  chapters: [
    {
      id: '12/0e7e73bf743525dd',
      title: 'Chapter 1',
      chapterNumber: 1,
      releaseDate: '2021-01-20T00:00:00.000Z',
      url: 'https://flamecomics.xyz/series/12/0e7e73bf743525dd'
    },
    {
      id: '12/a94bbc3e35923cef',
      title: 'Chapter 2',
      chapterNumber: 2,
      releaseDate: '2021-01-21T00:00:00.000Z',
      url: 'https://flamecomics.xyz/series/12/a94bbc3e35923cef'
    },
    {...},
  ]
}
```

Chapters are in reading order, first chapter first, sorted by `chapterNumber` (`44.5` comes between `44` and `45`). A chapter the site names is titled like on the site, `Chapter 151 - Season 4 Start`; one without a name is `Chapter 152`. `releaseDate` is ISO 8601. The description is plain text, with a blank line between paragraphs.

### fetchChapterPages

<h4>Parameters</h4>

| Parameter | Type     | Description                                   |
| --------- | -------- | --------------------------------------------- |
| chapterId | `string` | chapter id (_can be found in the manga info_) |

```ts
flameScans.fetchChapterPages('12/0e7e73bf743525dd').then((data) => {
  console.log(data);
});
```

returns an array of pages. (_[`Promise<IMangaChapterPage[]>`](../../../src/models/types.ts)_)\
output:

```js
[
  {
    img: 'https://cdn.flamecomics.xyz/uploads/images/series/12/0e7e73bf743525dd/001.jpg?1611100800',
    page: 1
  },
  {
    img: 'https://cdn.flamecomics.xyz/uploads/images/series/12/0e7e73bf743525dd/002.jpg?1611100800',
    page: 2
  },
  {
    img: 'https://cdn.flamecomics.xyz/uploads/images/series/12/0e7e73bf743525dd/003.jpg?1611100800',
    page: 3
  },
  {...},
]
```

<p align="end">(<a href="../../guides/manga.md">Back to Providers List</a>)</p>
