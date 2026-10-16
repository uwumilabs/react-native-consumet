<h1> BRMangas 🇧🇷 </h1>

```ts
const brmangas = new MANGA.BRMangas();
```

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
brmangas.search('punpun').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of manga. (_[`Promise<ISearch<IMangaResult[]>>`](../../../src/models/types.ts)_)\
output:

```js
{
  results: [
    {
      id: 'berserk-online',
      title: 'Berserk',
      image: 'https://cdn.plaquiz.xyz/uploads/b/berserk/berserk.jpg',
      headerForImage: { Referer: 'https://brmangas.net' },
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
brmangas.fetchMangaInfo('berserk-online').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an manga info object (including the chapters). (_[`Promise<IMangaInfo>`](../../../src/models/types.ts)_)\
output:

```js
{
      id: 'berserk-online',
      title: 'Berserk',
      altTitles: [],
      description: 'Gatts é um sobrevivente que vaga pelo mundo à procura de respostas. Antigo membro do ext “Bando dos Falcões”, um grupo mercenário de cavaleiros e guerreiros liderado por Griffith e Caska, Gatts se adentra na história que ganha corpo e emerge sob um ponto de vista totalmente imprevisível, a medida que os acontecimentos vão se completando. É uma obra dedicada à eterna luta do Catolicismo contra Paganismo….',
      headerForImage: { Referer: 'https://www.brmangas.net' },
      image: 'https://cdn.plaquiz.xyz/uploads/b/berserk/berserk.jpg',
      genres: [
        'Ação',         'Aventura',
        'Demônios',     'Drama',
        'Fantasia',     'Horror',
        'Mangás',       'Militar',
        'Psicológico',  'Seinen',
        'Sobrenatural'
      ],
      status: 'Unknown',
      views: null,
      authors: [ 'Miura, Kentarou' ],
      chapters: [
        {
          id: 'berserk-16-online',
          title: 'Capítulo -16',
          views: null,
          releasedDate: null
        },
        {...}
      ]
    }
```

Note: The `headerForImage` property might be useful when getting the image to display.

### fetchChapterPages

<h4>Parameters</h4>

| Parameter | Type     | Description                                              |
| --------- | -------- | -------------------------------------------------------- |
| chapterId | `string` | chapter id.(_chapter id can be found in the manga info_) |

```ts
brmangas.fetchChapterPages('berserk-16-online').then((data) => {
  console.log(data);
});
```

returns an array of pages. (_[`Promise<IMangaChapterPage[]>`](../../../src/models/types.ts)_)\
output:

```js
[
  {
      img: 'https://cdn.plaquiz.xyz/uploads/b/berserk/-16/1.jpg',
      page: 0,
      title: 'Page 1',
      headerForImage: { Referer: 'https://www.brmangas.net' }
  },
  {
      img: 'https://cdn.plaquiz.xyz/uploads/b/berserk/-16/2.jpg',
      page: 1,
      title: 'Page 2',
      headerForImage: { Referer: 'https://www.brmangas.net' }
  },
  {...}
]
```

<p align="end">(<a href="../../guides/manga.md">back to manga providers list</a>)</p>
