<h1> MangaHost 🇧🇷 </h1>

```ts
const mangahost = new MANGA.MangaHost();
```

The constructor takes an optional provider context, `new MANGA.MangaHost(ctx?)`, whose axios makes every request (default: `createProviderContext()`). See the [manga guide](../../guides/manga.md).

<h2>Methods</h2>

- [search](#search)
- [fetchMangaInfo](#fetchmangainfo)
- [fetchChapterPages](#fetchchapterpages)

### search

> Note: This method is a subclass of the [`BaseParser`](../../../src/models/base-parser.ts) class. meaning it is available across most categories.

<h4>Parameters</h4>

| Parameter | Type     | Description                                                         |
| --------- | -------- | ------------------------------------------------------------------- |
| query     | `string` | query to search for. (_In this case, We're searching for `punpun`_) |

```ts
mangahost.search('punpun').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of manga. (_[`Promise<ISearch<IMangaResult[]>>`](../../../src/models/types.ts)_)\
output:

```js
{
  results: [
    {
      id: 'oyasumi-punpun-mh34076',
      title: 'Oyasumi Punpun',
      image:
        'https://img-host.filestatic3.xyz/mangas_files/oyasumi-punpun/image_oyasumi-punpun_xmedium.jpg',
      headerForImage: { Referer: 'https://mangahosted.com' },
    },
  ];
}
```

### fetchMangaInfo

<h4>Parameters</h4>

| Parameter | Type     | Description                                                    |
| --------- | -------- | -------------------------------------------------------------- |
| mangaId   | `string` | manga id.(_manga id can be found in the manga search results_) |

```ts
mangahost.fetchMangaInfo('oyasumi-punpun-mh34076').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an manga info object (including the chapters). (_[`Promise<IMangaInfo>`](../../../src/models/types.ts)_)\
output:

```js
{
      id: 'oyasumi-punpun-mh34076',
      title: 'Oyasumi Punpun',
      altTitles: 'おやすみプンプンCompleto',
      description: 'Punpun é uma criança como todas as outras. Alegre e hiperativo, ele passa por muitos conflitos em sua vida, assim como qualquer outro ser humano. Essa é a história sobre a vida de Punpun, superando seus obstáculos e as adversidades que o mundo lhe traz.',
      headerForImage: { Referer: 'https://mangahosted.com' },
      image: 'https://img-host.filestatic3.xyz/mangas_files/oyasumi-punpun/image_oyasumi-punpun_full.jpg',
      genres: [
        'adulto',
        'comedia',
        'drama',
        'escolar',
        'psicologico',
        'seinen',
        'slice of life'
      ],
      status: 'Completed',
      views: 55498,
      authors: [ 'Asano Inio' ],
      chapters: [
        {
          id: '147',
          title: 'Capítulo #147 - Oyasumi Punpun',
          views: null,
          releasedDate: ''
        },
        {...}
      ]
    }
```

Note: The `headerForImage` property might be useful when getting the image to display.

### fetchChapterPages

<h4>Parameters</h4>

| Parameter | Type     | Description                                                              |
| --------- | -------- | ------------------------------------------------------------------------ |
| mangaId   | `string` | manga id.(_chapter id is the same one from the fetchMangaInfo function_) |
| chapterId | `string` | chapter id.(_chapter id can be found in the manga info_)                 |

```ts
mangahost.fetchChapterPages('oyasumi-punpun-mh34076', '1').then((data) => {
  console.log(data);
});
```

returns an array of pages. (_[`Promise<IMangaChapterPage[]>`](../../../src/models/types.ts)_)\
output:

```js
[
  {
      img: 'https://img-host.filestatic3.xyz/mangas_files/oyasumi-punpun/1/00.png',
      page: 0,
      title: 'Page 1',
      headerForImage: { Referer: 'https://mangahosted.com' }
  },
  {
      img: 'https://img-host.filestatic3.xyz/mangas_files/oyasumi-punpun/1/01-02.jpg',
      page: 1,
      title: 'Page 2',
      headerForImage: { Referer: 'https://mangahosted.com' }
  },
  {...}
]
```

<p align="end">(<a href="../../guides/manga.md">back to manga providers list</a>)</p>
