<h1> MangaDex </h1>

```ts
const mangadex = new MANGA.MangaDex();
```

The constructor takes an optional provider context, `new MANGA.MangaDex(ctx?)`, whose axios makes every request (default: `createProviderContext()`). See the [manga guide](../../guides/manga.md) for the shape every manga provider returns.

MangaDex is a public API (api.mangadex.org), so ids are MangaDex UUIDs. Some notes on how its data maps onto that shape:

- `title` is English: the main title when it is English, otherwise the first English alt title, otherwise the main title (often romaji, e.g. `Mieruko-chan`). Every other title is in `altTitles`.
- `description` is the English description (or the first one MangaDex has), with its Markdown removed.
- Search and list results have the 512 px cover; `fetchMangaInfo` has the full-size one. Neither needs `headerForImage`.
- `fetchMangaInfo` lists the chapters of one language (English unless you pass another). It leaves out chapters MangaDex has no pages for: official chapters that only link to the publisher's site, and chapters not readable yet. When several groups have translated a chapter, each version is listed, with its group in `scanlator`.

<h2>Methods</h2>

- [search](#search)
- [fetchMangaInfo](#fetchmangainfo)
- [fetchChapterPages](#fetchchapterpages)
- [fetchPopular](#fetchpopular)
- [fetchRecentlyAdded](#fetchrecentlyadded)
- [fetchLatestUpdates](#fetchlatestupdates)
- [fetchRandom](#fetchrandom)

### search

> Note: This method is a subclass of the [`BaseParser`](../../../src/models/base-parser.ts) class, meaning it is available across most categories.

<h4>Parameters</h4>

| Parameter        | Type     | Description                                                                 |
| ---------------- | -------- | --------------------------------------------------------------------------- |
| query            | `string` | query to search for. (_In this case, we're searching for `Tomodachi Game`_) |
| page (optional)  | `number` | page number (default: 1)                                                    |
| limit (optional) | `number` | results per page (default: 20, max: 100)                                    |

```ts
mangadex.search('Tomodachi Game').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of manga. (_[`Promise<ISearch<IMangaResult>>`](../../../src/models/types.ts)_)\
output:

```js
{
  currentPage: 1,
  hasNextPage: false,
  totalResults: 6,
  results: [
    {
      id: 'b35f67b6-bfb9-4cbd-86f0-621f37e6cb41', // manga id
      title: 'Friends Games', // its main title is the romaji 'Tomodachi Game'
      altTitles: ['Tomodachi Game', 'Przyjacielskie rozgrywki', 'トモダチゲーム', '朋友游戏', ...],
      image: 'https://uploads.mangadex.org/covers/b35f67b6-bfb9-4cbd-86f0-621f37e6cb41/20e9fdd6-9b70-4ba0-8202-3e24d6c72748.jpg.512.jpg',
      description: 'Katagiri Yuichi believes that friends are more important than money, but he also knows the hardships of not having enough funds...',
      status: 'Completed', // MediaStatus
      releaseDate: 2013,
      url: 'https://mangadex.org/title/b35f67b6-bfb9-4cbd-86f0-621f37e6cb41',
      contentRating: 'suggestive', // safe, suggestive, erotica or pornographic
      lastVolume: 26, // when MangaDex lists the final volume and chapter
      lastChapter: 127
    },
    {
      id: 'b03f6a91-81ab-4930-b92c-fe1d29821f5f',
      title: 'Netoge Tomodachi ga Omotteta n to Chigau',
      altTitles: ["My Online Friend Wasn't What I Expected", 'ネトゲ友達が思ってたんと違', 'Net Game Tomodachi ga Omottetan to Chigau'],
      image: 'https://uploads.mangadex.org/covers/b03f6a91-81ab-4930-b92c-fe1d29821f5f/3f70d79b-a5ca-4602-95d8-aa2bc84fbb8e.png.512.jpg',
      status: 'Completed', // no description: MangaDex has none
      releaseDate: 2020,
      url: 'https://mangadex.org/title/b03f6a91-81ab-4930-b92c-fe1d29821f5f',
      contentRating: 'safe'
    },
    {...}
  ]
}
```

### fetchMangaInfo

<h4>Parameters</h4>

| Parameter       | Type     | Description                                                                                 |
| --------------- | -------- | ------------------------------------------------------------------------------------------- |
| mangaId         | `string` | manga id (_can be found in the manga search results_)                                       |
| lang (optional) | `string` | language of the chapters, as MangaDex codes it (default: `en`; e.g. `pt-br`, `es-la`, `fr`) |

```ts
mangadex.fetchMangaInfo('6670ee28-f26d-4b61-b49c-d71149cd5a6e').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into a manga info object, with its chapters in reading order (first chapter first). (_[`Promise<IMangaInfo>`](../../../src/models/types.ts)_)\
output:

```js
{
  id: '6670ee28-f26d-4b61-b49c-d71149cd5a6e',
  title: 'Mieruko-chan',
  altTitles: ['見える子ちゃん', 'Can See Them–chan', 'The Girl Who Can See Them', ...],
  image: 'https://uploads.mangadex.org/covers/6670ee28-f26d-4b61-b49c-d71149cd5a6e/13d41432-d7ec-41cd-a265-5af700989aa6.jpg',
  description: 'All of a sudden, Miko is able to see grotesque monsters all around her; but no one else can. ...\n\nAlt Official Raw: niconico Manga',
  status: 'Ongoing',
  releaseDate: 2018,
  url: 'https://mangadex.org/title/6670ee28-f26d-4b61-b49c-d71149cd5a6e',
  contentRating: 'safe',
  authors: ['Izumi Tomoki'],
  artists: ['Izumi Tomoki'],
  genres: ['Thriller', 'Psychological', 'Comedy', 'Drama', 'Horror', 'Slice of Life', 'Mystery', 'Tragedy'],
  themes: ['Monsters', 'Ghosts', 'School Life', 'Supernatural'],
  malId: 116790, // when MangaDex links the title to MyAnimeList
  chapters: [
    {
      id: '5ac9a412-c6f0-4461-af0b-6b80f3086c2b', // chapter id
      title: 'Chapter 1', // the chapter's name, or this when it has none
      chapterNumber: 1,
      volumeNumber: 1,
      pages: 16,
      releaseDate: '2018-11-27T09:06:58+00:00',
      scanlator: 'Fairy Knight University',
      language: 'en',
      url: 'https://mangadex.org/chapter/5ac9a412-c6f0-4461-af0b-6b80f3086c2b'
    },
    {...},
    {
      id: 'ec558e55-e25d-4d8d-b794-49e250c46331',
      title: 'Bonus',
      chapterNumber: 4.5,
      volumeNumber: 1,
      pages: 3,
      releaseDate: '2019-01-23T07:56:42+00:00',
      scanlator: 'Fairy Knight University',
      language: 'en',
      url: 'https://mangadex.org/chapter/ec558e55-e25d-4d8d-b794-49e250c46331'
    },
    {...},
    {
      id: 'd809ff42-6816-4149-b9a3-927f553a477f',
      title: 'Chapter 73',
      chapterNumber: 73, // no volumeNumber: not in a volume yet
      pages: 48,
      releaseDate: '2026-10-22T20:27:41+00:00',
      scanlator: 'Creeg Scans & Canidae', // a joint release
      language: 'en',
      url: 'https://mangadex.org/chapter/d809ff42-6816-4149-b9a3-927f553a477f'
    }
  ]
}
```

### fetchChapterPages

<h4>Parameters</h4>

| Parameter            | Type      | Description                                               |
| -------------------- | --------- | --------------------------------------------------------- |
| chapterId            | `string`  | chapter id (_can be found in the manga info_)             |
| dataSaver (optional) | `boolean` | smaller, compressed images (default: `false`)             |

```ts
mangadex.fetchChapterPages('5ac9a412-c6f0-4461-af0b-6b80f3086c2b').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into the chapter's pages, numbered from 1. (_[`Promise<IMangaChapterPage[]>`](../../../src/models/types.ts)_)\
output:

```js
[
  {
    img: 'https://cmdxd98sb0x3yprd.mangadex.network/data/7772ef83daffe1834c59424b8b65257b/x1-f91ceaef3cb68f70c22c6e0ad22c151f6d428a3d2e0feaa09b377dafd36fc861.jpg',
    page: 1
  },
  {
    img: 'https://cmdxd98sb0x3yprd.mangadex.network/data/7772ef83daffe1834c59424b8b65257b/x2-331247bec83fd5632664ae0b5a48940fe7cf31e53c6c27ee0c8d66096d74af1e.png',
    page: 2
  },
  {...}
]
```

The images come from the MangaDex@Home server MangaDex assigns to the chapter. That server can change, so call `fetchChapterPages` again (rather than keeping the URLs) when a chapter is opened later or its images stop loading. A chapter that only links to a publisher's site has no pages on MangaDex, and `fetchChapterPages` rejects with an error saying so.

### fetchPopular

The most followed titles that have chapters (safe and suggestive).

<h4>Parameters</h4>

| Parameter        | Type     | Description                              |
| ---------------- | -------- | ---------------------------------------- |
| page (optional)  | `number` | page number (default: 1)                 |
| limit (optional) | `number` | results per page (default: 20, max: 100) |

```ts
mangadex.fetchPopular().then((data) => {
  console.log(data);
});
```

returns a promise which resolves into a page of manga, in the same shape as [search](#search). (_[`Promise<ISearch<IMangaResult>>`](../../../src/models/types.ts)_)

### fetchRecentlyAdded

The titles most recently added to MangaDex that have chapters (safe, suggestive and erotica).

<h4>Parameters</h4>

| Parameter        | Type     | Description                              |
| ---------------- | -------- | ---------------------------------------- |
| page (optional)  | `number` | page number (default: 1)                 |
| limit (optional) | `number` | results per page (default: 20, max: 100) |

```ts
mangadex.fetchRecentlyAdded().then((data) => {
  console.log(data);
});
```

returns a promise which resolves into a page of manga, in the same shape as [search](#search). (_[`Promise<ISearch<IMangaResult>>`](../../../src/models/types.ts)_)

### fetchLatestUpdates

The titles with the most recently uploaded chapters.

<h4>Parameters</h4>

| Parameter        | Type     | Description                              |
| ---------------- | -------- | ---------------------------------------- |
| page (optional)  | `number` | page number (default: 1)                 |
| limit (optional) | `number` | results per page (default: 20, max: 100) |

```ts
mangadex.fetchLatestUpdates().then((data) => {
  console.log(data);
});
```

returns a promise which resolves into a page of manga, in the same shape as [search](#search). (_[`Promise<ISearch<IMangaResult>>`](../../../src/models/types.ts)_)

### fetchRandom

<h4>Parameters</h4>

None.

```ts
mangadex.fetchRandom().then((data) => {
  console.log(data);
});
```

returns a promise which resolves into one random title, in the same shape as [search](#search). (_[`Promise<ISearch<IMangaResult>>`](../../../src/models/types.ts)_)\
output:

```js
{
  currentPage: 1,
  hasNextPage: false,
  results: [
    {
      id: '151bca3e-db98-4ad2-8d8d-239943b91437',
      title: 'Fabulous Beasts',
      altTitles: ['Yǒu Shòu Yān', '有兽焉', 'There Are Beasts', 'Existen Bestias', ...],
      image: 'https://uploads.mangadex.org/covers/151bca3e-db98-4ad2-8d8d-239943b91437/8adee174-8d08-45d7-ae3c-eea089f4d19e.jpg.512.jpg',
      description: '"In this realm mythological creatures roam, descendant of the nine heavens they call home."\n\nSibuxiang, a mythical deer-man couch potato, is kicked out of heaven...',
      status: 'Ongoing',
      releaseDate: 2017,
      url: 'https://mangadex.org/title/151bca3e-db98-4ad2-8d8d-239943b91437',
      contentRating: 'safe'
    }
  ]
}
```

<p align="end">(<a href="../../guides/manga.md">back to manga providers list</a>)</p>
