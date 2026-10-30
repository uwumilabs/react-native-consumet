<h1> MangaPill </h1>

```ts
const mangaPill = new MANGA.MangaPill();
```

The constructor takes an optional provider context, `new MANGA.MangaPill(ctx?)`, whose axios makes every request (default: `createProviderContext()`). Results follow the shape every manga provider returns; see [What every manga provider returns](../../guides/manga.md#what-every-manga-provider-returns).

MangaPill's image CDN refuses requests without a MangaPill `Referer` (HTTP 403), for covers and pages alike. Every result with a cover and every page therefore carries `headerForImage: { Referer: 'https://mangapill.com/' }`; send it with the image request:

```tsx
<Image source={{ uri: page.img, headers: page.headerForImage }} />
```

<h2>Methods</h2>

- [search](#search)
- [fetchMangaInfo](#fetchmangainfo)
- [fetchChapterPages](#fetchchapterpages)

### search

> Note: This method is a subclass of the [`BaseParser`](../../../src/models/base-parser.ts) class, meaning it is available across most categories.

<h4>Parameters</h4>

| Parameter       | Type     | Description                                                            |
| --------------- | -------- | ---------------------------------------------------------------------- |
| query           | `string` | query to search for. (_In this case, we're searching for `one piece`_) |
| page (optional) | `number` | page number (default: `1`); the site lists 50 titles a page            |

```ts
mangaPill.search('one piece').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into a page of manga. (_[`Promise<ISearch<IMangaResult>>`](../../../src/models/types.ts)_)\
output:

```js
{
  currentPage: 1,
  hasNextPage: true,
  results: [
    {
      id: '2/one-piece',
      title: 'One Piece',
      image: 'https://cdn.readdetectiveconan.com/file/mangapill/i/2.webp?h=01971742-5d7f-7f32-8d2b-d038279f8a73',
      headerForImage: { Referer: 'https://mangapill.com/' },
      url: 'https://mangapill.com/manga/2/one-piece',
      status: 'Ongoing', // MediaStatus.ONGOING
      releaseDate: 1997
    },
    {
      id: '6290/one-piece-pirate-recipes',
      title: 'One Piece Pirate Recipes',
      altTitles: ["One Piece Pirate Recipes: Sanji's Gut-Stuffers"],
      image: 'https://cdn.readdetectiveconan.com/file/mangapill/i/6290.png',
      headerForImage: { Referer: 'https://mangapill.com/' },
      url: 'https://mangapill.com/manga/6290/one-piece-pirate-recipes',
      status: 'Completed', // MediaStatus.COMPLETED
      releaseDate: 2021
    },
    {...},
  ]
}
```

`altTitles` is only there when the site lists another title. The site's statuses map to `MediaStatus`: publishing → `Ongoing`, finished → `Completed`, on hiatus → `Hiatus`, discontinued → `Cancelled`, not yet published → `Not yet aired`.

### fetchMangaInfo

<h4>Parameters</h4>

| Parameter | Type     | Description                                           |
| --------- | -------- | ----------------------------------------------------- |
| mangaId   | `string` | manga id (_can be found in the manga search results_) |

```ts
mangaPill.fetchMangaInfo('2/one-piece').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into a manga info object (including the chapters). (_[`Promise<IMangaInfo>`](../../../src/models/types.ts)_)\
output:

```js
{
  id: '2/one-piece',
  title: 'One Piece',
  image: 'https://cdn.readdetectiveconan.com/file/mangapill/i/2.webp?h=01971742-5d7f-7f32-8d2b-d038279f8a73',
  headerForImage: { Referer: 'https://mangapill.com/' },
  description: 'Gol D. Roger, a man referred to as the "Pirate King," is set to be executed by the World Government. [...] the Great Age of Pirates begins.\n\nTwenty-two years later, [...]\n\n[Written by MAL Rewrite]',
  status: 'Ongoing',
  releaseDate: 1997,
  url: 'https://mangapill.com/manga/2/one-piece',
  genres: ['Action', 'Adventure', 'Comedy', 'Fantasy', 'Shounen', 'Super Power'],
  chapters: [
    {
      id: '2-10001000/one-piece-chapter-1',
      title: 'Chapter 1',
      chapterNumber: 1,
      url: 'https://mangapill.com/chapters/2-10001000/one-piece-chapter-1'
    },
    {
      id: '2-10002000/one-piece-chapter-2',
      title: 'Chapter 2',
      chapterNumber: 2,
      url: 'https://mangapill.com/chapters/2-10002000/one-piece-chapter-2'
    },
    {...},
    {
      id: '2-11054500/one-piece-chapter-1054.5',
      title: 'Chapter 1054.5',
      chapterNumber: 1054.5,
      url: 'https://mangapill.com/chapters/2-11054500/one-piece-chapter-1054.5'
    },
    {...},
  ]
}
```

Chapters are in reading order, first chapter first (the site lists them newest first), with
`chapterNumber` read from the `Chapter N` label. The site's pages show no chapter names, volumes,
scanlators, release dates or authors, so those fields are left out.

### fetchChapterPages

<h4>Parameters</h4>

| Parameter | Type     | Description                                   |
| --------- | -------- | --------------------------------------------- |
| chapterId | `string` | chapter id (_can be found in the manga info_) |

```ts
mangaPill.fetchChapterPages('2-11069000/one-piece-chapter-1069').then((data) => {
  console.log(data);
});
```

returns an array of pages. (_[`Promise<IMangaChapterPage[]>`](../../../src/models/types.ts)_)\
output:

```js
[
  {
    img: 'https://cdn.readdetectiveconan.com/file/mangap/2/11069000/1.jpeg?t=1740977722',
    page: 1,
    headerForImage: { Referer: 'https://mangapill.com/' }
  },
  {
    img: 'https://cdn.readdetectiveconan.com/file/mangap/2/11069000/2.jpeg?t=1740977722',
    page: 2,
    headerForImage: { Referer: 'https://mangapill.com/' }
  },
  {...},
]
```

<p align="end">(<a href="../../guides/manga.md">Back to Providers List</a>)</p>
