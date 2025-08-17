<h1>NovelUpdates</h1>

```ts
const novelupdates = new LIGHT_NOVELS.NovelUpdates();
```

<h2>Methods</h2>

- [search](#search)
- [fetchLightNovelInfo](#fetchlightnovelinfo)
- [fetchChapterContent](#fetchchaptercontent)

### search

> Note: This method is a subclass of the [`BaseParser`](https://github.com/consumet/extensions/blob/master/src/models/base-parser.ts) class. meaning it is available across most categories.

<h4>Parameters</h4>

| Parameter | Type     | Description                                                                         |
| --------- | -------- | ----------------------------------------------------------------------------------- |
| query     | `string` | query to search for. (_In this case, We're searching for `Classrrom of the Elite`_) |

```ts
novelupdates.search('Clasroom of the Elite').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of light novels. (_<a href= "https://github.com/consumet/extensions/blob/master/src/models/types.ts#L128-L134"> <code>Promise<ISearch\<ILightNovelResult>></code></a>_)\
output:

```js
{
  results: [
    {
      id: 'youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e', // the light novel id
      title: 'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e',
      url: 'https://www-novelupdates-com.translate.goog/series/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/?_x_tr_sl=ja&_x_tr_tl=en&_x_tr_hl=en-US',
      image: 'https://cdn.novelupdates.com/imgmid/series_10266.jpg'
    },
    {...}
    ...
  ]
}
```

### fetchLightNovelInfo

<h4>Parameters</h4>

| Parameter              | Type     | Description                                                                                            |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| lightNovelUrl          | `string` | id or url of the light novel. (_light novel id or url can be found in the light novel search results_) |
| chapterPage (optional) | `number` | chapter page number (_default: -1 meaning will fetch all chapters_)                                    |

```ts
novelupdates
  .fetchLightNovelInfo('youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e')
  .then((data) => {
    console.log(data);
  });
```

returns a promise which resolves into an light novel info object (including the chapters or volumes). (_<a href="https://github.com/consumet/extensions/blob/master/src/models/types.ts#L148-L156"><code>Promise\<ILightNovelInfo></code></a>_)\
output:

```js
{
  id: 'youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e',
  title: 'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e',
  url: 'https://www.novelupdates.com/series/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e',
  image: 'https://cdn.novelupdates.com/images/2017/02/cover00219.jpeg',
  author: 'Kinugasa Shougo衣笠彰梧',
  genres: [
    'Drama',
    'Psychological',
    '...'
  ],
  rating: 9,
  views: NaN,
  description: 'Kōdo Ikusei Senior High School, a leading prestigious school with state-of-the-art facilities where nearly...',
  status: 'Completed',
  chapters: [
    {
      id: '6659442',
      title: 'v17...',
      url: 'https://www.novelupdates.com/extnu/6659442'
    },
    {...}
    ...
```

### fetchChapterContent

<h4>Parameters</h4>

| Parameter | Type     | Description                                                            |
| --------- | -------- | ---------------------------------------------------------------------- |
| chapterId | `string` | chapter id. (_chapter id can be found in the light novel info object_) |

```ts
readlightnovels.fetchChapterContent('5692421').then((data) => {
  console.log(data);
});
```

returns a content object. (_<a href="https://github.com/consumet/extensions/blob/master/src/models/types.ts#L143-L146"><code>Promise\<ILightNovelChapterContent></code></a>_)\
output:

```js
{
  text: '\n' +
    'It’s a bit sudden,...',
  html: '<p></p><p>It’s a bit sudden, but listen seriously to the question I’m about to ask and think about...'
}
```

<p align="end">(<a href="https://github.com/consumet/extensions/blob/master/docs/guides/light-novels.md#">back to light novels providers list</a>)</p>
