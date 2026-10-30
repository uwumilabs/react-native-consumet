<h1> MangaKakalot </h1>

```ts
const mangakakalot = new MANGA.MangaKakalot();
```

The constructor takes an optional provider context, `new MANGA.MangaKakalot(ctx?)`, whose axios makes every request (default: `createProviderContext()`). See the [manga guide](../../guides/manga.md).

MangaKakalot now lives at `https://www.kakamanga.com` (`mangakakalot.gg` redirects there; `mangakakalot.com` is gone). `manganato.gg` is the same site under another name, with the same ids, so the provider uses kakamanga.com only.

Covers and pages are on `*.2xstorage.com`, which refuses images unless the Referer is exactly `https://www.kakamanga.com/`. Every result, info and page has that `headerForImage`; send it with the image request, e.g. `<Image source={{ uri: page.img, headers: page.headerForImage }} />`.

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
| page (optional) | `number` | page number (default: 1). Pages hold 20 titles.                             |

```ts
mangakakalot.search('Tomodachi Game').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of manga. (_[`Promise<ISearch<IMangaResult[]>>`](../../../src/models/types.ts)_)\
output:

```js
{
  currentPage: 1,
  hasNextPage: true,
  results: [
    {
      id: 'tomodachi-game', // the title's slug: pass it to fetchMangaInfo
      title: 'Tomodachi Game',
      url: 'https://www.kakamanga.com/manga/tomodachi-game',
      image: 'https://imgs-2.2xstorage.com/thumb/tomodachi-game.webp',
      headerForImage: { Referer: 'https://www.kakamanga.com/' }
    },
    {
      id: 'onee-chan-no-tomodachi-ga-kyou-mo-ore-wo-batsu-game-ni-tsukau',
      title: 'Onee-Chan no Tomodachi ga Kyou mo Ore wo Batsu Game ni Tsukau.',
      url: 'https://www.kakamanga.com/manga/onee-chan-no-tomodachi-ga-kyou-mo-ore-wo-batsu-game-ni-tsukau',
      image: 'https://img-r2.2xstorage.com/thumb/onee-chan-no-tomodachi-ga-kyou-mo-ore-wo-batsu-game-ni-tsukau.webp',
      headerForImage: { Referer: 'https://www.kakamanga.com/' }
    },
    {...}
    ...
  ]
}
```

The site matches any word of the query, so later results may share only one word with it.

### fetchMangaInfo

<h4>Parameters</h4>

| Parameter | Type     | Description                                                                      |
| --------- | -------- | -------------------------------------------------------------------------------- |
| mangaId   | `string` | manga id, the title's slug (_manga id can be found in the manga search results_) |

```ts
mangakakalot.fetchMangaInfo('tomodachi-game').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an manga info object (including the chapters). (_[`Promise<IMangaInfo>`](../../../src/models/types.ts)_)\
output:

```js
{
  id: 'tomodachi-game',
  title: 'Tomodachi Game',
  url: 'https://www.kakamanga.com/manga/tomodachi-game',
  image: 'https://imgs-2.2xstorage.com/thumb/tomodachi-game.webp',
  headerForImage: { Referer: 'https://www.kakamanga.com/' },
  description: 'Katagiri Yuichi believes that friends are more important than money, but he also knows the hardships of not having enough funds. ...',
  authors: [ 'Yamaguchi Mikoto' ],
  status: 'Ongoing',
  genres: [ 'Drama', 'Seinen', 'Psychological', 'Mystery' ],
  views: 41148877,
  chapters: [
    {
      id: 'tomodachi-game/chapter-0', // pass it to fetchChapterPages
      title: 'Chapter 0',
      chapterNumber: 0,
      releaseDate: '2024-11-03T09:54:02.000Z',
      views: 242186,
      url: 'https://www.kakamanga.com/manga/tomodachi-game/chapter-0'
    },
    {...},
    {
      id: 'tomodachi-game/chapter-127-5',
      title: 'Chapter 127.5',
      chapterNumber: 127.5,
      releaseDate: '2024-11-03T11:37:28.000Z',
      views: 17419,
      url: 'https://www.kakamanga.com/manga/tomodachi-game/chapter-127-5'
    }
  ]
}
```

Chapters are in reading order, first chapter first, and include every chapter (the site's list API pages them). A chapter keeps the site's name in `title` (`Chapter 1197: Love is Defence`). `altTitles` is set when the site lists alternative titles; fields the page leaves empty (such as an `Unknown` author) are left out.

### fetchChapterPages

<h4>Parameters</h4>

| Parameter | Type     | Description                                                                           |
| --------- | -------- | ------------------------------------------------------------------------------------- |
| chapterId | `string` | chapter id, `<manga id>/<chapter slug>` (_chapter id can be found in the manga info_) |

```ts
mangakakalot.fetchChapterPages('tomodachi-game/chapter-127-5').then((data) => {
  console.log(data);
});
```

returns an array of pages. (_[`Promise<IMangaChapterPage[]>`](../../../src/models/types.ts)_)\
output:

```js
[
  {
    img: 'https://imgs-2.2xstorage.com/tomodachi-game/127.5/0.webp',
    page: 1,
    headerForImage: { Referer: 'https://www.kakamanga.com/' }
  },
  {
    img: 'https://imgs-2.2xstorage.com/tomodachi-game/127.5/1.webp',
    page: 2,
    headerForImage: { Referer: 'https://www.kakamanga.com/' }
  },
  {...}
]
```

<p align="end">(<a href="../../guides/manga.md">back to manga providers list</a>)</p>
