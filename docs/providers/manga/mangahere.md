<h1> MangaHere </h1>

```ts
const mangahere = new MANGA.MangaHere();
```

The constructor takes an optional provider context, `new MANGA.MangaHere(ctx?)`, whose axios makes every request (default: `createProviderContext()`). See the [manga guide](../../guides/manga.md) for the shape every manga provider returns.

MangaHere's image host refuses covers and page images without a MangaHere `Referer` (403). Every result with an `image`, and every page, carries `headerForImage: { Referer: 'https://www.mangahere.cc/' }`; send it with the image request.

<h2>Methods</h2>

- [search](#search)
- [fetchMangaInfo](#fetchmangainfo)
- [fetchChapterPages](#fetchchapterpages)

### search

> Note: This method is a subclass of the [`BaseParser`](../../../src/models/base-parser.ts) class. meaning it is available across most categories.

<h4>Parameters</h4>

| Parameter       | Type     | Description                                                                 |
| --------------- | -------- | --------------------------------------------------------------------------- |
| query           | `string` | query to search for. (_In this case, We're searching for `Tomodachi Game`_) |
| page (optional) | `number` | page number (default: 1)                                                    |

```ts
mangahere.search('Tomodachi Game').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of manga. (_[`Promise<ISearch<IMangaResult>>`](../../../src/models/types.ts)_)\
output:

```js
{
  currentPage: 1,
  hasNextPage: true,
  results: [
    {
      id: 'tomodachi_game',
      title: 'Tomodachi Game',
      url: 'https://www.mangahere.cc/manga/tomodachi_game/',
      image: 'https://fmcdn.mangahere.com/store/manga/15338/cover.jpg?token=e444bd3545fa09a886a528796738acc03fa555ed&ttl=1793455200&v=1729750652',
      headerForImage: { Referer: 'https://www.mangahere.cc/' },
      description: 'Katagiri Yuichi believes that friends are more important than money, but he also knows the hardships of not ha...',
      status: 'Ongoing'
    },
    {
      id: 'hon_no_tomodachi',
      title: 'Hon no Tomodachi',
      url: 'https://www.mangahere.cc/manga/hon_no_tomodachi/',
      image: 'https://fmcdn.mangahere.com/store/manga/15522/cover.jpg?token=c39d1def2a1ca25f81230961838f118a8cba4365&ttl=1793455200&v=1414398523',
      headerForImage: { Referer: 'https://www.mangahere.cc/' },
      // No description: the site has none for this title.
      status: 'Completed'
    },
    {...}
    ...
  ]
}
```

### fetchMangaInfo

<h4>Parameters</h4>

| Parameter | Type     | Description                                                     |
| --------- | -------- | --------------------------------------------------------------- |
| mangaId   | `string` | manga id. (_manga id can be found in the manga search results_) |

```ts
mangahere.fetchMangaInfo('kingdom').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into a manga info object (including the chapters). (_[`Promise<IMangaInfo>`](../../../src/models/types.ts)_)\
Chapters come in reading order, first chapter first, with the `chapterNumber` and `volumeNumber` of labels such as `Vol.01 Ch.001`. `releaseDate` is an ISO 8601 date (`Jul 13,2010` → `2010-07-13`); dates the site gives as `7 hour ago` become that hour's timestamp. It throws for an id the site doesn't have.\
output:

```js
{
  id: 'kingdom',
  title: 'Kingdom',
  url: 'https://www.mangahere.cc/manga/kingdom/',
  description: 'Millions of years have passed since the times of legends, when the worlds of man and gods were still the same. ...',
  image: 'https://fmcdn.mangahere.com/store/manga/8198/cover.jpg?token=bb121137fd4b86808b1700ad70a68c2741f0d8be&ttl=1793455200&v=1793341816',
  headerForImage: { Referer: 'https://www.mangahere.cc/' },
  genres: [ 'Action', 'Historical', 'Drama', 'Seinen', 'Mature' ],
  status: 'Ongoing',
  rating: 4.97,
  authors: [ 'HARA Yasuhisa' ],
  chapters: [
    {
      id: 'kingdom/v01/c001',
      title: 'Vol.01 Ch.001',
      chapterNumber: 1,
      volumeNumber: 1,
      releaseDate: '2010-07-13',
      url: 'https://www.mangahere.cc/manga/kingdom/v01/c001/1.html'
    },
    {...}
    ...
    {
      id: 'kingdom/v51/c892',
      title: 'Vol.51 Ch.892',
      chapterNumber: 892,
      volumeNumber: 51,
      releaseDate: '2026-10-30T07:00:00.000Z',
      url: 'https://www.mangahere.cc/manga/kingdom/v51/c892/1.html'
    }
  ]
}
```

Titles without volumes have no `volumeNumber`; a chapter's `title` is the site's label, with its name when it has one:

```js
{
  id: 'tomodachi_game/c001',
  title: 'Ch.001 - Huh? Is Yuuichi-Kun Doubting His Friends?',
  chapterNumber: 1,
  releaseDate: '2014-09-22',
  url: 'https://www.mangahere.cc/manga/tomodachi_game/c001/1.html'
}
```

### fetchChapterPages

<h4>Parameters</h4>

| Parameter | Type     | Description                                               |
| --------- | -------- | --------------------------------------------------------- |
| chapterId | `string` | chapter id. (_chapter id can be found in the manga info_) |

```ts
mangahere.fetchChapterPages('kingdom/v46/c500.5').then((data) => {
  console.log(data);
});
```

returns an array of pages, counted from 1. (_[`Promise<IMangaChapterPage[]>`](../../../src/models/types.ts)_)\
MangaHere hides the image URLs in packed scripts, which the provider decodes without evaluating them: the long-strip reader lists every image at once, and the page-by-page reader is asked for one image pair at a time (every other page). It throws when a page's image can't be found.\
output:

```js
[
  {
    page: 1,
    img: 'https://zjcdn.mangahere.org/store/manga/8198/46-500.5/compressed/eimg001.jpg',
    headerForImage: { Referer: 'https://www.mangahere.cc/' }
  },
  {
    page: 2,
    img: 'https://zjcdn.mangahere.org/store/manga/8198/46-500.5/compressed/eimg002.jpg',
    headerForImage: { Referer: 'https://www.mangahere.cc/' }
  },
  {
    page: 3,
    img: 'https://zjcdn.mangahere.org/store/manga/8198/46-500.5/compressed/ecmg002.jpg',
    headerForImage: { Referer: 'https://www.mangahere.cc/' }
  }
]
```

<p align="end">(<a href="../../guides/manga.md">back to manga providers list</a>)</p>
