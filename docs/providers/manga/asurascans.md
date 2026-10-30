<h1> AsuraScans </h1>

```ts
const asuraScans = new MANGA.AsuraScans();
```

The constructor takes an optional provider context, `new MANGA.AsuraScans(ctx?)`, whose axios makes every request (default: `createProviderContext()`). See the [manga guide](../../guides/manga.md).

The provider reads [asurascans.com](https://asurascans.com) (formerly asuracomic.net) through the JSON API its pages use, `https://api.asurascans.com/api`. Results follow the shape every manga provider returns ([What every manga provider returns](../../guides/manga.md#what-every-manga-provider-returns)):

- Title ids are the series slug (`omniscient-readers-viewpoint`). Ids from asuracomic.net (`series/<slug>-<hash>`) still work.
- Chapter ids are `<slug>/chapter/<number>` (`omniscient-readers-viewpoint/chapter/1`, `solo-farming-in-the-tower/chapter/100.5`). Older ids of the same form, with the `-<hash>` slug, still work.
- Chapters come first to last, with `chapterNumber` (`100.5` included), an ISO `releaseDate` and the chapter's `url`. A chapter's `title` is its name, or `Chapter 12` when it has none.
- Early-access chapters (paid, for the hours or days after release) are left out of `chapters` until they unlock. Fetching their pages rejects with the unlock time.
- `cdn.asurascans.com` serves covers and pages without a Referer, so there is no `headerForImage`.
- Besides the shared fields, results carry `type` (`manga`, `manhwa` or `manhua`), `rating` (0–10) and, in search, `latestChapter` (the newest chapter's number).

<h2>Methods</h2>

- [search](#search)
- [fetchMangaInfo](#fetchmangainfo)
- [fetchChapterPages](#fetchchapterpages)

### search

> Note: This method is a subclass of the [`BaseParser`](../../../src/models/base-parser.ts) class, meaning it is available across most categories.

<h4>Parameters</h4>

| Parameter       | Type     | Description                                                                                |
| --------------- | -------- | ------------------------------------------------------------------------------------------ |
| query           | `string` | query to search for. (_In this case, we're searching for `Omniscient Reader’s Viewpoint`_) |
| page (optional) | `number` | page number, 20 results per page (default: 1)                                              |

```ts
asuraScans.search('Omniscient Reader’s Viewpoint').then((data) => {
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
      id: 'omniscient-readers-viewpoint',
      title: 'Omniscient Reader’s Viewpoint',
      altTitles: ['Lector omnisciente', 'Punto de vista de lector omnisciente', '全知讀者視角', ...],
      image: 'https://cdn.asurascans.com/asura-images/covers/omniscient-readers-viewpoint.c29ced.webp',
      url: 'https://asurascans.com/comics/omniscient-readers-viewpoint-3ebcc5a9',
      description: '‘This is a development that I know of.’The moment he thought that the world had been destroyed, a new universe had unfolded.The new life of an ordinary reader begins within the world of the novel, a novel that he alone had finished.',
      status: 'Hiatus',
      type: 'manhwa',
      rating: 9.85,
      latestChapter: 311
    }
  ]
}
```

### fetchMangaInfo

<h4>Parameters</h4>

| Parameter | Type     | Description                                           |
| --------- | -------- | ----------------------------------------------------- |
| mangaId   | `string` | manga id (_can be found in the manga search results_) |

```ts
asuraScans.fetchMangaInfo('omniscient-readers-viewpoint').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an manga info object (including the chapters). (_[`Promise<IMangaInfo>`](../../../src/models/types.ts)_)\
output:

```js
{
  id: 'omniscient-readers-viewpoint',
  title: 'Omniscient Reader’s Viewpoint',
  altTitles: ['Lector omnisciente', 'Punto de vista de lector omnisciente', '全知讀者視角', ...],
  image: 'https://cdn.asurascans.com/asura-images/covers/omniscient-readers-viewpoint.c29ced.webp',
  url: 'https://asurascans.com/comics/omniscient-readers-viewpoint-3ebcc5a9',
  description: '‘This is a development that I know of.’The moment he thought that the world had been destroyed, ...',
  status: 'Hiatus',
  type: 'manhwa',
  rating: 9.85,
  genres: ['Action', 'Adventure', 'Fantasy'],
  authors: ['Sing-Shong'],
  artists: ['3B2S'],
  recommendations: [
    {
      id: 'nano-machine',
      title: 'Nano Machine',
      image: 'https://cdn.asurascans.com/asura-images/covers/nano-machine.e31bdb.webp',
      url: 'https://asurascans.com/comics/nano-machine-3ebcc5a9',
      status: 'Ongoing',
      type: 'manhwa',
      rating: 9.27
    },
    {...}
  ],
  chapters: [
    {
      id: 'omniscient-readers-viewpoint/chapter/0',
      title: 'Prologue',
      chapterNumber: 0,
      releaseDate: '2022-12-21T16:35:42.000Z',
      url: 'https://asurascans.com/comics/omniscient-readers-viewpoint-3ebcc5a9/chapter/0'
    },
    {
      id: 'omniscient-readers-viewpoint/chapter/1',
      title: 'Chapter 1',
      chapterNumber: 1,
      releaseDate: '2022-12-21T16:48:51.000Z',
      url: 'https://asurascans.com/comics/omniscient-readers-viewpoint-3ebcc5a9/chapter/1'
    },
    {...},
    {
      id: 'omniscient-readers-viewpoint/chapter/311',
      title: '“Dokja’s Fable” Part -13 {S1 END}',
      chapterNumber: 311,
      releaseDate: '2026-05-19T17:56:55.666Z',
      url: 'https://asurascans.com/comics/omniscient-readers-viewpoint-3ebcc5a9/chapter/311'
    }
  ]
}
```

### fetchChapterPages

<h4>Parameters</h4>

| Parameter | Type     | Description                                   |
| --------- | -------- | --------------------------------------------- |
| chapterId | `string` | chapter id (_can be found in the manga info_) |

```ts
asuraScans.fetchChapterPages('omniscient-readers-viewpoint/chapter/1').then((data) => {
  console.log(data);
});
```

returns an array of pages, counted from 1. (_[`Promise<IMangaChapterPage[]>`](../../../src/models/types.ts)_)\
output:

```js
[
  {
    page: 1,
    img: 'https://cdn.asurascans.com/asura-images/chapters/omniscient-readers-viewpoint/1/001.webp?v=1770499638'
  },
  {
    page: 2,
    img: 'https://cdn.asurascans.com/asura-images/chapters/omniscient-readers-viewpoint/1/002.webp?v=1770499638'
  },
  {
    page: 3,
    img: 'https://cdn.asurascans.com/asura-images/chapters/omniscient-readers-viewpoint/1/003.webp?v=1770499638'
  },
  {...}
]
```

<p align="end">(<a href="../../guides/manga.md">Back to Providers List</a>)</p>
